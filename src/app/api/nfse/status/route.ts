import { NextResponse } from "next/server";
import { ambienteAtual, nfseConfigurada, infoCertificado } from "@/lib/nfse";

export const runtime = "nodejs";

// Status leve pro modal de emissão: ambiente real (do servidor, não de env pública
// que pode dessincronizar) + validade do certificado A1. Não bate no gov.br.
export async function GET() {
  const configurada = nfseConfigurada();
  const cert = configurada ? infoCertificado() : null;

  return NextResponse.json({
    configurada,
    ambiente: ambienteAtual(),
    certificado: cert?.ok
      ? { validoAte: cert.validoAte, diasRestantes: cert.diasRestantes, vencido: cert.vencido }
      : null,
    certErro: cert && !cert.ok ? cert.erro : null,
  });
}
