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
          @page { margin: 15mm 20mm; size: A4 portrait; }
        }
        body { font-family: Arial, sans-serif; }
      `}</style>

      <div className="no-print fixed top-4 right-4 z-50 flex gap-2">
        <button onClick={() => window.print()}
          className="bg-primary text-white font-semibold px-5 py-2 rounded-xl shadow-md hover:bg-primary-light transition text-sm">
          Imprimir / Salvar PDF
        </button>
        <button onClick={() => window.close()}
          className="bg-white border border-gray-200 text-text-muted font-medium px-4 py-2 rounded-xl text-sm hover:border-gray-400 transition">
          Fechar
        </button>
      </div>

      <div className="min-h-screen bg-white relative" style={{ padding: "40px 50px" }}>

        {/* Watermark */}
        <div className="fixed bottom-0 right-0 pointer-events-none" style={{ opacity: 0.07, width: 380, height: 380 }}>
          <img src="/Logomarca/57423_Imapet_040521_aa-01.png" alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
        </div>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
          <img src="/Logomarca/57423_Imapet_040521_aa-01.png" alt="IMAPET" style={{ height: 75 }} />
          <img src="/cia-do-animal.jpg" alt="Cia do Animal" style={{ height: 65, objectFit: "contain" }} />
        </div>

        {/* Red line */}
        <div style={{ borderTop: "2px solid #8B1A1A", marginBottom: 28 }} />

        {/* Title */}
        <h1 style={{ textAlign: "center", fontSize: 18, fontWeight: 600, color: "#333", marginBottom: 20 }}>
          Relação dos exames realizados na clínica veterinária Cia do Animal — {mesNome} {ano}:
        </h1>

        {/* Table */}
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginBottom: 28 }}>
          <thead>
            <tr style={{ backgroundColor: "#C8B89A" }}>
              {["Data","Forma de Pagamento","Valor","Procedimento","Paciente"].map(h => (
                <th key={h} style={{ border: "1px solid #C8B89A", padding: "7px 10px", textAlign: "left", fontWeight: 600, color: "#333" }}>{h}</th>
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
              const bg = i % 2 === 0 ? "#F5F0E8" : "#FFFFFF";
              return (
                <tr key={e.id} style={{ backgroundColor: bg }}>
                  <td style={{ border: "1px solid #ddd", padding: "6px 10px", fontWeight: 600, color: "#333", whiteSpace: "nowrap" }}>{dataFmt(e.data_exame)}</td>
                  <td style={{ border: "1px solid #ddd", padding: "6px 10px", color: "#555" }}>{pgto}</td>
                  <td style={{ border: "1px solid #ddd", padding: "6px 10px", color: "#555", whiteSpace: "nowrap" }}>{e.valor_bruto ? moeda(e.valor_bruto) : "—"}</td>
                  <td style={{ border: "1px solid #ddd", padding: "6px 10px", color: "#555" }}>{e.tipo || "—"}</td>
                  <td style={{ border: "1px solid #ddd", padding: "6px 10px", color: "#555" }}>{paciente}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Total pendente */}
        <p style={{ textAlign: "center", fontWeight: 700, fontSize: 14, color: "#333", marginBottom: 60 }}>
          Valor total pendente em {dataFimStr}: {moeda(totalPendente)} ({valorExtenso(totalPendente)})
        </p>

        {/* Assinatura */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 60 }}>
          <div style={{ textAlign: "center" }}>
            <img src="/assinatura.png" alt="Assinatura" style={{ height: 75, objectFit: "contain", display: "block", margin: "0 auto 4px" }} />
            <div style={{ borderTop: "1px solid #aaa", paddingTop: 8, width: 260 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#333", margin: 0 }}>Camila Bentzen Barreto</p>
              <p style={{ fontSize: 11, color: "#777", margin: "2px 0 0" }}>Médica Veterinária — CRMV-PE 5916</p>
            </div>
          </div>
        </div>

        {/* Footer contato */}
        <div style={{ borderTop: "1px solid #eee", paddingTop: 10, display: "flex", gap: 24, fontSize: 11, color: "#888", flexWrap: "wrap" }}>
          <span>🌐 www.imapet.com.br</span>
          <span>✉️ atendimento@imapet.com.br</span>
          <span>📷 @Imapet_diagvet</span>
          <span>📘 Imapet_diagvet</span>
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
