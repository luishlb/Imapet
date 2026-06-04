"use client";

import { useEffect } from "react";
import { valorExtenso, tipoDocumento } from "@/lib/utils";

type Props = {
  nomePagador: string;
  documento: string;
  valor: string;
  referente: string;
  data: string;
  numero: string;
};

function dataPorExtenso(d: string) {
  if (!d) return "";
  const meses = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
  const [ano, mes, dia] = d.split("-");
  return `${parseInt(dia)} de ${meses[parseInt(mes) - 1]} de ${ano}`;
}

function montarNomeArquivo(nomePagador: string, data: string): string {
  const nomeLimpo = (nomePagador || "Cliente")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, " ");
  const dataFmt = data ? (() => {
    const [a, m, d] = data.split("-");
    return `${d}-${m}-${a}`;
  })() : "";
  return `Recibo IMAPET - ${nomeLimpo}${dataFmt ? ` - ${dataFmt}` : ""}`;
}

export default function ReciboPreview({ nomePagador, documento, valor, referente, data, numero }: Props) {
  const valorNum = parseFloat(valor);
  const valorFmt = isNaN(valorNum) ? "0,00" : valorNum.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
  const tipoDoc = tipoDocumento(documento);

  // Define o título do documento dinamicamente — o browser usa esse título
  // como nome sugerido no diálogo "Imprimir / Salvar como PDF"
  useEffect(() => {
    const tituloOriginal = document.title;
    const nomeArquivo = montarNomeArquivo(nomePagador, data);
    document.title = nomeArquivo;
    return () => { document.title = tituloOriginal; };
  }, [nomePagador, data]);

  return (
    <div id="recibo" className="relative overflow-hidden bg-white rounded-2xl shadow-sm print:shadow-none print:rounded-none">
      {/* Stripes de topo */}
      <div className="h-2 bg-[#8B1A1A]" />
      <div className="h-px bg-[#8B1A1A] opacity-25" />

      <div className="relative px-10 py-8 print:px-12 print:py-10">
        {/* Marca d'água sutil */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.04] print:opacity-[0.06]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/Logomarca/57423_Imapet_040521_aa-01.png" alt="" style={{ width: 360 }} />
        </div>

        <div className="relative">
          {/* Header */}
          <div className="flex items-start justify-between mb-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/Logomarca/57423_Imapet_040521_aa-01.png" alt="IMAPET" style={{ height: 64, display: "block" }} />
            <div className="text-right">
              <p className="text-3xl font-bold text-[#8B1A1A] tracking-[0.25em] font-playfair">RECIBO</p>
              <p className="text-[11px] text-gray-400 font-mono mt-1">Nº {numero}</p>
            </div>
          </div>

          {/* Card do valor */}
          <div className="rounded-2xl border border-[#8B1A1A]/20 bg-gradient-to-br from-[#8B1A1A]/5 to-transparent px-6 py-5 mb-8">
            <p className="text-[10px] font-semibold text-[#8B1A1A] uppercase tracking-[0.2em] mb-1">Valor</p>
            <p className="font-playfair text-4xl font-bold text-gray-900 leading-none">
              R$ {valorFmt}
            </p>
            {!isNaN(valorNum) && valorNum > 0 && (
              <p className="text-xs italic text-gray-500 mt-2">{valorExtenso(valorNum)}</p>
            )}
          </div>

          {/* Grid de informações */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 mb-6">
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-[0.15em] mb-1">Pagador</p>
              <p className="text-sm font-medium text-gray-900">{nomePagador || "—"}</p>
            </div>
            {documento && (
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-[0.15em] mb-1">{tipoDoc}</p>
                <p className="text-sm font-medium text-gray-900">{documento}</p>
              </div>
            )}
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-[0.15em] mb-1">Data</p>
              <p className="text-sm font-medium text-gray-900">{dataPorExtenso(data)}</p>
            </div>
          </div>

          {/* Texto introdutório */}
          <p className="text-sm leading-relaxed text-gray-700 mb-2">
            Recebi(emos) a importância acima discriminada, referente a:
          </p>

          {/* Box "Referente" */}
          <div className="rounded-xl bg-gray-50 border border-gray-100 px-5 py-4 mb-12">
            <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-line">
              {referente || "—"}
            </p>
          </div>

          {/* Para clareza */}
          <p className="text-sm text-gray-700 mb-12">
            Para clareza firmo o presente recibo.
          </p>

          {/* Assinatura */}
          <div className="flex justify-end mt-12 mb-6">
            <div className="text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/assinatura.png" alt="Assinatura" style={{ height: 70, margin: "0 auto -8px", display: "block", objectFit: "contain" }} />
              <div className="border-t border-gray-400 pt-2 w-72">
                <p className="text-sm font-semibold text-gray-800">Camila Bentzen Barreto</p>
                <p className="text-[11px] text-gray-500">Médica Veterinária — CRMV-PE 5916</p>
                <p className="text-[11px] text-[#8B1A1A] font-medium mt-0.5">IMAPET Diagnóstico Veterinário por Imagem</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t-2 border-[#8B1A1A] px-10 py-3 print:px-12">
        <div className="flex items-center justify-between flex-wrap gap-3 text-[11px] text-gray-500">
          <span>📱 (81) 99674-1525</span>
          <span>🌐 imapet.com.br</span>
          <span>✉️ imapet@imapet.com.br</span>
          <span>📷 @Imapet_diagvet</span>
        </div>
      </div>

      {/* Print A4 hint */}
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 12mm; }
          body { background: #fff; }
          #recibo { box-shadow: none; border-radius: 0; }
        }
      `}</style>
    </div>
  );
}
