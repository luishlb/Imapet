"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

type ExameReenvio = {
  id: string;
  laudo_url: string | null;
  clinica: string | null;
  nome_paciente: string | null;
  pet_id: string | null;
  pets: { nome: string } | null;
};

type Props = {
  exameId: string;
  onClose: () => void;
};

type Destino = {
  nome: string;
  email: string | null;
  whatsapp: string | null;
};

export default function ReenviarLaudoModal({ exameId, onClose }: Props) {
  const [exame, setExame] = useState<ExameReenvio | null>(null);
  const [clinica, setClinica] = useState<Destino | null>(null);
  const [tutor, setTutor] = useState<Destino | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [acaoEmCurso, setAcaoEmCurso] = useState<string | null>(null);
  const [feitos, setFeitos] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      const sb = createClient();
      const { data: ex } = await sb
        .from("exames")
        .select("id, laudo_url, clinica, nome_paciente, pet_id, pets(nome)")
        .eq("id", exameId)
        .single();
      const exData = ex as unknown as ExameReenvio;
      setExame(exData);

      if (exData?.clinica) {
        const { data: cl } = await sb
          .from("clinicas")
          .select("nome, email, whatsapp")
          .eq("nome", exData.clinica)
          .maybeSingle();
        if (cl) setClinica(cl as Destino);
      }

      if (exData?.pet_id) {
        const { data: pet } = await sb
          .from("pets")
          .select("tutor_id")
          .eq("id", exData.pet_id)
          .maybeSingle();
        if (pet?.tutor_id) {
          const { data: tu } = await sb
            .from("tutores")
            .select("nome, email, whatsapp")
            .eq("id", pet.tutor_id)
            .maybeSingle();
          if (tu) setTutor(tu as Destino);
        }
      }

      setCarregando(false);
    })();
  }, [exameId]);

  function nomePet(): string {
    return exame?.nome_paciente || exame?.pets?.nome || "—";
  }

  function abrirWhatsApp(numero: string, chave: string) {
    if (!exame?.laudo_url) return;
    const num = numero.replace(/\D/g, "");
    if (!num) return;
    const msg = encodeURIComponent(
      `Olá! Segue o laudo do paciente *${nomePet()}*.\n\n📄 Acesse pelo link:\n${exame.laudo_url}\n\nATT, IMAPET`
    );
    window.open(`https://web.whatsapp.com/send?phone=55${num}&text=${msg}`, "_blank");
    setFeitos(prev => prev.includes(chave) ? prev : [...prev, chave]);
  }

  async function enviarEmail(para: string, tipo: "clinica" | "cliente", chave: string, nomeClinica?: string) {
    if (!exame?.laudo_url) return;
    setAcaoEmCurso(chave);
    const res = await fetch("/api/enviar-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tipo,
        para,
        dados: {
          nomePet: nomePet(),
          laudoUrl: exame.laudo_url,
          nomeTutor: tutor?.nome || "",
          nomeClinica: nomeClinica || "",
        },
      }),
    });
    if (res.ok) setFeitos(prev => [...prev, chave]);
    else alert("Erro ao enviar email.");
    setAcaoEmCurso(null);
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
          <h2 className="font-playfair text-lg font-bold text-text-main">Reenviar laudo</h2>
          <button onClick={onClose} className="text-text-muted hover:text-red-500 text-xl leading-none px-2">×</button>
        </div>

        {carregando ? (
          <p className="text-sm text-text-muted py-12 text-center">Carregando...</p>
        ) : !exame?.laudo_url ? (
          <div className="px-6 py-8 text-center">
            <span className="text-3xl">⚠️</span>
            <p className="text-sm text-text-muted mt-2">Esse exame ainda não tem laudo anexado.</p>
            <p className="text-xs text-text-muted mt-1">Anexe pelo botão de editar antes de reenviar.</p>
          </div>
        ) : (
          <div className="px-6 py-5 space-y-5">
            <div>
              <p className="text-sm font-medium text-text-main">{nomePet()}</p>
              <p className="text-xs text-text-muted">{exame.clinica || "—"}</p>
              <a href={exame.laudo_url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1 mt-2 rounded-lg bg-primary/10 text-primary text-[11px] font-medium hover:bg-primary/20 transition-colors">
                📄 Ver laudo
              </a>
            </div>

            {/* Clínica */}
            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
                Clínica {exame.clinica && <span className="font-normal normal-case tracking-normal text-text-main">— {exame.clinica}</span>}
              </p>
              {!clinica ? (
                <p className="text-xs text-text-muted italic">Clínica não cadastrada com email/WhatsApp.</p>
              ) : (
                <div className="space-y-2">
                  <button
                    onClick={() => clinica.email && enviarEmail(clinica.email, "clinica", "email-clinica", clinica.nome)}
                    disabled={!clinica.email || acaoEmCurso === "email-clinica"}
                    className={`w-full flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition ${feitos.includes("email-clinica") ? "bg-green-50 text-green-700" : clinica.email ? "bg-gray-50 hover:bg-primary/10 hover:text-primary text-text-main" : "bg-gray-50 text-gray-300 cursor-not-allowed"}`}
                  >
                    <span>📧 {clinica.email || "Sem email cadastrado"}</span>
                    {feitos.includes("email-clinica") && <span className="text-xs">✓ Enviado</span>}
                    {acaoEmCurso === "email-clinica" && <span className="text-xs">Enviando...</span>}
                  </button>
                  <button
                    onClick={() => clinica.whatsapp && abrirWhatsApp(clinica.whatsapp, "wa-clinica")}
                    disabled={!clinica.whatsapp}
                    className={`w-full flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition ${feitos.includes("wa-clinica") ? "bg-green-50 text-green-700" : clinica.whatsapp ? "bg-gray-50 hover:bg-primary/10 hover:text-primary text-text-main" : "bg-gray-50 text-gray-300 cursor-not-allowed"}`}
                  >
                    <span>📱 {clinica.whatsapp || "Sem WhatsApp cadastrado"}</span>
                    {feitos.includes("wa-clinica") && <span className="text-xs">✓ Aberto</span>}
                  </button>
                </div>
              )}
            </div>

            {/* Tutor */}
            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
                Tutor {tutor && <span className="font-normal normal-case tracking-normal text-text-main">— {tutor.nome}</span>}
              </p>
              {!tutor ? (
                <p className="text-xs text-text-muted italic">Sem tutor vinculado a esse exame.</p>
              ) : (
                <div className="space-y-2">
                  <button
                    onClick={() => tutor.email && enviarEmail(tutor.email, "cliente", "email-tutor")}
                    disabled={!tutor.email || acaoEmCurso === "email-tutor"}
                    className={`w-full flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition ${feitos.includes("email-tutor") ? "bg-green-50 text-green-700" : tutor.email ? "bg-gray-50 hover:bg-primary/10 hover:text-primary text-text-main" : "bg-gray-50 text-gray-300 cursor-not-allowed"}`}
                  >
                    <span>📧 {tutor.email || "Sem email cadastrado"}</span>
                    {feitos.includes("email-tutor") && <span className="text-xs">✓ Enviado</span>}
                    {acaoEmCurso === "email-tutor" && <span className="text-xs">Enviando...</span>}
                  </button>
                  <button
                    onClick={() => tutor.whatsapp && abrirWhatsApp(tutor.whatsapp, "wa-tutor")}
                    disabled={!tutor.whatsapp}
                    className={`w-full flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition ${feitos.includes("wa-tutor") ? "bg-green-50 text-green-700" : tutor.whatsapp ? "bg-gray-50 hover:bg-primary/10 hover:text-primary text-text-main" : "bg-gray-50 text-gray-300 cursor-not-allowed"}`}
                  >
                    <span>📱 {tutor.whatsapp || "Sem WhatsApp cadastrado"}</span>
                    {feitos.includes("wa-tutor") && <span className="text-xs">✓ Aberto</span>}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end sticky bottom-0 bg-white">
          <button onClick={onClose}
            className="text-sm text-text-muted hover:text-text-main px-4 py-2">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
