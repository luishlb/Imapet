import Image from "next/image";

const beneficios = [
  "Atendimento itinerante — vamos até a sua clínica",
  "Equipamentos modernos e de alta precisão",
  "Laudos completos entregues com agilidade",
  "Veterinária especialista em diagnóstico por imagem",
  "Sem custo de equipamento ou manutenção para a clínica",
  "Exame realizado com protocolo de bem-estar animal",
];

export default function ClinicasParceiras() {
  return (
    <section id="clinicas" className="bg-primary py-24 px-6 overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
          {/* Text */}
          <div>
            <span className="text-accent text-xs font-semibold tracking-[0.2em] uppercase">
              Para clínicas veterinárias
            </span>
            <h2 className="font-playfair text-4xl md:text-5xl text-white font-bold mt-4 mb-6 leading-tight">
              Ofereça diagnóstico
              <br />
              por imagem sem sair
              <br />
              da sua clínica.
            </h2>
            <p className="text-white/70 text-lg leading-relaxed mb-8">
              A IMAPET é a parceira ideal para clínicas veterinárias que querem
              oferecer ultrassonografia e cistocentese com qualidade, sem
              precisar investir em equipamentos ou especialistas próprios.
            </p>

            {/* Benefícios */}
            <ul className="space-y-3.5 mb-10">
              {beneficios.map((item) => (
                <li key={item} className="flex items-start gap-3 text-white/80">
                  <span className="mt-1 w-5 h-5 rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center flex-shrink-0">
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 12 12"
                      fill="none"
                    >
                      <path
                        d="M2 6l3 3 5-5"
                        stroke="#D4A5A5"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                  <span className="text-sm leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>

            <a
              href="https://wa.me/5581996741525?text=Olá%21+Tenho+interesse+em+ser+uma+clínica+parceira+da+IMAPET."
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-white text-primary font-semibold px-8 py-4 rounded-full transition-all duration-300 hover:bg-accent hover:shadow-xl hover:-translate-y-0.5"
            >
              <WhatsAppIcon />
              Quero ser clínica parceira
            </a>
          </div>

          {/* Image */}
          <div className="relative h-[480px] rounded-3xl overflow-hidden shadow-2xl shadow-black/30">
            <Image
              src="/clinicas-parceiras.jpg"
              alt="Veterinários parceiros da IMAPET"
              fill
              className="object-cover"
            />
            {/* Subtle overlay */}
            <div className="absolute inset-0 bg-primary/10" />
          </div>
        </div>
      </div>
    </section>
  );
}

function WhatsAppIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}
