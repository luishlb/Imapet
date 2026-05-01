// One-shot: importa os 23 atendimentos de abril/2026 (16/04 a 25/04)
// Idempotente — checa antes se já existem exames no período pra não duplicar.
//
// Rodar: node scripts/importar-abril-2026.mjs

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, "..", ".env.local");
const env = Object.fromEntries(
  readFileSync(envPath, "utf8")
    .split("\n")
    .filter(l => l.trim() && !l.startsWith("#"))
    .map(l => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

// ─── 1. 'Pendente' em formas_pagamento ───────────────────────────────────────
const { data: existePend } = await supabase
  .from("formas_pagamento")
  .select("nome")
  .eq("nome", "Pendente")
  .maybeSingle();

if (!existePend) {
  console.log("Inserindo 'Pendente' em formas_pagamento...");
  const { error } = await supabase.from("formas_pagamento").insert({ nome: "Pendente" });
  if (error) { console.error("✗ formas_pagamento:", error); process.exit(1); }
  console.log("✓ 'Pendente' adicionado");
} else {
  console.log("✓ 'Pendente' já existe em formas_pagamento");
}

// ─── 2. Verifica se já tem exames no período ─────────────────────────────────
const { count } = await supabase
  .from("exames")
  .select("id", { count: "exact", head: true })
  .gte("data_exame", "2026-04-16")
  .lte("data_exame", "2026-04-25");

if (count && count > 0) {
  console.log(`\n⚠  Já existem ${count} exames entre 16/04 e 25/04 no banco.`);
  console.log("    Pra evitar duplicação, NÃO vou inserir. Apague os existentes manualmente se quiser reimportar.");
  process.exit(0);
}

// ─── 3. Inserts ──────────────────────────────────────────────────────────────
const exames = [
  // 16/04
  { data_exame: "2026-04-16", tipo: "USG abdominal",   clinica: "Animania",          forma_pagamento: "Pendente", valor_bruto: 140.00, valor:  81.20, pet_id: null, nome_paciente: "Suzi (Fel SRD)" },
  { data_exame: "2026-04-16", tipo: "USG abdominal",   clinica: "Caninos e Felinos", forma_pagamento: "PIX",      valor_bruto: 180.00, valor: 104.40, pet_id: null, nome_paciente: "Estrela (Fel SRD)" },
  { data_exame: "2026-04-16", tipo: "USG abdominal",   clinica: "Cia do Animal",     forma_pagamento: "Pettop",   valor_bruto: 120.00, valor:  69.60, pet_id: null, nome_paciente: "Alceu (Pug)" },
  // 17/04
  { data_exame: "2026-04-17", tipo: "USG abdominal",   clinica: "Cia do Animal",     forma_pagamento: "Pettop",   valor_bruto: 120.00, valor:  69.60, pet_id: null, nome_paciente: "Nick (Pinscher)" },
  // 18/04
  { data_exame: "2026-04-18", tipo: "USG abdominal",   clinica: "CGT Paula",         forma_pagamento: "PIX",      valor_bruto: 140.00, valor:  81.20, pet_id: null, nome_paciente: "Kong (Fel SRD)" },
  { data_exame: "2026-04-18", tipo: "USG abdominal",   clinica: "Bicho Feliz",       forma_pagamento: "Pendente", valor_bruto: 150.00, valor:  87.00, pet_id: null, nome_paciente: "Apollo (Dasch)" },
  { data_exame: "2026-04-18", tipo: "USG abdominal",   clinica: "Brasilia Petshop",  forma_pagamento: "Pendente", valor_bruto: 120.00, valor:  69.60, pet_id: null, nome_paciente: "Juju (Fel SRD)" },
  // 20/04
  { data_exame: "2026-04-20", tipo: "USG abdominal",   clinica: "Clindermavet",      forma_pagamento: "PIX",      valor_bruto: 180.00, valor: 104.40, pet_id: null, nome_paciente: "Mel (Shihtzu)" },
  { data_exame: "2026-04-20", tipo: "USG abdominal",   clinica: "Caninos e Felinos", forma_pagamento: "PIX",      valor_bruto: 180.00, valor: 104.40, pet_id: null, nome_paciente: "Pipo (Shihtzu)" },
  { data_exame: "2026-04-20", tipo: "USG abdominal",   clinica: "Caninos e Felinos", forma_pagamento: "PIX",      valor_bruto: 180.00, valor: 104.40, pet_id: null, nome_paciente: "Dori (Fel SRD)" },
  { data_exame: "2026-04-20", tipo: "USG abdominal",   clinica: "Caninos e Felinos", forma_pagamento: "Crédito",  valor_bruto: 200.00, valor: 116.00, pet_id: null, nome_paciente: "Tanooki (Fel SRD)" },
  { data_exame: "2026-04-20", tipo: "USG abdominal",   clinica: "Caninos e Felinos", forma_pagamento: "Pendente", valor_bruto: 180.00, valor: 104.40, pet_id: null, nome_paciente: "Bebel (Fel SRD)" },
  // 22/04
  { data_exame: "2026-04-22", tipo: "Abdominocentese", clinica: "Brasilia Petshop",  forma_pagamento: "Pendente", valor_bruto:  50.00, valor:  29.00, pet_id: null, nome_paciente: "Isabella (Can SRD)" },
  { data_exame: "2026-04-22", tipo: "USG abdominal",   clinica: "Caninos e Felinos", forma_pagamento: "PIX",      valor_bruto: 200.00, valor: 116.00, pet_id: null, nome_paciente: "Coca (Can SRD)" },
  { data_exame: "2026-04-22", tipo: "USG abdominal",   clinica: "CGT Paula",         forma_pagamento: "PIX",      valor_bruto: 140.00, valor:  81.20, pet_id: null, nome_paciente: "Corujinha (Fel SRD)" },
  { data_exame: "2026-04-22", tipo: "USG abdominal",   clinica: "CGT Paula",         forma_pagamento: "PIX",      valor_bruto: 140.00, valor:  81.20, pet_id: null, nome_paciente: "Mila (Fel SRD)" },
  { data_exame: "2026-04-22", tipo: "USG abdominal",   clinica: "CGT Paula",         forma_pagamento: "PIX",      valor_bruto: 140.00, valor:  81.20, pet_id: null, nome_paciente: "Tina (Fel SRD)" },
  // 23/04
  { data_exame: "2026-04-23", tipo: "USG abdominal",   clinica: "CGT Paula",         forma_pagamento: "PIX",      valor_bruto: 140.00, valor:  81.20, pet_id: null, nome_paciente: "Amora (Fel SRD)" },
  { data_exame: "2026-04-23", tipo: "USG abdominal",   clinica: "CGT Paula",         forma_pagamento: "PIX",      valor_bruto: 140.00, valor:  81.20, pet_id: null, nome_paciente: "Galega (Fel SRD)" },
  { data_exame: "2026-04-23", tipo: "USG abdominal",   clinica: "CGT Paula",         forma_pagamento: "PIX",      valor_bruto: 140.00, valor:  81.20, pet_id: null, nome_paciente: "Kiko (Fel SRD)" },
  { data_exame: "2026-04-23", tipo: "USG abdominal",   clinica: "Cia do Animal",     forma_pagamento: "Pendente", valor_bruto: 120.00, valor:  69.60, pet_id: null, nome_paciente: "Pingo (Maltês)" },
  // 24/04
  { data_exame: "2026-04-24", tipo: "USG abdominal",   clinica: "Animania",          forma_pagamento: "Pendente", valor_bruto: 140.00, valor:  81.20, pet_id: null, nome_paciente: "Luna (Fel SRD)" },
  // 25/04
  { data_exame: "2026-04-25", tipo: "USG abdominal",   clinica: "Caninos e Felinos", forma_pagamento: "PIX",      valor_bruto: 180.00, valor: 104.40, pet_id: null, nome_paciente: "Pipo (Shihtzu)" },
];

console.log(`\nInserindo ${exames.length} exames...`);
const { error } = await supabase.from("exames").insert(exames);

if (error) {
  console.error("✗ Falhou:", error);
  process.exit(1);
}

const totalBruto = exames.reduce((s, e) => s + e.valor_bruto, 0);
const pendentes = exames.filter(e => e.forma_pagamento === "Pendente").length;
const totalPendente = exames.filter(e => e.forma_pagamento === "Pendente").reduce((s, e) => s + e.valor_bruto, 0);

console.log(`\n✓ ${exames.length} exames inseridos com sucesso`);
console.log(`   Faturamento bruto: R$ ${totalBruto.toFixed(2).replace(".", ",")}`);
console.log(`   Pendentes: ${pendentes} (R$ ${totalPendente.toFixed(2).replace(".", ",")})`);
