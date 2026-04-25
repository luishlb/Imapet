"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

function formatarCPF(v: string) {
  return v.replace(/\D/g, "").slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

function dataPorExtenso(d: string) {
  if (!d) return "";
  const meses = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
  const [ano, mes, dia] = d.split("-");
  return `${parseInt(dia)} de ${meses[parseInt(mes) - 1]} de ${ano}`;
}

function valorExtenso(valor: number): string {
  if (isNaN(valor) || valor < 0) return "";
  const reais = Math.floor(valor);
  const centavos = Math.round((valor - reais) * 100);

  const u = ["","um","dois","três","quatro","cinco","seis","sete","oito","nove",
    "dez","onze","doze","treze","quatorze","quinze","dezesseis","dezessete","dezoito","dezenove"];
  const d = ["","","vinte","trinta","quarenta","cinquenta","sessenta","setenta","oitenta","noventa"];
  const c = ["","cento","duzentos","trezentos","quatrocentos","quinhentos","seiscentos","setecentos","oitocentos","novecentos"];

  function n2w(n: number): string {
    if (n === 0) return "";
    if (n === 100) return "cem";
    if (n < 20) return u[n];
    if (n < 100) return d[Math.floor(n/10)] + (n%10 ? " e " + u[n%10] : "");
    const resto = n % 100;
    return c[Math.floor(n/100)] + (resto ? " e " + n2w(resto) : "");
  }

  function full(n: number): string {
    if (n === 0) return "zero";
    if (n < 1000) return n2w(n);
    const mil = Math.floor(n / 1000);
    const resto = n % 1000;
    const milStr = mil === 1 ? "mil" : n2w(mil) + " mil";
    return milStr + (resto ? (resto < 100 ? " e " : ", ") + n2w(resto) : "");
  }

  let result = full(reais) + (reais === 1 ? " real" : " reais");
  if (centavos > 0) result += " e " + n2w(centavos) + (centavos === 1 ? " centavo" : " centavos");
  return result.charAt(0).toUpperCase() + result.slice(1);
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

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: name === "cpf" ? formatarCPF(value) : value }));
  }

  const valorNum = parseFloat(form.valor);

  return (
    <div className="min-h-screen bg-background">
      {/* Header — oculto na impressão */}
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between sticky top-0 z-10 print:hidden">
        <Image src="/Logomarca/imapet_transparent.png" alt="IMAPET" width={100} height={50} className="brightness-0" />
        <span className="text-sm text-text-muted font-medium">Gerador de recibo</span>
        <Link href="/admin" className="text-sm text-primary font-medium hover:underline">← Voltar</Link>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-10">

        {/* Formulário — oculto na impressão */}
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
            onClick={() => setGerado(true)}
            disabled={!form.nomePagador || !form.valor || !form.referente || !form.data}
            className="w-full mt-6 bg-primary hover:bg-primary-light text-white font-semibold py-4 rounded-xl transition-all duration-300 disabled:opacity-50">
            Gerar recibo
          </button>
        </div>

        {/* Preview do recibo — visível depois de gerar e na impressão */}
        {gerado && (
          <>
            {/* Botões de ação — ocultos na impressão */}
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

            {/* Recibo */}
            <div id="recibo" className="bg-white rounded-2xl shadow-sm p-10 print:shadow-none print:rounded-none print:p-0">

              {/* Cabeçalho */}
              <div className="flex items-center justify-between mb-8 pb-6 border-b border-gray-200">
                <img src="/Logomarca/57423_Imapet_040521_aa-01.png" alt="IMAPET" width={110} style={{ display: "block" }} />
                <div className="text-right">
                  <p className="text-2xl font-bold text-[#8B1A1A] tracking-widest">RECIBO</p>
                  <p className="text-xs text-gray-400 mt-1">{dataPorExtenso(form.data)}</p>
                </div>
              </div>

              {/* Corpo */}
              <p className="text-sm leading-relaxed text-gray-700 mb-6">
                Recebi(emos) de{" "}
                <strong className="text-gray-900">{form.nomePagador}</strong>
                {form.cpf && <>, CPF <strong className="text-gray-900">{form.cpf}</strong></>}
                {", "}a importância de{" "}
                <strong className="text-gray-900">
                  R$ {parseFloat(form.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </strong>{" "}
                ({valorExtenso(valorNum)}), referente a:
              </p>

              <div className="bg-gray-50 rounded-xl px-5 py-4 mb-10">
                <p className="text-sm text-gray-800 leading-relaxed">{form.referente}</p>
              </div>

              {/* Assinatura */}
              <div className="flex justify-end">
                <div className="text-center">
                  <div className="border-t border-gray-400 pt-3 w-64">
                    <p className="text-sm font-semibold text-gray-800">Júliet Bertino</p>
                    <p className="text-xs text-gray-500">Médica Veterinária</p>
                    <p className="text-xs text-[#8B1A1A] font-medium mt-0.5">IMAPET Diagnóstico Veterinário por Imagem</p>
                  </div>
                </div>
              </div>

            </div>
          </>
        )}
      </main>
    </div>
  );
}
