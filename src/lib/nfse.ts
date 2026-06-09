// Integração com Portal Nacional NFS-e (gov.br/nfse)
//
// Fluxo: montar DPS XML → assinar com A1 → gzip → POST /nfse via mTLS → NFS-e

import forge from "node-forge";
import { SignedXml } from "xml-crypto";
import { XMLBuilder, XMLParser } from "fast-xml-parser";
import { gzipSync, gunzipSync } from "node:zlib";
import https from "node:https";

const ENDPOINTS = {
  homologacao: "https://sefin.producaorestrita.nfse.gov.br/SefinNacional",
  producao: "https://sefin.nfse.gov.br/SefinNacional",
} as const;

// O DANFSe (PDF) é servido pelo ADN, não pelo Sefin
const ENDPOINTS_ADN = {
  homologacao: "https://adn.producaorestrita.nfse.gov.br",
  producao: "https://adn.nfse.gov.br",
} as const;

function endpointAdn(): string {
  return ENDPOINTS_ADN[ambienteAtual()];
}

export type Ambiente = "homologacao" | "producao";

export type TomadorPessoaFisica = {
  tipo: "CPF";
  documento: string;
  nome: string;
  email?: string;
  endereco?: Endereco;
};

export type TomadorPessoaJuridica = {
  tipo: "CNPJ";
  documento: string;
  nome: string;
  inscricaoMunicipal?: string;
  email?: string;
  endereco?: Endereco;
};

export type Tomador = TomadorPessoaFisica | TomadorPessoaJuridica;

export type Endereco = {
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
  codigoMunicipio?: string;
};

export type DadosDPS = {
  tomador: Tomador;
  descricao: string;
  valorServico: number;
  codigoServicoNacional?: string;
  codigoServicoMunicipal?: string;
  aliquotaIss?: number;
  dataPrestacao?: string; // YYYY-MM-DD
};

export type RespostaEmissao =
  | { ok: true; numeroNfse: string; codigoVerificacao: string; xmlNfse: string; xmlDps: string }
  | { ok: false; erro: string; detalhes?: unknown };

// ─── Configuração / Helpers ──────────────────────────────────────────────────

export function ambienteAtual(): Ambiente {
  return process.env.NFSE_AMBIENTE === "producao" ? "producao" : "homologacao";
}

export function endpointBase(): string {
  return ENDPOINTS[ambienteAtual()];
}

export function nfseConfigurada(): boolean {
  return !!(
    process.env.NFSE_CERT_BASE64 &&
    process.env.NFSE_CERT_PASSWORD &&
    process.env.NFSE_CNPJ_EMITENTE &&
    process.env.NFSE_INSCRICAO_MUNICIPAL
  );
}

function soDigitos(s: string): string {
  return s.replace(/\D/g, "");
}

// ─── Certificado A1 ──────────────────────────────────────────────────────────

let certCache: { pemCert: string; pemKey: string; cert: forge.pki.Certificate; key: forge.pki.rsa.PrivateKey } | null = null;

export function carregarCertificado() {
  if (certCache) return certCache;

  const b64 = process.env.NFSE_CERT_BASE64!;
  const senha = process.env.NFSE_CERT_PASSWORD!;

  const der = Buffer.from(b64, "base64").toString("binary");
  const p12Asn1 = forge.asn1.fromDer(der);
  const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, senha);

  const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
  const certBag = certBags[forge.pki.oids.certBag]?.[0];
  const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
  const keyBag = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0];

  if (!certBag?.cert || !keyBag?.key) {
    throw new Error("Certificado A1 inválido — não consegui extrair cert ou chave");
  }

  const cert = certBag.cert;
  const key = keyBag.key as forge.pki.rsa.PrivateKey;
  const pemCert = forge.pki.certificateToPem(cert);
  const pemKey = forge.pki.privateKeyToPem(key);

  certCache = { cert, key, pemCert, pemKey };
  return certCache;
}

// ─── Montagem do DPS XML ─────────────────────────────────────────────────────

function gerarIdDps(cMun: string, tpInsc: 1 | 2, doc: string, serie: string, numero: string): string {
  // Formato ABRASF Nacional: DPS + cMun(7) + tpInsc(1) + nInsc(14, zero-padded) + serie(5) + nDPS(15)
  // tpInsc: 1=CPF, 2=CNPJ
  return `DPS${cMun.padStart(7, "0")}${tpInsc}${doc.padStart(14, "0")}${serie.padStart(5, "0")}${numero.padStart(15, "0")}`;
}

