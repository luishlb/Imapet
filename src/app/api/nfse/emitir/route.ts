import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { emitirNfse, nfseConfigurada, ambienteAtual, type DadosDPS } from "@/lib/nfse";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  if (!nfseConfigurada()) {
    return NextResponse.json(
      { ok: false, erro: "NFS-e ainda não configurada (faltam env vars). Verifique NFSE_CERT_BASE64, NFSE_CERT_PASSWORD, NFSE_CNPJ_EMITENTE, NFSE_INSCRICAO_MUNICIPAL." },
      { status: 503 },
    );
  }

  try {
    const body = await req.json() as DadosDPS & { exameId?: string };
    const { exameId, ...dados } = body;

    const resultado = await emitirNfse(dados);

    // Persiste no banco
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    const tomadorTipo = dados.tomador.tipo;
    const tomadorDoc = dados.tomador.documento;
    const aliq = dados.aliquotaIss ?? parseFloat(process.env.NFSE_ALIQUOTA_ISS || "0.02");

    const linha = {
      exame_id: exameId || null,
      ambiente: ambienteAtual(),
      status: resultado.ok ? "autorizada" : "rejeitada",
      numero_nfse: resultado.ok ? resultado.numeroNfse : null,
      codigo_verificacao: resultado.ok ? resultado.codigoVerificacao : null,
      erro: resultado.ok ? null : resultado.erro,
      tomador_nome: dados.tomador.nome,
      tomador_documento: tomadorDoc,
      tomador_tipo_doc: tomadorTipo,
      tomador_email: dados.tomador.email || null,
      descricao: dados.descricao,
      valor_servico: dados.valorServico,
      aliquota_iss: aliq,
      valor_iss: Math.round(dados.valorServico * aliq * 100) / 100,
      dps_xml: resultado.ok ? resultado.xmlDps : null,
      nfse_xml: resultado.ok ? resultado.xmlNfse : null,
      emitida_em: resultado.ok ? new Date().toISOString() : null,
    };

    await sb.from("notas_fiscais").insert(linha);

    return NextResponse.json(resultado, { status: resultado.ok ? 200 : 400 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "erro desconhecido";
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
