"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Clinica = { id: string; nome: string; email: string | null; whatsapp: string | null };

type DadosEnvio = {
  nomeTutor: string;
  emailTutor: string;
  whatsappTutor: string;
  nomePet: string;
  tiposExame: string[];
  dataExame: string;
  laudoUrl: string;
};

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
  const [servicos, setServicos] = useState<string[]>([]);
  const [formasPagamento, setFormasPagamento] = useState<string[]>([]);

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
    dataExame: new Date().toISOString().split("T")[0],
    clinica: "", formaPagamento: "", preco: "", desconto: "", observacoes: "",
  });
  const [tiposExame, setTiposExame] = useState<string[]>([]);
  const [arquivo, setArquivo] = useState<File | null>(null);

  // estado para adicionar novos itens inline
  const [novoServico, setNovoServico] = useState("");
  const [novaFormaPagamento, setNovaFormaPagamento] = useState("");
  const [mostrarAddServico, setMostrarAddServico] = useState(false);
  const [mostrarAddPagamento, setMostrarAddPagamento] = useState(false);
  const [mostrarSugestoesCli, setMostrarSugestoesCli] = useState(false);
  const [emailClinicaInput, setEmailClinicaInput] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase.from("clinicas").select("*").order("nome")
      .then(({ data }) => setClinicas(data || []));
    supabase.from("servicos").select("nome").order("id")
      .then(({ data }) => setServicos((data || []).map((s: { nome: string }) => s.nome)));
    supabase.from("formas_pagamento").select("nome").order("id")
      .then(({ data }) => {
        const lista = (data || []).map((f: { nome: string }) => f.nome);
        setFormasPagamento(lista);
        if (lista.length > 0) setForm(f => ({ ...f, formaPagamento: lista[0] }));
      });
  }, []);

  function toggleServico(s: string) {
    setTiposExame(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: name === "cpf" ? formatarCPF(value) : value }));
  }

  async function adicionarServico() {
    const nome = novoServico.trim();
    if (!nome || servicos.includes(nome)) return;
    await createClient().from("servicos").insert({ nome });
    setServicos(prev => [...prev, nome]);
    toggleServico(nome);
    setNovoServico("");
    setMostrarAddServico(false);
  }

  async function adicionarFormaPagamento() {
    const nome = novaFormaPagamento.trim();
    if (!nome || formasPagamento.includes(nome)) return;
    await createClient().from("formas_pagamento").insert({ nome });
    setFormasPagamento(prev => [...prev, nome]);
    setForm(f => ({ ...f, formaPagamento: nome }));
    setNovaFormaPagamento("");
    setMostrarAddPagamento(false);
  }

  async function adicionarClinica() {
    const nome = form.clinica.trim();
    if (!nome) return;
    const { data } = await createClient()
      .from("clinicas").insert({ nome, email: null, whatsapp: null }).select("*").single();
    if (data) setClinicas(prev => [...prev, data].sort((a, b) => a.nome.localeCompare(b.nome)));
    setMostrarSugestoesCli(false);
  }

  async function salvarEmailClinica(clinicaId: string) {
    const email = emailClinicaInput.trim();
    if (!email) return;
    await createClient().from("clinicas").update({ email }).eq("id", clinicaId);
    setClinicas(prev => prev.map(c => c.id === clinicaId ? { ...c, email } : c));
    setEmailClinicaInput("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setCarregando(true);

    try {
      const supabase = createClient();
      const cpfLimpo = form.cpf.replace(/\D/g, "");

      let tutorId: string | null = null;
      const temDadosTutor = cpfLimpo || form.nomeTutor || form.emailTutor || form.whatsappTutor;
      if (temDadosTutor) {
        if (cpfLimpo) {
          const { data: tutorExistente } = await supabase
            .from("tutores").select("id").eq("cpf", cpfLimpo).single();
          if (tutorExistente) tutorId = tutorExistente.id;
        }
        if (!tutorId) {
          const np = "NÃO PREENCHIDO";
          const { data: novoTutor, error: erroTutor } = await supabase
            .from("tutores").insert({
              nome: form.nomeTutor || np,
              cpf: cpfLimpo || null,
              email: form.emailTutor || np,
              whatsapp: form.whatsappTutor || np,
            }).select("id").single();
          if (erroTutor || !novoTutor) throw new Error("Erro ao cadastrar tutor.");
          tutorId = novoTutor.id;
        }
      }

      let petId: string;
      if (tutorId) {
        const { data: petExistente } = await supabase
          .from("pets").select("id").eq("tutor_id", tutorId).eq("nome", form.nomePet).single();
        if (petExistente) {
          petId = petExistente.id;
        } else {
          const { data: novoPet, error: erroPet } = await supabase
            .from("pets").insert({ tutor_id: tutorId, nome: form.nomePet, especie: form.especie, raca: form.raca })
            .select("id").single();
          if (erroPet || !novoPet) throw new Error("Erro ao cadastrar pet.");
          petId = novoPet.id;
        }
      } else {
        const { data: novoPet, error: erroPet } = await supabase
          .from("pets").insert({ tutor_id: null, nome: form.nomePet, especie: form.especie, raca: form.raca })
          .select("id").single();
        if (erroPet || !novoPet) throw new Error("Erro ao cadastrar pet.");
        petId = novoPet.id;
      }

      let laudoUrl = "";
      if (arquivo) {
        const nomeSeguro = arquivo.name.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9._-]/g, "_");
        const nomeArquivo = `${petId}/${Date.now()}_${nomeSeguro}`;
        const { error: erroUpload } = await supabase.storage.from("laudos").upload(nomeArquivo, arquivo);
        if (erroUpload) throw new Error(`Erro ao enviar o laudo: ${erroUpload.message}`);
        const { data: urlData } = supabase.storage.from("laudos").getPublicUrl(nomeArquivo);
        laudoUrl = urlData.publicUrl;
      }

      const preco = form.preco ? parseFloat(form.preco) : null;
      const desc = form.desconto ? parseFloat(form.desconto) : 0;
      const vBruto = preco !== null ? parseFloat((preco - desc).toFixed(2)) : null;
      const vLiq = vBruto !== null ? parseFloat((vBruto * 0.58).toFixed(2)) : null;

      const { error: erroExame } = await supabase.from("exames").insert({
        pet_id: petId, tipo: tiposExame.join(", ") || null, data_exame: form.dataExame,
        clinica: form.clinica, forma_pagamento: form.formaPagamento,
        valor_bruto: vBruto,
        valor: vLiq,
        observacoes: form.observacoes, laudo_url: laudoUrl,
        nome_paciente: form.nomePet || null,
      });
      if (erroExame) throw new Error("Erro ao registrar o exame.");

      setDadosEnvio({
        nomeTutor: form.nomeTutor,
        emailTutor: form.emailTutor, whatsappTutor: form.whatsappTutor,
        nomePet: form.nomePet, tiposExame,
        dataExame: form.dataExame, laudoUrl,
      });
      setEtapa("envio");
      setEnviados([]);

    } catch (err: unknown) {
      setErro(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setCarregando(false);
    }
  }

  async function enviarEmail(para: string, tipo: "clinica" | "cliente", chave: string, nomeClinica?: string) {
    if (!dadosEnvio) return;
    setEnviando(chave);
    const dados = {
      nomePet: dadosEnvio.nomePet,
      laudoUrl: dadosEnvio.laudoUrl,
      nomeTutor: dadosEnvio.nomeTutor,
      nomeClinica: nomeClinica || "",
    };
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
      `Olá! Segue o laudo do paciente *${dadosEnvio.nomePet}*.\n\n📄 Acesse pelo link:\n${dadosEnvio.laudoUrl}\n\nATT, IMAPET`
    );
    window.open(`https://wa.me/55${num}?text=${msg}`, "_blank");
  }

  function novoExame() {
    setForm({
      nomeTutor: "", cpf: "", emailTutor: "", whatsappTutor: "",
      nomePet: "", especie: "Cão", raca: "",
      dataExame: new Date().toISOString().split("T")[0],
      clinica: "", formaPagamento: formasPagamento[0] || "", preco: "", desconto: "", observacoes: "",
    });
    setTiposExame([]);
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
        <div className="flex items-center gap-2">
          <Link href="/admin/recibo" className="text-sm font-medium px-4 py-2 rounded-xl border border-gray-200 text-text-muted hover:border-primary hover:text-primary transition-colors">Gerar recibo</Link>
          <Link href="/admin/financeiro" className="text-sm font-medium px-4 py-2 rounded-xl border border-gray-200 text-text-muted hover:border-primary hover:text-primary transition-colors">Ver financeiro</Link>
        </div>
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
                <div>
                  <h2 className="font-semibold text-text-main">Dados do tutor</h2>
                  <p className="text-xs text-text-muted mt-0.5">Todos opcionais — preencha quando disponível</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-text-muted mb-1.5">Nome completo</label>
                    <input name="nomeTutor" value={form.nomeTutor} onChange={handleChange} placeholder="Nome do tutor" className="input" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-muted mb-1.5">CPF</label>
                    <input name="cpf" value={form.cpf} onChange={handleChange} placeholder="000.000.000-00" inputMode="numeric" className="input" />
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

                {/* Serviços */}
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-2">
                    Serviços <span className="text-gray-300 font-normal">(selecione um ou mais)</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {servicos.map(s => (
                      <button key={s} type="button" onClick={() => toggleServico(s)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                          tiposExame.includes(s)
                            ? "bg-primary text-white border-primary"
                            : "bg-white text-text-muted border-gray-200 hover:border-primary hover:text-primary"
                        }`}>
                        {s}
                      </button>
                    ))}
                    {mostrarAddServico ? (
                      <div className="flex items-center gap-1">
                        <input
                          value={novoServico}
                          onChange={e => setNovoServico(e.target.value)}
                          onKeyDown={e => e.key === "Enter" && (e.preventDefault(), adicionarServico())}
                          placeholder="Nome do serviço"
                          autoFocus
                          className="text-xs border border-gray-200 rounded-full px-3 py-1.5 outline-none focus:border-primary w-40"
                        />
                        <button type="button" onClick={adicionarServico}
                          className="text-xs bg-primary text-white px-2.5 py-1.5 rounded-full font-medium">✓</button>
                        <button type="button" onClick={() => { setMostrarAddServico(false); setNovoServico(""); }}
                          className="text-xs text-text-muted px-1">✕</button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => setMostrarAddServico(true)}
                        className="px-3 py-1.5 rounded-full text-xs font-medium border border-dashed border-gray-300 text-gray-400 hover:border-primary hover:text-primary transition-all">
                        + novo
                      </button>
                    )}
                  </div>
                  {tiposExame.length === 0 && (
                    <p className="text-xs text-red-400 mt-1.5">Selecione ao menos um serviço</p>
                  )}
                </div>

                {/* Data */}
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1.5">Data do exame</label>
                  <input name="dataExame" value={form.dataExame} onChange={handleChange} type="date" required className="input" />
                </div>

                {/* Clínica */}
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1.5">Clínica</label>
                  <div className="relative">
                    <input
                      name="clinica"
                      value={form.clinica}
                      onChange={e => { handleChange(e); setMostrarSugestoesCli(true); }}
                      onFocus={() => setMostrarSugestoesCli(true)}
                      onBlur={() => setTimeout(() => setMostrarSugestoesCli(false), 150)}
                      placeholder="Digite ou escolha a clínica"
                      autoComplete="off"
                      className="input w-full"
                    />
                    {mostrarSugestoesCli && (() => {
                      const termo = form.clinica.toLowerCase().trim();
                      const filtradas = clinicas.filter(c => !termo || c.nome.toLowerCase().includes(termo));
                      const exataExiste = clinicas.some(c => c.nome.toLowerCase() === termo);
                      if (filtradas.length === 0 && exataExiste) return null;
                      return (
                        <div className="absolute top-full left-0 right-0 z-20 bg-white border border-gray-200 rounded-xl shadow-lg mt-1 max-h-52 overflow-y-auto">
                          {filtradas.map(c => (
                            <button key={c.id} type="button"
                              onMouseDown={() => { setForm(f => ({ ...f, clinica: c.nome })); setMostrarSugestoesCli(false); }}
                              className="w-full text-left px-4 py-2.5 text-sm text-text-main hover:bg-gray-50 border-b border-gray-50 last:border-0">
                              {c.nome}
                            </button>
                          ))}
                          {form.clinica.trim() && !exataExiste && (
                            <button type="button" onMouseDown={adicionarClinica}
                              className="w-full text-left px-4 py-2.5 text-sm text-primary font-medium hover:bg-primary/5 border-t border-gray-100">
                              + Salvar &ldquo;{form.clinica.trim()}&rdquo; como nova clínica
                            </button>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                  {(() => {
                    const sel = clinicas.find(c => c.nome.toLowerCase() === form.clinica.toLowerCase().trim());
                    if (!sel) return null;
                    if (sel.email) return (
                      <div className="mt-2 flex items-center gap-2 text-xs text-text-muted bg-gray-50 rounded-lg px-3 py-2">
                        <span>📧</span>
                        <span>{sel.email}</span>
                      </div>
                    );
                    return (
                      <div className="mt-2 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <input
                            type="email"
                            value={emailClinicaInput}
                            onChange={e => setEmailClinicaInput(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && (e.preventDefault(), salvarEmailClinica(sel.id))}
                            placeholder="email@clinica.com.br"
                            className="input text-sm flex-1"
                          />
                          <button type="button" onClick={() => salvarEmailClinica(sel.id)}
                            disabled={!emailClinicaInput.trim()}
                            className="bg-primary text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-primary-light transition disabled:opacity-50 shrink-0">
                            Salvar
                          </button>
                        </div>
                        <p className="text-xs text-text-muted">Este e-mail ficará cadastrado e vinculado a <strong>{sel.nome}</strong> para envios futuros.</p>
                      </div>
                    );
                  })()}
                </div>

                {/* Pagamento */}
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1.5">Forma de pagamento</label>
                  <div className="flex items-center gap-2">
                    <select name="formaPagamento" value={form.formaPagamento} onChange={handleChange} className="input flex-1">
                      {formasPagamento.map(f => <option key={f}>{f}</option>)}
                    </select>
                    {mostrarAddPagamento ? (
                      <div className="flex items-center gap-1 shrink-0">
                        <input
                          value={novaFormaPagamento}
                          onChange={e => setNovaFormaPagamento(e.target.value)}
                          onKeyDown={e => e.key === "Enter" && (e.preventDefault(), adicionarFormaPagamento())}
                          placeholder="Nome"
                          autoFocus
                          className="input text-sm w-28"
                        />
                        <button type="button" onClick={adicionarFormaPagamento}
                          className="bg-primary text-white text-sm px-3 py-2 rounded-xl">✓</button>
                        <button type="button" onClick={() => { setMostrarAddPagamento(false); setNovaFormaPagamento(""); }}
                          className="text-text-muted text-sm px-1">✕</button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => setMostrarAddPagamento(true)}
                        className="shrink-0 text-sm text-primary border border-primary rounded-xl px-3 py-2 hover:bg-primary hover:text-white transition-all">
                        +
                      </button>
                    )}
                  </div>
                </div>

                {/* Valores */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-text-muted mb-1.5">Valor do exame (R$)</label>
                    <input name="preco" value={form.preco} onChange={handleChange} type="number" step="0.01" min="0" placeholder="0,00" className="input" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-muted mb-1.5">Desconto ao cliente (R$)</label>
                    <input name="desconto" value={form.desconto} onChange={handleChange} type="number" step="0.01" min="0" placeholder="0,00" className="input" />
                  </div>
                </div>
                {form.preco && (
                  (() => {
                    const bruto = parseFloat(form.preco) - parseFloat(form.desconto || "0");
                    return (
                      <div className="bg-gray-50 rounded-xl px-4 py-3 grid grid-cols-2 gap-2 text-sm text-center">
                        <div>
                          <p className="text-xs text-text-muted mb-0.5">Cobrado</p>
                          <p className="font-semibold text-text-main">{bruto.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
                        </div>
                        <div>
                          <p className="text-xs text-text-muted mb-0.5">Veterinária (com adicional) 42%</p>
                          <p className="font-semibold text-primary">{(bruto * 0.42).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
                        </div>
                      </div>
                    );
                  })()
                )}

                {/* Observações */}
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

              <button type="submit" disabled={carregando || tiposExame.length === 0}
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
                <p className="text-sm text-green-700">{dadosEnvio.nomePet} · {dadosEnvio.tiposExame.join(", ")} · {formatarData(dadosEnvio.dataExame)}</p>
              </div>
            </div>

            <h2 className="font-playfair text-2xl font-bold text-text-main mb-2">Como deseja enviar o laudo?</h2>
            <p className="text-text-muted text-sm mb-6">Escolha uma ou mais opções abaixo.</p>

            <div className="space-y-3">
              {clinicas.filter(c => c.email).map(c => (
                <button key={c.id}
                  onClick={() => enviarEmail(c.email!, "clinica", `clinica-${c.id}`, c.nome)}
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