export function montarDpsXml(dados: DadosDPS, params: {
  serie: string;
  numero: string;
  tpEmis?: number; // 1=Normal, 2=Contingência
}): string {
  const cnpjEmit = soDigitos(process.env.NFSE_CNPJ_EMITENTE!);
  const imEmit = soDigitos(process.env.NFSE_INSCRICAO_MUNICIPAL!);
  const codMun = process.env.NFSE_CODIGO_MUNICIPIO || "2611606";
  const aliq = dados.aliquotaIss ?? parseFloat(process.env.NFSE_ALIQUOTA_ISS || "0.02");
  // cTribNac pelo padrão XSD aceita só dígitos (sem pontos)
  const codTribNac = soDigitos(dados.codigoServicoNacional || process.env.NFSE_CODIGO_SERVICO_NACIONAL || "05.03.01");
  const codTribMun = dados.codigoServicoMunicipal || process.env.NFSE_CODIGO_SERVICO || "501";

  const idDps = gerarIdDps(codMun, 2, cnpjEmit, params.serie, params.numero);
  // dhEmi em horário de Brasília (-03:00) — ajustamos os ms pra que o ISO output já bata
  const agoraBrasilia = new Date(Date.now() - 3 * 60 * 60 * 1000);
  const dhEmi = agoraBrasilia.toISOString().replace(/\.\d{3}Z$/, "-03:00");
  const dCompet = (dados.dataPrestacao || new Date().toISOString().slice(0, 10));

  const valor = dados.valorServico;
  const vISS = +(valor * aliq).toFixed(2);

  // Tomador
  const t = dados.tomador;
  const tomadorDoc = t.tipo === "CPF"
    ? { CPF: soDigitos(t.documento) }
    : { CNPJ: soDigitos(t.documento) };

  // opSimpNac (TSOpSimpNac): 1=Não optante, 2=MEI, 3=Optante ME/EPP SN
  // IMAPET é LTDA Simples Nacional → 3
  const tribOpSimples = parseInt(process.env.NFSE_OP_SIMP_NAC || "3", 10);

  const dpsObj = {
    DPS: {
      "@_xmlns": "http://www.sped.fazenda.gov.br/nfse",
      "@_versao": "1.00",
      infDPS: {
        "@_Id": idDps,
        tpAmb: ambienteAtual() === "producao" ? 1 : 2,
        dhEmi,
        verAplic: "IMAPET-1.0",
        serie: params.serie,
        nDPS: params.numero,
        dCompet,
        tpEmit: 1, // 1=Prestador emitindo a própria nota
        cLocEmi: codMun,
        prest: {
          CNPJ: cnpjEmit,
          IM: imEmit,
          regTrib: {
            opSimpNac: tribOpSimples, // 1=Não optante, 2=MEI, 3=ME/EPP SN
            // Optante SN (2 ou 3) precisa do regime de apuração
            ...(tribOpSimples >= 2 ? { regApTribSN: 1 } : {}),
            regEspTrib: 0,
          },
        },
        toma: {
          ...tomadorDoc,
          xNome: t.nome,
          ...(t.endereco ? {
            end: {
              endNac: {
                cMun: t.endereco.codigoMunicipio || codMun,
                CEP: soDigitos(t.endereco.cep),
              },
              xLgr: t.endereco.logradouro,
              nro: t.endereco.numero || "S/N",
              ...(t.endereco.complemento ? { xCpl: t.endereco.complemento } : {}),
              xBairro: t.endereco.bairro,
            },
          } : {}),
          ...(t.email ? { email: t.email } : {}),
        },
        serv: {
          locPrest: { cLocPrestacao: codMun },
          cServ: {
            cTribNac: codTribNac,
            cTribMun: codTribMun,
            xDescServ: dados.descricao.slice(0, 2000),
          },
        },
        valores: {
          vServPrest: { vServ: valor.toFixed(2) },
          trib: {
            tribMun: {
              tribISSQN: 1, // 1=Operação tributável
              tpRetISSQN: 1, // 1=Não retido
            },
            totTrib: {
              vTotTrib: {
                vTotTribFed: "0.00",
                vTotTribEst: "0.00",
                vTotTribMun: vISS.toFixed(2),
              },
            },
          },
        },
      },
    },
  };

  const builder = new XMLBuilder({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    format: false,
    suppressEmptyNode: true,
  });

  return '<?xml version="1.0" encoding="UTF-8"?>' + builder.build(dpsObj);
}

