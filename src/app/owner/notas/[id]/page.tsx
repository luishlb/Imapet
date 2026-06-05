"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { moeda, dataFmt } from "@/lib/utils";

type NotaFiscal = {
  id: string;
  numero_nfse: string | null;
  ambiente: string;
  status: string;
  tomador_nome: string;
  tomador_documento: string | null;
  descricao: string;
  valor_servico: number;
  nfse_pdf_url: string | null;
  emitida_em: string | null;
  criado_em: string;
};

export default function NotaDetalhePage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const [auth, setAuth] = useState<boolean | null>(null);
  const [nota, setNota] = useState<NotaFiscal | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [compartilhando, setCompartilhando] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("owner_auth") !== "1") { router.replace("/owner"); return; }
    setAuth(true);
    (async () => {
      const { data } = await createClient().from("notas_fiscais").select("*").eq("id", id).single();
      setNota((data as NotaFiscal) || null);
      setCarregando(false);
    })();
  }, [id, router]);

  function baixarPdf() {
    if (!nota?.numero_nfse) return;
    window.open(`/api/nfse/danfse/${nota.numero_nfse}`, "_blank");
  }

  async function compartilhar() {
    if (!nota?.numero_nfse) return;
    setCompartilhando(true);
    try {
      // Sobe o PDF do gov.br pro R2 e atualiza nfse_pdf_url
      let pdfUrl = nota.nfse_pdf_url;
      if (!pdfUrl) {
        const res = await fetch(`/api/nfse/danfse/${nota.numero_nfse}?upload=1`);
        const data = await res.json();
        if (!data.ok || !data.url) {
          alert("Falha ao gerar link: " + (data.erro || "erro"));
          setCompartilhando(false);
          return;
        }
        pdfUrl = data.url;
        setNota({ ...nota, nfse_pdf_url: pdfUrl });
      }

      const texto =
        `Nota Fiscal de Serviço — IMAPET\n\n` +
        `Valor: ${moeda(nota.valor_servico)}\n` +
        `Serviço: ${nota.descricao}\n\n` +
        `📄 Acessar nota oficial:\n${pdfUrl}\n\n` +
        `Chave de acesso: ${nota.numero_nfse}`;

      if (typeof navigator !== "undefined" && navigator.share) {
        try {
          await navigator.share({ title: "NFS-e IMAPET", text: texto, url: pdfUrl ?? undefined });
          setCompartilhando(false);
          return;
        } catch { /* cancelado */ }
      }
      window.open(`https://web.whatsapp.com/send?text=${encodeURIComponent(texto)}`, "_blank");
    } catch (e) {
      alert("Erro: " + (e instanceof Error ? e.message : "desconhecido"));
    }
    setCompartilhando(false);
  }

  if (!auth) return null;
  if (carregando) return <p className="text-center text-text-muted py-20">Carregando...</p>;
  if (!nota) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-text-muted">Nota não encontrada.</p>
    </div>
  );

  const pdfUrl = nota.numero_nfse ? `/api/nfse/danfse/${nota.numero_nfse}` : null;

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <Link href="/owner/notas" className="text-sm text-text-muted hover:text-primary">← Voltar</Link>
        <span className="text-sm font-semibold text-text-main">NFS-e</span>
        <span className="hidden sm:inline text-[11px] text-text-muted">
          {nota.numero_nfse ? `${nota.numero_nfse.slice(0, 8)}…${nota.numero_nfse.slice(-6)}` : ""}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={baixarPdf}
            disabled={!pdfUrl}
            className="bg-primary text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-primary-light transition disabled:opacity-50"
          >
            📄 Baixar
          </button>
          <button
            onClick={compartilhar}
            disabled={compartilhando || !pdfUrl}
            className="bg-green-600 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-green-700 transition disabled:opacity-50"
          >
            {compartilhando ? "..." : "📤 Compartilhar"}
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-5 space-y-4">
        {/* Resumo da nota */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Tomador</p>
              <p className="text-sm font-medium text-text-main">{nota.tomador_nome}</p>
              {nota.tomador_documento && <p className="text-xs text-text-muted">{nota.tomador_documento}</p>}
            </div>
            <div className="text-right">
              <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Valor</p>
              <p className="font-playfair text-xl font-bold text-primary">{moeda(nota.valor_servico)}</p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Serviço</p>
            <p className="text-sm text-text-main">{nota.descricao}</p>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between flex-wrap gap-2">
            <span className={`text-[10px] font-semibold px-2 py-1 rounded-md ${nota.ambiente === "homologacao" ? "bg-amber-100 text-amber-800" : "bg-green-100 text-green-700"}`}>
              {nota.ambiente === "homologacao" ? "⚠ Homologação (sem valor fiscal)" : "✓ Produção"}
            </span>
            <span className="text-xs text-text-muted">
              Emitida em {dataFmt((nota.emitida_em || nota.criado_em).slice(0, 10))}
            </span>
          </div>
          {nota.numero_nfse && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Chave de acesso</p>
              <p className="text-[11px] font-mono break-all text-text-main mt-0.5">{nota.numero_nfse}</p>
            </div>
          )}
        </div>

        {/* PDF embed */}
        {pdfUrl && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
              <p className="text-sm font-semibold text-text-main">Nota Fiscal — DANFSe oficial</p>
              <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
                Abrir em nova aba ↗
              </a>
            </div>
            <iframe
              src={pdfUrl}
              className="w-full"
              style={{ height: "80vh", border: "none" }}
              title="DANFSe oficial"
            />
            <p className="text-[11px] text-text-muted px-5 py-2 bg-gray-50">
              Se o PDF não carregar acima, use o botão <strong>📄 Baixar</strong> no topo.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
