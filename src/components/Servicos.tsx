"use client";

import Image from "next/image";
import { CheckCircle2 } from "lucide-react";
import { useInView } from "@/hooks/useInView";

const servicos = [
  {
    titulo: "Ultrassonografia",
    tag: "Principal serviço",
    imagem: "/veterinario-exame.jpg",
    descricao:
      "Exame de imagem seguro, indolor e em tempo real que permite visualizar órgãos internos com alta precisão — coração, fígado, rins, bexiga, útero e muito mais. Realizado com gel aquecido e em ambiente cuidadosamente preparado para o conforto do pet.",
    itens: [
      "Sem radiação — 100% seguro",
      "Indolor e não invasivo",
      "Resultado disponível rapidamente",
      "Cães, gatos e outros animais",
    ],
  },
  {
    titulo: "Cistocentese",
    tag: "Guiada por ultrassom",
    imagem: "/cistocentese.jpg",
    descricao:
      "Procedimento minimamente invasivo para coleta de urina diretamente da bexiga, guiado por ultrassom. Garante amostras sem contaminação e de alta qualidade para exames laboratoriais — com o mínimo de desconforto para o animal.",
    itens: [
      "Guiada por ultrassom em tempo real",
      "Alta precisão diagnóstica",
      "Amostra sem contaminação",
      "Máxima segurança e cuidado",
    ],
  },
];

export default function Servicos() {
  const { ref, inView } = useInView();

  return (
    <section id="servicos" className="bg-background py-24 px-6 relative overflow-hidden">
      {/* Decorative blob */}
      <div className="absolute top-1/2 right-0 w-[350px] h-[350px] bg-accent/15 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2 pointer-events-none" />

      <div className="max-w-7xl mx-auto relative" ref={ref}>
        {/* Header */}
        <div
          className={!inView ? "opacity-0" : ""}
          style={inView ? { animation: "fadeUp 0.7s ease-out both" } : {}}
        >
          <div className="text-center mb-16">
            <span className="text-primary text-xs font-semibold tracking-[0.2em] uppercase">
              O que fazemos
            </span>
            <h2 className="font-playfair text-4xl md:text-5xl text-text-main font-bold mt-4 mb-6">
              Nossos serviços
            </h2>
            <p className="text-text-muted text-lg max-w-2xl mx-auto leading-relaxed">
              Exames de imagem veterinária realizados com equipamentos modernos e
              profissionais especializados — na clínica do seu pet.
            </p>
          </div>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {servicos.map((servico, index) => (
            <div
              key={servico.titulo}
              className={!inView ? "opacity-0" : ""}
              style={
                inView
                  ? { animation: `fadeUp 0.7s ease-out ${index * 150 + 200}ms both` }
                  : {}
              }
            >
              <div className="bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 group h-full">
                {/* Image */}
                <div className="relative h-60 overflow-hidden">
                  <Image
                    src={servico.imagem}
                    alt={servico.titulo}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  {/* Tag */}
                  <div className="absolute top-4 left-6">
                    <span className="bg-primary text-white text-xs font-semibold px-3 py-1.5 rounded-full">
                      {servico.tag}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-8">
                  <h3 className="font-playfair text-2xl font-bold text-text-main mb-4">
                    {servico.titulo}
                  </h3>
                  <p className="text-text-muted leading-relaxed mb-6 text-sm">
                    {servico.descricao}
                  </p>
                  <ul className="space-y-2.5">
                    {servico.itens.map((item) => (
                      <li
                        key={item}
                        className="flex items-center gap-2.5 text-sm text-text-muted"
                      >
                        <CheckCircle2
                          size={16}
                          className="text-primary flex-shrink-0"
                        />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
