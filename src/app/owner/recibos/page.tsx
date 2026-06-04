"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { moeda, dataFmt } from "@/lib/utils";
import ReciboPreview from "@/components/shared/ReciboPreview";

type Recibo = {
  id: string;
  numero: number;
  numero_no_mes: number | null;
  nome_pagador: string;
  documento: string | null;
  tipo_documento: string | null;
  valor: number;
  referente: string;
  data_recibo: string;
  origem: string | null;
  criado_em: string;
};

function formatarNumeroRecibo(r: Pick<Recibo, "numero" | "numero_no_mes" | "data_recibo">): string {
  const [ano, mes] = r.data_recibo.split("-");
  if (r.numero_no_mes !== null && r.numero_no_mes !== undefined) {
    return `${mes}/${String(r.numero_no_mes).padStart(4, "0")}/${ano}`;
  }
  // Fallback pra recibos antigos sem numero_no_mes
  return `${String(r.numero).padStart(4, "0")}/${ano}`;
}

export default function RecibosHistoricoPage() {
  const router = useRouter();
  const [auth, setAuth] = useState<boolean | null>(null);
  const [recibos, setRecibos] = useState<Recibo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [tabelaExiste, setTabelaExiste] = useState(true);
  const [busca, setBusca] = useState("");
  const [verRecibo, setVerRecibo] = useState<Recibo | null>(null);

  useEffect(() => {
    if (localStorage.getItem("owner_auth") !== "1") { router.replace("/owner"); return; }
    setAuth(true);
    carregar();
  }, [router]);

  async function carregar() {
    setCarregando(true);
    const { data, error } = await createClient()
      .from("recibos")
      .select("*")
      .order("numero", { ascending: false })
      .limit(500);
    if (error) {
      if (error.message?.includes("recibos") || error.code === "PGRST205") {
        setTabelaExiste(false);
      }
    } else {
      setRecibos((data as Recibo[]) || []);
    }
    setCarregando(false);
  }

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return recibos;
    return recibos.filter(r =>
      r.nome_pagador.toLowerCase().includes(q) ||
      (r.documento || "").toLowerCase().includes(q) ||
      r.referente.toLowerCase().includes(q) ||
      String(r.numero).includes(q) ||
      dataFmt(r.data_recibo).includes(q)
    );
  }, [recibos, busca]);

  const total = filtrados.reduce((s, r) => s + r.valor, 0);

  if (!auth) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-4 sticky top-0 z-10 print:hidden">
        <Link href="/owner" className="text-sm text-text-muted hover:text-primary transition-colors">← Voltar</Link>
        <span className="text-sm font-semibold text-text-main">Histórico de recibos</span>
        <Link href="/owner/recibo" className="ml-auto bg-primary text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-primary-light transition">
          🧾 Novo recibo
        </Link>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-5">
        {!tabelaExiste ? (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
            <p className="text-sm font-semibold text-amber-800">⚠️ Setup pendente</p>
            <p className="text-xs text-amber-700 mt-1">
              Rode o SQL <code className="bg-amber-100 px-1 rounded">criar_tabela_recibos.sql</code> no Editor SQL do Supabase.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Total emitidos</p>
                <p className="font-playfair text-xl font-bold text-text-main mt-1">{recibos.length}</p>
              </div>
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Filtrados</p>
                <p className="font-playfair text-xl font-bold text-text-main mt-1">{filtrados.length}</p>
              </div>
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Soma do filtro</p>
                <p className="font-playfair text-xl font-bold text-primary mt-1">{moeda(total)}</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-3 shadow-sm">
              <input
                type="text"
                value={busca}
                onChange={e => setBusca(e.target.value)}
                placeholder="Buscar por número, nome, documento, descrição ou data..."
                className="input text-sm w-full"
              />
            </div>

            {carregando ? (
              <p className="text-center text-text-muted py-12">Carregando...</p>
            ) : filtrados.length === 0 ? (
              <div className="bg-white rounded-2xl p-10 shadow-sm text-center">
                <span className="text-4xl">🧾</span>
                <p className="text-sm text-text-muted mt-3">
                  {busca ? "Nenhum recibo encontrado." : "Nenhum recibo emitido ainda."}
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-[10px] text-text-muted uppercase tracking-wider bg-gray-50 border-b border-gray-100">
                        <th className="text-left px-3 py-3 whitespace-nowrap">Nº</th>
                        <th className="text-left px-3 py-3 whitespace-nowrap">Data</th>
                        <th className="text-left px-3 py-3">Pagador</th>
                        <th className="text-left px-3 py-3">CPF/CNPJ</th>
                        <th className="text-left px-3 py-3">Descrição</th>
                        <th className="text-right px-3 py-3">Valor</th>
                        <th className="text-center px-3 py-3">Origem</th>
                        <th className="px-3 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filtrados.map(r => (
                        <tr key={r.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 font-mono text-text-main font-semibold whitespace-nowrap">
                            {formatarNumeroRecibo(r)}
                          </td>
                          <td className="px-3 py-2 text-text-muted whitespace-nowrap">{dataFmt(r.data_recibo)}</td>
                          <td className="px-3 py-2 font-medium text-text-main">{r.nome_pagador}</td>
                          <td className="px-3 py-2 text-text-muted whitespace-nowrap">{r.documento || "—"}</td>
                          <td className="px-3 py-2 text-text-muted max-w-[200px] truncate">{r.referente}</td>
                          <td className="px-3 py-2 text-right font-semibold text-text-main">{moeda(r.valor)}</td>
                          <td className="px-3 py-2 text-center">
                            <span className={`text-[10px] font-semibold px-2 py-1 rounded-md ${r.origem === "admin" ? "bg-blue-100 text-blue-700" : "bg-primary/10 text-primary"}`}>
                              {r.origem === "admin" ? "Vet" : "Owner"}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right">
                            <button
                              onClick={() => setVerRecibo(r)}
                              className="text-text-muted hover:text-primary hover:bg-primary/10 px-2 py-1 rounded-lg transition-colors text-sm"
                              title="Ver e imprimir novamente"
                            >
                              👁
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {verRecibo && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto print:p-0 print:bg-white" onClick={() => setVerRecibo(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl my-8 print:my-0 print:shadow-none print:max-w-full" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white rounded-t-2xl print:hidden">
              <h2 className="font-semibold text-text-main">Recibo Nº {formatarNumeroRecibo(verRecibo)}</h2>
              <div className="flex items-center gap-2">
                <button onClick={() => window.print()}
                  className="bg-primary text-white text-xs font-semibold px-4 py-2 rounded-lg hover:bg-primary-light transition">
                  Imprimir / PDF
                </button>
                <button onClick={() => setVerRecibo(null)}
                  className="text-text-muted hover:text-red-500 text-xl leading-none px-2">×</button>
              </div>
            </div>
            <div className="p-4 print:p-0">
              <ReciboPreview
                nomePagador={verRecibo.nome_pagador}
                documento={verRecibo.documento || ""}
                valor={String(verRecibo.valor)}
                referente={verRecibo.referente}
                data={verRecibo.data_recibo}
                numero={formatarNumeroRecibo(verRecibo)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
