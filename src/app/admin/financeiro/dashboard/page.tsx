"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { dataFmt } from "@/lib/utils";

type Exame = {
  id: string;
  data_exame: string;
  tipo: string;
  clinica: string;
  forma_pagamento: string;
};

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const DIAS_SEMANA = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];
const HOJE = new Date();
const PRIMEIRO_DIA_MES = `${HOJE.getFullYear()}-${String(HOJE.getMonth() + 1).padStart(2, "0")}-01`;
const HOJE_STR = HOJE.toISOString().split("T")[0];

function normalizarPagamento(p: string): string {
  if (!p) return "Outro";
  const s = p.trim().toLowerCase();
  if (s === "pix") return "PIX";
  if (s.startsWith("créd") || s.startsWith("cred")) return "Crédito";
  if (s === "débito" || s === "debito") return "Débito";
  return p.trim();
}

async function fetchTodos(): Promise<Exame[]> {
  const supabase = createClient();
  const PAGE = 1000;
  let todos: Exame[] = [];
  let from = 0;
  while (true) {
    const { data } = await supabase
      .from("exames")
      .select("id, data_exame, tipo, clinica, forma_pagamento")
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

// ─── SVG Area Chart (count-based) ─────────────────────────────────────────────
function AreaChart({ data }: { data: { label: string; total: number }[] }) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  if (data.length === 0) return null;

  const PL = 36; const PR = 8; const PT = 12; const PB = 22;
  const VW = 800; const VH = 170;
  const CW = VW - PL - PR; const CH = VH - PT - PB;

  const max = Math.max(...data.map(d => d.total), 1);
  const yTicks = [0, 0.25, 0.5, 0.75, 1];

  const pts = data.map((d, i) => ({
    x: PL + (data.length === 1 ? CW / 2 : (i / (data.length - 1)) * CW),
    y: PT + (1 - d.total / max) * CH,
    label: d.label,
    total: d.total,
  }));

  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const area = `${line} L ${pts[pts.length - 1].x.toFixed(1)} ${PT + CH} L ${pts[0].x.toFixed(1)} ${PT + CH} Z`;
  const step = Math.max(1, Math.ceil(data.length / 10));

  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * VW;
    let nearest = 0; let minDist = Infinity;
    pts.forEach((p, i) => { const d = Math.abs(p.x - mouseX); if (d < minDist) { minDist = d; nearest = i; } });
    setHoverIdx(nearest);
  }

  const hp = hoverIdx !== null ? pts[hoverIdx] : null;

  return (
    <svg ref={svgRef} viewBox={`0 0 ${VW} ${VH}`} className="w-full" style={{ height: 170 }}
      onMouseMove={handleMouseMove} onMouseLeave={() => setHoverIdx(null)}>
      <defs>
        <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8B1A1A" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#8B1A1A" stopOpacity="0" />
        </linearGradient>
      </defs>
      {yTicks.map(f => {
        const y = PT + (1 - f) * CH;
        return (
          <g key={f}>
            <line x1={PL} y1={y} x2={VW - PR} y2={y} stroke="#f3f4f6" strokeWidth="1" />
            <text x={PL - 4} y={y + 3.5} textAnchor="end" fontSize="8.5" fill="#9CA3AF">{Math.round(max * f)}</text>
          </g>
        );
      })}
      <path d={area} fill="url(#grad)" />
      <path d={line} fill="none" stroke="#8B1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {pts.filter((_, i) => i % step === 0 || i === pts.length - 1).map((p, i) => (
        <text key={i} x={p.x} y={VH - 2} textAnchor="middle" fontSize="9" fill="#9CA3AF">{p.label}</text>
      ))}
      {data.length <= 40 && pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={hoverIdx === i ? 4.5 : 2.5} fill="#8B1A1A"
          opacity={hoverIdx !== null && hoverIdx !== i ? 0.3 : 1} />
      ))}
      {hp && (() => {
        const tw = 88; const th = 36;
        const tx = Math.min(Math.max(hp.x - tw / 2, PL), VW - PR - tw);
        const ty = Math.max(hp.y - th - 10, PT);
        return (
          <g>
            <line x1={hp.x} y1={PT} x2={hp.x} y2={PT + CH} stroke="#8B1A1A" strokeWidth="1" strokeDasharray="3 3" opacity="0.4" />
            <rect x={tx} y={ty} width={tw} height={th} rx="5" fill="#1C1C1E" />
            <text x={tx + tw / 2} y={ty + 13} textAnchor="middle" fontSize="8.5" fill="#9CA3AF">{hp.label}</text>
            <text x={tx + tw / 2} y={ty + 28} textAnchor="middle" fontSize="12" fontWeight="bold" fill="white">
              {hp.total} exam.
            </text>
          </g>
        );
      })()}
    </svg>
  );
}

