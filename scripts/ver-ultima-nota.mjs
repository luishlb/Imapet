import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const env = Object.fromEntries(
  readFileSync(join(__dirname, "..", ".env.local"), "utf8")
    .split("\n").filter(l => l.trim() && !l.startsWith("#"))
    .map(l => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const { data } = await sb.from("notas_fiscais").select("*").order("criado_em", { ascending: false }).limit(3);
if (!data || data.length === 0) {
  console.log("Nenhuma nota foi gravada no banco.");
  process.exit(0);
}
for (const n of data) {
  console.log("─".repeat(60));
  console.log(`ID: ${n.id}`);
  console.log(`Status: ${n.status}`);
  console.log(`Ambiente: ${n.ambiente}`);
  console.log(`Tomador: ${n.tomador_nome} (${n.tomador_tipo_doc} ${n.tomador_documento})`);
  console.log(`Descrição: ${n.descricao}`);
  console.log(`Valor: R$ ${n.valor_servico}`);
  console.log(`Erro: ${n.erro || "—"}`);
  console.log(`Número NFSe: ${n.numero_nfse || "—"}`);
  console.log(`Criado em: ${n.criado_em}`);
  if (n.dps_xml) console.log(`DPS XML (primeiros 300 chars): ${n.dps_xml.slice(0, 300)}...`);
  if (n.nfse_xml) console.log(`NFS-e XML (primeiros 300 chars): ${n.nfse_xml.slice(0, 300)}...`);
}
