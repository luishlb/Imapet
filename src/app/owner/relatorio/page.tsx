"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type jsPDFType from "jspdf";
import { moeda, dataFmt, ultimoDiaMes, formatarPagamento, valorExtenso } from "@/lib/utils";

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const HOJE = new Date();

type Exame = {
  id: string;
  data_exame: string;
  tipo: string | null;
  forma_pagamento: string | null;
  valor_bruto: number | null;
  nome_paciente: string | null;
  pets: { nome: string; raca: string | null } | null;
};

export default function RelatorioPage() {
  const [mes, setMes] = useState(HOJE.getMonth() + 1);
  const [ano, setAno] = useState(HOJE.getFullYear());
  const [exames, setExames] = useState<Exame[]>([]);
  const [gerado, setGerado] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [gerando, setGerando] = useState(false);

  const anos = [2024, 2025, 2026, 2027];

  async function gerar() {
    setCarregando(true);
    const supabase = createClient();
    const mesStr = String(mes).padStart(2, "0");
    const ultimo = String(ultimoDiaMes(mes, ano)).padStart(2, "0");
    const { data } = await supabase
      .from("exames")
      .select("id, data_exame, tipo, forma_pagamento, valor_bruto, nome_paciente, pets(nome, raca)")
      .eq("clinica", "Cia do Animal")
      .gte("data_exame", `${ano}-${mesStr}-01`)
      .lte("data_exame", `${ano}-${mesStr}-${ultimo}`)
      .order("data_exame");
    setExames((data as unknown as Exame[]) || []);
    setCarregando(false);
    setGerado(true);
  }

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
      pdf.save(`relatorio-cia-do-animal-${MESES[mes - 1].toLowerCase()}-${ano}.pdf`);
    } finally {
      setGerando(false);
    }
  }

  // ── Tela de seleção ───────────────────────────────────────────────────────
  if (!gerado) {
    return (
      <div className="min-h-screen bg-background">
        <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-4 sticky top-0 z-10">
          <Link href="/owner" className="text-sm text-text-muted hover:text-primary transition-colors">← Voltar</Link>
          <span className="text-sm font-semibold text-text-main">Relatório Cia do Animal</span>
        </header>
        <main className="max-w-sm mx-auto px-4 py-16">
          <div className="bg-white rounded-2xl p-8 shadow-sm space-y-6">
            <div>
              <h1 className="font-playfair text-2xl font-bold text-text-main">Gerar relatório</h1>
              <p className="text-sm text-text-muted mt-1">Selecione o período</p>
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs font-medium text-text-muted mb-1.5">Mês</label>
                <select value={mes} onChange={e => setMes(Number(e.target.value))} className="input text-sm">
                  {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1.5">Ano</label>
                <select value={ano} onChange={e => setAno(Number(e.target.value))} className="input text-sm">
                  {anos.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>
            <button
              onClick={gerar}
              disabled={carregando}
              className="w-full bg-primary hover:bg-primary-light text-white font-semibold py-3 rounded-xl transition-all disabled:opacity-50"
            >
              {carregando ? "Carregando..." : "Gerar relatório"}
            </button>
          </div>
        </main>
      </div>
    );
  }

  // ── Relatório gerado ──────────────────────────────────────────────────────
  const totalPendente = exames.reduce((s, e) =>
    formatarPagamento(e.forma_pagamento) === "Pendente" ? s + (e.valor_bruto || 0) : s, 0);

  const ultimoDia = ultimoDiaMes(mes, ano);
  const dataFimStr = `${String(ultimoDia).padStart(2,"0")}/${String(mes).padStart(2,"0")}/${ano}`;
  const mesNome = MESES[mes - 1];

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
        .toolbar-left { display: flex; align-items: center; gap: 12px; }
        .toolbar-back {
          background: none;
          border: 1px solid #ddd;
          color: #666;
          padding: 8px 16px;
          border-radius: 10px;
          font-size: 13px;
          cursor: pointer;
        }
        .toolbar-back:hover { border-color: #8B1A1A; color: #8B1A1A; }
        .toolbar-label { font-size: 13px; color: #888; }
        .toolbar-download {
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
        .toolbar-download:disabled { opacity: 0.7; cursor: not-allowed; }

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

      <div className="toolbar">
        <div className="toolbar-left">
          <button className="toolbar-back" onClick={() => setGerado(false)}>← Trocar período</button>
          <span className="toolbar-label">{mesNome} {ano}</span>
        </div>
        <button
          className="toolbar-download"
          onClick={gerarPDF}
          disabled={gerando}
        >
          {gerando ? "Gerando PDF..." : "⬇ Baixar PDF"}
        </button>
      </div>

      <div className="page-scroll">
        <div className="page" id="relatorio-doc">

          <div className="header">
            <img src="/Logomarca/57423_Imapet_040521_aa-01.png" alt="IMAPET" style={{ height: 70 }} />
            <div className="header-right">
              <img src="/cia-do-animal.jpg" alt="Cia do Animal" style={{ height: 52, objectFit: "contain", display: "block", marginLeft: "auto", marginBottom: 2 }} />
              <p>CNPJ / Clínica Parceira</p>
            </div>
          </div>

          <div className="stripe1" />
          <div className="stripe2" />

          <div className="title">
            <h1>Relação de Exames — Cia do Animal</h1>
            <p>Período: {mesNome} de {ano} &nbsp;·&nbsp; Emitido em {new Date().toLocaleDateString("pt-BR")}</p>
          </div>

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

          <div className="totais">
            <div className="totais-left">
              <p className="totais-label">Valor total pendente em {dataFimStr}</p>
              <p className="totais-extenso">{valorExtenso(totalPendente)}</p>
            </div>
            <p className="totais-valor">{moeda(totalPendente)}</p>
          </div>

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
