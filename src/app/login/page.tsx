"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

function formatarCPF(valor: string) {
  return valor
    .replace(/\D/g, "")
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

export default function LoginPage() {
  const router = useRouter();
  const [cpf, setCpf] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setCarregando(true);

    const cpfLimpo = cpf.replace(/\D/g, "");
    const emailInterno = `${cpfLimpo}@imapet.internal`;

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: emailInterno,
      password: senha,
    });

    if (error) {
      setErro("CPF ou senha incorretos.");
      setCarregando(false);
      return;
    }

    router.push("/area-do-tutor");
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Link href="/">
            <Image
              src="/Logomarca/imapet_transparent.png"
              alt="IMAPET"
              width={140}
              height={70}
              className="brightness-0"
            />
          </Link>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-sm p-8">
          <h1 className="font-playfair text-2xl font-bold text-text-main mb-1">
            Bem-vindo
          </h1>
          <p className="text-text-muted text-sm mb-8">
            Acesse os laudos e o histórico de exames do seu pet.
          </p>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-text-main mb-1.5">
                CPF
              </label>
              <input
                type="text"
                value={cpf}
                onChange={(e) => setCpf(formatarCPF(e.target.value))}
                required
                placeholder="000.000.000-00"
                inputMode="numeric"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-text-main placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-main mb-1.5">
                Senha
              </label>
              <input
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-text-main placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
              />
            </div>

            {erro && (
              <p className="text-sm text-red-600 bg-red-50 px-4 py-2.5 rounded-xl">
                {erro}
              </p>
            )}

            <button
              type="submit"
              disabled={carregando}
              className="w-full bg-primary hover:bg-primary-light text-white font-semibold py-3.5 rounded-xl transition-all duration-300 disabled:opacity-60"
            >
              {carregando ? "Entrando..." : "Entrar"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-text-muted mt-6">
          <Link href="/" className="hover:text-primary transition-colors">
            ← Voltar ao site
          </Link>
        </p>
      </div>
    </div>
  );
}
