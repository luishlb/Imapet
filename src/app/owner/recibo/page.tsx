"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { valorExtenso, formatarDocumento, tipoDocumento } from "@/lib/utils";
import ReciboPreview from "@/components/shared/ReciboPreview";

function gerarNumero(): string {
  const n = new Date();
  const pad = (x: number) => String(x).padStart(2, "0");
  return `${n.getFullYear()}${pad(n.getMonth() + 1)}${pad(n.getDate())}-${pad(n.getHours())}${pad(n.getMinutes())}`;
}

export default function ReciboOwnerPage() {
  const router = useRouter();
  const [auth, setAuth] = useState<boolean | null>(null);
  const hoje = new Date().toISOString().split("T")[0];

  const [form, setForm] = useState({
    nomePagador: "",
    documento: "",
    valor: "",
    referente: "",
    data: hoje,
  });
  const [gerado, setGerado] = useState(false);
  const [numero, setNumero] = useState("");

  useEffect(() => {
    if (localStorage.getItem("owner_auth") !== "1") { router.replace("/owner"); return; }
    setAuth(true);
  }, [router]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: name === "documento" ? formatarDocumento(value) : value }));
  }

  function gerar() {
    setNumero(gerarNumero());
    setGerado(true);
  }

  if (!auth) return null;

  const valorNum = parseFloat(form.valor);

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-4 sticky top-0 z-10 print:hidden">
        <Link href="/owner" className="text-sm text-text-muted hover:text-primary transition-colors">← Voltar</Link>
        <span className="text-sm font-semibold text-text-main">Gerador de recibo</span>
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
                <label className="block text-xs font-medium text-text-muted mb-1.5">
                  CPF / CNPJ <span className="text-gray-300 font-normal">(opcional)</span>
                  {form.documento && <span className="text-primary font-semibold ml-2">{tipoDocumento(form.documento)}</span>}
                </label>
                <input name="documento" value={form.documento} onChange={handleChange} placeholder="CPF ou CNPJ" inputMode="numeric" className="input" />
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
