"use client";

import { useInView } from "@/hooks/useInView";

const steps = [
  {
    number: "01",
    titulo: "Clínica solicita o exame",
    descricao:
      "A clínica veterinária entra em contato com a IMAPET pelo WhatsApp para agendar o exame do paciente.",
  },
  {
    number: "02",
    titulo: "IMAPET vai até a clínica",
    descricao:
      "Nossa veterinária especialista se desloca até a clínica parceira com equipamento portátil de alta tecnologia.",
  },
  {
    number: "03",
    titulo: "Exame com todo o cuidado",
    descricao:
      "O pet é atendido em ambiente familiar, sem estresse de transporte, com musicoterapia, gel aquecido e aromaterapia.",
  },
  {
    number: "04",
    titulo: "Laudo entregue rapidamente",
    descricao:
      "O resultado é enviado para a clínica e para o tutor pelo WhatsApp e por e-mail, com agilidade e clareza.",
  },
];

export default function ComoFunciona() {
  const { ref, inView } = useInView();

  return (
    <section id="como-funciona" className="bg-background py-24 px-6 relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute top-0 right-0 w-[450px] h-[450px] bg-primary/4 rounded-full blur-3xl translate-x-1/3 -translate-y-1/3 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[350px] h-[350px] bg-accent/15 rounded-full blur-3xl -translate-x-1/3 translate-y-1/3 pointer-events-none" />

      <div className="max-w-7xl mx-auto relative" ref={ref}>
        {/* Header */}
        <div
          className={!inView ? "opacity-0" : ""}
          style={inView ? { animation: "fadeUp 0.7s ease-out both" } : {}}
        >
          <div className="text-center mb-20">
            <span className="text-primary text-xs font-semibold tracking-[0.2em] uppercase">
              Passo a passo
            </span>
            <h2 className="font-playfair text-4xl md:text-5xl text-text-main font-bold mt-4 mb-6 leading-tight">
              Simples para você,<br />melhor para o pet
            </h2>
            <p className="text-text-muted text-lg max-w-2xl mx-auto leading-relaxed">
              A IMAPET vai até onde o pet está. Sem deslocamentos desnecessários,
              sem estresse extra — apenas cuidado e diagnóstico de qualidade.
            </p>
          </div>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
          {/* Connecting line (desktop only) */}
          <div className="hidden lg:block absolute top-10 left-[12.5%] right-[12.5%] h-px bg-accent/40 z-0" />

          {steps.map((step, index) => (
            <div
              key={step.number}
              className={`relative z-10 ${!inView ? "opacity-0" : ""}`}
              style={
                inView
                  ? { animation: `fadeUp 0.7s ease-out ${index * 130 + 200}ms both` }
                  : {}
              }
            >
              {/* Number bubble */}
              <div className="w-20 h-20 rounded-full bg-card border-2 border-accent/30 flex items-center justify-center mb-6 mx-auto lg:mx-0 shadow-sm">
                <span className="font-playfair text-2xl font-bold text-primary">
                  {step.number}
                </span>
              </div>

              {/* Content */}
              <h3 className="font-playfair text-xl font-bold text-text-main mb-3 text-center lg:text-left">
                {step.titulo}
              </h3>
              <p className="text-text-muted text-sm leading-relaxed text-center lg:text-left">
                {step.descricao}
              </p>

              {/* Arrow (mobile) */}
              {index < steps.length - 1 && (
                <div className="lg:hidden flex justify-center mt-6 mb-2 text-accent">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 5v14M5 12l7 7 7-7" />
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* CTA */}
        <div
          className={`text-center mt-16 ${!inView ? "opacity-0" : ""}`}
          style={inView ? { animation: "fadeUp 0.7s ease-out 700ms both" } : {}}
        >
          <a
            href="https://wa.me/5581996741525"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-primary hover:bg-primary-light text-white font-semibold px-8 py-4 rounded-full transition-all duration-300 hover:shadow-lg hover:shadow-primary/20 hover:-translate-y-0.5"
          >
            Agendar agora pelo WhatsApp
          </a>
        </div>
      </div>
    </section>
  );
}
