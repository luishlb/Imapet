import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "IMAPET Gestão",
  description: "Gestão financeira IMAPET",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "IMAPET Gestão",
  },
};

export const viewport: Viewport = {
  themeColor: "#8B1A1A",
};

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  return children;
}