// ─── Assinatura Digital ──────────────────────────────────────────────────────

export function assinarXml(xml: string): string {
  const { pemCert, pemKey } = carregarCertificado();

  const sig = new SignedXml({
    privateKey: pemKey,
    publicCert: pemCert,
    signatureAlgorithm: "http://www.w3.org/2001/04/xmldsig-more#rsa-sha256",
    canonicalizationAlgorithm: "http://www.w3.org/TR/2001/REC-xml-c14n-20010315",
  });

  sig.addReference({
    xpath: "//*[local-name(.)='infDPS']",
    digestAlgorithm: "http://www.w3.org/2001/04/xmlenc#sha256",
    transforms: [
      "http://www.w3.org/2000/09/xmldsig#enveloped-signature",
      "http://www.w3.org/TR/2001/REC-xml-c14n-20010315",
    ],
  });

  sig.computeSignature(xml, {
    location: { reference: "//*[local-name(.)='infDPS']", action: "after" },
  });

  return sig.getSignedXml();
}

// ─── Envio ao Portal Nacional ────────────────────────────────────────────────

function postMtlsUma(url: string, body: Buffer, headers: Record<string, string>, timeoutMs: number): Promise<{ status: number; body: string; headers: Record<string, string | string[] | undefined> }> {
  const { pemCert, pemKey } = carregarCertificado();

  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request({
      hostname: u.hostname,
      port: u.port || 443,
      path: u.pathname + u.search,
      method: "POST",
      headers: { ...headers, "Content-Length": body.length.toString() },
      cert: pemCert,
      key: pemKey,
      rejectUnauthorized: true,
      timeout: timeoutMs,
    }, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => {
        const buf = Buffer.concat(chunks);
        resolve({
          status: res.statusCode || 0,
          body: buf.toString("utf8"),
          headers: res.headers as Record<string, string | string[] | undefined>,
        });
      });
    });
    req.on("error", reject);
    req.on("timeout", () => req.destroy(new Error("Timeout")));
    req.write(body);
    req.end();
  });
}

async function postMtls(url: string, body: Buffer, headers: Record<string, string>): Promise<{ status: number; body: string; headers: Record<string, string | string[] | undefined> }> {
  // Retry com backoff em erros transitórios (socket hang up, ECONNRESET, ETIMEDOUT)
  const delays = [0, 2000, 4000, 7000, 12000];
  const errosPorTentativa: string[] = [];

  for (let i = 0; i < delays.length; i++) {
    if (delays[i] > 0) await new Promise(r => setTimeout(r, delays[i]));
    try {
      console.log(`[NFSE] Tentativa ${i + 1}/${delays.length} POST ${url}`);
      const res = await postMtlsUma(url, body, headers, 45000);
      console.log(`[NFSE] Tentativa ${i + 1} resposta status ${res.status}`);
      return res;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro desconhecido";
      errosPorTentativa.push(`#${i + 1}: ${msg}`);
      console.log(`[NFSE] Tentativa ${i + 1} falhou: ${msg}`);
      const lower = msg.toLowerCase();
      // Só faz retry em erros de transporte. Erros HTTP normais (4xx, 5xx) chegam como response, não exception.
      const transitorio = lower.includes("socket hang up") || lower.includes("econnreset") || lower.includes("etimedout") || lower.includes("timeout") || lower.includes("epipe");
      if (!transitorio) {
        throw new Error(`Erro permanente: ${msg}`);
      }
    }
  }
  throw new Error(`Servidor do gov.br cortou a conexão em todas as ${delays.length} tentativas. Erros: ${errosPorTentativa.join(" | ")}`);
}

export async function diagnosticarConexao(): Promise<{ ok: boolean; mensagem: string; detalhes: unknown }> {
  if (!nfseConfigurada()) return { ok: false, mensagem: "NFS-e não configurada", detalhes: null };

  try {
    const url = `${endpointBase()}/nfse`;
    const res = await postMtls(url, Buffer.from("{}"), {
      "Content-Type": "application/json",
      "Accept": "application/json",
    });
    return {
      ok: true,
      mensagem: `Conectou em ${url}. Status HTTP: ${res.status}`,
      detalhes: {
        endpoint: url,
        status: res.status,
        headers: res.headers,
        body: res.body.slice(0, 2000),
      },
    };
  } catch (e) {
    return {
      ok: false,
      mensagem: e instanceof Error ? e.message : "Erro de conexão",
      detalhes: e,
    };
  }
}

