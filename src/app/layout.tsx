import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "IMAPET — Diagnóstico Veterinário por Imagem",
  description:
    "Ultrassonografia e cistocentese veterinária com cuidado, tecnologia e sensibilidade. A IMAPET vai até a clínica do seu pet em Recife e região.",
  keywords: "ultrassonografia veterinária, diagnóstico por imagem, cistocentese, Recife, veterinário",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${playfair.variable} ${inter.variable}`}>
      <body className="font-inter bg-background antialiased">
        {children}
      </body>
    </html>
  );
}
