"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { moeda, dataFmt } from "@/lib/utils";
import DonutChart, { type DonutSlice } from "@/components/shared/DonutChart";
import Sparkline from "@/components/shared/Sparkline";
import CalendarHeatmap from "@/components/shared/CalendarHeatmap";

type Exame = {
  id: string;
  data_exame: string;
  tipo: string;
  clinica: string;
  forma_pagamento: string;
  valor_bruto: number | null;
  nome_paciente: string | null;
  pets: { nome: string } | null;
};

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const DIAS_SEMANA_CURTO = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];
const HOJE = new Date();
const PRIMEIRO_DIA_MES = `${HOJE.getFullYear()}-${String(HOJE.getMonth() + 1).padStart(2, "0")}-01`;
const HOJE_STR = HOJE.toISOString().split("T")[0];

const COR_PAGAMENTO: Record<string, string> = {
  PIX: "#10b981",
  Crédito: "#3b82f6",
  Débito: "#6366f1",
  Espécie: "#f59e0b",
  Pettop: "#8b5cf6",
  Petcare: "#ec4899",
  Petlove: "#f472b6",
  Eupet: "#a855f7",
  Pendente: "#f97316",
  Outro: "#94a3b8",
};

const PALETA_CLINICAS = ["#8B1A1A", "#B22222", "#C4453A", "#D9786E", "#E9A9A0", "#94a3b8"];

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
      .select("id, data_exame, tipo, clinica, forma_pagamento, valor_bruto, nome_paciente, pets(nome)")
      .order("data_exame", { ascending: false })
      .order("id", { ascending: false })
      .range(from, from + PAGE - 1);
    if (!data || data.length === 0) break;
    todos = todos.concat(data as unknown as Exame[]);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  const seen = new Set<string>();
  return todos.filter(e => { if (seen.has(e.id)) return false; seen.add(e.id); return true; });
}

// ─── Area Chart com toggle ────────────────────────────────────────────────────
function AreaChart({ data, formatY }: { data: { label: string; total: number }[]; formatY: (v: number) => string }) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  if (data.length === 0) return null;

  const PL = 56; const PR = 8; const PT = 12; const PB = 22;
  const VW = 800; const VH = 200;
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
    <svg ref={svgRef} viewBox={`0 0 ${VW} ${VH}`} className="w-full" style={{ height: 200 }}
      onMouseMove={handleMouseMove} onMouseLeave={() => setHoverIdx(null)}>
      <defs>
        <linearGradient id="gradAdmin" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8B1A1A" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#8B1A1A" stopOpacity="0" />
        </linearGradient>
      </defs>
      {yTicks.map(f => {
        const y = PT + (1 - f) * CH;
        return (
          <g key={f}>
            <line x1={PL} y1={y} x2={VW - PR} y2={y} stroke="#f3f4f6" strokeWidth="1" />
            <text x={PL - 4} y={y + 3.5} textAnchor="end" fontSize="8" fill="#9CA3AF">{formatY(max * f)}</text>
          </g>
        );
      })}
      <path d={area} fill="url(#gradAdmin)" />
      <path d={line} fill="none" stroke="#8B1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {pts.filter((_, i) => i % step === 0 || i === pts.length - 1).map((p, i) => (
        <text key={i} x={p.x} y={VH - 2} textAnchor="middle" fontSize="9" fill="#9CA3AF">{p.label}</text>
      ))}
      {data.length <= 40 && pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={hoverIdx === i ? 5 : 2.5} fill="#8B1A1A"
          opacity={hoverIdx !== null && hoverIdx !== i ? 0.3 : 1} />
      ))}
      {hp && (() => {
        const tw = 130; const th = 36;
        const tx = Math.min(Math.max(hp.x - tw / 2, PL), VW - PR - tw);
        const ty = Math.max(hp.y - th - 10, PT);
        return (
          <g>
            <line x1={hp.x} y1={PT} x2={hp.x} y2={PT + CH} stroke="#8B1A1A" strokeWidth="1" strokeDasharray="3 3" opacity="0.4" />
            <rect x={tx} y={ty} width={tw} height={th} rx="6" fill="#1C1C1E" />
            <text x={tx + tw / 2} y={ty + 13} textAnchor="middle" fontSize="9" fill="#9CA3AF">{hp.label}</text>
            <text x={tx + tw / 2} y={ty + 28} textAnchor="middle" fontSize="12" fontWeight="bold" fill="white">
              {formatY(hp.total)}
            </text>
          </g>
        );
      })()}
    </svg>
  );
}

