"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { moeda, dataFmt } from "@/lib/utils";

const CATEGORIAS = ["Impostos", "Marketing", "Contabilidade", "Transporte", "Equipamento", "Seguros", "Outros"];
const HOJE_STR = new Date().toISOString().split("T")[0];

type Despesa = {
  id: string;
  data: string;
  descricao: string;
  categoria: string;
  valor: number;
  comprovante_url: string | null;
};

export default function DespesasOwnerPage() {
  const router = useRouter();
  const [auth, setAuth] = useState<boolean | null>(null);
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [form, setForm] = useState({ data: HOJE_STR, descricao: "", categoria: CATEGORIAS[0], valor: "" });

  useEffect(() => {
    if (localStorage.getItem("owner_auth") !== "1") { router.replace("/owner"); return; }
    setAuth(true);
    createClient().from("despesas").select("*")
      .order("data", { ascending: false })
      .order("created_at", { ascending: false })
      .then(({ data }) => { setDespesas(data || []); setCarregando(false); });
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.descricao || !form.valor || !form.data) return;
    setSalvando(true);
    const supabase = createClient();
    let comprovante_url: string | null = null;
    if (arquivo) {
      const ext = arquivo.name.split(".").pop();
      const path = `comprovantes/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("laudos").upload(path, arquivo);
      if (!upErr) {
        const { data: urlData } = supabase.storage.from("laudos").getPublicUrl(path);
        comprovante_url = urlData.publicUrl;
      }
    }
    const { data } = await supabase.from("despesas")
      .insert({ data: form.data, descricao: form.descricao.trim(), categoria: form.categoria, valor: parseFloat(form.valor), comprovante_url })
      .select("*").single();
    if (data) {
      setDespesas(prev => [data as Despesa, ...prev]);
      setForm({ data: HOJE_STR, descricao: "", categoria: CATEGORIAS[0], valor: "" });
      setArquivo(null);
      const input = document.getElementById("comprovante-input") as HTMLInputElement;
      if (input) input.value = "";
    }
    setSalvando(false);
  }

  async function apagarDespesa(id: string) {
    if (!window.confirm("Apagar esta despesa permanentemente?")) return;
    const { error } = await createClient().from("despesas").delete().eq("id", id);
    if (!error) setDespesas(prev => prev.filter(d => d.id !== id));
  }

  if (!auth) return null;

  const total = despesas.reduce((s, d) => s + d.valor, 0);

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-4 sticky top-0 z-10">
        <Link href="/owner" className="text-sm text-text-muted hover:text-primary transition-colors">← Voltar</Link>
        <span className="text-sm font-semibold text-text-main">Despesas</span>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Formulário */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
          <h2 className="font-playfair text-lg font-bold text-text-main">Lançar despesa</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1.5">Data *</label>
              <input name="data" type="date" value={form.data}
                onChange={e => setForm(f => ({ ...f, data: e.target.value }))} className="input text-sm" />
            </div>
            <div className="col-span-1 sm:col-span-2">
              <label className="block text-xs font-medium text-text-muted mb-1.5">Categoria *</label>
              <select value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))} className="input text-sm">
                {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1.5">Valor (R$) *</label>
              <input type="number" step="0.01" min="0" value={form.valor}
                onChange={e => setForm(f => ({ ...f, valor: e.target.value }))}
                placeholder="0,00" className="input text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5">Descrição *</label>
            <input value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
              placeholder="Ex: Publicação patrocinada no Instagram" className="input text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5">
              Comprovante <span className="text-gray-300 font-normal">(opcional)</span>
            </label>
            <input id="comprovante-input" type="file" accept="image/*,application/pdf"
              onChange={e => setArquivo(e.target.files?.[0] || null)}
              className="block w-full text-sm text-text-muted file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer" />
            {arquivo && <p className="text-xs text-text-muted mt-1.5">📎 {arquivo.name}</p>}
          </div>
          <button type="submit" disabled={salvando || !form.descricao || !form.valor}
            className="w-full bg-primary hover:bg-primary-light text-white font-semibold py-3 rounded-xl transition-all disabled:opacity-50">
            {salvando ? "Salvando..." : "Lançar despesa"}
          </button>
        </form>

        {/* Histórico */}
        {carregando ? (
          <p className="text-sm text-text-muted text-center py-8">Carregando...</p>
        ) : despesas.length === 0 ? (
          <p className="text-sm text-text-muted text-center py-8">Nenhuma despesa lançada ainda.</p>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-text-main">Histórico <span className="text-text-muted font-normal text-sm">({despesas.length})</span></h2>
              <span className="text-sm text-text-muted">Total: <strong className="text-red-500">{moeda(total)}</strong></span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[10px] text-text-muted uppercase tracking-wider border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-3 py-3 whitespace-nowrap">Data</th>
                    <th className="text-left px-3 py-3">Descrição</th>
                    <th className="text-left px-3 py-3">Categoria</th>
                    <th className="text-right px-3 py-3">Valor</th>
                    <th className="px-3 py-3"></th>
                    <th className="px-3 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {despesas.map(d => (
                    <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-3 py-2 text-text-muted whitespace-nowrap">{dataFmt(d.data)}</td>
                      <td className="px-3 py-2 font-medium text-text-main">{d.descricao}</td>
                      <td className="px-3 py-2 text-text-muted">{d.categoria}</td>
                      <td className="px-3 py-2 text-right font-semibold text-red-500">{moeda(d.valor)}</td>
                      <td className="px-3 py-2 text-center">
                        {d.comprovante_url
                          ? <a href={d.comprovante_url} target="_blank" rel="noopener noreferrer" className="text-base hover:opacity-70">📄</a>
                          : <span className="text-gray-200">—</span>}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button onClick={() => apagarDespesa(d.id)}
                          className="text-red-400 hover:text-red-600 hover:bg-red-50 px-2 py-1 rounded-lg transition-colors text-base leading-none" title="Apagar despesa">🗑</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
