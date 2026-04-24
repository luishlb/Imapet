"use client";

import { Music2, Thermometer, Wind, Lightbulb } from "lucide-react";
import { useInView } from "@/hooks/useInView";

const diferenciais = [
  {
    Icon: Music2,
    titulo: "Musicoterapia",
    descricao:
      "Sons relaxantes e melodias suaves criam um ambiente tranquilo, reduzindo a ansiedade e o estresse do pet durante o exame.",
  },
  {
    Icon: Thermometer,
    titulo: "Gel Aquecido",
    descricao:
      "O gel de ultrassom é aquecido antes da aplicação, eliminando o choque térmico e garantindo maior conforto ao animal.",
  },
  {
    Icon: Wind,
    titulo: "Aromaterapia",
    descricao:
      "Aromas calmantes e naturais, cuidadosamente selecionados para criar um ambiente sereno e acolhedor para o pet.",
  },
  {
    Icon: Lightbulb,
    titulo: "Terapia de Luz",
    descricao:
      "Iluminação especialmente ajustada — suave e não ofuscante — para proporcionar calma e bem-estar durante o procedimento.",
  },
];

export default function Diferenciais() {
  const { ref, inView } = useInView();

  return (
    <section className="bg-card py-24 px-6 relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-accent/25 rounded-full blur-3xl translate-x-1/3 translate-y-1/3 pointer-events-none" />

      <div className="max-w-7xl mx-auto relative" ref={ref}>
        {/* Header */}
        <div
          className={!inView ? "opacity-0" : ""}
          style={inView ? { animation: "fadeUp 0.7s ease-out both" } : {}}
        >
          <div className="text-center mb-16">
            <span className="text-primary text-xs font-semibold tracking-[0.2em] uppercase">
              Por que a IMAPET
            </span>
            <h2 className="font-playfair text-4xl md:text-5xl text-text-main font-bold mt-4 mb-6 leading-tight">
              Cuidado além do diagnóstico
            </h2>
            <p className="text-text-muted text-lg max-w-2xl mx-auto leading-relaxed">
              Acreditamos que o exame deve ser uma experiência tranquila. Por
              isso, criamos um ambiente pensado para o bem-estar do seu pet em
              cada detalhe.
            </p>
          </div>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {diferenciais.map(({ Icon, titulo, descricao }, index) => (
            <div
              key={titulo}
              className={!inView ? "opacity-0" : ""}
              style={
                inView
                  ? { animation: `fadeUp 0.7s ease-out ${index * 120 + 150}ms both` }
                  : {}
              }
            >
              <div className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300 group cursor-default h-full">
                <div className="w-14 h-14 bg-primary/8 rounded-xl flex items-center justify-center mb-6 group-hover:bg-primary transition-colors duration-300">
                  <Icon
                    size={26}
                    className="text-primary group-hover:text-white transition-colors duration-300"
                  />
                </div>
                <h3 className="font-playfair text-xl font-bold text-text-main mb-3">
                  {titulo}
                </h3>
                <p className="text-text-muted text-sm leading-relaxed">
                  {descricao}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
