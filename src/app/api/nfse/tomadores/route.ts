import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function GET() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const { data, error } = await sb
    .from("tomadores_nf")
    .select("id, tipo_doc, documento, nome, email, logradouro, numero, complemento, bairro, cidade, uf, cep, cod_municipio, ultima_emissao_em, emissoes")
    .order("ultima_emissao_em", { ascending: false })
    .limit(200);

  if (error) {
    // Tabela não existe ainda
    if (error.code === "PGRST205" || error.message?.includes("tomadores_nf")) {
      return NextResponse.json({ tomadores: [], setupPendente: true });
    }
    return NextResponse.json({ erro: error.message }, { status: 500 });
  }

  return NextResponse.json({ tomadores: data || [] });
}
