"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { moeda, dataFmt } from "@/lib/utils";

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const HOJE = new Date();
const HOJE_STR = HOJE.toISOString().split("T")[0];
const PRIMEIRO_DIA_MES = `${HOJE.getFullYear()}-${String(HOJE.getMonth() + 1).padStart(2, "0")}-01`;

type Exame = {
  id: string;
  data_exame: string;
  tipo: string | null;
  clinica: string | null;
  forma_pagamento: string | null;
  valor_bruto: number | null;
  nome_paciente: string | null;
  pets: { nome: string } | null;
};

async function fetchTodos(): Promise<Exame[]> {
  const supabase = createClient();
  let todos: Exame[] = [], from = 0;
  while (true) {
    const { data } = await supabase
      .from("exames")
      .select("id, data_exame, tipo, clinica, forma_pagamento, valor_bruto, nome_paciente, pets(nome)")
      .order("data_exame", { ascending: false })
      .range(from, from + 999);
    if (!data || data.length === 0) break;
    todos = todos.concat(data as unknown as Exame[]);
    if (data.length < 1000) break;
    from += 1000;
  }
  return todos;
}

export default function ExamesPage() {
  const router = useRouter();
  const [auth, setAuth] = useState<boolean | null>(null);
  const [exames, setExames] = useState<Exame[]>([]);
  const [carregando, setCarregando] = useState(true);

  const [modo, setModo] = useState<"mensal" | "periodo">("mensal");
  const [mesSel, setMesSel] = useState(HOJE.getMonth() + 1);
  const [anoSel, setAnoSel] = useState(HOJE.getFullYear());
  const [dataInicio, setDataInicio] = useState(PRIMEIRO_DIA_MES);
  const [dataFim, setDataFim] = useState(HOJE_STR);
  const [dataInicioAplicada, setDataInicioAplicada] = useState(PRIMEIRO_DIA_MES);
  const [dataFimAplicada, setDataFimAplicada] = useState(HOJE_STR);
  const [busca, setBusca] = useState("");
  const [filtroClinica, setFiltroClinica] = useState("");

  useEffect(() => {
    if (localStorage.getItem("owner_auth") !== "1") { router.replace("/owner"); return; }
    setAuth(true);
    fetchTodos().then(d => { setExames(d); setCarregando(false); });
  }, [router]);

  const anos = useMemo(() => {
    const set = new Set(exames.map(e => new Date(e.data_exame + "T12:00:00").getFullYear()));
    set.add(HOJE.getFullYear());
    return [...set].sort((a, b) => b - a);
  }, [exames]);

  const filtradosPeriodo = useMemo(() =>
    exames.filter(e => {
      const d = new Date(e.data_exame + "T12:00:00");
      if (modo === "mensal") return d.getMonth() + 1 === mesSel && d.getFullYear() === anoSel;
      return e.data_exame >= dataInicioAplicada && e.data_exame <= dataFimAplicada;
    }), [exames, modo, mesSel, anoSel, dataInicioAplicada, dataFimAplicada]);

  const clinicaOptions = useMemo(() => {
    const set = new Set(filtradosPeriodo.map(e => e.clinica).filter(Boolean));
    return [...set].sort() as string[];
  }, [filtradosPeriodo]);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return filtradosPeriodo.filter(e => {
      if (filtroClinica && e.clinica !== filtroClinica) return false;
      if (!q) return true;
      const paciente = (e.nome_paciente || e.pets?.nome || "").toLowerCase();
      return paciente.includes(q) || (e.clinica || "").toLowerCase().includes(q)
        || (e.tipo || "").toLowerCase().includes(q) || dataFmt(e.data_exame).includes(q);
    });
  }, [filtradosPeriodo, busca, filtroClinica]);

  async function apagarExame(id: string) {
    if (!window.confirm("Apagar este exame permanentemente?")) return;
    const { error } = await createClient().from("exames").delete().eq("id", id);
    if (!error) setExames(prev => prev.filter(e => e.id !== id));
  }

  if (!auth) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-4 sticky top-0 z-10">
        <Link href="/owner" className="text-sm text-text-muted hover:text-primary transition-colors">← Voltar</Link>
        <span className="text-sm font-semibold text-text-main">Tabela de exames</span>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-4">
        {/* Filtros período */}
        <div className="bg-white rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex rounded-xl overflow-hidden border border-gray-200 shrink-0">
            <button onClick={() => setModo("mensal")} className={`px-4 py-2 text-sm font-medium transition-colors ${modo === "mensal" ? "bg-primary text-white" : "bg-white text-text-muted hover:bg-gray-50"}`}>Mensal</button>
            <button onClick={() => setModo("periodo")} className={`px-4 py-2 text-sm font-medium transition-colors ${modo === "periodo" ? "bg-primary text-white" : "bg-white text-text-muted hover:bg-gray-50"}`}>Período</button>
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
              <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="input text-sm py-2" />
              <span className="text-sm text-text-muted">até</span>
              <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="input text-sm py-2" />
              <button onClick={() => { setDataInicioAplicada(dataInicio); setDataFimAplicada(dataFim); }} className="bg-primary text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-primary-light transition">Aplicar</button>
            </div>
          )}
        </div>

        {/* Tabela */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-text-main text-sm">
                {(busca || filtroClinica) && filtrados.length !== filtradosPeriodo.length
                  ? `${filtrados.length} de ${filtradosPeriodo.length} exames`
                  : `${filtradosPeriodo.length} exame${filtradosPeriodo.length !== 1 ? "s" : ""}`}
              </span>
              {(busca || filtroClinica) && (
                <button onClick={() => { setBusca(""); setFiltroClinica(""); }} className="text-xs text-text-muted hover:text-red-500 transition-colors">Limpar filtros</button>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <input type="text" value={busca} onChange={e => setBusca(e.target.value)}
                placeholder="Buscar por paciente, clínica, serviço ou data..."
                className="input text-sm flex-1" />
              {clinicaOptions.length > 1 && (
                <select value={filtroClinica} onChange={e => setFiltroClinica(e.target.value)} className="input text-sm sm:w-44">
                  <option value="">Clínica: todas</option>
                  {clinicaOptions.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              )}
            </div>
          </div>

          {carregando ? (
            <p className="text-sm text-text-muted px-6 py-10 text-center">Carregando...</p>
          ) : filtrados.length === 0 ? (
            <p className="text-sm text-text-muted px-6 py-10 text-center">Nenhum exame encontrado.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[10px] text-text-muted uppercase tracking-wider bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-3 py-2.5 whitespace-nowrap">Data</th>
                    <th className="text-left px-3 py-2.5">Paciente</th>
                    <th className="text-left px-3 py-2.5">Clínica</th>
                    <th className="text-left px-3 py-2.5">Serviço</th>
                    <th className="text-left px-3 py-2.5">Pgto.</th>
                    <th className="text-right px-3 py-2.5">Valor</th>
                    <th className="px-3 py-2.5"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtrados.map(e => (
                    <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-3 py-2 text-text-muted whitespace-nowrap">{dataFmt(e.data_exame)}</td>
                      <td className="px-3 py-2 font-medium text-text-main">{e.nome_paciente || e.pets?.nome || "—"}</td>
                      <td className="px-3 py-2 text-text-muted">{e.clinica || "—"}</td>
                      <td className="px-3 py-2 text-text-muted">{e.tipo || "—"}</td>
                      <td className="px-3 py-2 text-text-muted">{e.forma_pagamento || "—"}</td>
                      <td className="px-3 py-2 text-right text-text-muted">{e.valor_bruto ? moeda(e.valor_bruto) : "—"}</td>
                      <td className="px-3 py-2 text-center">
                        <button onClick={() => apagarExame(e.id)}
                          className="text-gray-300 hover:text-red-500 transition-colors text-base leading-none" title="Apagar">🗑</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
