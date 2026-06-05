"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { moeda, dataFmt } from "@/lib/utils";
import EmitirNotaModal from "@/components/shared/EmitirNotaModal";

type NotaFiscal = {
  id: string;
  exame_id: string | null;
  numero_nfse: string | null;
  ambiente: string;
  status: string;
  erro: string | null;
  tomador_nome: string;
  tomador_documento: string | null;
  tomador_tipo_doc: string | null;
  descricao: string;
  valor_servico: number;
  nfse_pdf_url: string | null;
  emitida_em: string | null;
  criado_em: string;
};

const STATUS_LABELS: Record<string, { texto: string; cor: string }> = {
  rascunho: { texto: "Rascunho", cor: "bg-gray-100 text-gray-600" },
  enviada: { texto: "Enviada", cor: "bg-blue-100 text-blue-700" },
  autorizada: { texto: "Autorizada", cor: "bg-green-100 text-green-700" },
  rejeitada: { texto: "Rejeitada", cor: "bg-red-100 text-red-700" },
  cancelada: { texto: "Cancelada", cor: "bg-amber-100 text-amber-800" },
};

export default function NotasPage() {
  const router = useRouter();
  const [auth, setAuth] = useState<boolean | null>(null);
  const [notas, setNotas] = useState<NotaFiscal[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [tabelaExiste, setTabelaExiste] = useState(true);
  const [emitindo, setEmitindo] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("owner_auth") !== "1") {
      router.replace("/owner");
      return;
    }
    setAuth(true);
    carregar();
  }, [router]);

  async function carregar() {
    setCarregando(true);
    const { data, error } = await createClient()
      .from("notas_fiscais")
      .select("*")
      .order("criado_em", { ascending: false })
      .limit(200);
    if (error) {
      // Tabela ainda não existe (migração pendente)
      if (error.message?.includes("notas_fiscais") || error.code === "PGRST205") {
        setTabelaExiste(false);
      }
    } else {
      setNotas((data as NotaFiscal[]) || []);
    }
    setCarregando(false);
  }

  if (!auth) return null;

  const total = notas.reduce((s, n) => s + n.valor_servico, 0);

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-4 sticky top-0 z-10">
        <Link href="/owner" className="text-sm text-text-muted hover:text-primary transition-colors">← Voltar</Link>
        <span className="text-sm font-semibold text-text-main">Notas fiscais</span>
        <button
          onClick={() => setEmitindo(true)}
          className="ml-auto bg-primary text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-primary-light transition"
        >
          🧾 Emitir nova
        </button>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-5">
        {!tabelaExiste ? (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
            <p className="text-sm font-semibold text-amber-800">⚠️ Setup pendente</p>
            <p className="text-xs text-amber-700 mt-1">
              A tabela <code className="bg-amber-100 px-1 rounded">notas_fiscais</code> ainda não foi criada no banco.
              Rode o arquivo <code className="bg-amber-100 px-1 rounded">criar_tabela_notas_fiscais.sql</code> no SQL Editor do Supabase.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Total emitidas</p>
                <p className="font-playfair text-xl font-bold text-text-main mt-1">{notas.length}</p>
              </div>
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Autorizadas</p>
                <p className="font-playfair text-xl font-bold text-green-700 mt-1">
                  {notas.filter((n) => n.status === "autorizada").length}
                </p>
              </div>
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Rejeitadas</p>
                <p className="font-playfair text-xl font-bold text-red-600 mt-1">
                  {notas.filter((n) => n.status === "rejeitada").length}
                </p>
              </div>
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Valor total</p>
                <p className="font-playfair text-xl font-bold text-text-main mt-1">{moeda(total)}</p>
              </div>
            </div>

            {carregando ? (
              <p className="text-center text-text-muted py-12">Carregando...</p>
            ) : notas.length === 0 ? (
              <div className="bg-white rounded-2xl p-10 shadow-sm text-center">
                <span className="text-4xl">🧾</span>
                <p className="text-sm text-text-muted mt-3">Nenhuma nota emitida ainda.</p>
                <button onClick={() => setEmitindo(true)} className="text-sm text-primary font-medium mt-2 hover:underline">
                  Emitir a primeira →
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-[10px] text-text-muted uppercase tracking-wider bg-gray-50 border-b border-gray-100">
                        <th className="text-left px-3 py-3 whitespace-nowrap">Data</th>
                        <th className="text-left px-3 py-3">Nº NFS-e</th>
                        <th className="text-left px-3 py-3">Tomador</th>
                        <th className="text-left px-3 py-3">Descrição</th>
                        <th className="text-right px-3 py-3">Valor</th>
                        <th className="text-left px-3 py-3">Status</th>
                        <th className="px-3 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {notas.map((n) => {
                        const status = STATUS_LABELS[n.status] || STATUS_LABELS.rascunho;
                        return (
                          <tr key={n.id} className="hover:bg-gray-50">
                            <td className="px-3 py-2 text-text-muted whitespace-nowrap">
                              {n.emitida_em ? dataFmt(n.emitida_em.slice(0, 10)) : dataFmt(n.criado_em.slice(0, 10))}
                            </td>
                            <td className="px-3 py-2 font-mono text-text-main">{n.numero_nfse || "—"}</td>
                            <td className="px-3 py-2 text-text-main">{n.tomador_nome}</td>
                            <td className="px-3 py-2 text-text-muted max-w-[240px] truncate">{n.descricao}</td>
                            <td className="px-3 py-2 text-right font-semibold text-text-main">{moeda(n.valor_servico)}</td>
                            <td className="px-3 py-2">
                              <span className={`text-[10px] font-semibold px-2 py-1 rounded-md ${status.cor}`}>
                                {status.texto}
                              </span>
                              {n.ambiente === "homologacao" && (
                                <span className="text-[10px] text-amber-600 ml-1">homol</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-right">
                              {n.nfse_pdf_url && (
                                <a
                                  href={n.nfse_pdf_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center px-2 py-1 rounded-lg bg-primary/10 text-primary text-[11px] font-medium hover:bg-primary/20"
                                  title="Baixar DANFSe"
                                >
                                  📄
                                </a>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {emitindo && <EmitirNotaModal onClose={() => setEmitindo(false)} onEmitida={carregar} />}
    </div>
  );
}
