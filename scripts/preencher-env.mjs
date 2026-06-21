// Preenche as env vars NFSE_* no .env.local com os dados extraídos do cert + valores do contador
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, "..", ".env.local");
const base64Path = join(__dirname, "..", "credenciais-cert-base64.local.txt");

const base64 = readFileSync(base64Path, "utf8").trim();

const NFSE_VARS = {
  NFSE_AMBIENTE: "homologacao",
  NFSE_CERT_BASE64: base64,
  NFSE_CERT_PASSWORD: "Camila@00",
  NFSE_CNPJ_EMITENTE: "42432557000141",
  NFSE_INSCRICAO_MUNICIPAL: "", // aguardando
  NFSE_CODIGO_MUNICIPIO: "2611606", // Recife
  NFSE_CODIGO_SERVICO: "501", // código municipal
  NFSE_CODIGO_SERVICO_NACIONAL: "05.03.01", // item da LC 116
  NFSE_ALIQUOTA_ISS: "0.02", // 2%
  NFSE_REGIME_TRIBUTARIO: "SimplesNacional",
};

let env = readFileSync(envPath, "utf8");

// Para cada chave, substituir linha existente ou adicionar
for (const [chave, valor] of Object.entries(NFSE_VARS)) {
  const regex = new RegExp(`^${chave}=.*$`, "m");
  if (regex.test(env)) {
    env = env.replace(regex, `${chave}=${valor}`);
  } else {
    env += `\n${chave}=${valor}`;
  }
}

writeFileSync(envPath, env);
console.log("✓ .env.local atualizado");
console.log(`  ${Object.keys(NFSE_VARS).length} variáveis NFSE_* configuradas`);
console.log(`  Cert base64: ${base64.length} caracteres`);
console.log("\n⚠  Falta apenas a Inscrição Municipal (não está no certificado)");
