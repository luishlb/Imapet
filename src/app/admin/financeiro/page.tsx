"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Exame = {
  id: string;
  data_exame: string;
  tipo: string;
  clinica: string;
  forma_pagamento: string;
  valor: number | null;
  valor_bruto: number | null;
  nome_paciente: string | null;
  pets: { nome: string } | null;
};

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

function moeda(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function dataFmt(d: string) {
  const [a, m, dia] = d.split("-");
  return `${dia}/${m}/${a}`;
}

async function fetchTodos(): Promise<Exame[]> {
  const supabase = createClient();
  const PAGE = 1000;
  let todos: Exame[] = [];
  let from = 0;
  while (true) {
    const { data } = await supabase
      .from("exames")
      .select("id, data_exame, tipo, clinica, forma_pagamento, valor, valor_bruto, nome_paciente, pets(nome)")
      .order("data_exame", { ascending: false })
      .order("id", { ascending: false })
      .range(from, from + PAGE - 1);
    if (!data || data.length === 0) break;
    todos = todos.concat(data as Exame[]);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  const seen = new Set<string>();
  return todos.filter(e => { if (seen.has(e.id)) return false; seen.add(e.id); return true; });
}

export default function FinanceiroPage() {
  const [exames, setExames] = useState<Exame[]>([]);
  const [carregando, setCarregando] = useState(true);

  const hoje = new Date();
  const [modo, setModo] = useState<"mensal" | "periodo">("mensal");
  const [mesSel, setMesSel] = useState(hoje.getMonth() + 1);
  const [anoSel, setAnoSel] = useState(hoje.getFullYear());

  const primeiroDiaMes = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-01`;
  const [dataInicio, setDataInicio] = useState(primeiroDiaMes);
  const [dataFim, setDataFim] = useState(hoje.toISOString().split("T")[0]);
  const [dataInicioAplicada, setDataInicioAplicada] = useState(primeiroDiaMes);
  const [dataFimAplicada, setDataFimAplicada] = useState(hoje.toISOString().split("T")[0]);

  useEffect(() => { fetchTodos().then(d => { setExames(d); setCarregando(false); }); }, []);

  const filtrados = useMemo(() =>
    exames.filter(e => {
      const d = new Date(e.data_exame + "T12:00:00");
      if (modo === "mensal") return d.getMonth() + 1 === mesSel && d.getFullYear() === anoSel;
      return e.data_exame >= dataInicioAplicada && e.data_exame <= dataFimAplicada;
    }), [exames, modo, mesSel, anoSel, dataInicioAplicada, dataFimAplicada]);

  const anos = useMemo(() => {
    const set = new Set(exames.map(e => new Date(e.data_exame + "T12:00:00").getFullYear()));
    set.add(hoje.getFullYear());
    return [...set].sort((a, b) => b - a);
  }, [exames]);

  const labelPeriodo = modo === "mensal"
    ? `${MESES[mesSel - 1]} ${anoSel}`
    : `${dataFmt(dataInicioAplicada)} a ${dataFmt(dataFimAplicada)}`;

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <Image src="/Logomarca/imapet_transparent.png" alt="IMAPET" width={100} height={50} className="brightness-0" />
        <span className="text-sm text-text-muted font-medium">Financeiro — Tabela</span>
        <div className="flex items-center gap-4">
          <Link href="/admin/financeiro/dashboard" className="text-sm text-primary font-medium hover:underline">Dashboard →</Link>
          <Link href="/admin" className="text-sm text-text-muted hover:underline">← Novo exame</Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-10">
        <div className="mb-6">
          <h1 className="font-playfair text-3xl font-bold text-text-main">Tabela de exames</h1>
          <p className="text-text-muted text-sm mt-1">Dados brutos por período</p>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-2xl p-4 shadow-sm mb-6 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex rounded-xl overflow-hidden border border-gray-200 shrink-0">
            <button onClick={() => setModo("mensal")} className={`px-4 py-2 text-sm font-medium transition-colors ${modo === "mensal" ? "bg-primary text-white" : "bg-white text-text-muted hover:bg-gray-50"}`}>Mensal</button>
            <button onClick={() => setModo("periodo")} className={`px-4 py-2 text-sm font-medium transition-colors ${modo === "periodo" ? "bg-primary text-white" : "bg-white text-text-muted hover:bg-gray-50"}`}>Por período</button>
          </div>
          {modo === "mensal" ? (
            <div className="flex items-center gap-2">
              <select value={mesSel} onChange={e => setMesSel(Number(e.target.value))} className="input text-sm py-2">
                {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
              <select value={anoSel} onChange={e => setAnoSel(Number(e.target.value))} className="input text-sm py-2">
                {anos.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-text-muted">De</span>
              <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="input text-sm py-2" />
              <span className="text-sm text-text-muted">até</span>
              <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="input text-sm py-2" />
              <button onClick={() => { setDataInicioAplicada(dataInicio); setDataFimAplicada(dataFim); }} className="bg-primary text-white text-sm font-semibold px-5 py-2 rounded-xl hover:bg-primary-light transition-colors">Aplicar</button>
            </div>
          )}
        </div>

        {carregando ? (
          <p className="text-center text-text-muted py-20">Carregando...</p>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-text-main">
                Exames — {labelPeriodo}
                <span className="ml-2 text-text-muted font-normal text-sm">({filtrados.length})</span>
              </h2>
            </div>
            {filtrados.length === 0 ? (
              <p className="text-sm text-text-muted px-6 py-8">Nenhum exame neste período.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-[10px] text-text-muted uppercase tracking-wider border-b border-gray-100 bg-gray-50">
                      <th className="text-left px-2 py-3 whitespace-nowrap">Data</th>
                      <th className="text-left px-2 py-3">Paciente</th>
                      <th className="text-left px-2 py-3">Clínica</th>
                      <th className="text-left px-2 py-3">Serviço</th>
                      <th className="text-left px-2 py-3">Pgto.</th>
                      <th className="text-right px-2 py-3">Bruto</th>
                      <th className="text-right px-2 py-3">Vet. 30%</th>
                      <th className="text-right px-2 py-3">Vet. 42%</th>
                      <th className="text-right px-2 py-3">Empresa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filtrados.map(e => (
                      <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-2 py-2 text-text-muted whitespace-nowrap">{dataFmt(e.data_exame)}</td>
                        <td className="px-2 py-2 font-medium text-text-main">{e.nome_paciente || e.pets?.nome || "—"}</td>
                        <td className="px-2 py-2 text-text-muted">{e.clinica || "—"}</td>
                        <td className="px-2 py-2 text-text-muted">{e.tipo || "—"}</td>
                        <td className="px-2 py-2 text-text-muted">{e.forma_pagamento || "—"}</td>
                        <td className="px-2 py-2 text-right text-text-muted">{e.valor_bruto ? moeda(e.valor_bruto) : "—"}</td>
                        <td className="px-2 py-2 text-right text-text-muted">{e.valor_bruto ? moeda(e.valor_bruto * 0.30) : "—"}</td>
                        <td className="px-2 py-2 text-right text-text-muted">{e.valor_bruto ? moeda(e.valor_bruto * 0.42) : "—"}</td>
                        <td className="px-2 py-2 text-right font-semibold text-primary">{e.valor ? moeda(e.valor) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
