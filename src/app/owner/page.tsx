"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { moeda, dataFmt, ultimoDiaMes } from "@/lib/utils";

const SENHA = process.env.NEXT_PUBLIC_OWNER_PASSWORD || "imapet2024";
const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const HOJE = new Date();

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

const HOJE_STR = HOJE.toISOString().split("T")[0];
const PRIMEIRO_DIA_MES = `${HOJE.getFullYear()}-${String(HOJE.getMonth() + 1).padStart(2, "0")}-01`;
const anos = [2024, 2025, 2026, 2027];

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
      .range(from, from + PAGE - 1);
    if (!data || data.length === 0) break;
    todos = todos.concat(data as unknown as Exame[]);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return todos;
}

export default function OwnerPage() {
  const [autenticado, setAutenticado] = useState(false);
  const [senha, setSenha] = useState("");
  const [erroSenha, setErroSenha] = useState(false);

  // Pagamento vet
  const [modoPgto, setModoPgto] = useState<"quinzena" | "mes">("quinzena");
  const [quinzena, setQuinzena] = useState<1 | 2>(1);
  const [mesPgto, setMesPgto] = useState(HOJE.getMonth() + 1);
  const [anoPgto, setAnoPgto] = useState(HOJE.getFullYear());
  const [examesPgto, setExamesPgto] = useState<Exame[]>([]);
  const [carregandoPgto, setCarregandoPgto] = useState(false);
  const [calculado, setCalculado] = useState(false);

  // Relatório Cia do Animal
  const [mesRel, setMesRel] = useState(HOJE.getMonth() + 1);
  const [anoRel, setAnoRel] = useState(HOJE.getFullYear());

  // Tabela de exames
  const [todosExames, setTodosExames] = useState<Exame[]>([]);
  const [carregandoTabela, setCarregandoTabela] = useState(true);
  const [modoTabela, setModoTabela] = useState<"mensal" | "periodo">("mensal");
  const [mesTabelaSel, setMesTabelaSel] = useState(HOJE.getMonth() + 1);
  const [anoTabelaSel, setAnoTabelaSel] = useState(HOJE.getFullYear());
  const [dataInicioTabela, setDataInicioTabela] = useState(PRIMEIRO_DIA_MES);
  const [dataFimTabela, setDataFimTabela] = useState(HOJE_STR);
  const [dataInicioAplicada, setDataInicioAplicada] = useState(PRIMEIRO_DIA_MES);
  const [dataFimAplicada, setDataFimAplicada] = useState(HOJE_STR);
  const [buscaTabela, setBuscaTabela] = useState("");
  const [filtroClinicaTabela, setFiltroClinicaTabela] = useState("");

  const filtradosPeriodoTabela = useMemo(() =>
    todosExames.filter(e => {
      const d = new Date(e.data_exame + "T12:00:00");
      if (modoTabela === "mensal") return d.getMonth() + 1 === mesTabelaSel && d.getFullYear() === anoTabelaSel;
      return e.data_exame >= dataInicioAplicada && e.data_exame <= dataFimAplicada;
    }), [todosExames, modoTabela, mesTabelaSel, anoTabelaSel, dataInicioAplicada, dataFimAplicada]);

  const clinicaOptionsTabela = useMemo(() => {
    const set = new Set(filtradosPeriodoTabela.map(e => e.clinica).filter(Boolean));
    return [...set].sort() as string[];
  }, [filtradosPeriodoTabela]);

  const filtradosTabela = useMemo(() => {
    const q = buscaTabela.trim().toLowerCase();
    return filtradosPeriodoTabela.filter(e => {
      if (filtroClinicaTabela && e.clinica !== filtroClinicaTabela) return false;
      if (!q) return true;
      const paciente = (e.nome_paciente || e.pets?.nome || "").toLowerCase();
      const clinica = (e.clinica || "").toLowerCase();
      const tipo = (e.tipo || "").toLowerCase();
      const data = dataFmt(e.data_exame);
      return paciente.includes(q) || clinica.includes(q) || tipo.includes(q) || data.includes(q);
    });
  }, [filtradosPeriodoTabela, buscaTabela, filtroClinicaTabela]);

  const anosTabela = useMemo(() => {
    const set = new Set(todosExames.map(e => new Date(e.data_exame + "T12:00:00").getFullYear()));
    set.add(HOJE.getFullYear());
    return [...set].sort((a, b) => b - a);
  }, [todosExames]);

  useEffect(() => {
    if (localStorage.getItem("owner_auth") === "1") setAutenticado(true);
  }, []);

  useEffect(() => {
    if (autenticado) {
      fetchTodos().then(d => { setTodosExames(d); setCarregandoTabela(false); });
    }
  }, [autenticado]);

  function login() {
    if (senha === SENHA) {
      localStorage.setItem("owner_auth", "1");
      setAutenticado(true);
    } else {
      setErroSenha(true);
    }
  }

  function logout() {
    localStorage.removeItem("owner_auth");
    setAutenticado(false);
  }

  async function apagarExame(id: string) {
    if (!window.confirm("Apagar este exame permanentemente?")) return;
    const supabase = createClient();
    const { error } = await supabase.from("exames").delete().eq("id", id);
    if (!error) {
      setExamesPgto(prev => prev.filter(e => e.id !== id));
      setTodosExames(prev => prev.filter(e => e.id !== id));
    }
  }

  async function calcular() {
    setCarregandoPgto(true);
    setCalculado(false);
    const supabase = createClient();
    const mesStr = String(mesPgto).padStart(2, "0");
    let dataInicio: string;
    let dataFim: string;

    if (modoPgto === "mes") {
      dataInicio = `${anoPgto}-${mesStr}-01`;
      dataFim = `${anoPgto}-${mesStr}-${String(ultimoDiaMes(mesPgto, anoPgto)).padStart(2, "0")}`;
    } else if (quinzena === 1) {
      dataInicio = `${anoPgto}-${mesStr}-01`;
      dataFim = `${anoPgto}-${mesStr}-15`;
    } else {
      dataInicio = `${anoPgto}-${mesStr}-16`;
      dataFim = `${anoPgto}-${mesStr}-${String(ultimoDiaMes(mesPgto, anoPgto)).padStart(2, "0")}`;
    }

    const { data } = await supabase
      .from("exames")
      .select("id, data_exame, tipo, clinica, forma_pagamento, valor_bruto, nome_paciente, pets(nome)")
      .gte("data_exame", dataInicio)
      .lte("data_exame", dataFim)
      .order("data_exame");

    setExamesPgto((data as unknown as Exame[]) || []);
    setCalculado(true);
    setCarregandoPgto(false);
  }

  const totalBruto = useMemo(() => examesPgto.reduce((s, e) => s + (e.valor_bruto || 0), 0), [examesPgto]);
  const totalVet = useMemo(() => Math.round(totalBruto * 0.42 * 100) / 100, [totalBruto]);

  const labelPeriodo = useMemo(() => {
    const m = MESES[mesPgto - 1];
    if (modoPgto === "mes") return `${m} ${anoPgto}`;
    const ultimo = ultimoDiaMes(mesPgto, anoPgto);
    return quinzena === 1
      ? `1ª quinzena de ${m} ${anoPgto} (01–15)`
      : `2ª quinzena de ${m} ${anoPgto} (16–${ultimo})`;
  }, [modoPgto, quinzena, mesPgto, anoPgto]);

  if (!autenticado) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm p-8 w-full max-w-sm">
          <Image src="/Logomarca/imapet_transparent.png" alt="IMAPET" width={90} height={45} className="brightness-0 mb-6" />
          <h1 className="font-playfair text-2xl font-bold text-text-main mb-1">Área restrita</h1>
          <p className="text-sm text-text-muted mb-6">Gestão IMAPET</p>
          <input
            type="password"
            value={senha}
            onChange={e => { setSenha(e.target.value); setErroSenha(false); }}
            onKeyDown={e => e.key === "Enter" && login()}
            placeholder="Senha"
            className="input mb-3"
            autoFocus
          />
          {erroSenha && <p className="text-xs text-red-500 mb-3">Senha incorreta.</p>}
          <button onClick={login}
            className="w-full bg-primary text-white font-semibold py-3 rounded-xl hover:bg-primary-light transition">
            Entrar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <Image src="/Logomarca/imapet_transparent.png" alt="IMAPET" width={90} height={45} className="brightness-0" />
        <span className="text-sm font-semibold text-text-main">Gestão IMAPET</span>
        <button onClick={logout} className="text-xs text-text-muted hover:text-red-500 transition-colors">Sair</button>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        {/* ── PAGAMENTO DA VETERINÁRIA ── */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100">
            <h2 className="font-playfair text-xl font-bold text-text-main">Pagamento da veterinária</h2>
            <p className="text-xs text-text-muted mt-0.5">42% do valor bruto dos exames no período</p>
          </div>
          <div className="px-6 py-5 space-y-4">

            {/* Quinzena / Mês */}
            <div className="flex rounded-xl overflow-hidden border border-gray-200 w-fit">
              <button onClick={() => { setModoPgto("quinzena"); setCalculado(false); }}
                className={`px-5 py-2 text-sm font-medium transition-colors ${modoPgto === "quinzena" ? "bg-primary text-white" : "bg-white text-text-muted hover:bg-gray-50"}`}>
                Quinzena
              </button>
              <button onClick={() => { setModoPgto("mes"); setCalculado(false); }}
                className={`px-5 py-2 text-sm font-medium transition-colors ${modoPgto === "mes" ? "bg-primary text-white" : "bg-white text-text-muted hover:bg-gray-50"}`}>
                Mês
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {modoPgto === "quinzena" && (
                <div className="flex rounded-xl overflow-hidden border border-gray-200">
                  <button onClick={() => { setQuinzena(1); setCalculado(false); }}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${quinzena === 1 ? "bg-primary/10 text-primary" : "bg-white text-text-muted hover:bg-gray-50"}`}>
                    1ª quinzena
                  </button>
                  <button onClick={() => { setQuinzena(2); setCalculado(false); }}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${quinzena === 2 ? "bg-primary/10 text-primary" : "bg-white text-text-muted hover:bg-gray-50"}`}>
                    2ª quinzena
                  </button>
                </div>
              )}
              <select value={mesPgto} onChange={e => { setMesPgto(Number(e.target.value)); setCalculado(false); }} className="input text-sm py-2">
                {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
              <select value={anoPgto} onChange={e => { setAnoPgto(Number(e.target.value)); setCalculado(false); }} className="input text-sm py-2">
                {anos.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
              <button onClick={calcular} disabled={carregandoPgto}
                className="bg-primary text-white text-sm font-semibold px-5 py-2 rounded-xl hover:bg-primary-light transition disabled:opacity-50">
                {carregandoPgto ? "Calculando..." : "Calcular"}
              </button>
            </div>

            {calculado && (
              <div className="space-y-3">
                <div className="bg-primary/5 rounded-xl px-5 py-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-text-muted">{labelPeriodo}</p>
                    <p className="text-sm font-medium text-text-main mt-0.5">
                      {examesPgto.length} exame{examesPgto.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-text-muted mb-1">A pagar (42%)</p>
                    <p className="text-2xl font-bold text-primary">{moeda(totalVet)}</p>
                    <p className="text-xs text-text-muted mt-0.5">Bruto: {moeda(totalBruto)}</p>
                  </div>
                </div>

                {examesPgto.length > 0 && (
                  <div className="overflow-x-auto rounded-xl border border-gray-100">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-[10px] text-text-muted uppercase tracking-wider bg-gray-50 border-b border-gray-100">
                          <th className="text-left px-3 py-2.5">Data</th>
                          <th className="text-left px-3 py-2.5">Paciente</th>
                          <th className="text-left px-3 py-2.5">Clínica</th>
                          <th className="text-left px-3 py-2.5">Serviço</th>
                          <th className="text-right px-3 py-2.5">Bruto</th>
                          <th className="text-right px-3 py-2.5">Vet. 42%</th>
                          <th className="px-3 py-2.5"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {examesPgto.map(e => (
                          <tr key={e.id} className="hover:bg-gray-50">
                            <td className="px-3 py-2 text-text-muted whitespace-nowrap">{dataFmt(e.data_exame)}</td>
                            <td className="px-3 py-2 font-medium text-text-main">{e.nome_paciente || e.pets?.nome || "—"}</td>
                            <td className="px-3 py-2 text-text-muted">{e.clinica || "—"}</td>
                            <td className="px-3 py-2 text-text-muted">{e.tipo || "—"}</td>
                            <td className="px-3 py-2 text-right text-text-muted">{e.valor_bruto ? moeda(e.valor_bruto) : "—"}</td>
                            <td className="px-3 py-2 text-right font-semibold text-primary">{e.valor_bruto ? moeda(e.valor_bruto * 0.42) : "—"}</td>
                            <td className="px-3 py-2 text-center">
                              <button
                                onClick={() => apagarExame(e.id)}
                                className="text-gray-300 hover:text-red-500 transition-colors text-base leading-none"
                                title="Apagar exame"
                              >
                                🗑
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── RELAÇÃO CIA DO ANIMAL ── */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <img src="/cia-do-animal.jpg" alt="Cia do Animal" className="h-10 w-10 object-contain rounded-lg border border-gray-100" />
              <div>
                <h2 className="font-playfair text-xl font-bold text-text-main">Relação — Cia do Animal</h2>
                <p className="text-xs text-text-muted mt-0.5">Relatório mensal para cobrança</p>
              </div>
            </div>
          </div>
          <div className="px-6 py-5">
            <div className="flex flex-wrap items-center gap-2">
              <select value={mesRel} onChange={e => setMesRel(Number(e.target.value))} className="input text-sm py-2">
                {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
              <select value={anoRel} onChange={e => setAnoRel(Number(e.target.value))} className="input text-sm py-2">
                {anos.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
              <button
                onClick={() => window.open(`/owner/relatorio?mes=${mesRel}&ano=${anoRel}`, "_blank")}
                className="bg-primary text-white text-sm font-semibold px-5 py-2 rounded-xl hover:bg-primary-light transition flex items-center gap-2">
                📄 Gerar PDF
              </button>
            </div>
          </div>
        </div>

        {/* ── TABELA DE EXAMES ── */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100">
            <h2 className="font-playfair text-xl font-bold text-text-main">Todos os exames</h2>
            <p className="text-xs text-text-muted mt-0.5">Busca, filtros e exclusão de registros</p>
          </div>
          <div className="px-6 py-5 space-y-3">

            {/* Filtro de período */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex rounded-xl overflow-hidden border border-gray-200">
                <button onClick={() => setModoTabela("mensal")} className={`px-4 py-2 text-sm font-medium transition-colors ${modoTabela === "mensal" ? "bg-primary text-white" : "bg-white text-text-muted hover:bg-gray-50"}`}>Mensal</button>
                <button onClick={() => setModoTabela("periodo")} className={`px-4 py-2 text-sm font-medium transition-colors ${modoTabela === "periodo" ? "bg-primary text-white" : "bg-white text-text-muted hover:bg-gray-50"}`}>Período</button>
              </div>
              {modoTabela === "mensal" ? (
                <>
                  <select value={mesTabelaSel} onChange={e => setMesTabelaSel(Number(e.target.value))} className="input text-sm py-2">
                    {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                  </select>
                  <select value={anoTabelaSel} onChange={e => setAnoTabelaSel(Number(e.target.value))} className="input text-sm py-2">
                    {anosTabela.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </>
              ) : (
                <>
                  <input type="date" value={dataInicioTabela} onChange={e => setDataInicioTabela(e.target.value)} className="input text-sm py-2" />
                  <span className="text-sm text-text-muted">até</span>
                  <input type="date" value={dataFimTabela} onChange={e => setDataFimTabela(e.target.value)} className="input text-sm py-2" />
                  <button onClick={() => { setDataInicioAplicada(dataInicioTabela); setDataFimAplicada(dataFimTabela); }} className="bg-primary text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-primary-light transition">Aplicar</button>
                </>
              )}
            </div>

            {/* Busca + filtro clínica */}
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={buscaTabela}
                onChange={e => setBuscaTabela(e.target.value)}
                placeholder="Buscar por paciente, clínica, serviço ou data..."
                className="input text-sm flex-1"
              />
              {clinicaOptionsTabela.length > 1 && (
                <select value={filtroClinicaTabela} onChange={e => setFiltroClinicaTabela(e.target.value)} className="input text-sm sm:w-44">
                  <option value="">Clínica: todas</option>
                  {clinicaOptionsTabela.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              )}
              {(buscaTabela || filtroClinicaTabela) && (
                <button onClick={() => { setBuscaTabela(""); setFiltroClinicaTabela(""); }} className="text-xs text-text-muted hover:text-red-500 transition-colors px-2">Limpar</button>
              )}
            </div>

            {/* Contador */}
            <p className="text-xs text-text-muted">
              {(buscaTabela || filtroClinicaTabela) && filtradosTabela.length !== filtradosPeriodoTabela.length
                ? `${filtradosTabela.length} de ${filtradosPeriodoTabela.length} exames`
                : `${filtradosPeriodoTabela.length} exame${filtradosPeriodoTabela.length !== 1 ? "s" : ""}`}
            </p>
          </div>

          {carregandoTabela ? (
            <p className="text-sm text-text-muted px-6 pb-8">Carregando...</p>
          ) : filtradosTabela.length === 0 ? (
            <p className="text-sm text-text-muted px-6 pb-8">
              {buscaTabela || filtroClinicaTabela ? "Nenhum exame encontrado para essa busca." : "Nenhum exame neste período."}
            </p>
          ) : (
            <div className="overflow-x-auto border-t border-gray-100">
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
                  {filtradosTabela.map(e => (
                    <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-3 py-2 text-text-muted whitespace-nowrap">{dataFmt(e.data_exame)}</td>
                      <td className="px-3 py-2 font-medium text-text-main">{e.nome_paciente || e.pets?.nome || "—"}</td>
                      <td className="px-3 py-2 text-text-muted">{e.clinica || "—"}</td>
                      <td className="px-3 py-2 text-text-muted">{e.tipo || "—"}</td>
                      <td className="px-3 py-2 text-text-muted">{e.forma_pagamento || "—"}</td>
                      <td className="px-3 py-2 text-right text-text-muted">{e.valor_bruto ? moeda(e.valor_bruto) : "—"}</td>
                      <td className="px-3 py-2 text-center">
                        <button
                          onClick={() => apagarExame(e.id)}
                          className="text-gray-300 hover:text-red-500 transition-colors text-base leading-none"
                          title="Apagar exame"
                        >
                          🗑
                        </button>
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
