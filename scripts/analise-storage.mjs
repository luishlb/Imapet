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

const fmt = (b) => b < 1024 ? `${b.toFixed(0)} B` :
                   b < 1024**2 ? `${(b/1024).toFixed(1)} KB` :
                   b < 1024**3 ? `${(b/1024**2).toFixed(2)} MB` :
                                 `${(b/1024**3).toFixed(3)} GB`;

// ─── 1. STORAGE — varre todas as pastas e soma ──────────────────────────────
async function listAll(path) {
  const { data } = await sb.storage.from("laudos").list(path, { limit: 1000, sortBy: { column: "created_at", order: "asc" } });
  return data || [];
}

const raiz = await listAll("");
const subpastas = raiz.filter(f => f.id === null).map(f => f.name);
const todos = [];
for (const p of [...subpastas, ""]) {
  const itens = (await listAll(p)).filter(f => f.id !== null);
  for (const f of itens) {
    todos.push({ ...f, path: p ? `${p}/${f.name}` : f.name });
  }
}

const validos = todos.filter(f => f.metadata?.size);
const totalBytes = validos.reduce((s, f) => s + f.metadata.size, 0);
const totalFiles = validos.length;
const mediaBytes = totalFiles > 0 ? totalBytes / totalFiles : 0;

// PDFs (laudos) vs PNGs (comprovantes despesa)
const pdfs = validos.filter(f => f.path.toLowerCase().endsWith(".pdf"));
const imgs = validos.filter(f => /\.(png|jpg|jpeg|webp)$/i.test(f.path));
const pdfBytes = pdfs.reduce((s, f) => s + f.metadata.size, 0);
const imgBytes = imgs.reduce((s, f) => s + f.metadata.size, 0);

console.log("═══ STORAGE (bucket: laudos) ═══");
console.log(`Total: ${totalFiles} arquivos · ${fmt(totalBytes)}`);
console.log(`  PDFs (laudos):       ${pdfs.length} · ${fmt(pdfBytes)} · média ${fmt(pdfBytes / Math.max(pdfs.length, 1))}/arquivo`);
console.log(`  Imagens (comprov.):  ${imgs.length} · ${fmt(imgBytes)} · média ${fmt(imgBytes / Math.max(imgs.length, 1))}/arquivo`);
console.log(`  Outros:              ${totalFiles - pdfs.length - imgs.length}`);

// ─── 2. BANCO — exames com laudo, contagens ─────────────────────────────────
const { count: totalExames } = await sb.from("exames").select("id", { count: "exact", head: true });
const { count: comLaudo } = await sb.from("exames").select("id", { count: "exact", head: true }).not("laudo_url", "is", null);
const { count: totalPets } = await sb.from("pets").select("id", { count: "exact", head: true });
const { count: totalDespesas } = await sb.from("despesas").select("id", { count: "exact", head: true });

console.log("\n═══ TABELAS (banco) ═══");
console.log(`exames:   ${totalExames} linhas (${comLaudo} com laudo anexado = ${(comLaudo / totalExames * 100).toFixed(1)}%)`);
console.log(`pets:     ${totalPets} linhas`);
console.log(`despesas: ${totalDespesas} linhas`);

// Estimativa do tamanho médio de uma row de exames
// (id 36, data 4, tipo 30, clinica 30, forma_pagamento 10, valor 8, valor_bruto 8, nome_paciente 30, laudo_url 200, etc)
// ~ 400-500 bytes por row na prática + índices
const rowEstimadaBytes = 500;
const tabelaEstimadaBytes = totalExames * rowEstimadaBytes;
console.log(`Estimativa tamanho da tabela exames: ~${fmt(tabelaEstimadaBytes)} (${rowEstimadaBytes} B/row)`);

// ─── 3. CRESCIMENTO — laudos por mês (últimos 6 meses) ──────────────────────
const seismeses = new Date();
seismeses.setMonth(seismeses.getMonth() - 6);
const novos = pdfs.filter(f => f.created_at && new Date(f.created_at) >= seismeses);
const porMes = {};
novos.forEach(f => {
  const mes = f.created_at.slice(0, 7);
  if (!porMes[mes]) porMes[mes] = { count: 0, bytes: 0 };
  porMes[mes].count += 1;
  porMes[mes].bytes += f.metadata.size;
});

console.log("\n═══ CRESCIMENTO (laudos PDF criados nos últimos 6 meses) ═══");
const meses = Object.keys(porMes).sort();
meses.forEach(m => {
  console.log(`${m}: ${porMes[m].count.toString().padStart(3)} laudos · ${fmt(porMes[m].bytes)}`);
});
const mediaLaudosMes = meses.length > 0 ? meses.reduce((s, m) => s + porMes[m].count, 0) / meses.length : 0;
const mediaBytesMes = meses.length > 0 ? meses.reduce((s, m) => s + porMes[m].bytes, 0) / meses.length : 0;
console.log(`MÉDIA: ${mediaLaudosMes.toFixed(1)} laudos/mês · ${fmt(mediaBytesMes)}/mês`);

// ─── 4. PROJEÇÃO ────────────────────────────────────────────────────────────
const FREE_STORAGE = 1024 * 1024 * 1024; // 1 GB
const restanteStorage = FREE_STORAGE - totalBytes;
const mesesAteEncher = mediaBytesMes > 0 ? restanteStorage / mediaBytesMes : Infinity;

console.log("\n═══ PROJEÇÃO (limite Supabase Free: 1 GB Storage) ═══");
console.log(`Atual:     ${fmt(totalBytes)} (${(totalBytes / FREE_STORAGE * 100).toFixed(1)}% do limite)`);
console.log(`Restante:  ${fmt(restanteStorage)}`);
if (Number.isFinite(mesesAteEncher)) {
  console.log(`Ritmo atual: ${fmt(mediaBytesMes)}/mês`);
  console.log(`Estimativa: ${mesesAteEncher.toFixed(1)} meses até encher (~${(mesesAteEncher / 12).toFixed(1)} anos)`);
}

console.log("\n═══ EGRESS (download) — 5 GB/mês free ═══");
console.log(`Cada laudo baixado pelo tutor/clínica gasta ~${fmt(mediaBytes)}`);
const downloadsMaxMes = (5 * 1024 * 1024 * 1024) / mediaBytes;
console.log(`5 GB / ${fmt(mediaBytes)} = ~${downloadsMaxMes.toFixed(0)} downloads/mês até estourar`);
