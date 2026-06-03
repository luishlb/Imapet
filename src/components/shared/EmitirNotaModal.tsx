"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { moeda, formatarDocumento, tipoDocumento } from "@/lib/utils";

type ExameVinculado = {
  id: string;
  data_exame: string;
  tipo: string | null;
  clinica: string | null;
  valor_bruto: number | null;
  nome_paciente: string | null;
  pet_id: string | null;
  pets: { nome: string } | null;
};

type Props = {
  exameId?: string;
  onClose: () => void;
  onEmitida?: () => void;
};

type Tomador = {
  nome: string;
  documento: string;
  email: string;
};

export default function EmitirNotaModal({ exameId, onClose, onEmitida }: Props) {
  const [exame, setExame] = useState<ExameVinculado | null>(null);
  const [carregando, setCarregando] = useState(!!exameId);
  const [emitindo, setEmitindo] = useState(false);
  const [resultado, setResultado] = useState<{ ok: boolean; mensagem: string } | null>(null);

  const [tomador, setTomador] = useState<Tomador>({ nome: "", documento: "", email: "" });
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");

  useEffect(() => {
    if (!exameId) return;
    (async () => {
      const sb = createClient();
      const { data: ex } = await sb
        .from("exames")
        .select("id, data_exame, tipo, clinica, valor_bruto, nome_paciente, pet_id, pets(nome)")
        .eq("id", exameId)
        .single();
      const exData = ex as unknown as ExameVinculado;
      setExame(exData);

      // Pré-preenche descrição e valor
      const paciente = exData?.nome_paciente || exData?.pets?.nome || "—";
      setDescricao(
        `${exData?.tipo || "Exame veterinário"} em paciente ${paciente}` +
        (exData?.clinica ? ` (${exData.clinica})` : "")
      );
      if (exData?.valor_bruto) setValor(String(exData.valor_bruto));

      // Tenta pré-preencher tomador via tutor (se existir)
      if (exData?.pet_id) {
        const { data: pet } = await sb
          .from("pets")
          .select("tutor_id")
          .eq("id", exData.pet_id)
          .maybeSingle();
        if (pet?.tutor_id) {
          const { data: tu } = await sb
            .from("tutores")
            .select("nome, cpf, email")
            .eq("id", pet.tutor_id)
            .maybeSingle();
          if (tu) {
            setTomador({
              nome: (tu as { nome: string }).nome || "",
              documento: (tu as { cpf: string | null }).cpf || "",
              email: (tu as { email: string | null }).email || "",
            });
          }
        }
      }

      setCarregando(false);
    })();
  }, [exameId]);

  async function emitir() {
    if (!tomador.nome.trim() || !descricao.trim() || !valor) return;
    setEmitindo(true);
    setResultado(null);

    const valorNum = parseFloat(valor.replace(",", "."));
    if (isNaN(valorNum) || valorNum <= 0) {
      setResultado({ ok: false, mensagem: "Valor inválido" });
      setEmitindo(false);
      return;
    }

    const tipoDoc = tipoDocumento(tomador.documento);
    const payload = {
      tomador: {
        tipo: tipoDoc || "CPF",
        documento: tomador.documento,
        nome: tomador.nome.trim(),
        email: tomador.email.trim() || undefined,
      },
      descricao: descricao.trim(),
      valorServico: valorNum,
    };

    try {
      const res = await fetch("/api/nfse/emitir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.status === 503) {
        setResultado({
          ok: false,
          mensagem: "⚠️ Módulo de NFS-e ainda não está configurado. O certificado A1 precisa ser cadastrado antes da primeira emissão.",
        });
      } else if (data.ok) {
        setResultado({
          ok: true,
          mensagem: `✓ Nota emitida! Número: ${data.numeroNfse}`,
        });
        onEmitida?.();
      } else {
        setResultado({ ok: false, mensagem: data.erro || "Erro ao emitir." });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro de rede";
      setResultado({ ok: false, mensagem: msg });
    }
    setEmitindo(false);
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <div>
            <h2 className="font-playfair text-lg font-bold text-text-main">Emitir NFS-e</h2>
            <p className="text-xs text-text-muted">Portal Nacional · {process.env.NEXT_PUBLIC_NFSE_AMBIENTE === "producao" ? "Produção" : "Homologação"}</p>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-red-500 text-xl leading-none px-2">×</button>
        </div>

        {carregando ? (
          <p className="text-sm text-text-muted py-12 text-center">Carregando dados do exame...</p>
        ) : (
          <div className="px-6 py-5 space-y-4">
            {exame && (
              <div className="bg-primary/5 rounded-xl px-4 py-3">
                <p className="text-[10px] font-semibold text-primary uppercase tracking-wider">Vinculado ao exame</p>
                <p className="text-sm font-medium text-text-main mt-0.5">
                  {exame.nome_paciente || exame.pets?.nome || "—"} · {exame.clinica || "—"}
                </p>
              </div>
            )}

            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Tomador</p>
              <div className="space-y-2">
                <input
                  value={tomador.nome}
                  onChange={(e) => setTomador((t) => ({ ...t, nome: e.target.value }))}
                  placeholder="Nome / Razão social *"
                  className="input text-sm"
                />
                <input
                  value={tomador.documento}
                  onChange={(e) => setTomador((t) => ({ ...t, documento: formatarDocumento(e.target.value) }))}
                  placeholder="CPF ou CNPJ"
                  inputMode="numeric"
                  className="input text-sm"
                />
                {tomador.documento && (
                  <p className="text-[11px] text-primary font-semibold">{tipoDocumento(tomador.documento)} detectado</p>
                )}
                <input
                  type="email"
                  value={tomador.email}
                  onChange={(e) => setTomador((t) => ({ ...t, email: e.target.value }))}
                  placeholder="Email (opcional — pra receber a nota)"
                  className="input text-sm"
                />
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Serviço</p>
              <textarea
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                rows={2}
                placeholder="Descrição do serviço prestado *"
                className="input text-sm resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-text-muted mb-1.5">Valor (R$) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                placeholder="0,00"
                className="input text-sm"
              />
              {valor && !isNaN(parseFloat(valor)) && (
                <p className="text-xs text-text-muted mt-1">{moeda(parseFloat(valor))}</p>
              )}
            </div>

            {resultado && (
              <div
                className={`rounded-xl px-4 py-3 text-sm ${
                  resultado.ok ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-800"
                }`}
              >
                {resultado.mensagem}
              </div>
            )}
          </div>
        )}

        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-2 sticky bottom-0 bg-white">
          <button onClick={onClose} disabled={emitindo} className="text-sm text-text-muted hover:text-text-main px-4 py-2">
            Cancelar
          </button>
          <button
            onClick={emitir}
            disabled={emitindo || !tomador.nome.trim() || !descricao.trim() || !valor}
            className="bg-primary text-white text-sm font-semibold px-5 py-2 rounded-xl hover:bg-primary-light transition disabled:opacity-50"
          >
            {emitindo ? "Emitindo..." : "🧾 Emitir NFS-e"}
          </button>
        </div>
      </div>
    </div>
  );
}
