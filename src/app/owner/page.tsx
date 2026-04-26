"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";

const SENHA = process.env.NEXT_PUBLIC_OWNER_PASSWORD || "imapet2024";

const MODULES = [
  { href: "/owner/dashboard",    icon: "📊", title: "Dashboard financeiro",      desc: "Faturamento, gráficos e insights" },
  { href: "/owner/veterinaria",  icon: "🩺", title: "Pagamento veterinária",     desc: "Calcular por quinzena ou mês" },
  { href: "/owner/exames",       icon: "📋", title: "Tabela de exames",          desc: "Buscar, filtrar e excluir registros" },
  { href: "/owner/despesas",     icon: "💸", title: "Despesas",                  desc: "Lançar e consultar gastos" },
  { href: "/owner/relatorio",    icon: "📄", title: "Relatório Cia do Animal",   desc: "Gerar PDF mensal para cobrança" },
];

export default function OwnerPage() {
  const [autenticado, setAutenticado] = useState(false);
  const [senha, setSenha] = useState("");
  const [erroSenha, setErroSenha] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("owner_auth") === "1") setAutenticado(true);
  }, []);

  function login() {
    if (senha === SENHA) {
      localStorage.setItem("owner_auth", "1");
      setAutenticado(true);
    } else {
      setErroSenha(true);
    }
  }

  function logout() {
    localStorage.removeItem("owner_auth");
    setAutenticado(false);
  }

  if (!autenticado) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm p-8 w-full max-w-sm">
          <Image src="/Logomarca/imapet_transparent.png" alt="IMAPET" width={90} height={45} className="brightness-0 mb-6" />
          <h1 className="font-playfair text-2xl font-bold text-text-main mb-1">Área restrita</h1>
          <p className="text-sm text-text-muted mb-6">Gestão IMAPET</p>
          <input
            type="password" value={senha}
            onChange={e => { setSenha(e.target.value); setErroSenha(false); }}
            onKeyDown={e => e.key === "Enter" && login()}
            placeholder="Senha" className="input mb-3" autoFocus
          />
          {erroSenha && <p className="text-xs text-red-500 mb-3">Senha incorreta.</p>}
          <button onClick={login} className="w-full bg-primary text-white font-semibold py-3 rounded-xl hover:bg-primary-light transition">
            Entrar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <Image src="/Logomarca/imapet_transparent.png" alt="IMAPET" width={90} height={45} className="brightness-0" />
        <span className="text-sm font-semibold text-text-main">Gestão IMAPET</span>
        <button onClick={logout} className="text-xs text-text-muted hover:text-red-500 transition-colors">Sair</button>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="font-playfair text-2xl font-bold text-text-main">O que deseja fazer?</h1>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {MODULES.map(m => (
            <Link key={m.href} href={m.href}
              className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md border border-transparent hover:border-primary/20 transition-all group">
              <span className="text-3xl block mb-3">{m.icon}</span>
              <h2 className="font-playfair text-lg font-bold text-text-main group-hover:text-primary transition-colors">{m.title}</h2>
              <p className="text-xs text-text-muted mt-1">{m.desc}</p>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