// ─── Funções públicas ────────────────────────────────────────────────────────

export async function emitirNfse(dados: DadosDPS, opts?: { serie?: string; numero?: string }): Promise<RespostaEmissao & { xmlDpsTentado?: string }> {
  if (!nfseConfigurada()) {
    return { ok: false, erro: "NFS-e não configurada (faltam env vars)." };
  }

  const serie = opts?.serie || "00001";
  const numero = opts?.numero || String(Date.now()).slice(-9);
  let xmlAssinado: string | null = null;

  try {
    const xmlDps = montarDpsXml(dados, { serie, numero });
    xmlAssinado = assinarXml(xmlDps);

    // Sefin Nacional aceita JSON com o XML assinado em gzip+base64
    // Campo: dpsXmlGZipB64
    const xmlBuf = Buffer.from(xmlAssinado, "utf8");
    const gzipped = gzipSync(xmlBuf);
    const dpsXmlGZipB64 = gzipped.toString("base64");

    const url = `${endpointBase()}/nfse`;
    const payload = Buffer.from(JSON.stringify({ dpsXmlGZipB64 }), "utf8");

    const res = await postMtls(url, payload, {
      "Content-Type": "application/json",
      "Accept": "application/json",
    });

    if (res.status >= 200 && res.status < 300) {
      try {
        const json = JSON.parse(res.body);
        // Identificadores — a chave de acesso é o "número" oficial da NFS-e no Padrão Nacional
        const numero =
          json.chaveAcesso ||
          json.nfse?.numeroNfse ||
          json.nfse?.numero ||
          json.numeroNfse ||
          json.numero ||
          json.infNFSe?.nNFSe ||
          json.nNFSe ||
          json.chNFSe ||
          "";
        const cv =
          json.nfse?.codigoVerificacao ||
          json.codigoVerificacao ||
          json.infNFSe?.codVerif ||
          json.codVerif ||
          "";
        // Resposta vem com nfseXmlGZipB64 — descomprime pra ter o XML em texto
        let xmlNfse = json.nfse?.xml || json.xml || "";
        if (json.nfseXmlGZipB64) {
          try {
            const buf = Buffer.from(json.nfseXmlGZipB64, "base64");
            xmlNfse = gunzipSync(buf).toString("utf8");
          } catch {
            xmlNfse = JSON.stringify(json);
          }
        }
        if (!xmlNfse) xmlNfse = JSON.stringify(json);

        return {
          ok: true,
          numeroNfse: String(numero),
          codigoVerificacao: String(cv),
          xmlNfse,
          xmlDps: xmlAssinado,
        };
      } catch {
        return {
          ok: true,
          numeroNfse: "",
          codigoVerificacao: "",
          xmlNfse: res.body,
          xmlDps: xmlAssinado,
        };
      }
    }

    // Erro — captura tudo possível
    let mensagemErro = `HTTP ${res.status}`;
    const bodyTrim = res.body.trim();
    if (bodyTrim.length === 0) {
      mensagemErro = `HTTP ${res.status} — resposta vazia. Content-Type: ${res.headers["content-type"] || "?"}`;
    } else {
      try {
        const json = JSON.parse(res.body);
        const m = json.erro || json.message || json.mensagem || json.error;
        if (m && typeof m === "string") {
          mensagemErro = `HTTP ${res.status}: ${m}`;
        } else if (Object.keys(json).length === 0) {
          mensagemErro = `HTTP ${res.status} — resposta {} (objeto vazio). Headers: ${JSON.stringify(res.headers).slice(0, 300)}`;
        } else {
          mensagemErro = `HTTP ${res.status}: ${JSON.stringify(json).slice(0, 500)}`;
        }
      } catch {
        const parser = new XMLParser({ ignoreAttributes: false });
        try {
          const obj = parser.parse(res.body);
          mensagemErro = `HTTP ${res.status}: ${JSON.stringify(obj).slice(0, 500)}`;
        } catch {
          mensagemErro = `HTTP ${res.status}: ${res.body.slice(0, 500)}`;
        }
      }
    }

    return {
      ok: false,
      erro: mensagemErro,
      detalhes: {
        status: res.status,
        headers: res.headers,
        body: res.body.slice(0, 2000),
        urlEnviado: url,
        tamanhoJson: payload.length,
        tamanhoXml: xmlBuf.length,
        tamanhoGzipB64: dpsXmlGZipB64.length,
        idDps: gerarIdDps(
          process.env.NFSE_CODIGO_MUNICIPIO || "2611606",
          2,
          soDigitos(process.env.NFSE_CNPJ_EMITENTE!),
          serie,
          numero,
        ),
      },
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido";
    return {
      ok: false,
      erro: msg,
      detalhes: { stack: e instanceof Error ? e.stack : null, serie, numero },
      xmlDpsTentado: xmlAssinado || undefined,
    };
  }
}

export async function consultarNfse(numero: string): Promise<RespostaEmissao> {
  if (!nfseConfigurada()) return { ok: false, erro: "NFS-e não configurada." };

  try {
    const cnpj = soDigitos(process.env.NFSE_CNPJ_EMITENTE!);
    const url = `${endpointBase()}/nfse/${cnpj}/${numero}`;

    const { pemCert, pemKey } = carregarCertificado();
    const u = new URL(url);
    const res = await new Promise<{ status: number; body: string }>((resolve, reject) => {
      const req = https.request({
        hostname: u.hostname,
        path: u.pathname,
        method: "GET",
        cert: pemCert,
        key: pemKey,
      }, (resp) => {
        const chunks: Buffer[] = [];
        resp.on("data", (c) => chunks.push(c));
        resp.on("end", () => resolve({ status: resp.statusCode || 0, body: Buffer.concat(chunks).toString("utf8") }));
      });
      req.on("error", reject);
      req.end();
    });

    if (res.status >= 200 && res.status < 300) {
      return { ok: true, numeroNfse: numero, codigoVerificacao: "", xmlNfse: res.body, xmlDps: "" };
    }
    return { ok: false, erro: `HTTP ${res.status}`, detalhes: res.body };
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : "Erro" };
  }
}

