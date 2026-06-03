import { NextRequest, NextResponse } from "next/server";
import { emitirNfse, nfseConfigurada, type DadosDPS } from "@/lib/nfse";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  if (!nfseConfigurada()) {
    return NextResponse.json(
      { ok: false, erro: "NFS-e ainda não configurada. Aguardando certificado A1." },
      { status: 503 },
    );
  }

  try {
    const dados = (await req.json()) as DadosDPS;
    const resultado = await emitirNfse(dados);
    return NextResponse.json(resultado, { status: resultado.ok ? 200 : 400 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "erro desconhecido";
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