function MetricCard({ icon, titulo, valor, sub, accent = "primary" }: { icon: string; titulo: string; valor: string; sub?: string; accent?: "primary" | "blue" | "green" | "orange" }) {
  const accents: Record<string, string> = {
    primary: "from-primary/10 to-primary/5 text-primary",
    blue: "from-blue-100 to-blue-50 text-blue-600",
    green: "from-green-100 to-green-50 text-green-700",
    orange: "from-orange-100 to-orange-50 text-orange-600",
  };
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br ${accents[accent]} mb-3 text-lg`}>
        {icon}
      </div>
      <p className="text-xs font-medium text-text-muted">{titulo}</p>
      <p className="font-playfair text-2xl font-bold text-text-main mt-1 leading-tight">{valor}</p>
      {sub && <p className="text-[11px] text-text-muted mt-1.5 leading-snug">{sub}</p>}
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

  const [metricaChart, setMetricaChart] = useState<"ganho" | "atendimentos" | "ticket">("ganho");

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

  const ganhoVet = useMemo(() => {
    const bruto = filtrados.reduce((s, e) => s + (e.valor_bruto || 0), 0);
    return Math.round(bruto * 0.42 * 100) / 100;
  }, [filtrados]);

  const ticketMedioVet = useMemo(() => {
    return filtrados.length > 0 ? ganhoVet / filtrados.length : 0;
  }, [ganhoVet, filtrados]);

  const diasNoPeriodo = useMemo(() => {
    if (modo === "mes_atual") return HOJE.getDate();
    if (modo === "mensal") return new Date(anoSel, mesSel, 0).getDate();
    return Math.ceil((new Date(dataFimAplicada).getTime() - new Date(dataInicioAplicada).getTime()) / 86400000) + 1;
  }, [modo, mesSel, anoSel, dataInicioAplicada, dataFimAplicada]);

  const ganhoPorDia = useMemo(() => {
    const map: Record<number, number> = {};
    filtrados.forEach(e => {
      const dia = parseInt(e.data_exame.split("-")[2]);
      map[dia] = (map[dia] || 0) + (e.valor_bruto || 0) * 0.42;
    });
    return map;
  }, [filtrados]);

  const sparklineData = useMemo(() => {
    if (modo === "periodo") {
      const ini = new Date(dataInicioAplicada + "T12:00:00");
      const fim = new Date(dataFimAplicada + "T12:00:00");
      const dias = Math.ceil((fim.getTime() - ini.getTime()) / 86400000) + 1;
      const map: Record<string, number> = {};
      filtrados.forEach(e => { map[e.data_exame] = (map[e.data_exame] || 0) + (e.valor_bruto || 0) * 0.42; });
      return Array.from({ length: Math.min(dias, 30) }, (_, i) => {
        const d = new Date(ini.getTime() + i * 86400000);
        return map[d.toISOString().split("T")[0]] || 0;
      });
    }
    const total = modo === "mes_atual" ? HOJE.getDate() : new Date(anoSel, mesSel, 0).getDate();
    return Array.from({ length: total }, (_, i) => ganhoPorDia[i + 1] || 0);
  }, [filtrados, modo, anoSel, mesSel, dataInicioAplicada, dataFimAplicada, ganhoPorDia]);

  const evolucao = useMemo(() => {
    if (filtrados.length === 0) return [];
    const calc = (e: Exame): number => {
      if (metricaChart === "ganho") return (e.valor_bruto || 0) * 0.42;
      if (metricaChart === "atendimentos") return 1;
      return (e.valor_bruto || 0) * 0.42; // ticket: somatório dividido por count
    };

    if (modo === "mes_atual" || modo === "mensal") {
      const daysInMonth = modo === "mes_atual" ? HOJE.getDate() : new Date(anoSel, mesSel, 0).getDate();
      const map: Record<number, { sum: number; count: number }> = {};
      filtrados.forEach(e => {
        const dia = parseInt(e.data_exame.split("-")[2]);
        if (!map[dia]) map[dia] = { sum: 0, count: 0 };
        map[dia].sum += calc(e);
        map[dia].count += 1;
      });
      return Array.from({ length: daysInMonth }, (_, i) => {
        const d = i + 1;
        const v = map[d];
        const total = !v ? 0 :
          metricaChart === "ticket" ? (v.count > 0 ? v.sum / v.count : 0) : v.sum;
        return { label: String(d), total };
      });
    }

    const ini = new Date(dataInicioAplicada + "T12:00:00");
    const fim = new Date(dataFimAplicada + "T12:00:00");
    const diffDays = Math.ceil((fim.getTime() - ini.getTime()) / 86400000) + 1;
    if (diffDays <= 90) {
      const map: Record<string, { sum: number; count: number }> = {};
      filtrados.forEach(e => {
        if (!map[e.data_exame]) map[e.data_exame] = { sum: 0, count: 0 };
        map[e.data_exame].sum += calc(e);
        map[e.data_exame].count += 1;
      });
      return Array.from({ length: diffDays }, (_, i) => {
        const d = new Date(ini.getTime() + i * 86400000);
        const key = d.toISOString().split("T")[0];
        const label = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
        const v = map[key];
        const total = !v ? 0 :
          metricaChart === "ticket" ? (v.count > 0 ? v.sum / v.count : 0) : v.sum;
        return { label, total };
      });
    }
    const map: Record<string, { sum: number; count: number }> = {};
    filtrados.forEach(e => {
      const key = e.data_exame.slice(0, 7);
      if (!map[key]) map[key] = { sum: 0, count: 0 };
      map[key].sum += calc(e);
      map[key].count += 1;
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([key, v]) => {
      const [ano, mes] = key.split("-");
      const total = metricaChart === "ticket" ? (v.count > 0 ? v.sum / v.count : 0) : v.sum;
      return { label: `${MESES[parseInt(mes) - 1].slice(0, 3)}/${ano.slice(2)}`, total };
    });
  }, [filtrados, modo, mesSel, anoSel, dataInicioAplicada, dataFimAplicada, metricaChart]);

  const porPagamento = useMemo<DonutSlice[]>(() => {
    const map: Record<string, number> = {};
    filtrados.forEach(e => {
      const p = normalizarPagamento(e.forma_pagamento);
      map[p] = (map[p] || 0) + 1;
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([nome, count]) => ({ label: nome, value: count, color: COR_PAGAMENTO[nome] || "#94a3b8" }));
  }, [filtrados]);

  const porClinica = useMemo<DonutSlice[]>(() => {
    const map: Record<string, number> = {};
    filtrados.forEach(e => {
      const c = e.clinica || "Sem clínica";
      map[c] = (map[c] || 0) + 1;
    });
    const ord = Object.entries(map).sort((a, b) => b[1] - a[1]);
    const top = ord.slice(0, 5);
    const resto = ord.slice(5).reduce((s, [, v]) => s + v, 0);
    const result = top.map(([nome, count], i) => ({ label: nome, value: count, color: PALETA_CLINICAS[i] }));
    if (resto > 0) result.push({ label: "Outras", value: resto, color: PALETA_CLINICAS[5] });
    return result;
  }, [filtrados]);

  const rankingServicos = useMemo(() => {
    const map: Record<string, { count: number; ganho: number }> = {};
    filtrados.forEach(e => {
      const t = e.tipo || "Outro";
      if (!map[t]) map[t] = { count: 0, ganho: 0 };
      map[t].count += 1;
      map[t].ganho += (e.valor_bruto || 0) * 0.42;
    });
    return Object.entries(map).sort((a, b) => b[1].ganho - a[1].ganho).slice(0, 5);
  }, [filtrados]);

  // Insights
  const maiorTicket = useMemo(() => {
    if (filtrados.length === 0) return null;
    return filtrados.reduce((max, e) => (e.valor_bruto || 0) > (max?.valor_bruto || 0) ? e : max, filtrados[0]);
  }, [filtrados]);

  const melhorDia = useMemo(() => {
    const entries = Object.entries(ganhoPorDia);
    if (entries.length === 0) return null;
    const [dia, valor] = entries.sort((a, b) => b[1] - a[1])[0];
    return { dia: parseInt(dia), valor };
  }, [ganhoPorDia]);

  const porDiaSemana = useMemo(() => {
    const map: Record<number, { count: number; ganho: number }> = {};
    for (let i = 0; i < 7; i++) map[i] = { count: 0, ganho: 0 };
    filtrados.forEach(e => {
      const d = new Date(e.data_exame + "T12:00:00").getDay();
      map[d].count += 1;
      map[d].ganho += (e.valor_bruto || 0) * 0.42;
    });
    return DIAS_SEMANA_CURTO.map((label, i) => ({ label, count: map[i].count, ganho: map[i].ganho }));
  }, [filtrados]);

  const melhorDiaSemana = useMemo(() => {
    return porDiaSemana.reduce((best, d) => d.ganho > best.ganho ? d : best, porDiaSemana[0]);
  }, [porDiaSemana]);

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
    const prev = exames.filter(e => e.data_exame >= prevIni && e.data_exame <= prevFim);
    const prevGanho = prev.reduce((s, e) => s + (e.valor_bruto || 0) * 0.42, 0);
    if (prevGanho === 0) return null;
    return { pct: ((ganhoVet - prevGanho) / prevGanho) * 100, diff: ganhoVet - prevGanho, prevGanho };
  }, [exames, filtrados, ganhoVet, modo, mesSel, anoSel, dataInicioAplicada, dataFimAplicada]);

  const labelPeriodo = modo === "mes_atual"
    ? `${MESES[HOJE.getMonth()]} ${HOJE.getFullYear()} (até dia ${HOJE.getDate()})`
    : modo === "mensal"
    ? `${MESES[mesSel - 1]} ${anoSel}`
    : `${dataFmt(dataInicioAplicada)} a ${dataFmt(dataFimAplicada)}`;

  const formatYChart = (v: number): string => {
    if (metricaChart === "atendimentos") return Math.round(v).toString();
    if (v >= 1000) return `R$ ${(v / 1000).toFixed(1)}k`;
    return moeda(v);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <Image src="/Logomarca/imapet_transparent.png" alt="IMAPET" width={100} height={50} className="brightness-0" />
        <div className="flex items-center gap-2 flex-wrap">
          <Link href="/admin/financeiro" className="text-sm font-medium px-4 py-2 rounded-xl border border-gray-200 text-text-muted hover:border-primary hover:text-primary transition-colors">Tabela</Link>
          <span className="text-sm font-semibold px-4 py-2 rounded-xl bg-primary text-white">Dashboard</span>
          <Link href="/admin/veterinaria" className="text-sm font-medium px-4 py-2 rounded-xl border border-gray-200 text-text-muted hover:border-primary hover:text-primary transition-colors">Meu pagamento</Link>
          <Link href="/admin/pendentes" className="text-sm font-medium px-4 py-2 rounded-xl border border-gray-200 text-text-muted hover:border-primary hover:text-primary transition-colors">Pendentes</Link>
          <Link href="/admin" className="text-sm font-medium px-4 py-2 rounded-xl border border-gray-200 text-text-muted hover:border-primary hover:text-primary transition-colors">+ Novo exame</Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-5">
        {/* Filtro */}
        <div className="bg-white rounded-2xl p-3 shadow-sm flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex rounded-xl overflow-hidden border border-gray-200 shrink-0">
            <button onClick={() => setModo("mes_atual")} className={`px-4 py-2 text-sm font-medium transition-colors ${modo === "mes_atual" ? "bg-primary text-white" : "bg-white text-text-muted hover:bg-gray-50"}`}>Mês atual</button>
            <button onClick={() => setModo("mensal")} className={`px-4 py-2 text-sm font-medium transition-colors ${modo === "mensal" ? "bg-primary text-white" : "bg-white text-text-muted hover:bg-gray-50"}`}>Mensal</button>
            <button onClick={() => setModo("periodo")} className={`px-4 py-2 text-sm font-medium transition-colors ${modo === "periodo" ? "bg-primary text-white" : "bg-white text-text-muted hover:bg-gray-50"}`}>Por período</button>
          </div>
          {modo === "mensal" && (
            <div className="flex items-center gap-2">
              <select value={mesSel} onChange={e => setMesSel(Number(e.target.value))} className="input text-sm py-2">
                {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
              <select value={anoSel} onChange={e => setAnoSel(Number(e.target.value))} className="input text-sm py-2">
                {anos.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          )}
          {modo === "periodo" && (
            <div className="flex items-center gap-2 flex-wrap">
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
            {/* Hero card — ganho da vet */}
            <div className="relative overflow-hidden rounded-2xl shadow-lg">
              <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-primary-light" />
              <div className="absolute -right-10 -top-10 w-64 h-64 rounded-full bg-white/5" />
              <div className="absolute -right-20 -bottom-16 w-72 h-72 rounded-full bg-white/5" />
              <div className="relative px-6 py-7 text-white">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <p className="text-xs font-medium text-white/70 uppercase tracking-wider">Seu pagamento (42%)</p>
                    <p className="font-playfair text-4xl sm:text-5xl font-bold mt-1 leading-none">{moeda(ganhoVet)}</p>
                    <p className="text-sm text-white/80 mt-2">
                      {filtrados.length} atendimento{filtrados.length !== 1 ? "s" : ""} · {labelPeriodo}
                    </p>
                    {crescimento && (
                      <div className="inline-flex items-center gap-2 mt-3 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-sm">
                        <span className="text-sm">
                          {crescimento.pct >= 0 ? "▲" : "▼"} <strong>{crescimento.pct >= 0 ? "+" : ""}{crescimento.pct.toFixed(1)}%</strong>
                        </span>
                        <span className="text-xs text-white/80">
                          {crescimento.diff >= 0 ? "+" : ""}{moeda(crescimento.diff)} vs. anterior
                        </span>
                      </div>
                    )}
                  </div>
                  {sparklineData.length > 1 && (
                    <div className="hidden sm:block">
                      <Sparkline values={sparklineData} width={200} height={70} color="#fff" fillOpacity={0.25} />
                      <p className="text-[10px] text-white/60 text-right mt-1">tendência</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Insights row */}
            {filtrados.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white rounded-2xl p-5 shadow-sm border-l-4 border-amber-400">
                  <p className="text-xs font-medium text-text-muted uppercase tracking-wider">🏆 Maior ticket</p>
                  {maiorTicket ? (
                    <>
                      <p className="font-playfair text-xl font-bold text-text-main mt-2">{moeda((maiorTicket.valor_bruto || 0) * 0.42)}</p>
                      <p className="text-xs text-text-muted mt-0.5 truncate">
                        {maiorTicket.nome_paciente || maiorTicket.pets?.nome || "—"} · {maiorTicket.clinica}
                      </p>
                      <p className="text-[11px] text-text-muted">{dataFmt(maiorTicket.data_exame)}</p>
                    </>
                  ) : <p className="text-sm text-text-muted mt-2">—</p>}
                </div>

                <div className="bg-white rounded-2xl p-5 shadow-sm border-l-4 border-green-500">
                  <p className="text-xs font-medium text-text-muted uppercase tracking-wider">📅 Melhor dia</p>
                  {melhorDia ? (
                    <>
                      <p className="font-playfair text-xl font-bold text-text-main mt-2">{moeda(melhorDia.valor)}</p>
                      <p className="text-xs text-text-muted mt-0.5">
                        Dia {melhorDia.dia} {modo === "mensal" ? `de ${MESES[mesSel - 1]}` : modo === "mes_atual" ? `de ${MESES[HOJE.getMonth()]}` : ""}
                      </p>
                    </>
                  ) : <p className="text-sm text-text-muted mt-2">—</p>}
                </div>

                <div className="bg-white rounded-2xl p-5 shadow-sm border-l-4 border-blue-500">
                  <p className="text-xs font-medium text-text-muted uppercase tracking-wider">🩺 Melhor dia da semana</p>
                  {melhorDiaSemana && melhorDiaSemana.ganho > 0 ? (
                    <>
                      <p className="font-playfair text-xl font-bold text-text-main mt-2">{melhorDiaSemana.label}</p>
                      <p className="text-xs text-text-muted mt-0.5">{moeda(melhorDiaSemana.ganho)} no total</p>
                    </>
                  ) : <p className="text-sm text-text-muted mt-2">—</p>}
                </div>
              </div>
            )}

            {/* Métricas grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard icon="🩺" titulo="Atendimentos" valor={String(filtrados.length)} sub={labelPeriodo} accent="primary" />
              <MetricCard icon="💰" titulo="Ganho do período" valor={moeda(ganhoVet)} sub="42% do bruto" accent="green" />
              <MetricCard icon="🎯" titulo="Ticket médio" valor={filtrados.length > 0 ? moeda(ticketMedioVet) : "—"} sub="Por atendimento" accent="blue" />
              <MetricCard icon="⚡" titulo="Média diária" valor={filtrados.length > 0 ? `${(filtrados.length / diasNoPeriodo).toFixed(1)}` : "—"} sub={`atend/dia (${diasNoPeriodo} dias)`} accent="orange" />
            </div>

            {/* Evolução com toggle */}
            {evolucao.length > 0 && (
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                  <div>
                    <h2 className="font-semibold text-text-main">Evolução</h2>
                    <p className="text-xs text-text-muted">{labelPeriodo}</p>
                  </div>
                  <div className="flex rounded-xl overflow-hidden border border-gray-200">
                    {[
                      { v: "ganho", l: "Ganho" },
                      { v: "atendimentos", l: "Atendimentos" },
                      { v: "ticket", l: "Ticket médio" },
                    ].map(({ v, l }) => (
                      <button key={v} onClick={() => setMetricaChart(v as typeof metricaChart)}
                        className={`text-xs font-medium px-3 py-1.5 transition-colors ${metricaChart === v ? "bg-primary text-white" : "bg-white text-text-muted hover:bg-gray-50"}`}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
                <AreaChart data={evolucao} formatY={formatYChart} />
              </div>
            )}

            {/* Donuts: forma de pagamento + clínicas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h2 className="font-semibold text-text-main mb-1">Forma de pagamento</h2>
                <p className="text-xs text-text-muted mb-4">Distribuição por nº de atendimentos</p>
                {porPagamento.length > 0 ? (
                  <DonutChart data={porPagamento} formatValue={(v) => `${v} exam.`} centerLabel="Total" centerValue={String(filtrados.length)} />
                ) : <p className="text-sm text-text-muted text-center py-8">Sem dados.</p>}
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h2 className="font-semibold text-text-main mb-1">Por clínica</h2>
                <p className="text-xs text-text-muted mb-4">Top 5 + outras</p>
                {porClinica.length > 0 ? (
                  <DonutChart data={porClinica} formatValue={(v) => `${v} atend.`} centerLabel={`${new Set(filtrados.map(e => e.clinica)).size} clínicas`} centerValue={String(filtrados.length)} />
                ) : <p className="text-sm text-text-muted text-center py-8">Sem dados.</p>}
              </div>
            </div>

            {/* Calendar heatmap */}
            {(modo === "mes_atual" || modo === "mensal") && filtrados.length > 0 && (
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="mb-4">
                  <h2 className="font-semibold text-text-main">Calendário</h2>
                  <p className="text-xs text-text-muted">Ganho por dia em {modo === "mes_atual" ? MESES[HOJE.getMonth()] : MESES[mesSel - 1]}</p>
                </div>
                <CalendarHeatmap
                  ano={modo === "mes_atual" ? HOJE.getFullYear() : anoSel}
                  mes={modo === "mes_atual" ? HOJE.getMonth() + 1 : mesSel}
                  valoresPorDia={ganhoPorDia}
                  formatValue={moeda}
                />
              </div>
            )}

            {/* Top serviços */}
            {rankingServicos.length > 0 && (
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h2 className="font-semibold text-text-main mb-1">Top 5 serviços</h2>
                <p className="text-xs text-text-muted mb-4">Por ganho (42%)</p>
                <div className="space-y-3">
                  {rankingServicos.map(([nome, { count, ganho }], i) => (
                    <div key={nome}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-medium text-text-main flex items-center gap-2">
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-primary/10 text-primary text-[10px] font-bold">{i + 1}</span>
                          {nome}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="text-[11px] text-text-muted">{count} atend.</span>
                          <span className="text-sm font-semibold text-primary">{moeda(ganho)}</span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div className="bg-gradient-to-r from-primary to-primary-light h-2 rounded-full transition-all duration-700"
                          style={{ width: `${(ganho / rankingServicos[0][1].ganho) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
