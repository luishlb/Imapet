// Lê o certificado A1, valida com a senha, extrai dados e converte pra base64

import forge from "node-forge";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const CERT_PATH = "C:/Users/Administrator/Downloads/Imapet - senha Camila@00.pfx";
const SENHA = "Camila@00";

// Lê o arquivo
let buf;
try {
  buf = readFileSync(CERT_PATH);
  console.log(`✓ Arquivo lido: ${(buf.length / 1024).toFixed(1)} KB`);
} catch (e) {
  console.error(`✗ Não consegui ler o arquivo: ${e.message}`);
  process.exit(1);
}

// Tenta abrir com a senha
let p12;
try {
  const der = buf.toString("binary");
  const p12Asn1 = forge.asn1.fromDer(der);
  p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, SENHA);
  console.log(`✓ Senha "${SENHA}" funcionou`);
} catch (e) {
  console.error(`✗ Senha não bate: ${e.message}`);
  process.exit(1);
}

// Extrai certificado e chave privada
const bags = p12.getBags({ bagType: forge.pki.oids.certBag });
const certBag = bags[forge.pki.oids.certBag]?.[0];
const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
const keyBag = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0];

if (!certBag || !keyBag) {
  console.error("✗ Certificado ou chave privada não encontrados no PFX");
  process.exit(1);
}

const cert = certBag.cert;
console.log("\n═══ DADOS DO CERTIFICADO ═══");
console.log(`Subject:    ${cert.subject.attributes.map(a => `${a.shortName}=${a.value}`).join(", ")}`);
console.log(`Issuer:     ${cert.issuer.attributes.map(a => `${a.shortName}=${a.value}`).join(", ")}`);
console.log(`Validade:   ${cert.validity.notBefore.toLocaleDateString("pt-BR")} → ${cert.validity.notAfter.toLocaleDateString("pt-BR")}`);

// Extrai CNPJ do CN (formato: "NOME DA EMPRESA:CNPJ" ou similar)
const cnAttr = cert.subject.getField("CN");
if (cnAttr) {
  console.log(`CN:         ${cnAttr.value}`);
  const cnpjMatch = cnAttr.value.match(/(\d{14})/);
  if (cnpjMatch) {
    const cnpj = cnpjMatch[1];
    const cnpjFmt = `${cnpj.slice(0,2)}.${cnpj.slice(2,5)}.${cnpj.slice(5,8)}/${cnpj.slice(8,12)}-${cnpj.slice(12,14)}`;
    console.log(`CNPJ extraído: ${cnpjFmt}`);
  }
}

// Converte arquivo pra base64
const base64 = buf.toString("base64");
console.log(`\nBase64: ${base64.length} caracteres`);
console.log(`Preview: ${base64.slice(0, 60)}...`);

// Validade restante
const now = new Date();
const diasRestantes = Math.floor((cert.validity.notAfter - now) / (1000 * 60 * 60 * 24));
console.log(`\n⏱  Validade restante: ${diasRestantes} dias`);
if (diasRestantes < 30) console.log("⚠  Certificado expirando em breve!");
if (diasRestantes < 0) console.log("🔴 CERTIFICADO EXPIRADO!");

// Grava base64 num arquivo temporário pra eu colar no .env.local
const outPath = join(__dirname, "..", "credenciais-cert-base64.local.txt");
import("node:fs").then(fs => {
  fs.writeFileSync(outPath, base64);
  console.log(`\n💾 Base64 salvo em: ${outPath}`);
  console.log("   (esse arquivo está no .gitignore — não vai pro repositório)");
});