async function tentarBaixarDanfse(url: string): Promise<{ status: number; pdf: Buffer; contentType: string }> {
  const { pemCert, pemKey } = carregarCertificado();
  const u = new URL(url);
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: u.hostname,
      port: u.port || 443,
      path: u.pathname,
      method: "GET",
      cert: pemCert,
      key: pemKey,
      headers: { Accept: "application/pdf" },
    }, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => {
        resolve({
          status: res.statusCode || 0,
          pdf: Buffer.concat(chunks),
          contentType: String(res.headers["content-type"] || ""),
        });
      });
    });
    req.on("error", reject);
    req.end();
  });
}

export async function baixarDanfse(chaveAcesso: string): Promise<{ ok: true; pdf: Buffer } | { ok: false; erro: string; status?: number; body?: string }> {
  if (!nfseConfigurada()) return { ok: false, erro: "NFS-e não configurada." };

  // Lista de paths possíveis pra tentar — gov.br produção vs homologação tem variações
  const base = endpointAdn();
  const paths = [
    `${base}/danfse/${chaveAcesso}`,
    `${base}/contribuintes/danfse/${chaveAcesso}`,
    `${base}/Danfse/${chaveAcesso}`,
  ];

  let ultimoErro: { status: number; body: string } = { status: 0, body: "" };

  // 1 tentativa imediata + 1 retry após 2s (DANFSe leva alguns segundos pra ser gerado em produção)
  for (let tentativa = 0; tentativa < 2; tentativa++) {
    if (tentativa > 0) {
      await new Promise((r) => setTimeout(r, 2000));
    }
    for (const url of paths) {
      try {
        const r = await tentarBaixarDanfse(url);
        // Sucesso: status 2xx + Content-Type PDF
        if (r.status >= 200 && r.status < 300 && r.contentType.includes("pdf")) {
          return { ok: true, pdf: r.pdf };
        }
        ultimoErro = { status: r.status, body: r.pdf.toString("utf8").slice(0, 300) };
      } catch (e) {
        ultimoErro = { status: 0, body: e instanceof Error ? e.message : "erro" };
      }
    }
  }

  return {
    ok: false,
    erro: `Não foi possível baixar o DANFSe (status ${ultimoErro.status}). O PDF pode estar sendo gerado — tente novamente em alguns minutos.`,
    status: ultimoErro.status,
    body: ultimoErro.body,
  };
}

export async function cancelarNfse(numero: string, motivo: string): Promise<RespostaEmissao> {
  if (!nfseConfigurada()) return { ok: false, erro: "NFS-e não configurada." };
  // TODO: implementar cancelamento conforme spec do Portal Nacional
  return { ok: false, erro: `Cancelamento ainda não implementado (recebido: ${numero}, ${motivo})` };
}
