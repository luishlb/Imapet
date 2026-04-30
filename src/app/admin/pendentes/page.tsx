"use client";

import Image from "next/image";
import Link from "next/link";
import PagamentosPendentes from "@/components/shared/PagamentosPendentes";

export default function PendentesAdminPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <Image src="/Logomarca/imapet_transparent.png" alt="IMAPET" width={100} height={50} className="brightness-0" />
        <div className="flex items-center gap-2 flex-wrap">
          <Link href="/admin/financeiro" className="text-sm font-medium px-4 py-2 rounded-xl border border-gray-200 text-text-muted hover:border-primary hover:text-primary transition-colors">Tabela</Link>
          <Link href="/admin/financeiro/dashboard" className="text-sm font-medium px-4 py-2 rounded-xl border border-gray-200 text-text-muted hover:border-primary hover:text-primary transition-colors">Dashboard</Link>
          <Link href="/admin/veterinaria" className="text-sm font-medium px-4 py-2 rounded-xl border border-gray-200 text-text-muted hover:border-primary hover:text-primary transition-colors">Meu pagamento</Link>
          <span className="text-sm font-semibold px-4 py-2 rounded-xl bg-primary text-white">Pendentes</span>
          <Link href="/admin" className="text-sm font-medium px-4 py-2 rounded-xl border border-gray-200 text-text-muted hover:border-primary hover:text-primary transition-colors">+ Novo exame</Link>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="font-playfair text-3xl font-bold text-text-main">Pagamentos pendentes</h1>
          <p className="text-text-muted text-sm mt-1">Marque como recebido quando o pagamento entrar</p>
        </div>
        <PagamentosPendentes />
      </main>
    </div>
  );
}