function Insight({ icon, titulo, valor, desc, destaque }: { icon: string; titulo: string; valor: string; desc: string; destaque?: boolean }) {
  return (
    <div className={`rounded-2xl p-5 ${destaque ? "bg-primary text-white" : "bg-white shadow-sm"}`}>
      <span className="text-2xl">{icon}</span>
      <p className={`text-xs font-medium mt-2 mb-1 ${destaque ? "text-white/70" : "text-text-muted"}`}>{titulo}</p>
      <p className={`font-playfair text-xl font-bold leading-tight ${destaque ? "text-white" : "text-text-main"}`}>{valor}</p>
      <p className={`text-[11px] mt-1 leading-snug ${destaque ? "text-white/70" : "text-text-muted"}`}>{desc}</p>
    </div>
  );
}

export default function DashboardPage() {
  const [exames, setExames] = useState<Exame[]>([]);
  const [carregando, setCarregando] = useState(true);

  const [modo, setModo] = useState<"mes_atual" | "mensal" | "periodo">("mes_atual");
  const [mesSel, setMesSel] = useState(HOJE.getMonth() + 1);
  const [anoSel, setAnoSel] = useState(HOJE.getFullYear());
  const [dataInicio, setDataInicio] = useState(PRIMEIRO_DIA_MES);
  const [dataFim, setDataFim] = useState(HOJE_STR);
  const [dataInicioAplicada, setDataInicioAplicada] = useState(PRIMEIRO_DIA_MES);
  const [dataFimAplicada, setDataFimAplicada] = useState(HOJE_STR);

  useEffect(() => { fetchTodos().then(d => { setExames(d); setCarregando(false); }); }, []);

  const filtrados = useMemo(() =>
    exames.filter(e => {
      const d = new Date(e.data_exame + "T12:00:00");
      if (modo === "mes_atual") return e.data_exame >= PRIMEIRO_DIA_MES && e.data_exame <= HOJE_STR;
      if (modo === "mensal") return d.getMonth() + 1 === mesSel && d.getFullYear() === anoSel;
      return e.data_exame >= dataInicioAplicada && e.data_exame <= dataFimAplicada;
    }), [exames, modo, mesSel, anoSel, dataInicioAplicada, dataFimAplicada]);

  const anos = useMemo(() => {
    const set = new Set(exames.map(e => new Date(e.data_exame + "T12:00:00").getFullYear()));
    set.add(HOJE.getFullYear());
    return [...set].sort((a, b) => b - a);
  }, [exames]);

  const diasNoPeriodo = useMemo(() => {
    if (modo === "mes_atual") return HOJE.getDate();
    if (modo === "mensal") return new Date(anoSel, mesSel, 0).getDate();
    return Math.ceil((new Date(dataFimAplicada).getTime() - new Date(dataInicioAplicada).getTime()) / 86400000) + 1;
  }, [modo, mesSel, anoSel, dataInicioAplicada, dataFimAplicada]);

  // Evolução por contagem
  const evolucao = useMemo(() => {
    if (filtrados.length === 0) return [];
    if (modo === "mes_atual") {
      const map: Record<number, number> = {};
      filtrados.forEach(e => { const dia = parseInt(e.data_exame.split("-")[2]); map[dia] = (map[dia] || 0) + 1; });
      return Array.from({ length: HOJE.getDate() }, (_, i) => ({ label: String(i + 1), total: map[i + 1] || 0 }));
    }
    if (modo === "mensal") {
      const daysInMonth = new Date(anoSel, mesSel, 0).getDate();
      const map: Record<number, number> = {};
      filtrados.forEach(e => { const dia = parseInt(e.data_exame.split("-")[2]); map[dia] = (map[dia] || 0) + 1; });
      return Array.from({ length: daysInMonth }, (_, i) => ({ label: String(i + 1), total: map[i + 1] || 0 }));
    }
    const ini = new Date(dataInicioAplicada + "T12:00:00");
    const fim = new Date(dataFimAplicada + "T12:00:00");
    const diffDays = Math.ceil((fim.getTime() - ini.getTime()) / 86400000) + 1;
    if (diffDays <= 90) {
      const map: Record<string, number> = {};
      filtrados.forEach(e => { map[e.data_exame] = (map[e.data_exame] || 0) + 1; });
      return Array.from({ length: diffDays }, (_, i) => {
        const d = new Date(ini.getTime() + i * 86400000);
        const key = d.toISOString().split("T")[0];
        const label = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
        return { label, total: map[key] || 0 };
      });
    }
    const map: Record<string, number> = {};
    filtrados.forEach(e => { const key = e.data_exame.slice(0, 7); map[key] = (map[key] || 0) + 1; });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([key, total]) => {
      const [ano, mes] = key.split("-");
      return { label: `${MESES[parseInt(mes) - 1].slice(0, 3)}/${ano.slice(2)}`, total };
    });
  }, [filtrados, modo, mesSel, anoSel, dataInicioAplicada, dataFimAplicada]);

  const porDiaSemana = useMemo(() => {
    const map: Record<number, number> = {};
    for (let i = 0; i < 7; i++) map[i] = 0;
    filtrados.forEach(e => { const d = new Date(e.data_exame + "T12:00:00").getDay(); map[d] += 1; });
    return DIAS_SEMANA.map((label, i) => ({ label, count: map[i] }));
  }, [filtrados]);

  const maxDia = Math.max(...porDiaSemana.map(d => d.count), 1);
  const melhorDia = porDiaSemana.reduce((best, d) => d.count > best.count ? d : best, porDiaSemana[0]);

  const porPagamento = useMemo(() => {
    const map: Record<string, number> = {};
    filtrados.forEach(e => { const p = normalizarPagamento(e.forma_pagamento); map[p] = (map[p] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [filtrados]);

  const rankingClinicas = useMemo(() => {
    const map: Record<string, number> = {};
    filtrados.forEach(e => { const c = e.clinica || "Sem clínica"; map[c] = (map[c] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [filtrados]);

  const rankingServicos = useMemo(() => {
    const map: Record<string, number> = {};
    filtrados.forEach(e => { const t = e.tipo || "Outro"; map[t] = (map[t] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [filtrados]);

  const crescimento = useMemo(() => {
    if (filtrados.length === 0) return null;
    let prevIni: string, prevFim: string;
    if (modo === "mes_atual") {
      const pm = HOJE.getMonth() === 0 ? 12 : HOJE.getMonth();
      const py = HOJE.getMonth() === 0 ? HOJE.getFullYear() - 1 : HOJE.getFullYear();
      const dayNum = Math.min(HOJE.getDate(), new Date(py, pm, 0).getDate());
      prevIni = `${py}-${String(pm).padStart(2, "0")}-01`;
      prevFim = `${py}-${String(pm).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
    } else if (modo === "mensal") {
      const d = new Date(anoSel, mesSel - 2, 1);
      prevIni = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
      prevFim = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(new Date(anoSel, mesSel - 1, 0).getDate()).padStart(2, "0")}`;
    } else {
      const diffMs = new Date(dataFimAplicada).getTime() - new Date(dataInicioAplicada).getTime();
      const pf = new Date(new Date(dataInicioAplicada).getTime() - 86400000);
      const pi = new Date(pf.getTime() - diffMs);
      prevIni = pi.toISOString().split("T")[0];
      prevFim = pf.toISOString().split("T")[0];
    }
    const prevCount = exames.filter(e => e.data_exame >= prevIni && e.data_exame <= prevFim).length;
    if (prevCount === 0) return null;
    return { pct: ((filtrados.length - prevCount) / prevCount) * 100, prevCount };
  }, [exames, filtrados, modo, mesSel, anoSel, dataInicioAplicada, dataFimAplicada]);

  const labelPeriodo = modo === "mes_atual"
    ? `${MESES[HOJE.getMonth()]} ${HOJE.getFullYear()} — até hoje (dia ${HOJE.getDate()})`
    : modo === "mensal"
    ? `${MESES[mesSel - 1]} ${anoSel}`
    : `${dataFmt(dataInicioAplicada)} a ${dataFmt(dataFimAplicada)}`;

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <Image src="/Logomarca/imapet_transparent.png" alt="IMAPET" width={100} height={50} className="brightness-0" />
        <div className="flex items-center gap-2">
          <Link href="/admin/financeiro" className="text-sm font-medium px-4 py-2 rounded-xl border border-gray-200 text-text-muted hover:border-primary hover:text-primary transition-colors">Tabela</Link>
          <span className="text-sm font-semibold px-4 py-2 rounded-xl bg-primary text-white">Dashboard</span>
          <Link href="/admin/despesas" className="text-sm font-medium px-4 py-2 rounded-xl border border-gray-200 text-text-muted hover:border-primary hover:text-primary transition-colors">Despesas</Link>
          <Link href="/admin" className="text-sm font-medium px-4 py-2 rounded-xl border border-gray-200 text-text-muted hover:border-primary hover:text-primary transition-colors">+ Novo exame</Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-10">
        <div className="mb-6">
          <h1 className="font-playfair text-3xl font-bold text-text-main">Dashboard de atendimentos</h1>
          <p className="text-text-muted text-sm mt-1">Volume e distribuição por período</p>
        </div>

        {/* Filtro */}
        <div className="bg-white rounded-2xl p-4 shadow-sm mb-8 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex rounded-xl overflow-hidden border border-gray-200 shrink-0">
            <button onClick={() => setModo("mes_atual")} className={`px-4 py-2 text-sm font-medium transition-colors ${modo === "mes_atual" ? "bg-primary text-white" : "bg-white text-text-muted hover:bg-gray-50"}`}>Mês atual</button>
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
          ) : modo === "periodo" ? (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-text-muted">De</span>
              <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="input text-sm py-2" />
              <span className="text-sm text-text-muted">até</span>
              <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="input text-sm py-2" />
              <button onClick={() => { setDataInicioAplicada(dataInicio); setDataFimAplicada(dataFim); }} className="bg-primary text-white text-sm font-semibold px-5 py-2 rounded-xl hover:bg-primary-light transition-colors">Aplicar</button>
            </div>
          ) : null}
        </div>

        {carregando ? <p className="text-center text-text-muted py-20">Carregando...</p> : (
          <>
            {/* Insights */}
            {filtrados.length > 0 && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <Insight
                  icon="🩺"
                  titulo="Atendimentos"
                  valor={String(filtrados.length)}
                  desc={labelPeriodo}
                  destaque
                />
                {crescimento && (
                  <Insight
                    icon={crescimento.pct >= 0 ? "📈" : "📉"}
                    titulo="vs período anterior"
                    valor={`${crescimento.pct >= 0 ? "+" : ""}${crescimento.pct.toFixed(1)}%`}
                    desc={`Anterior: ${crescimento.prevCount} atendimentos`}
                    destaque={crescimento.pct > 0}
                  />
                )}
                <Insight
                  icon="📅"
                  titulo="Melhor dia da semana"
                  valor={melhorDia.count > 0 ? melhorDia.label : "—"}
                  desc={melhorDia.count > 0 ? `${melhorDia.count} atendimentos` : "Sem dados"}
                />
                <Insight
                  icon="⚡"
                  titulo="Média por dia"
                  valor={`${(filtrados.length / diasNoPeriodo).toFixed(1)}`}
                  desc={`atendimentos/dia (${diasNoPeriodo} dias)`}
                />
              </div>
            )}

            {/* Evolução */}
            {evolucao.length > 0 && (
              <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
                <h2 className="font-semibold text-text-main mb-1">Evolução de atendimentos</h2>
                <p className="text-xs text-text-muted mb-4">{labelPeriodo}</p>
                <AreaChart data={evolucao} />
              </div>
            )}

            {/* Dia da semana + Forma de pagamento */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h2 className="font-semibold text-text-main mb-4">Por dia da semana</h2>
                {filtrados.length === 0 ? <p className="text-sm text-text-muted">Sem dados.</p> : (
                  <div className="space-y-3">
                    {porDiaSemana.map(d => (
                      <div key={d.label}>
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-sm font-medium ${d.count === maxDia && d.count > 0 ? "text-primary" : "text-text-main"}`}>{d.label}</span>
                          <span className="text-sm font-semibold text-text-main">{d.count > 0 ? `${d.count} atend.` : "—"}</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                          <div className="h-1.5 rounded-full transition-all" style={{ width: `${(d.count / maxDia) * 100}%`, backgroundColor: d.count === maxDia && d.count > 0 ? "#8B1A1A" : "#d1d5db" }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h2 className="font-semibold text-text-main mb-4">Forma de pagamento</h2>
                {porPagamento.length === 0 ? <p className="text-sm text-text-muted">Sem dados.</p> : (
                  <div className="space-y-4">
                    {porPagamento.map(([nome, count]) => (
                      <div key={nome}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-text-main">{nome}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-[11px] text-text-muted">{Math.round(count / filtrados.length * 100)}%</span>
                            <span className="text-sm font-semibold text-primary w-16 text-right">{count} exam.</span>
                          </div>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                          <div className="bg-primary h-1.5 rounded-full" style={{ width: `${(count / porPagamento[0][1]) * 100}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Rankings */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h2 className="font-semibold text-text-main mb-4">Por clínica</h2>
                {rankingClinicas.length === 0 ? <p className="text-sm text-text-muted">Sem dados.</p> : (
                  <div className="space-y-3">
                    {rankingClinicas.map(([nome, count]) => (
                      <div key={nome}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-text-main truncate max-w-[180px]">{nome}</span>
                          <span className="text-sm text-primary font-semibold">{count} atend.</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                          <div className="bg-primary h-1.5 rounded-full" style={{ width: `${(count / rankingClinicas[0][1]) * 100}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h2 className="font-semibold text-text-main mb-4">Por serviço</h2>
                {rankingServicos.length === 0 ? <p className="text-sm text-text-muted">Sem dados.</p> : (
                  <div className="space-y-3">
                    {rankingServicos.map(([tipo, count]) => (
                      <div key={tipo}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-text-main">{tipo}</span>
                          <span className="text-sm text-primary font-semibold">{count} atend.</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                          <div className="bg-primary h-1.5 rounded-full" style={{ width: `${(count / rankingServicos[0][1]) * 100}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
