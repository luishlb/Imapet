"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

type Clinica = { id: string; nome: string; email: string | null; whatsapp: string | null };

type DadosEnvio = {
  nomeTutor: string;
  cpfFormatado: string;
  emailTutor: string;
  whatsappTutor: string;
  nomePet: string;
  tipoExame: string;
  dataExame: string;
  laudoUrl: string;
  isNovoTutor: boolean;
  senha?: string;
};

function gerarSenha(nome: string) {
  const primeiro = nome.trim().split(" ")[0].toLowerCase();
  const num = Math.floor(1000 + Math.random() * 9000);
  return `${primeiro}${num}`;
}

function formatarCPF(v: string) {
  return v.replace(/\D/g, "").slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

function formatarData(data: string) {
  if (!data) return "";
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

export default function AdminPage() {
  const [clinicas, setClinicas] = useState<Clinica[]>([]);
  const [etapa, setEtapa] = useState<"formulario" | "envio">("formulario");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [dadosEnvio, setDadosEnvio] = useState<DadosEnvio | null>(null);
  const [emailOutra, setEmailOutra] = useState("");
  const [mostrarOutra, setMostrarOutra] = useState(false);
  const [enviando, setEnviando] = useState<string | null>(null);
  const [enviados, setEnviados] = useState<string[]>([]);

  const [form, setForm] = useState({
    nomeTutor: "", cpf: "", emailTutor: "", whatsappTutor: "",
    nomePet: "", especie: "Cão", raca: "",
    tipoExame: "Ultrassonografia", dataExame: new Date().toISOString().split("T")[0],
    clinica: "", formaPagamento: "Pix", valor: "", observacoes: "",
  });
  const [arquivo, setArquivo] = useState<File | null>(null);

  useEffect(() => {
    createClient().from("clinicas").select("*").order("nome")
      .then(({ data }) => setClinicas(data || []));
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: name === "cpf" ? formatarCPF(value) : value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setCarregando(true);

    try {
      const supabase = createClient();
      const cpfLimpo = form.cpf.replace(/\D/g, "");
      const emailInterno = `${cpfLimpo}@imapet.internal`;

      // Verifica se tutor existe
      const { data: perfilExistente } = await supabase
        .from("profiles").select("id").eq("cpf", cpfLimpo).single();

      let tutorId: string;
      let isNovoTutor = false;
      let senha: string | undefined;

      if (perfilExistente) {
        tutorId = perfilExistente.id;
      } else {
        isNovoTutor = true;
        senha = gerarSenha(form.nomeTutor);
        const { data: novoUser, error: erroCriacao } = await supabase.auth.signUp({
          email: emailInterno,
          password: senha,
          options: { data: { nome: form.nomeTutor } },
        });
        if (erroCriacao || !novoUser.user) throw new Error("Erro ao criar conta do tutor.");
        tutorId = novoUser.user.id;
        await supabase.from("profiles").insert({ id: tutorId, nome: form.nomeTutor, cpf: cpfLimpo });
      }

      // Verifica se pet existe
      const { data: petExistente } = await supabase
        .from("pets").select("id").eq("tutor_id", tutorId).eq("nome", form.nomePet).single();

      let petId: string;
      if (petExistente) {
        petId = petExistente.id;
      } else {
        const { data: novoPet, error: erroPet } = await supabase
          .from("pets").insert({ tutor_id: tutorId, nome: form.nomePet, especie: form.especie, raca: form.raca })
          .select("id").single();
        if (erroPet || !novoPet) throw new Error("Erro ao cadastrar pet.");
        petId = novoPet.id;
      }

      // Upload do laudo
      let laudoUrl = "";
      if (arquivo) {
        const nomeArquivo = `${tutorId}/${petId}/${Date.now()}_${arquivo.name}`;
        const { error: erroUpload } = await supabase.storage.from("laudos").upload(nomeArquivo, arquivo);
        if (erroUpload) throw new Error("Erro ao enviar o laudo.");
        const { data: urlData } = supabase.storage.from("laudos").getPublicUrl(nomeArquivo);
        laudoUrl = urlData.publicUrl;
      }

      // Registra exame
      const { error: erroExame } = await supabase.from("exames").insert({
        pet_id: petId, tipo: form.tipoExame, data_exame: form.dataExame,
        clinica: form.clinica, forma_pagamento: form.formaPagamento,
        valor: form.valor ? parseFloat(form.valor) : null,
        observacoes: form.observacoes, laudo_url: laudoUrl,
      });
      if (erroExame) throw new Error("Erro ao registrar o exame.");

      setDadosEnvio({
        nomeTutor: form.nomeTutor, cpfFormatado: form.cpf,
        emailTutor: form.emailTutor, whatsappTutor: form.whatsappTutor,
        nomePet: form.nomePet, tipoExame: form.tipoExame,
        dataExame: form.dataExame, laudoUrl, isNovoTutor, senha,
      });
      setEtapa("envio");
      setEnviados([]);

    } catch (err: unknown) {
      setErro(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setCarregando(false);
    }
  }

  async function enviarEmail(para: string, tipo: "clinica" | "cliente", chave: string) {
    if (!dadosEnvio) return;
    setEnviando(chave);

    const dados = tipo === "clinica"
      ? { nomePet: dadosEnvio.nomePet, tipoExame: dadosEnvio.tipoExame, dataExame: formatarData(dadosEnvio.dataExame), laudoUrl: dadosEnvio.laudoUrl }
      : { nomeTutor: dadosEnvio.nomeTutor, nomePet: dadosEnvio.nomePet, tipoExame: dadosEnvio.tipoExame, dataExame: formatarData(dadosEnvio.dataExame), laudoUrl: dadosEnvio.laudoUrl, isNovoTutor: dadosEnvio.isNovoTutor, cpf: dadosEnvio.cpfFormatado, senha: dadosEnvio.senha };

    const res = await fetch("/api/enviar-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tipo, para, dados }),
    });

    if (res.ok) setEnviados(v => [...v, chave]);
    setEnviando(null);
  }

  function abrirWhatsApp(numero: string) {
    if (!dadosEnvio) return;
    const num = numero.replace(/\D/g, "");
    const msg = encodeURIComponent(
      `Olá! Segue o laudo de *${dadosEnvio.tipoExame}* do paciente *${dadosEnvio.nomePet}*.\n\n📄 Acesse pelo link:\n${dadosEnvio.laudoUrl}\n\nATT, IMAPET`
    );
    window.open(`https://wa.me/55${num}?text=${msg}`, "_blank");
  }

  function novoExame() {
    setForm({
      nomeTutor: "", cpf: "", emailTutor: "", whatsappTutor: "",
      nomePet: "", especie: "Cão", raca: "",
      tipoExame: "Ultrassonografia", dataExame: new Date().toISOString().split("T")[0],
      clinica: "", formaPagamento: "Pix", valor: "", observacoes: "",
    });
    setArquivo(null);
    setDadosEnvio(null);
    setEmailOutra("");
    setMostrarOutra(false);
    setEtapa("formulario");
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <Image src="/Logomarca/imapet_transparent.png" alt="IMAPET" width={100} height={50} className="brightness-0" />
        <span className="text-sm text-text-muted font-medium">Painel da Veterinária</span>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-10">

        {/* ── ETAPA 1: FORMULÁRIO ── */}
        {etapa === "formulario" && (
          <>
            <h1 className="font-playfair text-3xl font-bold text-text-main mb-2">Novo exame</h1>
            <p className="text-text-muted text-sm mb-8">Preencha os dados e anexe o laudo. Depois você escolhe como enviar.</p>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Tutor */}
              <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
                <h2 className="font-semibold text-text-main">Dados do tutor</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-text-muted mb-1.5">Nome completo</label>
                    <input name="nomeTutor" value={form.nomeTutor} onChange={handleChange} required placeholder="Nome do tutor" className="input" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-muted mb-1.5">CPF</label>
                    <input name="cpf" value={form.cpf} onChange={handleChange} required placeholder="000.000.000-00" inputMode="numeric" className="input" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-text-muted mb-1.5">E-mail</label>
                    <input name="emailTutor" value={form.emailTutor} onChange={handleChange} type="email" placeholder="email@exemplo.com" className="input" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-muted mb-1.5">WhatsApp</label>
                    <input name="whatsappTutor" value={form.whatsappTutor} onChange={handleChange} placeholder="(81) 99999-9999" inputMode="numeric" className="input" />
                  </div>
                </div>
              </div>

              {/* Pet */}
              <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
                <h2 className="font-semibold text-text-main">Dados do pet</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-text-muted mb-1.5">Nome do pet</label>
                    <input name="nomePet" value={form.nomePet} onChange={handleChange} required placeholder="Nome do animal" className="input" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-muted mb-1.5">Espécie</label>
                    <select name="especie" value={form.especie} onChange={handleChange} className="input">
                      <option>Cão</option>
                      <option>Gato</option>
                      <option>Outro</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1.5">Raça</label>
                  <input name="raca" value={form.raca} onChange={handleChange} placeholder="Ex: Golden Retriever" className="input" />
                </div>
              </div>

              {/* Exame */}
              <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
                <h2 className="font-semibold text-text-main">Dados do exame</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-text-muted mb-1.5">Tipo de exame</label>
                    <select name="tipoExame" value={form.tipoExame} onChange={handleChange} className="input">
                      <option>Ultrassonografia</option>
                      <option>Cistocentese</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-muted mb-1.5">Data do exame</label>
                    <input name="dataExame" value={form.dataExame} onChange={handleChange} type="date" required className="input" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1.5">Clínica</label>
                  <input name="clinica" value={form.clinica} onChange={handleChange} placeholder="Nome da clínica" list="clinicas-list" className="input" />
                  <datalist id="clinicas-list">
                    {clinicas.map(c => <option key={c.id} value={c.nome} />)}
                  </datalist>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-text-muted mb-1.5">Forma de pagamento</label>
                    <select name="formaPagamento" value={form.formaPagamento} onChange={handleChange} className="input">
                      <option>Pix</option>
                      <option>Cartão de crédito</option>
                      <option>Cartão de débito</option>
                      <option>Dinheiro</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-muted mb-1.5">Valor (R$)</label>
                    <input name="valor" value={form.valor} onChange={handleChange} type="number" step="0.01" min="0" placeholder="0,00" className="input" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1.5">Observações</label>
                  <textarea name="observacoes" value={form.observacoes} onChange={handleChange} rows={3} placeholder="Observações clínicas (opcional)" className="input resize-none" />
                </div>
              </div>

              {/* Upload */}
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h2 className="font-semibold text-text-main mb-4">Laudo em PDF</h2>
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-primary/50 transition">
                  <input type="file" accept=".pdf" className="hidden" onChange={e => setArquivo(e.target.files?.[0] || null)} />
                  {arquivo ? (
                    <div className="text-center">
                      <p className="text-sm font-medium text-primary">{arquivo.name}</p>
                      <p className="text-xs text-text-muted mt-1">Clique para trocar</p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <p className="text-sm text-text-muted">Clique para anexar o PDF</p>
                      <p className="text-xs text-gray-300 mt-1">Somente arquivos .pdf</p>
                    </div>
                  )}
                </label>
              </div>

              {erro && <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-xl">{erro}</p>}

              <button type="submit" disabled={carregando}
                className="w-full bg-primary hover:bg-primary-light text-white font-semibold py-4 rounded-xl transition-all duration-300 disabled:opacity-60">
                {carregando ? "Registrando..." : "Registrar exame"}
              </button>
            </form>
          </>
        )}

        {/* ── ETAPA 2: OPÇÕES DE ENVIO ── */}
        {etapa === "envio" && dadosEnvio && (
          <>
            <div className="bg-green-50 border border-green-200 rounded-2xl p-5 mb-8 flex items-center gap-3">
              <span className="text-2xl">✓</span>
              <div>
                <p className="font-semibold text-green-800">Exame registrado com sucesso!</p>
                <p className="text-sm text-green-700">{dadosEnvio.nomePet} · {dadosEnvio.tipoExame} · {formatarData(dadosEnvio.dataExame)}</p>
              </div>
            </div>

            {/* Credenciais novo tutor */}
            {dadosEnvio.isNovoTutor && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6">
                <p className="text-sm font-semibold text-amber-800 mb-2">Tutor novo — envie as credenciais pelo WhatsApp:</p>
                <p className="text-sm text-amber-900">CPF: <strong>{dadosEnvio.cpfFormatado}</strong></p>
                <p className="text-sm text-amber-900">Senha: <strong>{dadosEnvio.senha}</strong></p>
              </div>
            )}

            <h2 className="font-playfair text-2xl font-bold text-text-main mb-2">Como deseja enviar o laudo?</h2>
            <p className="text-text-muted text-sm mb-6">Escolha uma ou mais opções abaixo.</p>

            <div className="space-y-3">
              {/* Clínicas cadastradas */}
              {clinicas.filter(c => c.email).map(c => (
                <button key={c.id}
                  onClick={() => enviarEmail(c.email!, "clinica", `clinica-${c.id}`)}
                  disabled={enviando === `clinica-${c.id}` || enviados.includes(`clinica-${c.id}`)}
                  className={`w-full flex items-center justify-between px-5 py-4 rounded-xl border-2 transition-all text-left ${
                    enviados.includes(`clinica-${c.id}`)
                      ? "border-green-300 bg-green-50 text-green-700"
                      : "border-gray-200 bg-white hover:border-primary hover:bg-primary/3"
                  }`}>
                  <span className="font-medium text-sm">
                    {enviados.includes(`clinica-${c.id}`) ? "✓ Enviado para " : "📧 Enviar para "}{c.nome}
                  </span>
                  {enviando === `clinica-${c.id}` && <span className="text-xs text-text-muted">Enviando...</span>}
                </button>
              ))}

              {/* Outra clínica */}
              <div className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden">
                <button type="button" onClick={() => setMostrarOutra(!mostrarOutra)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition text-left">
                  <span className="font-medium text-sm text-text-main">📧 Outra clínica</span>
                  <span className="text-gray-400 text-lg">{mostrarOutra ? "−" : "+"}</span>
                </button>
                {mostrarOutra && (
                  <div className="px-5 pb-4 flex gap-2">
                    <input value={emailOutra} onChange={e => setEmailOutra(e.target.value)}
                      type="email" placeholder="email@clinica.com.br" className="input flex-1" />
                    <button onClick={() => enviarEmail(emailOutra, "clinica", "outra")}
                      disabled={!emailOutra || enviando === "outra" || enviados.includes("outra")}
                      className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-primary-light transition disabled:opacity-50">
                      {enviados.includes("outra") ? "✓" : "Enviar"}
                    </button>
                  </div>
                )}
              </div>

              {/* Enviar para o cliente */}
              {dadosEnvio.emailTutor && (
                <button onClick={() => enviarEmail(dadosEnvio.emailTutor, "cliente", "cliente")}
                  disabled={enviando === "cliente" || enviados.includes("cliente")}
                  className={`w-full flex items-center justify-between px-5 py-4 rounded-xl border-2 transition-all text-left ${
                    enviados.includes("cliente")
                      ? "border-green-300 bg-green-50 text-green-700"
                      : "border-gray-200 bg-white hover:border-primary hover:bg-primary/3"
                  }`}>
                  <span className="font-medium text-sm">
                    {enviados.includes("cliente") ? "✓ Enviado para o cliente" : "📧 Enviar para o cliente"}
                  </span>
                  {enviando === "cliente" && <span className="text-xs text-text-muted">Enviando...</span>}
                </button>
              )}

              {/* WhatsApp */}
              {dadosEnvio.whatsappTutor && (
                <button onClick={() => abrirWhatsApp(dadosEnvio.whatsappTutor)}
                  className="w-full flex items-center gap-3 px-5 py-4 rounded-xl border-2 border-gray-200 bg-white hover:border-green-400 hover:bg-green-50 transition text-left">
                  <span className="text-xl">💬</span>
                  <span className="font-medium text-sm">Compartilhar pelo WhatsApp</span>
                </button>
              )}
            </div>

            <button onClick={novoExame}
              className="w-full mt-8 border-2 border-primary text-primary font-semibold py-3.5 rounded-xl hover:bg-primary hover:text-white transition-all duration-300">
              + Registrar novo exame
            </button>
          </>
        )}
      </main>
    </div>
  );
}
