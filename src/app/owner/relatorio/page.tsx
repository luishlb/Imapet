"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const PLANOS = new Set(["eupet", "petcare", "petlove", "pettop"]);

type Exame = {
  id: string;
  data_exame: string;
  tipo: string | null;
  forma_pagamento: string | null;
  valor_bruto: number | null;
  nome_paciente: string | null;
  pets: { nome: string; raca: string | null } | null;
};

function moeda(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function dataFmt(d: string) {
  const [a, m, dia] = d.split("-");
  return `${dia}/${m}/${a}`;
}

function ultimoDiaMes(mes: number, ano: number) {
  return new Date(ano, mes, 0).getDate();
}

function formatarPagamento(p: string | null): string {
  if (!p) return "Pendente";
  if (PLANOS.has(p.trim().toLowerCase())) return p.trim();
  return "Pendente";
}

function valorExtenso(valor: number): string {
  if (isNaN(valor) || valor <= 0) return "zero reais";
  const reais = Math.floor(valor);
  const centavos = Math.round((valor - reais) * 100);
  const u = ["","um","dois","três","quatro","cinco","seis","sete","oito","nove",
    "dez","onze","doze","treze","quatorze","quinze","dezesseis","dezessete","dezoito","dezenove"];
  const dz = ["","","vinte","trinta","quarenta","cinquenta","sessenta","setenta","oitenta","noventa"];
  const c = ["","cento","duzentos","trezentos","quatrocentos","quinhentos","seiscentos","setecentos","oitocentos","novecentos"];
  function n2w(n: number): string {
    if (n === 0) return "";
    if (n === 100) return "cem";
    if (n < 20) return u[n];
    if (n < 100) return dz[Math.floor(n/10)] + (n%10 ? " e " + u[n%10] : "");
    const r = n % 100;
    return c[Math.floor(n/100)] + (r ? " e " + n2w(r) : "");
  }
  function full(n: number): string {
    if (n === 0) return "zero";
    if (n < 1000) return n2w(n);
    const mil = Math.floor(n / 1000);
    const r = n % 1000;
    return (mil === 1 ? "mil" : n2w(mil) + " mil") + (r ? (r < 100 ? " e " : ", ") + n2w(r) : "");
  }
  let result = full(reais) + (reais === 1 ? " real" : " reais");
  if (centavos > 0) result += " e " + n2w(centavos) + (centavos === 1 ? " centavo" : " centavos");
  return result.charAt(0).toUpperCase() + result.slice(1);
}

function RelatorioContent() {
  const params = useSearchParams();
  const mes = Number(params.get("mes")) || new Date().getMonth() + 1;
  const ano = Number(params.get("ano")) || new Date().getFullYear();

  const [exames, setExames] = useState<Exame[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    const mesStr = String(mes).padStart(2, "0");
    const ultimo = String(ultimoDiaMes(mes, ano)).padStart(2, "0");
    supabase
      .from("exames")
      .select("id, data_exame, tipo, forma_pagamento, valor_bruto, nome_paciente, pets(nome, raca)")
      .eq("clinica", "Cia do Animal")
      .gte("data_exame", `${ano}-${mesStr}-01`)
      .lte("data_exame", `${ano}-${mesStr}-${ultimo}`)
      .order("data_exame")
      .then(({ data }) => {
        setExames((data as unknown as Exame[]) || []);
        setCarregando(false);
      });
  }, [mes, ano]);

  const totalPendente = exames.reduce((s, e) =>
    formatarPagamento(e.forma_pagamento) === "Pendente" ? s + (e.valor_bruto || 0) : s, 0);

  const ultimoDia = ultimoDiaMes(mes, ano);
  const dataFimStr = `${String(ultimoDia).padStart(2,"0")}/${String(mes).padStart(2,"0")}/${ano}`;
  const mesNome = MESES[mes - 1];

  if (carregando) {
    return <div className="flex items-center justify-center min-h-screen text-gray-400 text-sm">Carregando...</div>;
  }

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          @page { margin: 12mm 15mm; size: A4 portrait; }
        }
        body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; background: #fff; }
      `}</style>

      <div className="no-print fixed top-4 right-4 z-50">
        <button onClick={() => window.print()}
          className="bg-primary text-white font-semibold px-6 py-3 rounded-xl shadow-lg hover:bg-primary-light transition text-sm">
          Salvar PDF
        </button>
      </div>

      <div style={{ maxWidth: 780, margin: "0 auto", padding: "40px 48px", background: "#fff" }}>

        {/* ── HEADER ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <img src="/Logomarca/57423_Imapet_040521_aa-01.png" alt="IMAPET" style={{ height: 80 }} />
          <div style={{ textAlign: "right" }}>
            <img src="/cia-do-animal.jpg" alt="Cia do Animal" style={{ height: 60, objectFit: "contain", display: "block", marginLeft: "auto", marginBottom: 4 }} />
            <p style={{ fontSize: 11, color: "#888", margin: 0 }}>CNPJ / Clínica Parceira</p>
          </div>
        </div>

        {/* Faixa bordô */}
        <div style={{ background: "#8B1A1A", height: 4, borderRadius: 2, marginBottom: 6 }} />
        <div style={{ background: "#8B1A1A", height: 1, opacity: 0.3, marginBottom: 24 }} />

        {/* ── TÍTULO ── */}
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 17, fontWeight: 700, color: "#8B1A1A", margin: "0 0 4px" }}>
            Relação de Exames — Cia do Animal
          </h1>
          <p style={{ fontSize: 13, color: "#666", margin: 0 }}>
            Período: {mesNome} de {ano} &nbsp;·&nbsp; Emitido em {new Date().toLocaleDateString("pt-BR")}
          </p>
        </div>

        {/* ── TABELA ── */}
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, marginBottom: 24 }}>
          <thead>
            <tr style={{ backgroundColor: "#8B1A1A" }}>
              {["Data", "Pagamento", "Valor", "Procedimento", "Paciente"].map(h => (
                <th key={h} style={{ padding: "9px 11px", textAlign: "left", fontWeight: 600, color: "#fff", fontSize: 11, letterSpacing: "0.03em", textTransform: "uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {exames.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: "20px", textAlign: "center", color: "#999", fontStyle: "italic" }}>
                  Nenhum exame encontrado para este período.
                </td>
              </tr>
            ) : exames.map((e, i) => {
              const nome = e.nome_paciente || e.pets?.nome || "—";
              const raca = e.pets?.raca;
              const paciente = raca ? `${nome}/${raca}` : nome;
              const pgto = formatarPagamento(e.forma_pagamento);
              return (
                <tr key={e.id} style={{ backgroundColor: i % 2 === 0 ? "#faf8f5" : "#fff" }}>
                  <td style={{ padding: "7px 11px", borderBottom: "1px solid #eee", color: "#444", whiteSpace: "nowrap", fontWeight: 600 }}>{dataFmt(e.data_exame)}</td>
                  <td style={{ padding: "7px 11px", borderBottom: "1px solid #eee", color: "#555" }}>{pgto}</td>
                  <td style={{ padding: "7px 11px", borderBottom: "1px solid #eee", color: "#444", whiteSpace: "nowrap" }}>{e.valor_bruto ? moeda(e.valor_bruto) : "—"}</td>
                  <td style={{ padding: "7px 11px", borderBottom: "1px solid #eee", color: "#555" }}>{e.tipo || "—"}</td>
                  <td style={{ padding: "7px 11px", borderBottom: "1px solid #eee", color: "#555" }}>{paciente}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* ── TOTAL PENDENTE ── */}
        <div style={{ background: "#fff8f8", border: "1px solid #f5c6c6", borderRadius: 8, padding: "14px 20px", marginBottom: 40, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p style={{ fontSize: 11, color: "#888", margin: "0 0 2px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Valor total pendente em {dataFimStr}</p>
            <p style={{ fontSize: 11, color: "#c0392b", margin: 0, fontStyle: "italic" }}>{valorExtenso(totalPendente)}</p>
          </div>
          <p style={{ fontSize: 22, fontWeight: 700, color: "#8B1A1A", margin: 0 }}>{moeda(totalPendente)}</p>
        </div>

        {/* ── ASSINATURA ── */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 48 }}>
          <div style={{ textAlign: "center" }}>
            <img src="/assinatura.png" alt="Assinatura" style={{ height: 70, objectFit: "contain", display: "block", margin: "0 auto 6px" }} />
            <div style={{ borderTop: "1px solid #ccc", paddingTop: 8, width: 260 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#333", margin: 0 }}>Camila Bentzen Barreto</p>
              <p style={{ fontSize: 11, color: "#777", margin: "3px 0 0" }}>Médica Veterinária · CRMV-PE 5916</p>
              <p style={{ fontSize: 11, color: "#8B1A1A", margin: "2px 0 0", fontWeight: 600 }}>IMAPET Diagnóstico Veterinário por Imagem</p>
            </div>
          </div>
        </div>

        {/* ── FOOTER ── */}
        <div style={{ borderTop: "2px solid #8B1A1A", paddingTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            {[
              { icon: "📱", text: "(81) 99674-1525" },
              { icon: "🌐", text: "www.imapet.com.br" },
              { icon: "✉️", text: "imapet@imapet.com.br" },
              { icon: "📷", text: "@Imapet_diagvet" },
              { icon: "📘", text: "Imapet_diagvet" },
            ].map(({ icon, text }) => (
              <span key={text} style={{ fontSize: 10.5, color: "#666", display: "flex", alignItems: "center", gap: 4 }}>
                <span>{icon}</span>{text}
              </span>
            ))}
          </div>
          <img src="/Logomarca/imapet_transparent.png" alt="" style={{ height: 28, opacity: 0.25 }} />
        </div>

      </div>
    </>
  );
}

export default function RelatorioPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen text-gray-400 text-sm">Carregando...</div>}>
      <RelatorioContent />
    </Suspense>
  );
}
