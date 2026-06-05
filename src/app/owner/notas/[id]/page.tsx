"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { moeda } from "@/lib/utils";
import type jsPDFType from "jspdf";

type NotaFiscal = {
  id: string;
  numero_nfse: string | null;
  ambiente: string;
  status: string;
  tomador_nome: string;
  tomador_documento: string | null;
  tomador_tipo_doc: string | null;
  tomador_email: string | null;
  descricao: string;
  valor_servico: number;
  valor_iss: number | null;
  aliquota_iss: number | null;
  nfse_xml: string | null;
  emitida_em: string | null;
  criado_em: string;
};

function dataPorExtenso(d: string) {
  if (!d) return "";
  const meses = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
  const dt = new Date(d);
  return `${dt.getDate()} de ${meses[dt.getMonth()]} de ${dt.getFullYear()}`;
}

function extrairNumeroNFSe(xml: string | null): string {
  if (!xml) return "";
  const m = xml.match(/<nNFSe>(\d+)<\/nNFSe>/);
  return m ? m[1] : "";
}

function extrairDataProcessamento(xml: string | null): string {
  if (!xml) return "";
  const m = xml.match(/<dhProc>([^<]+)<\/dhProc>/);
  return m ? m[1] : "";
}

export default function DanfsePage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const [auth, setAuth] = useState<boolean | null>(null);
  const [nota, setNota] = useState<NotaFiscal | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [gerando, setGerando] = useState(false);
  const [compartilhando, setCompartilhando] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("owner_auth") !== "1") { router.replace("/owner"); return; }
    setAuth(true);
    (async () => {
      const { data } = await createClient().from("notas_fiscais").select("*").eq("id", id).single();
      setNota((data as NotaFiscal) || null);
      setCarregando(false);
    })();
  }, [id, router]);

  async function gerarPdf(): Promise<Blob | null> {
    setGerando(true);
    try {
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import("jspdf"),
        import("html2canvas"),
      ]);
      const el = document.getElementById("danfse-doc") as HTMLElement;
      if (!el) return null;
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
      return pdf.output("blob");
    } finally {
      setGerando(false);
    }
  }

  async function baixarPdf() {
    const blob = await gerarPdf();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `NFSe-IMAPET-${nNFSe || (nota?.numero_nfse || "").slice(-6)}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function compartilhar() {
    if (!nota?.numero_nfse) return;
    setCompartilhando(true);
    try {
      const blob = await gerarPdf();
      if (!blob) { setCompartilhando(false); return; }

      // Sobe pro R2
      const file = new File([blob], `NFSe-IMAPET-${nNFSe}.pdf`, { type: "application/pdf" });
      const fd = new FormData();
      fd.append("file", file);
      fd.append("prefix", "nfse-pdf");
      const upRes = await fetch("/api/upload", { method: "POST", body: fd });
      const upData = await upRes.json();
      if (!upRes.ok || !upData.url) {
        alert("Falha ao subir PDF: " + (upData.error || "erro"));
        setCompartilhando(false);
        return;
      }

      // Salva URL na nota
      await createClient().from("notas_fiscais").update({ nfse_pdf_url: upData.url }).eq("id", nota.id);

      const texto = `Nota Fiscal de Serviço — IMAPET\n\nValor: ${moeda(nota.valor_servico)}\nServiço: ${nota.descricao}\n\n📄 Baixar nota:\n${upData.url}\n\nChave de acesso: ${nota.numero_nfse}`;

      // Web Share API (mobile nativo)
      if (typeof navigator !== "undefined" && navigator.share) {
        try {
          await navigator.share({ title: "NFS-e IMAPET", text: texto, url: upData.url });
          setCompartilhando(false);
          return;
        } catch { /* cancelou */ }
      }
      // Fallback: WhatsApp Web
      window.open(`https://web.whatsapp.com/send?text=${encodeURIComponent(texto)}`, "_blank");
    } catch (e) {
      alert("Erro: " + (e instanceof Error ? e.message : "desconhecido"));
    }
    setCompartilhando(false);
  }

  if (!auth) return null;
  if (carregando) return <p className="text-center text-text-muted py-20 print:hidden">Carregando...</p>;
  if (!nota) return (
    <div className="min-h-screen flex items-center justify-center print:hidden">
      <p className="text-text-muted">Nota não encontrada.</p>
    </div>
  );

  const nNFSe = extrairNumeroNFSe(nota.nfse_xml);
  const dhProc = extrairDataProcessamento(nota.nfse_xml);

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; padding: 0; background: #f0f0f0; font-family: 'Segoe UI', Arial, sans-serif; }
        @media print {
          .toolbar { display: none !important; }
          body { background: #fff; }
          @page { size: A4 portrait; margin: 0; }
          .page { box-shadow: none !important; margin: 0 !important; }
        }
      `}</style>

      {/* Toolbar */}
      <div className="toolbar bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 sticky top-0 z-10 print:hidden">
        <Link href="/owner/notas" className="text-sm text-text-muted hover:text-primary">← Voltar</Link>
        <span className="text-sm font-semibold text-text-main">DANFSe</span>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={baixarPdf}
            disabled={gerando}
            className="bg-primary text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-primary-light transition disabled:opacity-50"
          >
            {gerando ? "..." : "📄 Baixar PDF"}
          </button>
          <button
            onClick={compartilhar}
            disabled={compartilhando}
            className="bg-green-600 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-green-700 transition disabled:opacity-50"
          >
            {compartilhando ? "..." : "📤 Compartilhar"}
          </button>
        </div>
      </div>

      <main className="py-6 px-4">
        <div id="danfse-doc" className="page max-w-[210mm] mx-auto bg-white shadow-sm print:shadow-none">
          {/* Stripes vermelhas */}
          <div className="h-2 bg-[#8B1A1A]" />
          <div className="h-px bg-[#8B1A1A] opacity-25" />

          <div className="px-10 py-8">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/Logomarca/57423_Imapet_040521_aa-01.png" alt="IMAPET" style={{ height: 64 }} />
              <div className="text-right">
                <p className="text-2xl font-bold text-[#8B1A1A] tracking-[0.15em] font-playfair">DANFSe</p>
                <p className="text-[10px] text-gray-500 mt-1">Documento Auxiliar da NFS-e</p>
                {nota.ambiente === "homologacao" && (
                  <p className="text-[10px] text-orange-600 font-bold mt-1">⚠️ HOMOLOGAÇÃO — SEM VALOR FISCAL</p>
                )}
              </div>
            </div>

            {/* Número e chave */}
            <div className="rounded-xl border border-[#8B1A1A]/20 bg-gradient-to-br from-[#8B1A1A]/5 to-transparent px-5 py-4 mb-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-semibold text-[#8B1A1A] uppercase tracking-wider">Nº NFS-e</p>
                  <p className="font-playfair text-2xl font-bold text-gray-900 leading-none">{nNFSe || "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-[#8B1A1A] uppercase tracking-wider">Emitida em</p>
                  <p className="text-sm font-medium text-gray-900">{dhProc ? new Date(dhProc).toLocaleString("pt-BR") : dataPorExtenso(nota.emitida_em || nota.criado_em)}</p>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-[#8B1A1A]/10">
                <p className="text-[10px] font-semibold text-[#8B1A1A] uppercase tracking-wider">Chave de acesso</p>
                <p className="text-[11px] font-mono break-all text-gray-800 mt-0.5">{nota.numero_nfse || "—"}</p>
              </div>
            </div>

            {/* Prestador */}
            <div className="mb-6">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-[0.15em] mb-1">Prestador do serviço</p>
              <p className="text-sm font-semibold text-gray-900">IMAPET Diagnóstico Veterinário por Imagem LTDA</p>
              <p className="text-xs text-gray-700">CNPJ: 42.432.557/0001-41 · Inscrição Municipal: 721.430-8</p>
              <p className="text-xs text-gray-700">Rua da Aurora, 295, Apto 0502 — Boa Vista, Recife/PE — CEP 50050-000</p>
            </div>

            {/* Tomador */}
            <div className="mb-6">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-[0.15em] mb-1">Tomador do serviço</p>
              <p className="text-sm font-semibold text-gray-900">{nota.tomador_nome}</p>
              {nota.tomador_documento && (
                <p className="text-xs text-gray-700">{nota.tomador_tipo_doc}: {nota.tomador_documento}</p>
              )}
              {nota.tomador_email && (
                <p className="text-xs text-gray-700">{nota.tomador_email}</p>
              )}
            </div>

            {/* Descrição do serviço */}
            <div className="mb-6">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-[0.15em] mb-1">Descrição do serviço</p>
              <div className="bg-gray-50 rounded-lg px-4 py-3">
                <p className="text-sm text-gray-800 whitespace-pre-line">{nota.descricao}</p>
              </div>
              <p className="text-[11px] text-gray-500 mt-1">Item LC 116/2003: 05.03 — Laboratórios de análise na área veterinária</p>
            </div>

            {/* Valores */}
            <div className="rounded-xl bg-gradient-to-br from-[#8B1A1A]/5 to-transparent border border-[#8B1A1A]/15 px-5 py-4 mb-6">
              <div className="flex items-baseline justify-between mb-2">
                <p className="text-sm text-gray-700">Valor do serviço</p>
                <p className="font-playfair text-2xl font-bold text-[#8B1A1A]">{moeda(nota.valor_servico)}</p>
              </div>
              {nota.valor_iss !== null && (
                <div className="flex items-baseline justify-between text-xs text-gray-600">
                  <span>ISS ({((nota.aliquota_iss || 0) * 100).toFixed(2)}%)</span>
                  <span>{moeda(nota.valor_iss)}</span>
                </div>
              )}
            </div>

            {/* Como verificar */}
            <div className="border-t border-gray-200 pt-4 mt-6">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-[0.15em] mb-1">Verificar autenticidade</p>
              <p className="text-xs text-gray-600 leading-relaxed">
                Esta NFS-e foi emitida pelo Sistema Nacional NFS-e (Portal gov.br). Verifique a autenticidade usando a chave de acesso acima no portal{" "}
                <span className="font-semibold">https://www.gov.br/nfse</span>.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t-2 border-[#8B1A1A] px-10 py-3">
            <div className="flex items-center justify-between flex-wrap gap-2 text-[10px] text-gray-500">
              <span>📱 (81) 99674-1525</span>
              <span>🌐 imapet.com.br</span>
              <span>✉️ imapet@imapet.com.br</span>
              <span>📷 @Imapet_diagvet</span>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
