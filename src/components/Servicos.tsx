import Image from "next/image";
import { CheckCircle2 } from "lucide-react";

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
    imagem: null,
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
  return (
    <section id="servicos" className="bg-background py-24 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
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

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {servicos.map((servico) => (
            <div
              key={servico.titulo}
              className="bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 group"
            >
              {/* Image or Icon Area */}
              <div className="relative h-60 overflow-hidden">
                {servico.imagem ? (
                  <>
                    <Image
                      src={servico.imagem}
                      alt={servico.titulo}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  </>
                ) : (
                  <div className="w-full h-full bg-card flex items-center justify-center">
                    <div className="w-28 h-28 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors duration-300">
                      <SyringeIcon />
                    </div>
                  </div>
                )}
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
          ))}
        </div>
      </div>
    </section>
  );
}

function SyringeIcon() {
  return (
    <svg
      width="52"
      height="52"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#8B1A1A"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m18 2 4 4" />
      <path d="m17 7 3-3" />
      <path d="M19 9 8.7 19.3c-1 1-2.5 1-3.4 0l-.6-.6c-1-1-1-2.5 0-3.4L15 5" />
      <path d="m9 11 4 4" />
      <path d="m5 19-3 3" />
      <path d="m14 4 6 6" />
    </svg>
  );
}
