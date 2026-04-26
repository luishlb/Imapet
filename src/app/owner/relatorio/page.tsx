"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type jsPDFType from "jspdf";

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
  const [gerando, setGerando] = useState(false);

  async function gerarPDF() {
    setGerando(true);
    try {
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import("jspdf"),
        import("html2canvas"),
      ]);
      const el = document.getElementById("relatorio-doc") as HTMLElement;
      const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new (jsPDF as unknown as typeof jsPDFType)("p", "mm", "a4");
      const pw = pdf.internal.pageSize.getWidth();
      const ph = pdf.internal.pageSize.getHeight();
      const imgH = (canvas.height * pw) / canvas.width;
      let y = 0;
      while (y < imgH) {
        if (y > 0) pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, -y, pw, imgH);
        y += ph;
      }
      const mesNomeArq = MESES[mes - 1].toLowerCase();
      pdf.save(`relatorio-cia-do-animal-${mesNomeArq}-${ano}.pdf`);
    } finally {
      setGerando(false);
    }
  }

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
    return <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh", color:"#999", fontSize:14 }}>Carregando...</div>;
  }

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; padding: 0; background: #f0f0f0; font-family: 'Segoe UI', Arial, sans-serif; }

        .toolbar {
          background: #fff;
          border-bottom: 1px solid #ddd;
          padding: 10px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          position: sticky;
          top: 0;
          z-index: 100;
        }
        .toolbar p { margin: 0; font-size: 12px; color: #888; flex: 1; }
        .toolbar button {
          background: #8B1A1A;
          color: #fff;
          border: none;
          padding: 10px 22px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
        }

        .page {
          width: 210mm;
          min-height: 297mm;
          margin: 24px auto;
          background: #fff;
          padding: 16mm 15mm;
          box-shadow: 0 2px 16px rgba(0,0,0,0.12);
        }

        .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
        .header-right { text-align: right; }
        .header-right p { font-size: 10px; color: #999; margin: 4px 0 0; }

        .stripe1 { height: 4px; background: #8B1A1A; border-radius: 2px; margin-bottom: 4px; }
        .stripe2 { height: 1px; background: #8B1A1A; opacity: 0.25; margin-bottom: 20px; }

        .title { margin-bottom: 16px; }
        .title h1 { font-size: 16px; font-weight: 700; color: #8B1A1A; margin: 0 0 3px; }
        .title p { font-size: 12px; color: #666; margin: 0; }

        table { width: 100%; border-collapse: collapse; font-size: 11.5px; margin-bottom: 20px; table-layout: fixed; }
        thead tr { background: #8B1A1A; }
        th {
          padding: 8px 8px;
          text-align: left;
          color: #fff;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          overflow: hidden;
        }
        td {
          padding: 6px 8px;
          border-bottom: 1px solid #f0f0f0;
          color: #444;
          overflow: hidden;
          word-break: break-word;
        }
        tr:nth-child(even) td { background: #faf8f5; }

        .col-data       { width: 13%; }
        .col-pagamento  { width: 14%; }
        .col-valor      { width: 13%; }
        .col-proc       { width: 35%; }
        .col-paciente   { width: 25%; }

        .totais {
          border: 1px solid #e8c4c4;
          border-radius: 8px;
          padding: 12px 16px;
          margin-bottom: 32px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #fff8f8;
        }
        .totais-left p { margin: 0; }
        .totais-label { font-size: 10px; color: #999; text-transform: uppercase; letter-spacing: 0.05em; }
        .totais-extenso { font-size: 10.5px; color: #c0392b; font-style: italic; margin-top: 3px !important; }
        .totais-valor { font-size: 22px; font-weight: 700; color: #8B1A1A; margin: 0; }

        .assinatura { display: flex; justify-content: center; margin-bottom: 36px; }
        .assinatura-inner { text-align: center; }
        .assinatura-inner img { height: 60px; object-fit: contain; display: block; margin: 0 auto 6px; }
        .assinatura-linha { border-top: 1px solid #ccc; padding-top: 8px; width: 240px; }
        .assinatura-nome { font-size: 12.5px; font-weight: 700; color: #333; margin: 0; }
        .assinatura-cargo { font-size: 10.5px; color: #777; margin: 2px 0 0; }
        .assinatura-empresa { font-size: 10.5px; color: #8B1A1A; font-weight: 600; margin: 2px 0 0; }

        .footer {
          border-top: 2px solid #8B1A1A;
          padding-top: 10px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 6px;
        }
        .footer-contacts { display: flex; flex-wrap: wrap; gap: 14px; }
        .footer-contact { font-size: 10px; color: #666; display: flex; align-items: center; gap: 3px; }
        .footer img { height: 26px; opacity: 0.2; }

        @media print {
          .toolbar { display: none !important; }
          body { background: #fff; }
          .page { margin: 0; box-shadow: none; padding: 0; width: 100%; }
          @page { margin: 15mm; size: A4 portrait; }
        }

        @media screen and (max-width: 800px) {
          body { background: #e8e8e8; }
          .page { width: 100%; min-width: 680px; margin: 0; box-shadow: none; }
          .page-scroll { overflow-x: auto; }
        }
      `}</style>

      {/* Toolbar — hidden on print */}
      <div className="toolbar">
        <button
          onClick={gerarPDF}
          disabled={gerando}
          style={{ background: "#8B1A1A", color: "#fff", border: "none", padding: "10px 22px", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: gerando ? "not-allowed" : "pointer", opacity: gerando ? 0.7 : 1 }}
        >
          {gerando ? "Gerando PDF..." : "⬇ Baixar PDF"}
        </button>
      </div>

      {/* Scroll wrapper for small screens */}
      <div className="page-scroll">
        <div className="page" id="relatorio-doc">

          {/* Header */}
          <div className="header">
            <img src="/Logomarca/57423_Imapet_040521_aa-01.png" alt="IMAPET" style={{ height: 70 }} />
            <div className="header-right">
              <img src="/cia-do-animal.jpg" alt="Cia do Animal" style={{ height: 52, objectFit: "contain", display: "block", marginLeft: "auto", marginBottom: 2 }} />
              <p>CNPJ / Clínica Parceira</p>
            </div>
          </div>

          <div className="stripe1" />
          <div className="stripe2" />

          {/* Título */}
          <div className="title">
            <h1>Relação de Exames — Cia do Animal</h1>
            <p>Período: {mesNome} de {ano} &nbsp;·&nbsp; Emitido em {new Date().toLocaleDateString("pt-BR")}</p>
          </div>

          {/* Tabela */}
          <table>
            <colgroup>
              <col className="col-data" />
              <col className="col-pagamento" />
              <col className="col-valor" />
              <col className="col-proc" />
              <col className="col-paciente" />
            </colgroup>
            <thead>
              <tr>
                {["Data","Pagamento","Valor","Procedimento","Paciente"].map(h => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {exames.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", color: "#999", fontStyle: "italic", padding: 20 }}>
                    Nenhum exame encontrado para este período.
                  </td>
                </tr>
              ) : exames.map((e) => {
                const nome = e.nome_paciente || e.pets?.nome || "—";
                const raca = e.pets?.raca;
                const paciente = raca ? `${nome} (${raca})` : nome;
                const pgto = formatarPagamento(e.forma_pagamento);
                return (
                  <tr key={e.id}>
                    <td style={{ fontWeight: 600, whiteSpace: "nowrap" }}>{dataFmt(e.data_exame)}</td>
                    <td>{pgto}</td>
                    <td style={{ whiteSpace: "nowrap" }}>{e.valor_bruto ? moeda(e.valor_bruto) : "—"}</td>
                    <td>{e.tipo || "—"}</td>
                    <td>{paciente}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Totais */}
          <div className="totais">
            <div className="totais-left">
              <p className="totais-label">Valor total pendente em {dataFimStr}</p>
              <p className="totais-extenso">{valorExtenso(totalPendente)}</p>
            </div>
            <p className="totais-valor">{moeda(totalPendente)}</p>
          </div>

          {/* Assinatura */}
          <div className="assinatura">
            <div className="assinatura-inner">
              <img src="/assinatura.png" alt="Assinatura" />
              <div className="assinatura-linha">
                <p className="assinatura-nome">Camila Bentzen Barreto</p>
                <p className="assinatura-cargo">Médica Veterinária · CRMV-PE 5916</p>
                <p className="assinatura-empresa">IMAPET Diagnóstico Veterinário por Imagem</p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="footer">
            <div className="footer-contacts">
              {[
                { icon: "📱", text: "(81) 99674-1525" },
                { icon: "🌐", text: "www.imapet.com.br" },
                { icon: "✉️", text: "imapet@imapet.com.br" },
                { icon: "📷", text: "@Imapet_diagvet" },
              ].map(({ icon, text }) => (
                <span key={text} className="footer-contact">
                  <span>{icon}</span>{text}
                </span>
              ))}
            </div>
            <img src="/Logomarca/imapet_transparent.png" alt="" />
          </div>

        </div>
      </div>
    </>
  );
}

export default function RelatorioPage() {
  return (
    <Suspense fallback={<div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh", color:"#999", fontSize:14 }}>Carregando...</div>}>
      <RelatorioContent />
    </Suspense>
  );
}
