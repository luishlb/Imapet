"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { moeda } from "@/lib/utils";

type LogEntry = {
  id: string;
  exame_id: string | null;
  acao: "edit" | "delete" | "pagamento_recebido";
  alteracoes: Record<string, unknown> | null;
  resumo: string | null;
  origem: "admin" | "owner" | null;
  criado_em: string;
};

const RTULOS_CAMPO: Record<string, string> = {
  data_exame: "Data",
  clinica: "Clínica",
  tipo: "Serviço",
  forma_pagamento: "Forma de pagamento",
  valor_bruto: "Valor bruto",
  paciente: "Paciente",
  especie: "Espécie",
  raca: "Raça",
};

function fmtTimestamp(s: string): string {
  const d = new Date(s);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function fmtValor(campo: string, v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (campo === "valor_bruto") return typeof v === "number" ? moeda(v) : String(v);
  if (campo === "data_exame" && typeof v === "string") {
    const [a, m, d] = v.split("-");
    return `${d}/${m}/${a}`;
  }
  return String(v);
}

function rotuloAcao(acao: LogEntry["acao"]): { texto: string; cor: string; emoji: string } {
  if (acao === "edit") return { texto: "Editado", cor: "text-blue-600 bg-blue-50", emoji: "✏️" };
  if (acao === "delete") return { texto: "Apagado", cor: "text-red-600 bg-red-50", emoji: "🗑" };
  return { texto: "Pagamento recebido", cor: "text-green-700 bg-green-50", emoji: "💰" };
}

export default function HistoricoPage() {
  const router = useRouter();
  const [auth, setAuth] = useState<boolean | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [filtro, setFiltro] = useState<"todos" | "edit" | "delete" | "pagamento_recebido">("todos");

  useEffect(() => {
    if (localStorage.getItem("owner_auth") !== "1") { router.replace("/owner"); return; }
    setAuth(true);
    createClient().from("exames_log")
      .select("*")
      .order("criado_em", { ascending: false })
      .limit(500)
      .then(({ data }) => {
        setLogs((data as LogEntry[]) || []);
        setCarregando(false);
      });
  }, [router]);

  if (!auth) return null;

  const filtrados = filtro === "todos" ? logs : logs.filter(l => l.acao === filtro);

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-4 sticky top-0 z-10">
        <Link href="/owner" className="text-sm text-text-muted hover:text-primary transition-colors">← Voltar</Link>
        <span className="text-sm font-semibold text-text-main">Histórico de alterações</span>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-2 flex-wrap">
          <span className="text-sm text-text-muted">Filtrar:</span>
          {[
            { v: "todos", l: "Todos" },
            { v: "edit", l: "Edições" },
            { v: "delete", l: "Exclusões" },
            { v: "pagamento_recebido", l: "Pagamentos" },
          ].map(({ v, l }) => (
            <button key={v} onClick={() => setFiltro(v as typeof filtro)}
              className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${filtro === v ? "bg-primary text-white" : "bg-gray-50 text-text-muted hover:bg-gray-100"}`}>
              {l}
            </button>
          ))}
          <span className="ml-auto text-xs text-text-muted">{filtrados.length} registro{filtrados.length !== 1 ? "s" : ""}</span>
        </div>

        {carregando ? (
          <p className="text-center text-text-muted py-20">Carregando...</p>
        ) : filtrados.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 shadow-sm text-center">
            <span className="text-4xl">📋</span>
            <p className="text-sm text-text-muted mt-3">Nenhum registro de alteração ainda.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtrados.map(log => {
              const { texto, cor, emoji } = rotuloAcao(log.acao);
              return (
                <div key={log.id} className="bg-white rounded-2xl p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${cor}`}>
                        {emoji} {texto}
                      </span>
                      <span className="text-xs text-text-muted">
                        {log.origem === "admin" ? "Veterinária" : log.origem === "owner" ? "Owner" : "—"}
                      </span>
                    </div>
                    <span className="text-xs text-text-muted">{fmtTimestamp(log.criado_em)}</span>
                  </div>

                  {log.resumo && (
                    <p className="text-sm font-medium text-text-main mb-2">{log.resumo}</p>
                  )}

                  {log.acao === "edit" && log.alteracoes && (
                    <div className="space-y-1.5 mt-2">
                      {Object.entries(log.alteracoes as Record<string, { de: unknown; para: unknown }>).map(([campo, v]) => (
                        <div key={campo} className="flex items-baseline gap-2 text-xs flex-wrap">
                          <span className="font-medium text-text-muted min-w-[110px]">{RTULOS_CAMPO[campo] || campo}:</span>
                          <span className="text-red-500 line-through">{fmtValor(campo, v.de)}</span>
                          <span className="text-text-muted">→</span>
                          <span className="text-green-700 font-medium">{fmtValor(campo, v.para)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {log.acao === "pagamento_recebido" && log.alteracoes && (
                    <p className="text-xs text-text-muted mt-1">
                      Marcado como recebido como <strong className="text-green-700">{(log.alteracoes as { forma_pagamento: { para: string } }).forma_pagamento.para}</strong>
                    </p>
                  )}

                  {log.acao === "delete" && log.alteracoes && (
                    <div className="text-xs text-text-muted space-y-0.5 mt-2 bg-gray-50 rounded-lg px-3 py-2">
                      {Object.entries(log.alteracoes).map(([campo, v]) => (
                        <div key={campo}>
                          <span className="font-medium">{RTULOS_CAMPO[campo] || campo}:</span> {fmtValor(campo, v)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
