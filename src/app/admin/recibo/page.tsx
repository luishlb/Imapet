"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { valorExtenso } from "@/lib/utils";
import ReciboPreview from "@/components/shared/ReciboPreview";

function formatarCPF(v: string) {
  return v.replace(/\D/g, "").slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

function gerarNumero(): string {
  const n = new Date();
  const pad = (x: number) => String(x).padStart(2, "0");
  return `${n.getFullYear()}${pad(n.getMonth() + 1)}${pad(n.getDate())}-${pad(n.getHours())}${pad(n.getMinutes())}`;
}

export default function ReciboPage() {
  const hoje = new Date().toISOString().split("T")[0];

  const [form, setForm] = useState({
    nomePagador: "",
    cpf: "",
    valor: "",
    referente: "",
    data: hoje,
  });
  const [gerado, setGerado] = useState(false);
  const [numero, setNumero] = useState("");

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: name === "cpf" ? formatarCPF(value) : value }));
  }

  function gerar() {
    setNumero(gerarNumero());
    setGerado(true);
  }

  const valorNum = parseFloat(form.valor);

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between sticky top-0 z-10 print:hidden">
        <Image src="/Logomarca/imapet_transparent.png" alt="IMAPET" width={100} height={50} className="brightness-0" />
        <span className="text-sm text-text-muted font-medium">Gerador de recibo</span>
        <Link href="/admin" className="text-sm text-primary font-medium hover:underline">← Voltar</Link>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-10">
        <div className="print:hidden">
          <h1 className="font-playfair text-3xl font-bold text-text-main mb-2">Gerador de recibo</h1>
          <p className="text-text-muted text-sm mb-8">Preencha os dados e gere o recibo para imprimir ou salvar em PDF.</p>

          <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1.5">Nome do pagador *</label>
                <input name="nomePagador" value={form.nomePagador} onChange={handleChange} placeholder="Nome completo" className="input" />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1.5">CPF <span className="text-gray-300 font-normal">(opcional)</span></label>
                <input name="cpf" value={form.cpf} onChange={handleChange} placeholder="000.000.000-00" inputMode="numeric" className="input" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1.5">Valor (R$) *</label>
                <input name="valor" value={form.valor} onChange={handleChange} type="number" step="0.01" min="0" placeholder="0,00" className="input" />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1.5">Data *</label>
                <input name="data" value={form.data} onChange={handleChange} type="date" className="input" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-text-muted mb-1.5">Referente a *</label>
              <textarea name="referente" value={form.referente} onChange={handleChange} rows={3}
                placeholder="Ex: Realização de exame ultrassonográfico abdominal em paciente felino" className="input resize-none" />
            </div>
          </div>

          {form.valor && !isNaN(valorNum) && (
            <p className="text-xs text-text-muted mt-3 px-1">
              Por extenso: <span className="italic">{valorExtenso(valorNum)}</span>
            </p>
          )}

          <button
            onClick={gerar}
            disabled={!form.nomePagador || !form.valor || !form.referente || !form.data}
            className="w-full mt-6 bg-primary hover:bg-primary-light text-white font-semibold py-4 rounded-xl transition-all duration-300 disabled:opacity-50">
            Gerar recibo
          </button>
        </div>

        {gerado && (
          <>
            <div className="print:hidden mt-8 mb-6 flex items-center gap-3">
              <button onClick={() => window.print()}
                className="flex-1 bg-primary hover:bg-primary-light text-white font-semibold py-3 rounded-xl transition-all">
                Imprimir / Salvar PDF
              </button>
              <button onClick={() => setGerado(false)}
                className="px-5 py-3 border border-gray-200 rounded-xl text-sm text-text-muted hover:border-primary hover:text-primary transition-colors">
                Editar
              </button>
            </div>

            <ReciboPreview {...form} numero={numero} />
          </>
        )}
      </main>
    </div>
  );
}
