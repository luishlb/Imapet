"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PagamentosPendentes from "@/components/shared/PagamentosPendentes";

export default function PendentesOwnerPage() {
  const router = useRouter();
  const [auth, setAuth] = useState<boolean | null>(null);

  useEffect(() => {
    if (localStorage.getItem("owner_auth") !== "1") { router.replace("/owner"); return; }
    setAuth(true);
  }, [router]);

  if (!auth) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-4 sticky top-0 z-10">
        <Link href="/owner" className="text-sm text-text-muted hover:text-primary transition-colors">← Voltar</Link>
        <span className="text-sm font-semibold text-text-main">Pagamentos pendentes</span>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-8">
        <PagamentosPendentes />
      </main>
    </div>
  );
}
