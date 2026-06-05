import { NextResponse } from "next/server";
import { carregarCertificado, ambienteAtual, endpointBase, nfseConfigurada, diagnosticarConexao } from "@/lib/nfse";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET() {
  const config = {
    nfseConfigurada: nfseConfigurada(),
    ambiente: ambienteAtual(),
    endpoint: endpointBase(),
    envVars: {
      NFSE_AMBIENTE: !!process.env.NFSE_AMBIENTE,
      NFSE_CERT_BASE64: process.env.NFSE_CERT_BASE64 ? `${process.env.NFSE_CERT_BASE64.length} chars` : false,
      NFSE_CERT_PASSWORD: !!process.env.NFSE_CERT_PASSWORD,
      NFSE_CNPJ_EMITENTE: process.env.NFSE_CNPJ_EMITENTE || false,
      NFSE_INSCRICAO_MUNICIPAL: process.env.NFSE_INSCRICAO_MUNICIPAL || false,
      NFSE_CODIGO_MUNICIPIO: process.env.NFSE_CODIGO_MUNICIPIO || false,
      NFSE_CODIGO_SERVICO: process.env.NFSE_CODIGO_SERVICO || false,
      NFSE_CODIGO_SERVICO_NACIONAL: process.env.NFSE_CODIGO_SERVICO_NACIONAL || false,
      NFSE_ALIQUOTA_ISS: process.env.NFSE_ALIQUOTA_ISS || false,
      NFSE_REGIME_TRIBUTARIO: process.env.NFSE_REGIME_TRIBUTARIO || false,
    },
  };

  // Tenta carregar certificado
  let certInfo: unknown = null;
  let certErro: string | null = null;
  try {
    const { cert } = carregarCertificado();
    certInfo = {
      subject: cert.subject.attributes.map((a) => `${a.shortName}=${a.value}`).join(", "),
      validade: {
        de: cert.validity.notBefore.toISOString(),
        ate: cert.validity.notAfter.toISOString(),
        diasRestantes: Math.floor((cert.validity.notAfter.getTime() - Date.now()) / 86400000),
      },
    };
  } catch (e) {
    certErro = e instanceof Error ? e.message : "Erro desconhecido";
  }

  // Testa conexão
  const conexao = await diagnosticarConexao();

  return NextResponse.json({
    config,
    certificado: certInfo,
    certErro,
    conexao,
  });
}
