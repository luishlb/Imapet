import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { baixarDanfse, nfseConfigurada } from "@/lib/nfse";
import { uploadR2 } from "@/lib/r2";

export const runtime = "nodejs";
export const maxDuration = 30;

// GET /api/nfse/danfse/[chave]?upload=1
// - Sem ?upload: retorna o PDF direto (inline) para download
// - Com ?upload=1: faz upload pro R2 e retorna { url } pública (compartilhável)
export async function GET(req: NextRequest, ctx: { params: Promise<{ chave: string }> }) {
  if (!nfseConfigurada()) {
    return NextResponse.json({ ok: false, erro: "NFS-e não configurada." }, { status: 503 });
  }

  const { chave } = await ctx.params;
  const wantUpload = req.nextUrl.searchParams.get("upload") === "1";

  const r = await baixarDanfse(chave);
  if (!r.ok) {
    return NextResponse.json({ ok: false, erro: r.erro, detalhes: { status: r.status, body: r.body } }, { status: 502 });
  }

  if (wantUpload) {
    try {
      const key = `nfse/${chave}.pdf`;
      const finalUrl = await uploadR2(r.pdf, key, "application/pdf");

      const sb = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      );
      await sb.from("notas_fiscais").update({ nfse_pdf_url: finalUrl }).eq("numero_nfse", chave);

      return NextResponse.json({ ok: true, url: finalUrl });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "erro";
      return NextResponse.json({ ok: false, erro: `Falha no upload R2: ${msg}` }, { status: 500 });
    }
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
