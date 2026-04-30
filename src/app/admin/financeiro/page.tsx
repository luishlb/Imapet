"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { moeda, dataFmt } from "@/lib/utils";

type Exame = {
  id: string;
  data_exame: string;
  tipo: string;
  clinica: string;
  forma_pagamento: string;
  valor: number | null;
  valor_bruto: number | null;
  nome_paciente: string | null;
  laudo_url: string | null;
  pets: { nome: string } | null;
};

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
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
      .select("id, data_exame, tipo, clinica, forma_pagamento, valor, valor_bruto, nome_paciente, laudo_url, pets(nome)")
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

export default function FinanceiroPage() {
  const [exames, setExames] = useState<Exame[]>([]);
  const [carregando, setCarregando] = useState(true);

  const [modo, setModo] = useState<"mensal" | "periodo">("mensal");
  const [mesSel, setMesSel] = useState(HOJE.getMonth() + 1);
  const [anoSel, setAnoSel] = useState(HOJE.getFullYear());
  const [dataInicio, setDataInicio] = useState(PRIMEIRO_DIA_MES);
  const [dataFim, setDataFim] = useState(HOJE_STR);
  const [dataInicioAplicada, setDataInicioAplicada] = useState(PRIMEIRO_DIA_MES);
  const [dataFimAplicada, setDataFimAplicada] = useState(HOJE_STR);

  useEffect(() => { fetchTodos().then(d => { setExames(d); setCarregando(false); }); }, []);

  const [busca, setBusca] = useState("");
  const [filtroClinica, setFiltroClinica] = useState("");

  const filtradosPeriodo = useMemo(() =>
    exames.filter(e => {
      const d = new Date(e.data_exame + "T12:00:00");
      if (modo === "mensal") return d.getMonth() + 1 === mesSel && d.getFullYear() === anoSel;
      return e.data_exame >= dataInicioAplicada && e.data_exame <= dataFimAplicada;
    }), [exames, modo, mesSel, anoSel, dataInicioAplicada, dataFimAplicada]);

  const clinicaOptions = useMemo(() => {
    const set = new Set(filtradosPeriodo.map(e => e.clinica).filter(Boolean));
    return [...set].sort();
  }, [filtradosPeriodo]);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return filtradosPeriodo.filter(e => {
      if (filtroClinica && e.clinica !== filtroClinica) return false;
      if (!q) return true;
      const paciente = (e.nome_paciente || e.pets?.nome || "").toLowerCase();
      const clinica = (e.clinica || "").toLowerCase();
      const tipo = (e.tipo || "").toLowerCase();
      const data = dataFmt(e.data_exame);
      return paciente.includes(q) || clinica.includes(q) || tipo.includes(q) || data.includes(q);
    });
  }, [filtradosPeriodo, busca, filtroClinica]);

  const anos = useMemo(() => {
    const set = new Set(exames.map(e => new Date(e.data_exame + "T12:00:00").getFullYear()));
    set.add(HOJE.getFullYear());
    return [...set].sort((a, b) => b - a);
  }, [exames]);

  const labelPeriodo = modo === "mensal"
    ? `${MESES[mesSel - 1]} ${anoSel}`
    : `${dataFmt(dataInicioAplicada)} a ${dataFmt(dataFimAplicada)}`;

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <Image src="/Logomarca/imapet_transparent.png" alt="IMAPET" width={100} height={50} className="brightness-0" />
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold px-4 py-2 rounded-xl bg-primary text-white">Tabela</span>
          <Link href="/admin/financeiro/dashboard" className="text-sm font-medium px-4 py-2 rounded-xl border border-gray-200 text-text-muted hover:border-primary hover:text-primary transition-colors">Dashboard</Link>
          <Link href="/admin/veterinaria" className="text-sm font-medium px-4 py-2 rounded-xl border border-gray-200 text-text-muted hover:border-primary hover:text-primary transition-colors">Meu pagamento</Link>
          <Link href="/admin/pendentes" className="text-sm font-medium px-4 py-2 rounded-xl border border-gray-200 text-text-muted hover:border-primary hover:text-primary transition-colors">Pendentes</Link>
          <Link href="/admin" className="text-sm font-medium px-4 py-2 rounded-xl border border-gray-200 text-text-muted hover:border-primary hover:text-primary transition-colors">+ Novo exame</Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-10">
        <div className="mb-6">
          <h1 className="font-playfair text-3xl font-bold text-text-main">Tabela de exames</h1>
          <p className="text-text-muted text-sm mt-1">Dados brutos por período</p>
        </div>

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
            <div className="px-6 py-4 border-b border-gray-100 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-text-main">
                  Exames — {labelPeriodo}
                  <span className="ml-2 text-text-muted font-normal text-sm">
                    {(busca || filtroClinica) && filtrados.length !== filtradosPeriodo.length
                      ? `(${filtrados.length} de ${filtradosPeriodo.length})`
                      : `(${filtradosPeriodo.length})`}
                  </span>
                </h2>
                {(busca || filtroClinica) && (
                  <button type="button" onClick={() => { setBusca(""); setFiltroClinica(""); }}
                    className="text-xs text-text-muted hover:text-red-500 transition-colors">
                    Limpar filtros
                  </button>
                )}
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={busca}
                  onChange={e => setBusca(e.target.value)}
                  placeholder="Buscar por paciente, clínica, serviço ou data..."
                  className="input text-sm flex-1"
                />
                {clinicaOptions.length > 1 && (
                  <select value={filtroClinica} onChange={e => setFiltroClinica(e.target.value)}
                    className="input text-sm sm:w-44">
                    <option value="">Clínica: todas</option>
                    {clinicaOptions.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                )}
              </div>
            </div>
            {filtrados.length === 0 ? (
              <p className="text-sm text-text-muted px-6 py-8">
                {busca || filtroClinica ? "Nenhum exame encontrado para essa busca." : "Nenhum exame neste período."}
              </p>
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
                      <th className="text-right px-2 py-3">Vet. 42%</th>
                      <th className="px-2 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filtrados.map(e => (
                      <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-2 py-2 text-text-muted whitespace-nowrap">{dataFmt(e.data_exame)}</td>
                        <td className="px-2 py-2 font-medium text-text-main">{e.nome_paciente || e.pets?.nome || "—"}</td>
                        <td className="px-2 py-2 text-text-muted">{e.clinica || "—"}</td>
                        <td className="px-2 py-2 text-text-muted">{e.tipo || "—"}</td>
                        <td className="px-2 py-2 text-text-muted">{normalizarPagamento(e.forma_pagamento)}</td>
                        <td className="px-2 py-2 text-right text-text-muted">{e.valor_bruto ? moeda(e.valor_bruto) : "—"}</td>
                        <td className="px-2 py-2 text-right text-text-muted">{e.valor_bruto ? moeda(e.valor_bruto * 0.42) : "—"}</td>
                        <td className="px-2 py-2 text-center whitespace-nowrap">
                          {e.laudo_url
                            ? <a href={e.laudo_url} target="_blank" rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-[11px] font-medium hover:bg-primary/20 transition-colors">
                                📄 Laudo
                              </a>
                            : <span className="text-gray-300 text-xs">—</span>}
                        </td>
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
