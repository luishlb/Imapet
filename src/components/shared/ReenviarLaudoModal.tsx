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

export default function ReenviarLaudoModal({ exameId, onClose }: Props) {
  const [exame, setExame] = useState<ExameReenvio | null>(null);
  const [tutorNome, setTutorNome] = useState("");
  const [carregando, setCarregando] = useState(true);

  const [clinicaEmail, setClinicaEmail] = useState("");
  const [clinicaWhats, setClinicaWhats] = useState("");
  const [tutorEmail, setTutorEmail] = useState("");
  const [tutorWhats, setTutorWhats] = useState("");
  const [outroEmail, setOutroEmail] = useState("");
  const [outroWhats, setOutroWhats] = useState("");

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
          .select("email, whatsapp")
          .eq("nome", exData.clinica)
          .maybeSingle();
        if (cl) {
          setClinicaEmail((cl as { email: string | null }).email || "");
          setClinicaWhats((cl as { whatsapp: string | null }).whatsapp || "");
        }
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
          if (tu) {
            const tut = tu as { nome: string; email: string | null; whatsapp: string | null };
            setTutorNome(tut.nome || "");
            setTutorEmail(tut.email || "");
            setTutorWhats(tut.whatsapp || "");
          }
        }
      }

      setCarregando(false);
    })();
  }, [exameId]);

  const nomePet = exame?.nome_paciente || exame?.pets?.nome || "—";

  function abrirWhatsApp(numero: string, chave: string) {
    if (!exame?.laudo_url) return;
    const num = numero.replace(/\D/g, "");
    if (!num) { alert("Informe um número de WhatsApp válido."); return; }
    const msg = encodeURIComponent(
      `Olá! Segue o laudo do paciente *${nomePet}*.\n\n📄 Acesse pelo link:\n${exame.laudo_url}\n\nATT, IMAPET`
    );
    window.open(`https://web.whatsapp.com/send?phone=55${num}&text=${msg}`, "_blank");
    setFeitos(prev => prev.includes(chave) ? prev : [...prev, chave]);
  }

  async function enviarEmail(para: string, tipo: "clinica" | "cliente", chave: string, nomeClinica?: string) {
    if (!exame?.laudo_url) return;
    if (!para.trim() || !/\S+@\S+\.\S+/.test(para)) { alert("Informe um email válido."); return; }
    setAcaoEmCurso(chave);
    const res = await fetch("/api/enviar-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tipo,
        para: para.trim(),
        dados: {
          nomePet,
          laudoUrl: exame.laudo_url,
          nomeTutor: tutorNome || "",
          nomeClinica: nomeClinica || "",
        },
      }),
    });
    if (res.ok) setFeitos(prev => [...prev, chave]);
    else alert("Erro ao enviar email.");
    setAcaoEmCurso(null);
  }

  type LinhaProps = {
    chave: string;
    tipo: "email" | "whats";
    valor: string;
    onChange: (v: string) => void;
    placeholder: string;
    onEnviar: () => void;
  };
  const Linha = ({ chave, tipo, valor, onChange, placeholder, onEnviar }: LinhaProps) => {
    const enviado = feitos.includes(chave);
    const carregando = acaoEmCurso === chave;
    return (
      <div className="flex items-center gap-2">
        <input
          type={tipo === "email" ? "email" : "tel"}
          value={valor}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="input text-sm flex-1"
        />
        <button
          onClick={onEnviar}
          disabled={!valor.trim() || carregando}
          className={`shrink-0 inline-flex items-center justify-center w-11 h-10 rounded-xl font-medium transition ${
            enviado
              ? "bg-green-100 text-green-700"
              : valor.trim()
              ? tipo === "email"
                ? "bg-primary text-white hover:bg-primary-light"
                : "bg-green-600 text-white hover:bg-green-700"
              : "bg-gray-100 text-gray-300 cursor-not-allowed"
          }`}
          title={tipo === "email" ? "Enviar por email" : "Abrir WhatsApp"}
        >
          {enviado ? "✓" : tipo === "email" ? "📧" : "📱"}
        </button>
      </div>
    );
  };

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
              <p className="text-sm font-medium text-text-main">{nomePet}</p>
              <p className="text-xs text-text-muted">{exame.clinica || "—"}</p>
              <a href={exame.laudo_url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1 mt-2 rounded-lg bg-primary/10 text-primary text-[11px] font-medium hover:bg-primary/20 transition-colors">
                📄 Ver laudo
              </a>
            </div>

            {/* Clínica */}
            <div className="border-t border-gray-100 pt-4 space-y-2">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                Clínica {exame.clinica && <span className="font-normal normal-case tracking-normal text-text-main">— {exame.clinica}</span>}
              </p>
              <Linha chave="email-clinica" tipo="email" valor={clinicaEmail} onChange={setClinicaEmail} placeholder="email da clínica"
                onEnviar={() => enviarEmail(clinicaEmail, "clinica", "email-clinica", exame.clinica || undefined)} />
              <Linha chave="wa-clinica" tipo="whats" valor={clinicaWhats} onChange={setClinicaWhats} placeholder="(81) 99999-9999"
                onEnviar={() => abrirWhatsApp(clinicaWhats, "wa-clinica")} />
            </div>

            {/* Tutor */}
            <div className="border-t border-gray-100 pt-4 space-y-2">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                Tutor {tutorNome && <span className="font-normal normal-case tracking-normal text-text-main">— {tutorNome}</span>}
              </p>
              <Linha chave="email-tutor" tipo="email" valor={tutorEmail} onChange={setTutorEmail} placeholder="email do tutor"
                onEnviar={() => enviarEmail(tutorEmail, "cliente", "email-tutor")} />
              <Linha chave="wa-tutor" tipo="whats" valor={tutorWhats} onChange={setTutorWhats} placeholder="(81) 99999-9999"
                onEnviar={() => abrirWhatsApp(tutorWhats, "wa-tutor")} />
            </div>

            {/* Outro */}
            <div className="border-t border-gray-100 pt-4 space-y-2">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">Outro destinatário</p>
              <Linha chave="email-outro" tipo="email" valor={outroEmail} onChange={setOutroEmail} placeholder="email avulso"
                onEnviar={() => enviarEmail(outroEmail, "cliente", "email-outro")} />
              <Linha chave="wa-outro" tipo="whats" valor={outroWhats} onChange={setOutroWhats} placeholder="(81) 99999-9999"
                onEnviar={() => abrirWhatsApp(outroWhats, "wa-outro")} />
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
