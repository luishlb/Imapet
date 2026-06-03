import { NextRequest, NextResponse } from "next/server";
import { cancelarNfse, nfseConfigurada } from "@/lib/nfse";

export const runtime = "nodejs";

export async function POST(req: NextRequest, ctx: { params: Promise<{ numero: string }> }) {
  if (!nfseConfigurada()) {
    return NextResponse.json({ ok: false, erro: "NFS-e não configurada." }, { status: 503 });
  }
  const { numero } = await ctx.params;
  const { motivo } = await req.json();
  if (!motivo) {
    return NextResponse.json({ ok: false, erro: "Motivo obrigatório." }, { status: 400 });
  }
  const resultado = await cancelarNfse(numero, motivo);
  return NextResponse.json(resultado, { status: resultado.ok ? 200 : 400 });
}
