"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { logEdit, diffObjects, type Origem } from "@/lib/auditLog";
import { dataFmt } from "@/lib/utils";

export type ExameEditavel = {
  id: string;
  data_exame: string;
  tipo: string | null;
  clinica: string | null;
  forma_pagamento: string | null;
  valor_bruto: number | null;
  nome_paciente: string | null;
  laudo_url?: string | null;
  pets: { nome: string; especie: string | null; raca: string | null } | null;
};

type Props = {
  exame: ExameEditavel;
  origem: Origem;
  onClose: () => void;
  onSaved: (atualizado: ExameEditavel) => void;
};

export default function EditarExameModal({ exame, origem, onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    data_exame: exame.data_exame,
    clinica: exame.clinica || "",
    tipo: exame.tipo || "",
    forma_pagamento: exame.forma_pagamento || "",
    valor_bruto: exame.valor_bruto?.toString() || "",
  });
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [formas, setFormas] = useState<string[]>([]);
  const [clinicas, setClinicas] = useState<string[]>([]);
  const [servicos, setServicos] = useState<string[]>([]);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase.from("formas_pagamento").select("nome").order("id"),
      supabase.from("clinicas").select("nome").order("nome"),
      supabase.from("servicos").select("nome").order("id"),
    ]).then(([{ data: fp }, { data: cl }, { data: sv }]) => {
      setFormas(((fp || []) as { nome: string }[]).map(x => x.nome));
      setClinicas(((cl || []) as { nome: string }[]).map(x => x.nome));
      setServicos(((sv || []) as { nome: string }[]).map(x => x.nome));
    });
  }, []);

  async function salvar() {
    setSalvando(true);
    const supabase = createClient();
    const valorBruto = parseFloat(form.valor_bruto.replace(",", "."));
    const valorEmpresa = isNaN(valorBruto) ? null : Math.round(valorBruto * 0.58 * 100) / 100;

    let novoLaudoUrl: string | null | undefined = undefined;
    if (arquivo) {
      const fd = new FormData();
      fd.append("file", arquivo);
      fd.append("prefix", `laudos/${exame.pets ? "edit" : exame.id.slice(0, 8)}`);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) {
        setSalvando(false);
        const { error: msg } = await res.json().catch(() => ({ error: "erro" }));
        alert("Erro ao enviar arquivo: " + msg);
        return;
      }
      const { url } = await res.json();
      novoLaudoUrl = url;
    }

    const valorBrutoFinal = isNaN(valorBruto) ? null : valorBruto;
    const update: {
      data_exame: string;
      clinica: string | null;
      tipo: string | null;
      forma_pagamento: string | null;
      valor_bruto: number | null;
      valor: number | null;
      laudo_url?: string;
    } = {
      data_exame: form.data_exame,
      clinica: form.clinica || null,
      tipo: form.tipo || null,
      forma_pagamento: form.forma_pagamento || null,
      valor_bruto: valorBrutoFinal,
      valor: valorEmpresa,
    };
    if (novoLaudoUrl) update.laudo_url = novoLaudoUrl;

    const antes: Record<string, unknown> = {
      data_exame: exame.data_exame,
      clinica: exame.clinica,
      tipo: exame.tipo,
      forma_pagamento: exame.forma_pagamento,
      valor_bruto: exame.valor_bruto,
    };
    const depois: Record<string, unknown> = {
      data_exame: update.data_exame,
      clinica: update.clinica,
      tipo: update.tipo,
      forma_pagamento: update.forma_pagamento,
      valor_bruto: update.valor_bruto,
    };
    if (novoLaudoUrl) {
      antes.laudo_url = exame.laudo_url ?? null;
      depois.laudo_url = novoLaudoUrl;
    }

    const diff = diffObjects(antes, depois);

    const { error } = await supabase.from("exames").update(update).eq("id", exame.id);
    if (error) { setSalvando(false); alert("Erro ao salvar: " + error.message); return; }

    if (Object.keys(diff).length > 0) {
      const paciente = exame.nome_paciente || exame.pets?.nome || "—";
      await logEdit(
        exame.id,
        diff,
        `${paciente} · ${exame.clinica || "—"} · ${dataFmt(exame.data_exame)}`,
        origem,
      );
    }

    onSaved({ ...exame, ...update } as ExameEditavel);
    setSalvando(false);
  }

  const paciente = exame.nome_paciente || exame.pets?.nome || "—";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
          <div>
            <h2 className="font-playfair text-lg font-bold text-text-main">Editar exame</h2>
            <p className="text-xs text-text-muted">{paciente}</p>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-red-500 text-xl leading-none px-2">×</button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5">Data</label>
            <input type="date" value={form.data_exame}
              onChange={e => setForm(f => ({ ...f, data_exame: e.target.value }))}
              className="input text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5">Clínica</label>
            <input list="clinicas-list" value={form.clinica}
              onChange={e => setForm(f => ({ ...f, clinica: e.target.value }))}
              className="input text-sm" />
            <datalist id="clinicas-list">
              {clinicas.map(c => <option key={c} value={c} />)}
            </datalist>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5">Serviço</label>
            <input list="servicos-list" value={form.tipo}
              onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}
              className="input text-sm" />
            <datalist id="servicos-list">
              {servicos.map(s => <option key={s} value={s} />)}
            </datalist>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5">Forma de pagamento</label>
            <select value={form.forma_pagamento}
              onChange={e => setForm(f => ({ ...f, forma_pagamento: e.target.value }))}
              className="input text-sm">
              <option value="">—</option>
              {formas.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5">Valor bruto (R$)</label>
            <input type="number" step="0.01" min="0" value={form.valor_bruto}
              onChange={e => setForm(f => ({ ...f, valor_bruto: e.target.value }))}
              placeholder="0,00" className="input text-sm" />
            <p className="text-[11px] text-text-muted mt-1">Empresa (58%) será recalculada automaticamente</p>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <label className="block text-xs font-medium text-text-muted mb-1.5">
              Laudo {exame.laudo_url ? <span className="text-green-700 font-normal">(já anexado)</span> : <span className="text-gray-400 font-normal">(opcional)</span>}
            </label>
            {exame.laudo_url && !arquivo && (
              <a href={exame.laudo_url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1 mb-2 rounded-lg bg-primary/10 text-primary text-[11px] font-medium hover:bg-primary/20 transition-colors">
                📄 Ver laudo atual
              </a>
            )}
            <input id="laudo-edit-input" type="file" accept="image/*,application/pdf"
              onChange={e => setArquivo(e.target.files?.[0] || null)}
              className="block w-full text-sm text-text-muted file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer" />
            {arquivo && (
              <p className="text-xs text-green-700 mt-1.5">📎 {arquivo.name} {exame.laudo_url ? "— vai substituir o atual" : ""}</p>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-2 sticky bottom-0 bg-white">
          <button onClick={onClose} disabled={salvando}
            className="text-sm text-text-muted hover:text-text-main px-4 py-2">
            Cancelar
          </button>
          <button onClick={salvar} disabled={salvando}
            className="bg-primary text-white text-sm font-semibold px-5 py-2 rounded-xl hover:bg-primary-light transition disabled:opacity-50">
            {salvando ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}
