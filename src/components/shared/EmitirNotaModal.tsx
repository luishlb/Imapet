"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { moeda, formatarDocumento, tipoDocumento, parseValorBr } from "@/lib/utils";

type ExameVinculado = {
  id: string;
  data_exame: string;
  tipo: string | null;
  clinica: string | null;
  valor_bruto: number | null;
  nome_paciente: string | null;
  pet_id: string | null;
  pets: { nome: string } | null;
};

type Props = {
  exameId?: string;
  onClose: () => void;
  onEmitida?: () => void;
};

type Tomador = {
  nome: string;
  documento: string;
  email: string;
};

type Endereco = {
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
  codigoMunicipio: string;
};

const ENDERECO_VAZIO: Endereco = {
  logradouro: "", numero: "", complemento: "", bairro: "",
  cidade: "", uf: "", cep: "", codigoMunicipio: "",
};

type TomadorSalvo = {
  id: string;
  tipo_doc: "CPF" | "CNPJ";
  documento: string;
  nome: string;
  email: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  cep: string | null;
  cod_municipio: string | null;
  emissoes: number;
};

export default function EmitirNotaModal({ exameId, onClose, onEmitida }: Props) {
  const [exame, setExame] = useState<ExameVinculado | null>(null);
  const [carregando, setCarregando] = useState(!!exameId);
  const [emitindo, setEmitindo] = useState(false);
  const [resultado, setResultado] = useState<{ ok: boolean; mensagem: string; chave?: string; notaId?: string } | null>(null);

  const [tomador, setTomador] = useState<Tomador>({ nome: "", documento: "", email: "" });
  const [endereco, setEndereco] = useState<Endereco>(ENDERECO_VAZIO);
  const [buscandoCnpj, setBuscandoCnpj] = useState(false);
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [tomadoresSalvos, setTomadoresSalvos] = useState<TomadorSalvo[]>([]);
  const [tomadorIdSelecionado, setTomadorIdSelecionado] = useState<string>("");
  const [compartilhando, setCompartilhando] = useState(false);

  // Carrega tomadores salvos ao abrir o modal
  useEffect(() => {
    fetch("/api/nfse/tomadores")
      .then(r => r.json())
      .then(d => setTomadoresSalvos(d.tomadores || []))
      .catch(() => {});
  }, []);

  function selecionarTomadorSalvo(id: string) {
    setTomadorIdSelecionado(id);
    if (!id) {
      // "Novo tomador" — limpa campos
      setTomador({ nome: "", documento: "", email: "" });
      setEndereco(ENDERECO_VAZIO);
      return;
    }
    const t = tomadoresSalvos.find(x => x.id === id);
    if (!t) return;
    setTomador({
      nome: t.nome,
      documento: formatarDocumento(t.documento),
      email: t.email || "",
    });
    setEndereco({
      logradouro: t.logradouro || "",
      numero: t.numero || "",
      complemento: t.complemento || "",
      bairro: t.bairro || "",
      cidade: t.cidade || "",
      uf: t.uf || "",
      cep: t.cep || "",
      codigoMunicipio: t.cod_municipio || "",
    });
  }

  // Auto-busca endereço quando CNPJ válido for digitado
  useEffect(() => {
    const docDigitos = tomador.documento.replace(/\D/g, "");
    if (tipoDocumento(tomador.documento) !== "CNPJ" || docDigitos.length !== 14) return;
    // Se o documento veio de um tomador salvo, já temos os dados — não bater na API
    if (tomadorIdSelecionado && tomadoresSalvos.find(t => t.id === tomadorIdSelecionado)?.documento === docDigitos) return;
    let cancelado = false;
    setBuscandoCnpj(true);
    fetch(`https://brasilapi.com.br/api/cnpj/v1/${docDigitos}`)
      .then(r => r.ok ? r.json() : null)
      .then((data: { razao_social?: string; nome_fantasia?: string; logradouro?: string; numero?: string; complemento?: string; bairro?: string; municipio?: string; uf?: string; cep?: string; codigo_municipio_ibge?: string | number } | null) => {
        if (cancelado || !data) return;
        // Preenche nome se ainda estiver vazio
        setTomador(t => t.nome ? t : { ...t, nome: data.razao_social || data.nome_fantasia || "" });
        // Preenche endereço
        setEndereco({
          logradouro: data.logradouro || "",
          numero: String(data.numero || ""),
          complemento: data.complemento || "",
          bairro: data.bairro || "",
          cidade: data.municipio || "",
          uf: data.uf || "",
          cep: String(data.cep || "").replace(/\D/g, ""),
          codigoMunicipio: String(data.codigo_municipio_ibge || ""),
        });
      })
      .finally(() => { if (!cancelado) setBuscandoCnpj(false); });
    return () => { cancelado = true; };
  }, [tomador.documento]);

  useEffect(() => {
    if (!exameId) return;
    (async () => {
      const sb = createClient();
      const { data: ex } = await sb
        .from("exames")
        .select("id, data_exame, tipo, clinica, valor_bruto, nome_paciente, pet_id, pets(nome)")
        .eq("id", exameId)
        .single();
      const exData = ex as unknown as ExameVinculado;
      setExame(exData);

      // Pré-preenche descrição e valor
      const paciente = exData?.nome_paciente || exData?.pets?.nome || "—";
      setDescricao(
        `${exData?.tipo || "Exame veterinário"} em paciente ${paciente}` +
        (exData?.clinica ? ` (${exData.clinica})` : "")
      );
      if (exData?.valor_bruto) setValor(String(exData.valor_bruto));

      // Tenta pré-preencher tomador via tutor (se existir)
      if (exData?.pet_id) {
        const { data: pet } = await sb
          .from("pets")
          .select("tutor_id")
          .eq("id", exData.pet_id)
          .maybeSingle();
        if (pet?.tutor_id) {
          const { data: tu } = await sb
            .from("tutores")
            .select("nome, cpf, email")
            .eq("id", pet.tutor_id)
            .maybeSingle();
          if (tu) {
            setTomador({
              nome: (tu as { nome: string }).nome || "",
              documento: (tu as { cpf: string | null }).cpf || "",
              email: (tu as { email: string | null }).email || "",
            });
          }
        }
      }

      setCarregando(false);
    })();
  }, [exameId]);

  async function baixarPdf() {
    if (!resultado?.chave) return;
    window.open(`/api/nfse/danfse/${resultado.chave}`, "_blank");
  }

  async function compartilhar() {
    if (!resultado?.chave) return;
    setCompartilhando(true);
    try {
      const res = await fetch(`/api/nfse/danfse/${resultado.chave}?upload=1`);
      const data = await res.json();
      if (!data.ok || !data.url) {
        alert("Falha ao gerar link de compartilhamento: " + (data.erro || "erro"));
        setCompartilhando(false);
        return;
      }
      const valorNum = parseValorBr(valor);
      const texto =
        `Nota Fiscal de Serviço — IMAPET\n\n` +
        `Valor: ${moeda(valorNum)}\n` +
        `Serviço: ${descricao.trim()}\n\n` +
        `📄 Acessar nota oficial:\n${data.url}\n\n` +
        `Chave de acesso: ${resultado.chave}`;

      if (typeof navigator !== "undefined" && navigator.share) {
        try {
          await navigator.share({ title: "NFS-e IMAPET", text: texto, url: data.url });
          setCompartilhando(false);
          return;
        } catch { /* cancelado */ }
      }
      window.open(`https://web.whatsapp.com/send?text=${encodeURIComponent(texto)}`, "_blank");
    } catch (e) {
      alert("Erro: " + (e instanceof Error ? e.message : "desconhecido"));
    }
    setCompartilhando(false);
  }

  async function emitir() {
    if (!tomador.nome.trim() || !descricao.trim() || !valor) return;
    setEmitindo(true);
    setResultado(null);

    const valorNum = parseValorBr(valor);
    if (isNaN(valorNum) || valorNum <= 0) {
      setResultado({ ok: false, mensagem: "Valor inválido" });
      setEmitindo(false);
      return;
    }

    const tipoDoc = tipoDocumento(tomador.documento);
    const enderecoPreenchido = endereco.logradouro && endereco.bairro && endereco.cep;
    const payload = {
      tomador: {
        tipo: tipoDoc || "CPF",
        documento: tomador.documento,
        nome: tomador.nome.trim(),
        email: tomador.email.trim() || undefined,
        ...(enderecoPreenchido ? {
          endereco: {
            logradouro: endereco.logradouro,
            numero: endereco.numero || "S/N",
            complemento: endereco.complemento || undefined,
            bairro: endereco.bairro,
            cidade: endereco.cidade,
            uf: endereco.uf,
            cep: endereco.cep.replace(/\D/g, ""),
            codigoMunicipio: endereco.codigoMunicipio || undefined,
          },
        } : {}),
      },
      descricao: descricao.trim(),
      valorServico: valorNum,
    };

    try {
      const res = await fetch("/api/nfse/emitir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.status === 503) {
        setResultado({
          ok: false,
          mensagem: "⚠️ Módulo de NFS-e ainda não está configurado. O certificado A1 precisa ser cadastrado antes da primeira emissão.",
        });
      } else if (data.ok) {
        const chave = data.numeroNfse || "";
        const linhas = [`✓ Nota emitida com sucesso!`];
        if (chave) linhas.push(`Chave de acesso: ${chave}`);
        if (data.avisoBanco) linhas.push(`\n⚠️ ${data.avisoBanco}`);
        setResultado({ ok: true, mensagem: linhas.join("\n"), chave, notaId: data.notaId });
        onEmitida?.();
      } else {
        const erro = data.erro || "Erro ao emitir.";
        const det = data.detalhes ? `\n\n--- Detalhes ---\n${JSON.stringify(data.detalhes, null, 2).slice(0, 1500)}` : "";
        setResultado({ ok: false, mensagem: erro + det });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro de rede";
      setResultado({ ok: false, mensagem: msg });
    }
    setEmitindo(false);
  }


  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <div>
            <h2 className="font-playfair text-lg font-bold text-text-main">Emitir NFS-e</h2>
            <p className="text-xs text-text-muted">Portal Nacional · {process.env.NEXT_PUBLIC_NFSE_AMBIENTE === "producao" ? "Produção" : "Homologação"}</p>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-red-500 text-xl leading-none px-2">×</button>
        </div>

        {carregando ? (
          <p className="text-sm text-text-muted py-12 text-center">Carregando dados do exame...</p>
        ) : resultado?.ok ? (
          <div className="px-6 py-8 space-y-5 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-3xl">
              ✓
            </div>
            <div>
              <h3 className="font-playfair text-xl font-bold text-text-main">Nota emitida com sucesso!</h3>
              <p className="text-xs text-text-muted mt-1">A NFS-e foi autorizada pelo gov.br.</p>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 text-left space-y-2">
              <div>
                <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Tomador</p>
                <p className="text-sm text-text-main">{tomador.nome}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Valor</p>
                <p className="text-sm font-bold text-primary">{moeda(parseValorBr(valor))}</p>
              </div>
              {resultado.chave && (
                <div>
                  <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Chave de acesso</p>
                  <p className="text-[10px] font-mono break-all text-text-muted">{resultado.chave}</p>
                </div>
              )}
              {(resultado.mensagem.includes("avisoBanco") || resultado.mensagem.includes("⚠️")) && (
                <p className="text-[11px] text-amber-700 bg-amber-50 rounded p-2 mt-2">{resultado.mensagem.split("\n").find(l => l.includes("⚠️"))}</p>
              )}
            </div>

            <div className="space-y-2">
              <button
                onClick={baixarPdf}
                disabled={!resultado.chave}
                className="w-full bg-primary text-white text-sm font-semibold py-3 rounded-xl hover:bg-primary-light transition disabled:opacity-50"
              >
                📄 Baixar PDF
              </button>
              <button
                onClick={compartilhar}
                disabled={!resultado.chave || compartilhando}
                className="w-full bg-green-600 text-white text-sm font-semibold py-3 rounded-xl hover:bg-green-700 transition disabled:opacity-50"
              >
                {compartilhando ? "Gerando link..." : "📤 Compartilhar"}
              </button>
              <button
                onClick={onClose}
                className="w-full bg-gray-100 text-text-main text-sm font-semibold py-3 rounded-xl hover:bg-gray-200 transition"
              >
                Fechar
              </button>
            </div>
          </div>
        ) : (
          <div className="px-6 py-5 space-y-4">
            {exame && (
              <div className="bg-primary/5 rounded-xl px-4 py-3">
                <p className="text-[10px] font-semibold text-primary uppercase tracking-wider">Vinculado ao exame</p>
                <p className="text-sm font-medium text-text-main mt-0.5">
                  {exame.nome_paciente || exame.pets?.nome || "—"} · {exame.clinica || "—"}
                </p>
              </div>
            )}

            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Tomador</p>
              <div className="space-y-2">
                {tomadoresSalvos.length > 0 && (
                  <select
                    value={tomadorIdSelecionado}
                    onChange={(e) => selecionarTomadorSalvo(e.target.value)}
                    className="input text-sm bg-primary/5"
                  >
                    <option value="">+ Novo tomador (preencher abaixo)</option>
                    <optgroup label="Tomadores cadastrados">
                      {tomadoresSalvos.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.nome} · {formatarDocumento(t.documento)}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                )}
                <input
                  value={tomador.nome}
                  onChange={(e) => setTomador((t) => ({ ...t, nome: e.target.value }))}
                  placeholder="Nome / Razão social *"
                  className="input text-sm"
                />
                <input
                  value={tomador.documento}
                  onChange={(e) => setTomador((t) => ({ ...t, documento: formatarDocumento(e.target.value) }))}
                  placeholder="CPF ou CNPJ"
                  inputMode="numeric"
                  className="input text-sm"
                />
                {tomador.documento && (
                  <p className="text-[11px] text-primary font-semibold">
                    {tipoDocumento(tomador.documento)} detectado
                    {buscandoCnpj && " · buscando dados na Receita..."}
                  </p>
                )}
                <input
                  type="email"
                  value={tomador.email}
                  onChange={(e) => setTomador((t) => ({ ...t, email: e.target.value }))}
                  placeholder="Email (opcional — pra receber a nota)"
                  className="input text-sm"
                />
              </div>
            </div>

            {(tipoDocumento(tomador.documento) === "CNPJ" || endereco.logradouro) && (
              <div>
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                  Endereço {endereco.logradouro && <span className="text-green-700 font-normal">· preenchido automaticamente</span>}
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <input value={endereco.logradouro} onChange={e => setEndereco(en => ({ ...en, logradouro: e.target.value }))}
                    placeholder="Logradouro" className="input text-sm col-span-2" />
                  <input value={endereco.numero} onChange={e => setEndereco(en => ({ ...en, numero: e.target.value }))}
                    placeholder="Nº" className="input text-sm" />
                </div>
                <input value={endereco.complemento} onChange={e => setEndereco(en => ({ ...en, complemento: e.target.value }))}
                  placeholder="Complemento (opcional)" className="input text-sm mt-2" />
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <input value={endereco.bairro} onChange={e => setEndereco(en => ({ ...en, bairro: e.target.value }))}
                    placeholder="Bairro" className="input text-sm" />
                  <input value={endereco.cep} onChange={e => setEndereco(en => ({ ...en, cep: e.target.value }))}
                    placeholder="CEP" className="input text-sm" />
                </div>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <input value={endereco.cidade} onChange={e => setEndereco(en => ({ ...en, cidade: e.target.value }))}
                    placeholder="Cidade" className="input text-sm col-span-2" />
                  <input value={endereco.uf} onChange={e => setEndereco(en => ({ ...en, uf: e.target.value.toUpperCase().slice(0,2) }))}
                    placeholder="UF" className="input text-sm" />
                </div>
              </div>
            )}

            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Serviço</p>
              <textarea
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                rows={2}
                placeholder="Descrição do serviço prestado *"
                className="input text-sm resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-text-muted mb-1.5">Valor (R$) *</label>
              <input
                type="text"
                inputMode="decimal"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                placeholder="Ex: 1.280,00"
                className="input text-sm"
              />
              {valor && !isNaN(parseValorBr(valor)) && (
                <p className="text-xs text-text-muted mt-1">{moeda(parseValorBr(valor))}</p>
              )}
            </div>

            {resultado && !resultado.ok && (
              <div className="rounded-xl px-4 py-3 text-[11px] whitespace-pre-wrap break-words max-h-[26rem] overflow-y-auto font-mono bg-amber-50 text-amber-800">
                {resultado.mensagem}
              </div>
            )}
          </div>
        )}

        {!resultado?.ok && !carregando && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-2 sticky bottom-0 bg-white">
            <button onClick={onClose} disabled={emitindo} className="text-sm text-text-muted hover:text-text-main px-4 py-2">
              Cancelar
            </button>
            <button
              onClick={emitir}
              disabled={emitindo || !tomador.nome.trim() || !descricao.trim() || !valor}
              className="bg-primary text-white text-sm font-semibold px-5 py-2 rounded-xl hover:bg-primary-light transition disabled:opacity-50"
            >
              {emitindo ? "Emitindo..." : "🧾 Emitir NFS-e"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
