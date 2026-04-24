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

  useEffect(() => {
    createClient()
      .from("exames")
      .select("id, data_exame, tipo, clinica, forma_pagamento, valor, valor_bruto, nome_paciente, pets(nome)")
      .order("data_exame", { ascending: false })
      .then(({ data }) => { setExames((data as Exame[]) || []); setCarregando(false); });
  }, []);

  const filtrados = useMemo(() =>
    exames.filter(e => {
      const d = new Date(e.data_exame + "T12:00:00");
      if (modo === "mensal") {
        return d.getMonth() + 1 === mesSel && d.getFullYear() === anoSel;
      }
      return e.data_exame >= dataInicio && e.data_exame <= dataFim;
    }), [exames, modo, mesSel, anoSel, dataInicio, dataFim]);

  const totalBruto = filtrados.reduce((s, e) => s + (e.valor_bruto ?? e.valor ?? 0), 0);
  const totalLiquido = filtrados.reduce((s, e) => s + (e.valor ?? 0), 0);
  const totalVetBase = filtrados.reduce((s, e) => s + ((e.valor_bruto ?? 0) * 0.30), 0);
  const totalVet = filtrados.reduce((s, e) => s + ((e.valor_bruto ?? 0) * 0.42), 0);
  const ticketMedio = filtrados.length > 0 ? totalLiquido / filtrados.length : 0;

  const refMes = modo === "mensal" ? mesSel : new Date(dataFim + "T12:00:00").getMonth() + 1;
  const refAno = modo === "mensal" ? anoSel : new Date(dataFim + "T12:00:00").getFullYear();

  const ultimos6 = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(refAno, refMes - 1 - (5 - i), 1);
      const m = d.getMonth() + 1;
      const a = d.getFullYear();
      const total = exames
        .filter(e => { const ed = new Date(e.data_exame + "T12:00:00"); return ed.getMonth() + 1 === m && ed.getFullYear() === a; })
        .reduce((s, e) => s + (e.valor ?? 0), 0);
      const ativo = modo === "mensal" ? (m === mesSel && a === anoSel) : (m === refMes && a === refAno);
      return { label: MESES[m - 1].slice(0, 3), total, ativo };
    });
  }, [exames, modo, mesSel, anoSel, refMes, refAno]);

  const maxBar = Math.max(...ultimos6.map(m => m.total), 1);

  const rankingClinicas = useMemo(() => {
    const map: Record<string, { total: number; count: number }> = {};
    filtrados.forEach(e => {
      const c = e.clinica || "Sem clínica";
      if (!map[c]) map[c] = { total: 0, count: 0 };
      map[c].total += e.valor ?? 0;
      map[c].count += 1;
    });
    return Object.entries(map).sort((a, b) => b[1].total - a[1].total);
  }, [filtrados]);

  const rankingServicos = useMemo(() => {
    const map: Record<string, { total: number; count: number }> = {};
    filtrados.forEach(e => {
      const t = e.tipo || "Outro";
      if (!map[t]) map[t] = { total: 0, count: 0 };
      map[t].total += e.valor ?? 0;
      map[t].count += 1;
    });
    return Object.entries(map).sort((a, b) => b[1].total - a[1].total);
  }, [filtrados]);

  const anos = useMemo(() => {
    const set = new Set(exames.map(e => new Date(e.data_exame + "T12:00:00").getFullYear()));
    set.add(hoje.getFullYear());
    return [...set].sort((a, b) => b - a);
  }, [exames]);

  const labelPeriodo = modo === "mensal"
    ? `${MESES[mesSel - 1]} ${anoSel}`
    : `${dataFmt(dataInicio)} a ${dataFmt(dataFim)}`;

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <Image src="/Logomarca/imapet_transparent.png" alt="IMAPET" width={100} height={50} className="brightness-0" />
        <span className="text-sm text-text-muted font-medium">Financeiro</span>
        <Link href="/admin" className="text-sm text-primary font-medium hover:underline">← Novo exame</Link>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-10">
        {/* Título */}
        <div className="mb-6">
          <h1 className="font-playfair text-3xl font-bold text-text-main">Dashboard financeiro</h1>
          <p className="text-text-muted text-sm mt-1">Resumo de faturamento por período</p>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-2xl p-4 shadow-sm mb-8 flex flex-col sm:flex-row sm:items-center gap-4">
          {/* Toggle */}
          <div className="flex rounded-xl overflow-hidden border border-gray-200 shrink-0">
            <button
              onClick={() => setModo("mensal")}
              className={`px-4 py-2 text-sm font-medium transition-colors ${modo === "mensal" ? "bg-primary text-white" : "bg-white text-text-muted hover:bg-gray-50"}`}
            >
              Mensal
            </button>
            <button
              onClick={() => setModo("periodo")}
              className={`px-4 py-2 text-sm font-medium transition-colors ${modo === "periodo" ? "bg-primary text-white" : "bg-white text-text-muted hover:bg-gray-50"}`}
            >
              Por período
            </button>
          </div>

          {/* Controles conforme modo */}
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
              <input
                type="date"
                value={dataInicio}
                onChange={e => setDataInicio(e.target.value)}
                className="input text-sm py-2"
              />
              <span className="text-sm text-text-muted">até</span>
              <input
                type="date"
                value={dataFim}
                onChange={e => setDataFim(e.target.value)}
                className="input text-sm py-2"
              />
            </div>
          )}
        </div>

        {carregando ? (
          <p className="text-center text-text-muted py-20">Carregando...</p>
        ) : (
          <>
            {/* Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              <Card label="Exames realizados" valor={String(filtrados.length)} sub={labelPeriodo} />
              <Card label="Faturamento bruto" valor={moeda(totalBruto)} sub="valor cobrado" />
              <Card label="Faturamento líquido" valor={moeda(totalLiquido)} sub="caixa empresa" />
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              <Card label="Vet. base (30%)" valor={moeda(totalVetBase)} sub="sem adicional" />
              <Card label="Vet. com adicional (42%)" valor={moeda(totalVet)} sub="30% + 20% extra" />
              <Card label="Ticket médio" valor={moeda(ticketMedio)} sub="por exame" />
            </div>

            {/* Gráfico de barras */}
            <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
              <h2 className="font-semibold text-text-main mb-5">Faturamento líquido — últimos 6 meses</h2>
              <div className="flex items-end gap-2 h-36">
                {ultimos6.map((m, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                    {m.total > 0 && (
                      <span className="text-[10px] text-text-muted text-center leading-tight">
                        {moeda(m.total).replace("R$ ", "R$")}
                      </span>
                    )}
                    <div
                      className="w-full rounded-t-lg transition-all duration-500"
                      style={{
                        height: `${Math.max((m.total / maxBar) * 100, m.total > 0 ? 6 : 0)}%`,
                        backgroundColor: m.ativo ? "#8B1A1A" : "#e5e7eb",
                      }}
                    />
                    <span className={`text-xs font-medium ${m.ativo ? "text-primary" : "text-text-muted"}`}>{m.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Ranking clínicas + serviços */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h2 className="font-semibold text-text-main mb-4">Por clínica</h2>
                {rankingClinicas.length === 0 ? (
                  <p className="text-sm text-text-muted">Nenhum exame neste período.</p>
                ) : (
                  <div className="space-y-4">
                    {rankingClinicas.map(([nome, d]) => (
                      <div key={nome}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-text-main truncate max-w-[160px]">{nome}</span>
                          <span className="text-sm text-primary font-semibold">{moeda(d.total)}</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                          <div className="bg-primary h-1.5 rounded-full" style={{ width: `${(d.total / rankingClinicas[0][1].total) * 100}%` }} />
                        </div>
                        <span className="text-[11px] text-text-muted">{d.count} exame{d.count > 1 ? "s" : ""}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h2 className="font-semibold text-text-main mb-4">Por serviço</h2>
                {rankingServicos.length === 0 ? (
                  <p className="text-sm text-text-muted">Nenhum exame neste período.</p>
                ) : (
                  <div className="space-y-4">
                    {rankingServicos.map(([tipo, d]) => (
                      <div key={tipo}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-text-main">{tipo}</span>
                          <span className="text-sm text-primary font-semibold">{moeda(d.total)}</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                          <div className="bg-primary h-1.5 rounded-full" style={{ width: `${(d.total / rankingServicos[0][1].total) * 100}%` }} />
                        </div>
                        <span className="text-[11px] text-text-muted">{d.count} exame{d.count > 1 ? "s" : ""}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Tabela */}
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
                        <th className="text-left px-3 py-3 whitespace-nowrap">Data</th>
                        <th className="text-left px-3 py-3">Paciente</th>
                        <th className="text-left px-3 py-3">Clínica</th>
                        <th className="text-left px-3 py-3">Serviço</th>
                        <th className="text-left px-3 py-3">Pgto.</th>
                        <th className="text-right px-3 py-3">Bruto</th>
                        <th className="text-right px-3 py-3">Vet. 30%</th>
                        <th className="text-right px-3 py-3">Vet. 42%</th>
                        <th className="text-right px-3 py-3">Líquido</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filtrados.map(e => (
                        <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-3 py-2.5 text-text-muted whitespace-nowrap">{dataFmt(e.data_exame)}</td>
                          <td className="px-3 py-2.5 font-medium text-text-main">{e.nome_paciente || e.pets?.nome || "—"}</td>
                          <td className="px-3 py-2.5 text-text-muted">{e.clinica || "—"}</td>
                          <td className="px-3 py-2.5 text-text-muted">{e.tipo || "—"}</td>
                          <td className="px-3 py-2.5 text-text-muted">{e.forma_pagamento || "—"}</td>
                          <td className="px-3 py-2.5 text-right text-text-muted">{e.valor_bruto ? moeda(e.valor_bruto) : "—"}</td>
                          <td className="px-3 py-2.5 text-right text-text-muted">{e.valor_bruto ? moeda(e.valor_bruto * 0.30) : "—"}</td>
                          <td className="px-3 py-2.5 text-right text-text-muted">{e.valor_bruto ? moeda(e.valor_bruto * 0.42) : "—"}</td>
                          <td className="px-3 py-2.5 text-right font-semibold text-primary">{e.valor ? moeda(e.valor) : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function Card({ label, valor, sub }: { label: string; valor: string; sub: string }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm">
      <p className="text-xs font-medium text-text-muted mb-1">{label}</p>
      <p className="font-playfair text-2xl font-bold text-text-main leading-tight">{valor}</p>
      <p className="text-[11px] text-text-muted mt-1">{sub}</p>
    </div>
  );
}
