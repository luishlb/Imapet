export function moeda(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function dataFmt(d: string) {
  const [a, m, dia] = d.split("-");
  return `${dia}/${m}/${a}`;
}

export function ultimoDiaMes(mes: number, ano: number) {
  return new Date(ano, mes, 0).getDate();
}

const PLANOS = new Set(["eupet", "petcare", "petlove", "pettop"]);

export function formatarPagamento(p: string | null): string {
  if (!p) return "Pendente";
  if (PLANOS.has(p.trim().toLowerCase())) return p.trim();
  return "Pendente";
}

export function valorExtenso(valor: number): string {
  if (isNaN(valor) || valor <= 0) return "zero reais";
  const reais = Math.floor(valor);
  const centavos = Math.round((valor - reais) * 100);
  const u = ["","um","dois","três","quatro","cinco","seis","sete","oito","nove",
    "dez","onze","doze","treze","quatorze","quinze","dezesseis","dezessete","dezoito","dezenove"];
  const dz = ["","","vinte","trinta","quarenta","cinquenta","sessenta","setenta","oitenta","noventa"];
  const c = ["","cento","duzentos","trezentos","quatrocentos","quinhentos","seiscentos","setecentos","oitocentos","novecentos"];
  function n2w(n: number): string {
    if (n === 0) return "";
    if (n === 100) return "cem";
    if (n < 20) return u[n];
    if (n < 100) return dz[Math.floor(n / 10)] + (n % 10 ? " e " + u[n % 10] : "");
    const r = n % 100;
    return c[Math.floor(n / 100)] + (r ? " e " + n2w(r) : "");
  }
  function full(n: number): string {
    if (n === 0) return "zero";
    if (n < 1000) return n2w(n);
    const mil = Math.floor(n / 1000);
    const r = n % 1000;
    return (mil === 1 ? "mil" : n2w(mil) + " mil") + (r ? (r < 100 ? " e " : ", ") + n2w(r) : "");
  }
  let result = full(reais) + (reais === 1 ? " real" : " reais");
  if (centavos > 0) result += " e " + n2w(centavos) + (centavos === 1 ? " centavo" : " centavos");
  return result.charAt(0).toUpperCase() + result.slice(1);
}
