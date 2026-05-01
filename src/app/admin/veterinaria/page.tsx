"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { moeda, dataFmt, ultimoDiaMes } from "@/lib/utils";

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const HOJE = new Date();
const anos = [2024, 2025, 2026, 2027];

type Exame = {
  id: string;
  data_exame: string;
  tipo: string | null;
  clinica: string | null;
  valor_bruto: number | null;
  nome_paciente: string | null;
  pets: { nome: string; especie: string | null; raca: string | null } | null;
};

export default function VeterinariaAdminPage() {
  const [modoPgto, setModoPgto] = useState<"quinzena" | "mes">("quinzena");
  const [quinzena, setQuinzena] = useState<1 | 2>(1);
  const [mesPgto, setMesPgto] = useState(HOJE.getMonth() + 1);
  const [anoPgto, setAnoPgto] = useState(HOJE.getFullYear());
  const [exames, setExames] = useState<Exame[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [calculado, setCalculado] = useState(false);

  const totalBruto = useMemo(() => exames.reduce((s, e) => s + (e.valor_bruto || 0), 0), [exames]);
  const totalVet = useMemo(() => Math.round(totalBruto * 0.42 * 100) / 100, [totalBruto]);

  const labelPeriodo = useMemo(() => {
    const m = MESES[mesPgto - 1];
    if (modoPgto === "mes") return `${m} ${anoPgto}`;
    const ultimo = ultimoDiaMes(mesPgto, anoPgto);
    return quinzena === 1
      ? `1ª quinzena de ${m} ${anoPgto} (01–15)`
      : `2ª quinzena de ${m} ${anoPgto} (16–${ultimo})`;
  }, [modoPgto, quinzena, mesPgto, anoPgto]);

  async function calcular() {
    setCarregando(true);
    setCalculado(false);
    const supabase = createClient();
    const mesStr = String(mesPgto).padStart(2, "0");
    let dataInicio: string, dataFim: string;
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
      .select("id, data_exame, tipo, clinica, valor_bruto, nome_paciente, pets(nome, especie, raca)")
      .gte("data_exame", dataInicio)
      .lte("data_exame", dataFim)
      .order("data_exame");
    setExames((data as unknown as Exame[]) || []);
    setCalculado(true);
    setCarregando(false);
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <Image src="/Logomarca/imapet_transparent.png" alt="IMAPET" width={100} height={50} className="brightness-0" />
        <div className="flex items-center gap-2">
          <Link href="/admin/financeiro" className="text-sm font-medium px-4 py-2 rounded-xl border border-gray-200 text-text-muted hover:border-primary hover:text-primary transition-colors">Tabela</Link>
          <Link href="/admin/financeiro/dashboard" className="text-sm font-medium px-4 py-2 rounded-xl border border-gray-200 text-text-muted hover:border-primary hover:text-primary transition-colors">Dashboard</Link>
          <span className="text-sm font-semibold px-4 py-2 rounded-xl bg-primary text-white">Meu pagamento</span>
          <Link href="/admin/pendentes" className="text-sm font-medium px-4 py-2 rounded-xl border border-gray-200 text-text-muted hover:border-primary hover:text-primary transition-colors">Pendentes</Link>
          <Link href="/admin" className="text-sm font-medium px-4 py-2 rounded-xl border border-gray-200 text-text-muted hover:border-primary hover:text-primary transition-colors">+ Novo exame</Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100">
            <h1 className="font-playfair text-xl font-bold text-text-main">Calcular meu pagamento</h1>
            <p className="text-xs text-text-muted mt-0.5">42% do valor bruto dos exames no período</p>
          </div>
          <div className="px-6 py-5 space-y-4">
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
              <button onClick={calcular} disabled={carregando}
                className="bg-primary text-white text-sm font-semibold px-5 py-2 rounded-xl hover:bg-primary-light transition disabled:opacity-50">
                {carregando ? "Calculando..." : "Calcular"}
              </button>
            </div>

            {calculado && (
              <div className="space-y-3">
                <div className="bg-primary/5 rounded-xl px-5 py-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-text-muted">{labelPeriodo}</p>
                    <p className="text-sm font-medium text-text-main mt-0.5">{exames.length} exame{exames.length !== 1 ? "s" : ""}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-text-muted mb-1">A receber (42%)</p>
                    <p className="text-2xl font-bold text-primary">{moeda(totalVet)}</p>
                    <p className="text-xs text-text-muted mt-0.5">Bruto: {moeda(totalBruto)}</p>
                  </div>
                </div>

                {exames.length > 0 && (
                  <div className="overflow-x-auto rounded-xl border border-gray-100">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-[10px] text-text-muted uppercase tracking-wider bg-gray-50 border-b border-gray-100">
                          <th className="text-left px-3 py-2.5">Data</th>
                          <th className="text-left px-3 py-2.5">Paciente</th>
                          <th className="text-left px-3 py-2.5">Espécie</th>
                          <th className="text-left px-3 py-2.5">Raça</th>
                          <th className="text-left px-3 py-2.5">Clínica</th>
                          <th className="text-left px-3 py-2.5">Serviço</th>
                          <th className="text-right px-3 py-2.5">Bruto</th>
                          <th className="text-right px-3 py-2.5">Meu (42%)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {exames.map(e => (
                          <tr key={e.id} className="hover:bg-gray-50">
                            <td className="px-3 py-2 text-text-muted whitespace-nowrap">{dataFmt(e.data_exame)}</td>
                            <td className="px-3 py-2 font-medium text-text-main">{e.nome_paciente || e.pets?.nome || "—"}</td>
                            <td className="px-3 py-2 text-text-muted">{e.pets?.especie || "—"}</td>
                            <td className="px-3 py-2 text-text-muted">{e.pets?.raca || "—"}</td>
                            <td className="px-3 py-2 text-text-muted">{e.clinica || "—"}</td>
                            <td className="px-3 py-2 text-text-muted">{e.tipo || "—"}</td>
                            <td className="px-3 py-2 text-right text-text-muted">{e.valor_bruto ? moeda(e.valor_bruto) : "—"}</td>
                            <td className="px-3 py-2 text-right font-semibold text-primary">{e.valor_bruto ? moeda(e.valor_bruto * 0.42) : "—"}</td>
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
      </main>
    </div>
  );
}
