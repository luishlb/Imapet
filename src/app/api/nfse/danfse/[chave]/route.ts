import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { baixarDanfse, nfseConfigurada } from "@/lib/nfse";
import { uploadR2 } from "@/lib/r2";

export const runtime = "nodejs";
export const maxDuration = 30;

// GET /api/nfse/danfse/[chave]?upload=1
// - Sem ?upload: serve o PDF (inline). Se já existe no R2, redireciona; senão baixa do gov.br
//   e faz upload em background pra próximas requisições servirem do R2 direto.
// - Com ?upload=1: força reupload e retorna { url } pública (compartilhável)
export async function GET(req: NextRequest, ctx: { params: Promise<{ chave: string }> }) {
  if (!nfseConfigurada()) {
    return NextResponse.json({ ok: false, erro: "NFS-e não configurada." }, { status: 503 });
  }

  const { chave } = await ctx.params;
  const wantUpload = req.nextUrl.searchParams.get("upload") === "1";

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  // Cache R2: se já tem nfse_pdf_url no banco e não é upload forçado, redireciona pro R2
  if (!wantUpload) {
    const { data: nota } = await sb.from("notas_fiscais").select("nfse_pdf_url").eq("numero_nfse", chave).maybeSingle();
    if (nota?.nfse_pdf_url) {
      return NextResponse.redirect(nota.nfse_pdf_url, 302);
    }
  }

  // Não tem cache — baixa do gov.br (sujeito a rate limit)
  const r = await baixarDanfse(chave);
  if (!r.ok) {
    const dica = r.status === 429
      ? "O gov.br limitou as requisições temporariamente. Aguarde 1 minuto e recarregue."
      : "O PDF pode estar sendo gerado — tente novamente em alguns minutos.";
    return NextResponse.json({ ok: false, erro: `${r.erro} ${dica}`, detalhes: { status: r.status, body: r.body } }, { status: 502 });
  }

  // Upload pro R2 (sempre, pra cachear) — não bloqueia o request
  const key = `nfse/${chave}.pdf`;
  try {
    const finalUrl = await uploadR2(r.pdf, key, "application/pdf");
    await sb.from("notas_fiscais").update({ nfse_pdf_url: finalUrl }).eq("numero_nfse", chave);

    if (wantUpload) {
      return NextResponse.json({ ok: true, url: finalUrl });
    }
    // Redireciona pro R2 — economiza serializar o PDF de volta no response
    return NextResponse.redirect(finalUrl, 302);
  } catch (e) {
    // Se o upload falhar, ainda serve o PDF direto (fluxo antigo)
    console.error("[DANFSe] Upload R2 falhou:", e);
    if (wantUpload) {
      const msg = e instanceof Error ? e.message : "erro";
      return NextResponse.json({ ok: false, erro: `Falha no upload R2: ${msg}` }, { status: 500 });
    }
    return new NextResponse(r.pdf as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="NFSe-${chave}.pdf"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  }
}
