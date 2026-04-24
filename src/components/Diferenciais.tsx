import { Music2, Thermometer, Wind, Lightbulb } from "lucide-react";

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
  return (
    <section className="bg-card py-24 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
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

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {diferenciais.map(({ Icon, titulo, descricao }) => (
            <div
              key={titulo}
              className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 group cursor-default"
            >
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
          ))}
        </div>
      </div>
    </section>
  );
}
