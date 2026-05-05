import { createClient } from "@/lib/supabase/client";

export type Origem = "admin" | "owner";

type Diff = Record<string, { de: unknown; para: unknown }>;

export async function logEdit(
  exameId: string,
  alteracoes: Diff,
  resumo: string,
  origem: Origem,
) {
  if (Object.keys(alteracoes).length === 0) return;
  await createClient().from("exames_log").insert({
    exame_id: exameId,
    acao: "edit",
    alteracoes,
    resumo,
    origem,
  });
}

export async function logDelete(
  exameId: string,
  snapshot: Record<string, unknown>,
  resumo: string,
  origem: Origem,
) {
  await createClient().from("exames_log").insert({
    exame_id: exameId,
    acao: "delete",
    alteracoes: snapshot,
    resumo,
    origem,
  });
}

export async function logPagamentoRecebido(
  exameId: string,
  formaAntiga: string,
  formaNova: string,
  resumo: string,
  origem: Origem,
) {
  await createClient().from("exames_log").insert({
    exame_id: exameId,
    acao: "pagamento_recebido",
    alteracoes: { forma_pagamento: { de: formaAntiga, para: formaNova } },
    resumo,
    origem,
  });
}

export function diffObjects<T extends Record<string, unknown>>(antes: T, depois: T): Diff {
  const out: Diff = {};
  for (const k of Object.keys(depois)) {
    const a = antes[k];
    const b = depois[k];
    if (JSON.stringify(a) !== JSON.stringify(b)) out[k] = { de: a, para: b };
  }
  return out;
}
