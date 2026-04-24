import Image from "next/image";

export default function Sobre() {
  return (
    <section id="sobre" className="bg-card py-24 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Image with decorative elements */}
          <div className="relative order-2 lg:order-1">
            {/* Decorative background shapes */}
            <div className="absolute -top-6 -left-6 w-40 h-40 rounded-full bg-accent/25 -z-10" />
            <div className="absolute -bottom-6 -right-6 w-56 h-56 rounded-2xl bg-white -z-10" />

            {/* Main image */}
            <div className="relative h-[480px] rounded-3xl overflow-hidden shadow-lg">
              <Image
                src="/diferencial-gel.jpg"
                alt="Atendimento IMAPET — cuidado e tecnologia"
                fill
                className="object-cover"
              />
            </div>

            {/* Floating card */}
            <div className="absolute -bottom-4 -right-4 lg:-right-8 bg-white rounded-2xl shadow-xl p-5 max-w-[200px]">
              <p className="font-playfair text-3xl font-bold text-primary">100%</p>
              <p className="text-text-muted text-xs mt-1 leading-tight">
                Foco no bem-estar e conforto animal
              </p>
            </div>
          </div>

          {/* Text */}
          <div className="order-1 lg:order-2">
            <span className="text-primary text-xs font-semibold tracking-[0.2em] uppercase">
              Sobre a IMAPET
            </span>
            <h2 className="font-playfair text-4xl md:text-5xl text-text-main font-bold mt-4 mb-6 leading-tight">
              Diagnóstico com
              <br />
              <span className="text-primary italic">sensibilidade</span>
            </h2>
            <p className="text-text-muted text-lg leading-relaxed mb-5">
              A IMAPET nasceu da convicção de que um exame veterinário pode ser
              muito mais do que um procedimento técnico. Pode ser uma experiência
              tranquila, acolhedora e humana — para o pet e para o tutor.
            </p>
            <p className="text-text-muted text-lg leading-relaxed mb-8">
              Atuamos de forma itinerante nas clínicas veterinárias de Recife e
              região, levando equipamentos modernos e uma abordagem única:
              tecnologia com carinho. Cada detalhe — do gel aquecido à
              aromaterapia — é pensado para que o pet se sinta seguro e o tutor
              sinta confiança.
            </p>

            {/* Stats row */}
            <div className="grid grid-cols-2 gap-4 mb-10">
              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <p className="font-playfair text-2xl font-bold text-primary">Recife</p>
                <p className="text-text-muted text-xs mt-1">e região metropolitana</p>
              </div>
              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <p className="font-playfair text-2xl font-bold text-primary">Itinerante</p>
                <p className="text-text-muted text-xs mt-1">vamos até a sua clínica</p>
              </div>
            </div>

            <a
              href="https://wa.me/5581996741525"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-primary hover:bg-primary-light text-white font-semibold px-7 py-3.5 rounded-full transition-all duration-300 hover:shadow-lg hover:shadow-primary/20 hover:-translate-y-0.5"
            >
              Fale com a IMAPET
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
