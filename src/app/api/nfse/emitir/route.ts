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
      dps_xml: resultado.ok ? resultado.xmlDps : (resultado as { xmlDpsTentado?: string }).xmlDpsTentado || null,
      nfse_xml: resultado.ok ? resultado.xmlNfse : null,
      emitida_em: resultado.ok ? new Date().toISOString() : null,
    };

    console.log("[NFSE] Resultado emissão:", JSON.stringify({ ok: resultado.ok, numero: resultado.ok ? resultado.numeroNfse : null, erro: resultado.ok ? null : resultado.erro }).slice(0, 500));
    console.log("[NFSE] Tentando insert:", JSON.stringify({ ...linha, dps_xml: linha.dps_xml ? `${linha.dps_xml.length} chars` : null, nfse_xml: linha.nfse_xml ? `${linha.nfse_xml.length} chars` : null }).slice(0, 800));

    const { error: insertErr, data: insertData } = await sb.from("notas_fiscais").insert(linha).select("id").single();
    if (insertErr) {
      console.error("[NFSE] ERRO no insert:", JSON.stringify(insertErr));
      // Não falha o request — a nota foi emitida no gov.br. Retorna sucesso com aviso.
      return NextResponse.json({
        ...resultado,
        avisoBanco: `Nota emitida no gov.br mas falhou ao salvar localmente: ${insertErr.message}`,
      }, { status: resultado.ok ? 200 : 400 });
    }

    console.log("[NFSE] Insert OK, id:", insertData?.id);

    // Cadastra/atualiza tomador pra autocompletar nas próximas emissões
    if (resultado.ok && tomadorDoc) {
      try {
        const tom = dados.tomador;
        const endereco = (tom as { endereco?: { logradouro?: string; numero?: string; complemento?: string; bairro?: string; cidade?: string; uf?: string; cep?: string; codigoMunicipio?: string } }).endereco;
        const docDigitos = tomadorDoc.replace(/\D/g, "");
        const tomadorRow = {
          tipo_doc: tomadorTipo,
          documento: docDigitos,
          nome: tom.nome,
          email: tom.email || null,
          logradouro: endereco?.logradouro || null,
          numero: endereco?.numero || null,
          complemento: endereco?.complemento || null,
          bairro: endereco?.bairro || null,
          cidade: endereco?.cidade || null,
          uf: endereco?.uf || null,
          cep: endereco?.cep || null,
          cod_municipio: endereco?.codigoMunicipio || null,
          ultima_emissao_em: new Date().toISOString(),
        };
        // Upsert por documento — se já existe, atualiza últimos dados + incrementa contador
        const { data: existente } = await sb.from("tomadores_nf").select("emissoes").eq("documento", docDigitos).maybeSingle();
        if (existente) {
          await sb.from("tomadores_nf").update({
            ...tomadorRow,
            emissoes: (existente.emissoes || 0) + 1,
          }).eq("documento", docDigitos);
        } else {
          await sb.from("tomadores_nf").insert(tomadorRow);
        }
      } catch (e) {
        console.error("[NFSE] Falha ao salvar tomador (não-crítico):", e);
      }
    }

    return NextResponse.json({ ...resultado, notaId: insertData?.id }, { status: resultado.ok ? 200 : 400 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "erro desconhecido";
    console.error("Erro na API de emissão:", e);
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
