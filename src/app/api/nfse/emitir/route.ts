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
      numero_nfse: resultado.ok && resultado.numeroNfse ? resultado.numeroNfse : null,
      codigo_verificacao: resultado.ok && resultado.codigoVerificacao ? resultado.codigoVerificacao : null,
      erro: resultado.ok ? null : resultado.erro,
      tomador_nome: dados.tomador.nome,
      tomador_documento: tomadorDoc || null,
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

    const { error: insertErr } = await sb.from("notas_fiscais").insert(linha);
    if (insertErr) {
      console.error("Erro ao persistir nota:", insertErr);
      // Não falha o request — a nota foi emitida no gov.br. Retorna sucesso com aviso.
      return NextResponse.json({
        ...resultado,
        avisoBanco: `Nota emitida no gov.br mas falhou ao salvar localmente: ${insertErr.message}`,
      }, { status: resultado.ok ? 200 : 400 });
    }

    return NextResponse.json(resultado, { status: resultado.ok ? 200 : 400 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "erro desconhecido";
    console.error("Erro na API de emissão:", e);
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
