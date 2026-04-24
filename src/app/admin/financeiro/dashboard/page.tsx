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
};

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

function moeda(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

async function fetchTodos(): Promise<Exame[]> {
  const supabase = createClient();
  const PAGE = 1000;
  let todos: Exame[] = [];
  let from = 0;
  while (true) {
    const { data } = await supabase
      .from("exames")
      .select("id, data_exame, tipo, clinica, forma_pagamento, valor, valor_bruto")
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

export default function DashboardPage() {
  const [exames, setExames] = useState<Exame[]>([]);
  const [carregando, setCarregando] = useState(true);

  const hoje = new Date();
  const primeiroDiaMes = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-01`;

  // Filtro principal
  const [modo, setModo] = useState<"mensal" | "periodo">("mensal");
  const [mesSel, setMesSel] = useState(hoje.getMonth() + 1);
  const [anoSel, setAnoSel] = useState(hoje.getFullYear());
  const [dataInicio, setDataInicio] = useState(primeiroDiaMes);
  const [dataFim, setDataFim] = useState(hoje.toISOString().split("T")[0]);
  const [dataInicioAplicada, setDataInicioAplicada] = useState(primeiroDiaMes);
  const [dataFimAplicada, setDataFimAplicada] = useState(hoje.toISOString().split("T")[0]);

  // Calculadora de veterinária (filtro independente)
  const [vetModo, setVetModo] = useState<"mensal" | "periodo">("mensal");
  const [vetMes, setVetMes] = useState(hoje.getMonth() + 1);
  const [vetAno, setVetAno] = useState(hoje.getFullYear());
  const [vetInicio, setVetInicio] = useState(primeiroDiaMes);
  const [vetFim, setVetFim] = useState(hoje.toISOString().split("T")[0]);
  const [vetInicioAplicado, setVetInicioAplicado] = useState(primeiroDiaMes);
  const [vetFimAplicado, setVetFimAplicado] = useState(hoje.toISOString().split("T")[0]);
  const [resultadoVet, setResultadoVet] = useState<{ bruto: number; v30: number; v42: number; count: number } | null>(null);

  useEffect(() => { fetchTodos().then(d => { setExames(d); setCarregando(false); }); }, []);

  const filtrados = useMemo(() =>
    exames.filter(e => {
      const d = new Date(e.data_exame + "T12:00:00");
      if (modo === "mensal") return d.getMonth() + 1 === mesSel && d.getFullYear() === anoSel;
      return e.data_exame >= dataInicioAplicada && e.data_exame <= dataFimAplicada;
    }), [exames, modo, mesSel, anoSel, dataInicioAplicada, dataFimAplicada]);

  const totalBruto = filtrados.reduce((s, e) => s + (e.valor_bruto ?? e.valor ?? 0), 0);
  const totalEmpresa = filtrados.reduce((s, e) => s + (e.valor ?? 0), 0);
  const totalVetBase = filtrados.reduce((s, e) => s + ((e.valor_bruto ?? 0) * 0.30), 0);
  const totalVet = filtrados.reduce((s, e) => s + ((e.valor_bruto ?? 0) * 0.42), 0);
  const ticketMedio = filtrados.length > 0 ? totalBruto / filtrados.length : 0;

  const refMes = modo === "mensal" ? mesSel : new Date(dataFimAplicada + "T12:00:00").getMonth() + 1;
  const refAno = modo === "mensal" ? anoSel : new Date(dataFimAplicada + "T12:00:00").getFullYear();

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
      map[c].total += e.valor_bruto ?? e.valor ?? 0;
      map[c].count += 1;
    });
    return Object.entries(map).sort((a, b) => b[1].total - a[1].total);
  }, [filtrados]);

  const rankingServicos = useMemo(() => {
    const map: Record<string, { total: number; count: number }> = {};
    filtrados.forEach(e => {
      const t = e.tipo || "Outro";
      if (!map[t]) map[t] = { total: 0, count: 0 };
      map[t].total += e.valor_bruto ?? e.valor ?? 0;
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
    : `${dataInicioAplicada.split("-").reverse().join("/")} a ${dataFimAplicada.split("-").reverse().join("/")}`;

  function calcularVet() {
    const examesVet = exames.filter(e => {
      if (vetModo === "mensal") {
        const d = new Date(e.data_exame + "T12:00:00");
        return d.getMonth() + 1 === vetMes && d.getFullYear() === vetAno;
      }
      return e.data_exame >= vetInicioAplicado && e.data_exame <= vetFimAplicado;
    });
    const bruto = examesVet.reduce((s, e) => s + (e.valor_bruto ?? e.valor ?? 0), 0);
    setResultadoVet({ bruto, v30: bruto * 0.30, v42: bruto * 0.42, count: examesVet.length });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <Image src="/Logomarca/imapet_transparent.png" alt="IMAPET" width={100} height={50} className="brightness-0" />
        <span className="text-sm text-text-muted font-medium">Financeiro — Dashboard</span>
        <div className="flex items-center gap-4">
          <Link href="/admin/financeiro" className="text-sm text-primary font-medium hover:underline">← Tabela</Link>
          <Link href="/admin" className="text-sm text-text-muted hover:underline">Novo exame</Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-10">
        <div className="mb-6">
          <h1 className="font-playfair text-3xl font-bold text-text-main">Dashboard financeiro</h1>
          <p className="text-text-muted text-sm mt-1">Resumo de faturamento por período</p>
        </div>

        {/* Filtro principal */}
        <div className="bg-white rounded-2xl p-4 shadow-sm mb-8 flex flex-col sm:flex-row sm:items-center gap-4">
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
          <>
            {/* Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              <Card label="Exames realizados" valor={String(filtrados.length)} sub={labelPeriodo} />
              <Card label="Faturamento bruto" valor={moeda(totalBruto)} sub="valor cobrado" />
              <Card label="Fat. empresa" valor={moeda(totalEmpresa)} sub="caixa empresa" />
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              <Card label="Vet. base (30%)" valor={moeda(totalVetBase)} sub="sem adicional" />
              <Card label="Vet. com adicional (42%)" valor={moeda(totalVet)} sub="30% + 20% extra" />
              <Card label="Ticket médio" valor={moeda(ticketMedio)} sub="preço por exame" />
            </div>

            {/* Gráfico */}
            <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
              <h2 className="font-semibold text-text-main mb-5">Faturamento bruto — últimos 6 meses</h2>
              <div className="flex items-end gap-2 h-36">
                {ultimos6.map((m, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                    {m.total > 0 && (
                      <span className="text-[10px] text-text-muted text-center leading-tight">
                        {moeda(m.total).replace("R$ ", "R$")}
                      </span>
                    )}
                    <div className="w-full rounded-t-lg transition-all duration-500" style={{ height: `${Math.max((m.total / maxBar) * 100, m.total > 0 ? 6 : 0)}%`, backgroundColor: m.ativo ? "#8B1A1A" : "#e5e7eb" }} />
                    <span className={`text-xs font-medium ${m.ativo ? "text-primary" : "text-text-muted"}`}>{m.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Rankings */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h2 className="font-semibold text-text-main mb-4">Por clínica</h2>
                {rankingClinicas.length === 0 ? <p className="text-sm text-text-muted">Nenhum exame neste período.</p> : (
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
                {rankingServicos.length === 0 ? <p className="text-sm text-text-muted">Nenhum exame neste período.</p> : (
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

            {/* Calculadora de veterinária */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h2 className="font-semibold text-text-main mb-1">Calculadora — pagamento veterinária</h2>
              <p className="text-xs text-text-muted mb-5">Selecione o período e calcule o valor a pagar</p>

              <div className="flex flex-col sm:flex-row sm:items-end gap-4 mb-6">
                <div className="flex rounded-xl overflow-hidden border border-gray-200 shrink-0 h-10">
                  <button onClick={() => setVetModo("mensal")} className={`px-4 text-sm font-medium transition-colors ${vetModo === "mensal" ? "bg-primary text-white" : "bg-white text-text-muted hover:bg-gray-50"}`}>Mensal</button>
                  <button onClick={() => setVetModo("periodo")} className={`px-4 text-sm font-medium transition-colors ${vetModo === "periodo" ? "bg-primary text-white" : "bg-white text-text-muted hover:bg-gray-50"}`}>Por período</button>
                </div>
                {vetModo === "mensal" ? (
                  <div className="flex items-center gap-2">
                    <select value={vetMes} onChange={e => setVetMes(Number(e.target.value))} className="input text-sm py-2">
                      {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                    </select>
                    <select value={vetAno} onChange={e => setVetAno(Number(e.target.value))} className="input text-sm py-2">
                      {anos.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-text-muted">De</span>
                    <input type="date" value={vetInicio} onChange={e => setVetInicio(e.target.value)} className="input text-sm py-2" />
                    <span className="text-sm text-text-muted">até</span>
                    <input type="date" value={vetFim} onChange={e => setVetFim(e.target.value)} className="input text-sm py-2" />
                    <button onClick={() => { setVetInicioAplicado(vetInicio); setVetFimAplicado(vetFim); }} className="bg-gray-100 text-text-main text-sm font-medium px-4 py-2 rounded-xl hover:bg-gray-200 transition-colors">Aplicar</button>
                  </div>
                )}
                <button onClick={calcularVet} className="bg-primary text-white text-sm font-semibold px-6 py-2 rounded-xl hover:bg-primary-light transition-colors shrink-0">
                  Calcular
                </button>
              </div>

              {resultadoVet && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-gray-100">
                  <div>
                    <p className="text-xs text-text-muted mb-1">Exames no período</p>
                    <p className="font-playfair text-2xl font-bold text-text-main">{resultadoVet.count}</p>
                  </div>
                  <div>
                    <p className="text-xs text-text-muted mb-1">Faturamento bruto</p>
                    <p className="font-playfair text-2xl font-bold text-text-main">{moeda(resultadoVet.bruto)}</p>
                  </div>
                  <div className="bg-amber-50 rounded-xl p-3">
                    <p className="text-xs text-amber-700 mb-1 font-medium">Sem adicional (30%)</p>
                    <p className="font-playfair text-2xl font-bold text-amber-800">{moeda(resultadoVet.v30)}</p>
                  </div>
                  <div className="bg-primary/5 rounded-xl p-3">
                    <p className="text-xs text-primary mb-1 font-medium">Com adicional (42%)</p>
                    <p className="font-playfair text-2xl font-bold text-primary">{moeda(resultadoVet.v42)}</p>
                  </div>
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
