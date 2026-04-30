"use client";

import { Fragment, useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { moeda, dataFmt } from "@/lib/utils";

type ExamePendente = {
  id: string;
  data_exame: string;
  tipo: string | null;
  clinica: string | null;
  valor_bruto: number | null;
  nome_paciente: string | null;
  pets: { nome: string } | null;
};

export default function PagamentosPendentes() {
  const [exames, setExames] = useState<ExamePendente[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [formas, setFormas] = useState<string[]>([]);
  const [marcandoId, setMarcandoId] = useState<string | null>(null);
  const [formaSel, setFormaSel] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase.from("exames")
        .select("id, data_exame, tipo, clinica, valor_bruto, nome_paciente, pets(nome)")
        .eq("forma_pagamento", "Pendente")
        .order("data_exame", { ascending: true }),
      supabase.from("formas_pagamento").select("nome").order("id"),
    ]).then(([{ data: ex }, { data: fp }]) => {
      setExames((ex as unknown as ExamePendente[]) || []);
      const lista = ((fp || []) as { nome: string }[])
        .map(f => f.nome)
        .filter(n => n !== "Pendente");
      setFormas(lista);
      if (lista.length > 0) setFormaSel(lista[0]);
      setCarregando(false);
    });
  }, []);

  async function marcarRecebido(id: string) {
    if (!formaSel) return;
    setSalvando(true);
    const { error } = await createClient()
      .from("exames")
      .update({ forma_pagamento: formaSel })
      .eq("id", id);
    if (!error) {
      setExames(prev => prev.filter(e => e.id !== id));
      setMarcandoId(null);
    }
    setSalvando(false);
  }

  const porClinica = useMemo(() => {
    const map: Record<string, ExamePendente[]> = {};
    exames.forEach(e => {
      const c = e.clinica || "Sem clínica";
      if (!map[c]) map[c] = [];
      map[c].push(e);
    });
    return Object.entries(map).sort((a, b) => {
      const totalA = a[1].reduce((s, e) => s + (e.valor_bruto || 0), 0);
      const totalB = b[1].reduce((s, e) => s + (e.valor_bruto || 0), 0);
      return totalB - totalA;
    });
  }, [exames]);

  const total = exames.reduce((s, e) => s + (e.valor_bruto || 0), 0);

  if (carregando) return <p className="text-center text-text-muted py-20">Carregando...</p>;

  return (
    <div className="space-y-6">
      <div className="bg-primary text-white rounded-2xl p-6 flex items-center justify-between">
        <div>
          <p className="text-sm text-white/70">Total a receber</p>
          <p className="font-playfair text-3xl font-bold">{moeda(total)}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-white/70">Exames pendentes</p>
          <p className="font-playfair text-3xl font-bold">{exames.length}</p>
        </div>
      </div>

      {exames.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 shadow-sm text-center">
          <span className="text-4xl">🎉</span>
          <p className="text-sm text-text-muted mt-3">Tudo em dia! Nenhum pagamento pendente.</p>
        </div>
      ) : porClinica.map(([clinica, lista]) => {
        const totalClinica = lista.reduce((s, e) => s + (e.valor_bruto || 0), 0);
        return (
          <div key={clinica} className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-text-main">{clinica}</h2>
              <span className="text-sm text-text-muted">
                {lista.length} exame{lista.length !== 1 ? "s" : ""} · <strong className="text-primary">{moeda(totalClinica)}</strong>
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[10px] text-text-muted uppercase tracking-wider bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-3 py-3 whitespace-nowrap">Data</th>
                    <th className="text-left px-3 py-3">Paciente</th>
                    <th className="text-left px-3 py-3">Serviço</th>
                    <th className="text-right px-3 py-3">Valor</th>
                    <th className="px-3 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {lista.map(e => {
                    const paciente = e.nome_paciente || e.pets?.nome || "—";
                    const ehMarcando = marcandoId === e.id;
                    return (
                      <Fragment key={e.id}>
                        <tr className="hover:bg-gray-50 transition-colors">
                          <td className="px-3 py-2 text-text-muted whitespace-nowrap">{dataFmt(e.data_exame)}</td>
                          <td className="px-3 py-2 font-medium text-text-main">{paciente}</td>
                          <td className="px-3 py-2 text-text-muted">{e.tipo || "—"}</td>
                          <td className="px-3 py-2 text-right font-semibold text-text-main">{e.valor_bruto ? moeda(e.valor_bruto) : "—"}</td>
                          <td className="px-3 py-2 text-right whitespace-nowrap">
                            {!ehMarcando && (
                              <button
                                onClick={() => setMarcandoId(e.id)}
                                className="text-xs font-medium text-primary hover:bg-primary/10 px-3 py-1.5 rounded-lg transition-colors"
                              >
                                ✓ Recebido
                              </button>
                            )}
                          </td>
                        </tr>
                        {ehMarcando && (
                          <tr className="bg-primary/5">
                            <td colSpan={5} className="px-3 py-3">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs text-text-muted">Recebido como:</span>
                                <select
                                  value={formaSel}
                                  onChange={ev => setFormaSel(ev.target.value)}
                                  className="input text-xs py-1.5 w-36"
                                >
                                  {formas.map(f => <option key={f} value={f}>{f}</option>)}
                                </select>
                                <button
                                  onClick={() => marcarRecebido(e.id)}
                                  disabled={salvando}
                                  className="bg-primary text-white text-xs font-semibold px-4 py-1.5 rounded-lg hover:bg-primary-light transition disabled:opacity-50"
                                >
                                  {salvando ? "Salvando..." : "Confirmar"}
                                </button>
                                <button
                                  onClick={() => setMarcandoId(null)}
                                  disabled={salvando}
                                  className="text-xs text-text-muted hover:text-red-500 px-2 py-1.5"
                                >
                                  Cancelar
                                </button>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
