// Integração com Portal Nacional NFS-e (gov.br/nfse)
//
// Status: ESQUELETO — funções principais ainda não implementadas porque dependem
// do certificado A1. Quando NFSE_CERT_BASE64 estiver preenchido, implementar:
//   - carregarCertificado
//   - assinarXml (xml-crypto + cert)
//   - emitirNfse (POST /nfse com mTLS via https.Agent)
//
// Endpoints:
//   Homologação: https://adn.producaorestrita.nfse.gov.br
//   Produção:    https://adn.nfse.gov.br
//
// Fluxo: monta DPS (XML) → assina com A1 → gzip → POST /nfse via mTLS → NFS-e

const ENDPOINTS = {
  homologacao: "https://adn.producaorestrita.nfse.gov.br",
  producao: "https://adn.nfse.gov.br",
} as const;

export type Ambiente = "homologacao" | "producao";

export type TomadorPessoaFisica = {
  tipo: "CPF";
  documento: string;       // CPF formatado
  nome: string;
  email?: string;
  endereco?: Endereco;
};

export type TomadorPessoaJuridica = {
  tipo: "CNPJ";
  documento: string;       // CNPJ formatado
  nome: string;            // Razão social
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
};

export type DadosDPS = {
  tomador: Tomador;
  descricao: string;
  valorServico: number;
  codigoServico?: string;
  aliquotaIss?: number;     // ex: 0.02 = 2%
  dataPrestacao?: string;   // ISO date
};

export type RespostaEmissao =
  | { ok: true; numeroNfse: string; codigoVerificacao: string; xmlNfse: string }
  | { ok: false; erro: string; detalhes?: unknown };

export function ambienteAtual(): Ambiente {
  const v = process.env.NFSE_AMBIENTE || "homologacao";
  return v === "producao" ? "producao" : "homologacao";
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

// TODO: Implementar após receber certificado
// import forge from "node-forge";
// export function carregarCertificado() {
//   const b64 = process.env.NFSE_CERT_BASE64!;
//   const senha = process.env.NFSE_CERT_PASSWORD!;
//   const der = Buffer.from(b64, "base64").toString("binary");
//   const p12Asn1 = forge.asn1.fromDer(der);
//   const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, senha);
//   // Extrair chave privada e certificado X.509
//   ...
// }

// TODO: Implementar assinatura XML com xml-crypto

// TODO: Implementar emissão real
export async function emitirNfse(_dados: DadosDPS): Promise<RespostaEmissao> {
  if (!nfseConfigurada()) {
    return {
      ok: false,
      erro: "Certificado A1 ainda não configurado. Preencha NFSE_CERT_BASE64 e NFSE_CERT_PASSWORD nas env vars.",
    };
  }

  return {
    ok: false,
    erro: "Emissão real ainda não implementada. Aguardando próxima sessão de desenvolvimento.",
  };
}

export async function consultarNfse(_numero: string): Promise<RespostaEmissao> {
  return { ok: false, erro: "Consulta ainda não implementada." };
}

export async function cancelarNfse(_numero: string, _motivo: string): Promise<RespostaEmissao> {
  return { ok: false, erro: "Cancelamento ainda não implementado." };
}
