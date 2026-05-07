// Migra todos os arquivos do Supabase Storage (bucket "laudos") pro Cloudflare R2.
// Atualiza laudo_url em exames e comprovante_url em despesas.
// Idempotente — só migra arquivos cuja URL atual ainda aponta pro Supabase.

import { createClient } from "@supabase/supabase-js";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
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

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
});

const SUPABASE_PUBLIC = env.NEXT_PUBLIC_SUPABASE_URL + "/storage/v1/object/public/laudos/";
const R2_PUBLIC = env.R2_PUBLIC_URL;

// Lista todos os arquivos do bucket "laudos" recursivamente
async function listAll(path = "") {
  const out = [];
  const { data } = await sb.storage.from("laudos").list(path, { limit: 1000 });
  for (const item of data || []) {
    const fullPath = path ? `${path}/${item.name}` : item.name;
    if (item.id === null) {
      out.push(...(await listAll(fullPath)));
    } else {
      out.push({ ...item, path: fullPath });
    }
  }
  return out;
}

console.log("Listando arquivos do Supabase Storage...");
const arquivos = await listAll();
console.log(`Encontrados: ${arquivos.length} arquivos`);

let migrados = 0;
let pulados = 0;
const mapaUrls = {}; // supabaseUrl → r2Url

for (const f of arquivos) {
  const supabaseUrl = SUPABASE_PUBLIC + f.path;
  const r2Url = `${R2_PUBLIC}/${f.path}`;

  // Baixa do Supabase
  const { data: blob, error: dlErr } = await sb.storage.from("laudos").download(f.path);
  if (dlErr || !blob) {
    console.log(`✗ falha ao baixar ${f.path}: ${dlErr?.message}`);
    pulados++;
    continue;
  }

  // Sobe pro R2 com a mesma key
  const buffer = Buffer.from(await blob.arrayBuffer());
  await r2.send(new PutObjectCommand({
    Bucket: env.R2_BUCKET,
    Key: f.path,
    Body: buffer,
    ContentType: blob.type || "application/octet-stream",
  }));

  mapaUrls[supabaseUrl] = r2Url;
  migrados++;
  console.log(`✓ [${migrados}/${arquivos.length}] ${f.path} (${(buffer.length / 1024).toFixed(1)} KB)`);
}

console.log(`\nArquivos migrados: ${migrados}, pulados: ${pulados}\n`);

// Atualiza URLs no banco
console.log("Atualizando URLs em 'exames'...");
const { data: exames } = await sb.from("exames").select("id, laudo_url").not("laudo_url", "is", null);
let atualizadosExames = 0;
for (const e of exames || []) {
  if (mapaUrls[e.laudo_url]) {
    await sb.from("exames").update({ laudo_url: mapaUrls[e.laudo_url] }).eq("id", e.id);
    atualizadosExames++;
  }
}
console.log(`✓ ${atualizadosExames} URLs atualizadas em exames\n`);

console.log("Atualizando URLs em 'despesas'...");
const { data: despesas } = await sb.from("despesas").select("id, comprovante_url").not("comprovante_url", "is", null);
let atualizadosDespesas = 0;
for (const d of despesas || []) {
  if (mapaUrls[d.comprovante_url]) {
    await sb.from("despesas").update({ comprovante_url: mapaUrls[d.comprovante_url] }).eq("id", d.id);
    atualizadosDespesas++;
  }
}
console.log(`✓ ${atualizadosDespesas} URLs atualizadas em despesas\n`);

console.log("MIGRAÇÃO CONCLUÍDA");
console.log(`  Arquivos no R2: ${migrados}`);
console.log(`  Exames atualizados: ${atualizadosExames}`);
console.log(`  Despesas atualizadas: ${atualizadosDespesas}`);
console.log(`\nOs arquivos no Supabase Storage continuam intactos (backup).`);
console.log(`Após validar tudo, rode 'apagar-supabase-storage.mjs' pra limpar.`);
