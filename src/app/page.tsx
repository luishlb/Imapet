import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Diferenciais from "@/components/Diferenciais";
import Servicos from "@/components/Servicos";
import ComoFunciona from "@/components/ComoFunciona";
import ClinicasParceiras from "@/components/ClinicasParceiras";
import Sobre from "@/components/Sobre";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main>
      <Navbar />
      <Hero />
      <Diferenciais />
      <Servicos />
      <ComoFunciona />
      <ClinicasParceiras />
      <Sobre />
      <Footer />
    </main>
  );
}
