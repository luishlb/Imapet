import { NextRequest, NextResponse } from "next/server";
import { consultarNfse, nfseConfigurada } from "@/lib/nfse";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ numero: string }> }) {
  if (!nfseConfigurada()) {
    return NextResponse.json({ ok: false, erro: "NFS-e não configurada." }, { status: 503 });
  }
  const { numero } = await ctx.params;
  const resultado = await consultarNfse(numero);
  return NextResponse.json(resultado, { status: resultado.ok ? 200 : 400 });
}
