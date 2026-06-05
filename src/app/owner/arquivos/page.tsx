"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { dataFmt } from "@/lib/utils";

type ArquivoOficial = {
  id: string;
  nome: string;
  categoria: string | null;
  descricao: string | null;
  arquivo_url: string;
  arquivo_nome_original: string | null;
  tamanho_bytes: number | null;
  tipo_mime: string | null;
  validade: string | null;
  criado_em: string;
};

const CATEGORIAS = [
  "Documentação",
  "Tributário",
  "Contratos",
  "Certidões",
  "Comprovantes",
  "Outros",
] as const;

const ICONES_CATEGORIA: Record<string, string> = {
  "Documentação": "📋",
  "Tributário": "💰",
  "Contratos": "📝",
  "Certidões": "📜",
  "Comprovantes": "🧾",
  "Outros": "📁",
};

function fmtTamanho(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function iconePorTipo(mime: string | null, nome: string | null): string {
  const ext = nome?.split(".").pop()?.toLowerCase();
  if (mime?.includes("pdf") || ext === "pdf") return "📄";
  if (mime?.startsWith("image/") || ["png", "jpg", "jpeg", "webp"].includes(ext || "")) return "🖼️";
  if (mime?.includes("word") || ["doc", "docx"].includes(ext || "")) return "📝";
  if (mime?.includes("sheet") || ["xls", "xlsx", "csv"].includes(ext || "")) return "📊";
  return "📎";
}

function diasParaExpirar(validade: string | null): number | null {
  if (!validade) return null;
  const d = new Date(validade + "T00:00:00");
  const now = new Date();
  return Math.floor((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export default function ArquivosOficiaisPage() {
  const router = useRouter();
  const [auth, setAuth] = useState<boolean | null>(null);
  const [arquivos, setArquivos] = useState<ArquivoOficial[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [tabelaExiste, setTabelaExiste] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [editando, setEditando] = useState<ArquivoOficial | null>(null);
  const [mostrandoUpload, setMostrandoUpload] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("owner_auth") !== "1") { router.replace("/owner"); return; }
    setAuth(true);
    carregar();
  }, [router]);

  async function carregar() {
    setCarregando(true);
    const { data, error } = await createClient()
      .from("arquivos_oficiais")
      .select("*")
      .order("categoria", { ascending: true })
      .order("nome", { ascending: true });
    if (error) {
      if (error.message?.includes("arquivos_oficiais") || error.code === "PGRST205") {
        setTabelaExiste(false);
      }
    } else {
      setArquivos((data as ArquivoOficial[]) || []);
    }
    setCarregando(false);
  }

  async function apagar(arq: ArquivoOficial) {
    if (!window.confirm(`Apagar "${arq.nome}"? O arquivo será removido permanentemente.`)) return;
    await createClient().from("arquivos_oficiais").delete().eq("id", arq.id);
    setArquivos(prev => prev.filter(a => a.id !== arq.id));
  }

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return arquivos.filter(a => {
      if (filtroCategoria && a.categoria !== filtroCategoria) return false;
      if (!q) return true;
      return (
        a.nome.toLowerCase().includes(q) ||
        (a.descricao || "").toLowerCase().includes(q) ||
        (a.categoria || "").toLowerCase().includes(q)
      );
    });
  }, [arquivos, busca, filtroCategoria]);

  const porCategoria = useMemo(() => {
    const map: Record<string, ArquivoOficial[]> = {};
    filtrados.forEach(a => {
      const c = a.categoria || "Outros";
      if (!map[c]) map[c] = [];
      map[c].push(a);
    });
    return Object.entries(map).sort(([a], [b]) => {
      const ia = CATEGORIAS.indexOf(a as typeof CATEGORIAS[number]);
      const ib = CATEGORIAS.indexOf(b as typeof CATEGORIAS[number]);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });
  }, [filtrados]);

  // Alertas de validade
  const expirando = arquivos.filter(a => {
    const d = diasParaExpirar(a.validade);
    return d !== null && d >= 0 && d <= 60;
  });
  const expirados = arquivos.filter(a => {
    const d = diasParaExpirar(a.validade);
    return d !== null && d < 0;
  });

  if (!auth) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-4 sticky top-0 z-10">
        <Link href="/owner" className="text-sm text-text-muted hover:text-primary transition-colors">← Voltar</Link>
        <span className="text-sm font-semibold text-text-main">Arquivos oficiais</span>
        <button
          onClick={() => setMostrandoUpload(true)}
          className="ml-auto bg-primary text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-primary-light transition"
        >
          ⬆ Subir arquivo
        </button>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-5">
        {!tabelaExiste ? (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
            <p className="text-sm font-semibold text-amber-800">⚠️ Setup pendente</p>
            <p className="text-xs text-amber-700 mt-1">
              Rode o SQL <code className="bg-amber-100 px-1 rounded">criar_tabela_arquivos_oficiais.sql</code> no Editor SQL do Supabase.
            </p>
          </div>
        ) : (
          <>
            {/* Alertas de validade */}
            {(expirados.length > 0 || expirando.length > 0) && (
              <div className="space-y-2">
                {expirados.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3">
                    <span className="text-2xl">🔴</span>
                    <div className="text-sm flex-1">
                      <strong className="text-red-700">{expirados.length} documento(s) vencido(s)</strong>
                      <p className="text-xs text-red-600 mt-0.5">{expirados.map(a => a.nome).join(", ")}</p>
                    </div>
                  </div>
                )}
                {expirando.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
                    <span className="text-2xl">⚠️</span>
                    <div className="text-sm flex-1">
                      <strong className="text-amber-800">{expirando.length} documento(s) vencem em até 60 dias</strong>
                      <p className="text-xs text-amber-700 mt-0.5">
                        {expirando.map(a => `${a.nome} (${diasParaExpirar(a.validade)} dias)`).join(", ")}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Stats + busca */}
            <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={busca}
                  onChange={e => setBusca(e.target.value)}
                  placeholder="Buscar por nome, descrição..."
                  className="input text-sm flex-1"
                />
                <select
                  value={filtroCategoria}
                  onChange={e => setFiltroCategoria(e.target.value)}
                  className="input text-sm sm:w-48"
                >
                  <option value="">Todas as categorias</option>
                  {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <p className="text-xs text-text-muted">
                {filtrados.length} de {arquivos.length} arquivos
              </p>
            </div>

            {/* Listagem */}
            {carregando ? (
              <p className="text-center text-text-muted py-12">Carregando...</p>
            ) : arquivos.length === 0 ? (
              <div className="bg-white rounded-2xl p-10 shadow-sm text-center">
                <span className="text-4xl">📁</span>
                <p className="text-sm text-text-muted mt-3">Nenhum arquivo oficial cadastrado ainda.</p>
                <button onClick={() => setMostrandoUpload(true)} className="text-sm text-primary font-medium mt-2 hover:underline">
                  Subir o primeiro →
                </button>
              </div>
            ) : porCategoria.length === 0 ? (
              <div className="bg-white rounded-2xl p-10 shadow-sm text-center">
                <p className="text-sm text-text-muted">Nenhum arquivo encontrado pra essa busca.</p>
              </div>
            ) : (
              porCategoria.map(([cat, lista]) => (
                <div key={cat} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  <div className="px-6 py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
                    <span className="text-lg">{ICONES_CATEGORIA[cat] || "📁"}</span>
                    <h2 className="font-semibold text-text-main text-sm">{cat}</h2>
                    <span className="text-xs text-text-muted ml-auto">{lista.length} arquivo{lista.length !== 1 ? "s" : ""}</span>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {lista.map(a => {
                      const dias = diasParaExpirar(a.validade);
                      const expSoon = dias !== null && dias >= 0 && dias <= 60;
                      const expirado = dias !== null && dias < 0;
                      return (
                        <div key={a.id} className="px-6 py-3 flex items-center gap-3 hover:bg-gray-50">
                          <span className="text-2xl shrink-0">{iconePorTipo(a.tipo_mime, a.arquivo_nome_original)}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-text-main truncate">{a.nome}</p>
                            {a.descricao && <p className="text-xs text-text-muted truncate">{a.descricao}</p>}
                            <p className="text-[11px] text-text-muted">
                              {fmtTamanho(a.tamanho_bytes)} · {dataFmt(a.criado_em.slice(0, 10))}
                              {a.validade && (
                                <span className={`ml-2 ${expirado ? "text-red-600 font-semibold" : expSoon ? "text-amber-700 font-medium" : "text-green-700"}`}>
                                  {expirado ? `🔴 Vencido em ${dataFmt(a.validade)}` : expSoon ? `⚠ Vence em ${dataFmt(a.validade)}` : `✓ Válido até ${dataFmt(a.validade)}`}
                                </span>
                              )}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <a
                              href={a.arquivo_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-text-muted hover:text-primary hover:bg-primary/10 px-2 py-1 rounded-lg transition-colors"
                              title="Abrir arquivo"
                            >
                              👁
                            </a>
                            <button
                              onClick={() => setEditando(a)}
                              className="text-text-muted hover:text-primary hover:bg-primary/10 px-2 py-1 rounded-lg transition-colors"
                              title="Editar metadados"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => apagar(a)}
                              className="text-red-400 hover:text-red-600 hover:bg-red-50 px-2 py-1 rounded-lg transition-colors"
                              title="Apagar"
                            >
                              🗑
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </>
        )}
      </main>

      {(mostrandoUpload || editando) && (
        <FormArquivoModal
          arquivo={editando}
          onClose={() => { setMostrandoUpload(false); setEditando(null); }}
          onSalvo={() => { setMostrandoUpload(false); setEditando(null); carregar(); }}
        />
      )}
    </div>
  );
}

// ─── Modal de upload/edição ──────────────────────────────────────────────────

function FormArquivoModal({
  arquivo,
  onClose,
  onSalvo,
}: {
  arquivo: ArquivoOficial | null;
  onClose: () => void;
  onSalvo: () => void;
}) {
  const editando = !!arquivo;
  const [nome, setNome] = useState(arquivo?.nome || "");
  const [categoria, setCategoria] = useState(arquivo?.categoria || CATEGORIAS[0]);
  const [descricao, setDescricao] = useState(arquivo?.descricao || "");
  const [validade, setValidade] = useState(arquivo?.validade || "");
  const [novoArquivo, setNovoArquivo] = useState<File | null>(null);
  const [salvando, setSalvando] = useState(false);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setNovoArquivo(f);
    // Auto-preenche o nome com base no nome do arquivo (sem extensão)
    if (!nome) {
      const baseName = f.name.replace(/\.[^.]+$/, "").replace(/[_-]/g, " ");
      setNome(baseName);
    }
  }

  async function salvar() {
    if (!nome.trim()) { alert("Informe um nome pro arquivo."); return; }
    if (!editando && !novoArquivo) { alert("Selecione um arquivo."); return; }

    setSalvando(true);
    const sb = createClient();

    let arquivoUrl = arquivo?.arquivo_url || "";
    let nomeOriginal = arquivo?.arquivo_nome_original || null;
    let tamanho = arquivo?.tamanho_bytes || null;
    let mime = arquivo?.tipo_mime || null;

    if (novoArquivo) {
      const fd = new FormData();
      fd.append("file", novoArquivo);
      fd.append("prefix", "oficiais");
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) {
        const { error: msg } = await res.json().catch(() => ({ error: "erro" }));
        alert("Erro ao enviar: " + msg);
        setSalvando(false);
        return;
      }
      const { url } = await res.json();
      arquivoUrl = url;
      nomeOriginal = novoArquivo.name;
      tamanho = novoArquivo.size;
      mime = novoArquivo.type;
    }

    const payload = {
      nome: nome.trim(),
      categoria,
      descricao: descricao.trim() || null,
      validade: validade || null,
      arquivo_url: arquivoUrl,
      arquivo_nome_original: nomeOriginal,
      tamanho_bytes: tamanho,
      tipo_mime: mime,
      atualizado_em: new Date().toISOString(),
    };

    if (editando) {
      const { error } = await sb.from("arquivos_oficiais").update(payload).eq("id", arquivo!.id);
      if (error) { alert("Erro: " + error.message); setSalvando(false); return; }
    } else {
      const { error } = await sb.from("arquivos_oficiais").insert(payload);
      if (error) { alert("Erro: " + error.message); setSalvando(false); return; }
    }

    onSalvo();
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <h2 className="font-playfair text-lg font-bold text-text-main">
            {editando ? "Editar arquivo" : "Subir arquivo"}
          </h2>
          <button onClick={onClose} className="text-text-muted hover:text-red-500 text-xl leading-none px-2">×</button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5">
              Arquivo {editando && <span className="text-gray-400 font-normal">(opcional — só se quiser substituir)</span>}
            </label>
            {editando && arquivo?.arquivo_url && (
              <a href={arquivo.arquivo_url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1 mb-2 rounded-lg bg-primary/10 text-primary text-[11px] font-medium hover:bg-primary/20">
                📄 Ver arquivo atual ({arquivo.arquivo_nome_original || "arquivo"})
              </a>
            )}
            <input
              type="file"
              accept="application/pdf,image/*,.doc,.docx,.xls,.xlsx"
              onChange={handleFile}
              className="block w-full text-sm text-text-muted file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
            />
            {novoArquivo && (
              <p className="text-xs text-green-700 mt-1">📎 {novoArquivo.name} ({fmtTamanho(novoArquivo.size)})</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5">Nome *</label>
            <input
              type="text"
              value={nome}
              onChange={e => setNome(e.target.value)}
              placeholder="Ex: Cartão CNPJ, Contrato Social 2024"
              className="input text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5">Categoria *</label>
            <select value={categoria} onChange={e => setCategoria(e.target.value)} className="input text-sm">
              {CATEGORIAS.map(c => <option key={c} value={c}>{ICONES_CATEGORIA[c]} {c}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5">
              Validade <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <input
              type="date"
              value={validade}
              onChange={e => setValidade(e.target.value)}
              className="input text-sm"
            />
            <p className="text-[11px] text-text-muted mt-1">
              Se o documento expira (certidões, alvarás), preencha pra receber alertas com 60 dias de antecedência.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5">
              Descrição <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <textarea
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
              rows={2}
              placeholder="Observações sobre o documento..."
              className="input text-sm resize-none"
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-2 sticky bottom-0 bg-white">
          <button onClick={onClose} disabled={salvando} className="text-sm text-text-muted hover:text-text-main px-4 py-2">
            Cancelar
          </button>
          <button
            onClick={salvar}
            disabled={salvando || !nome.trim() || (!editando && !novoArquivo)}
            className="bg-primary text-white text-sm font-semibold px-5 py-2 rounded-xl hover:bg-primary-light transition disabled:opacity-50"
          >
            {salvando ? "Salvando..." : editando ? "Atualizar" : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}
