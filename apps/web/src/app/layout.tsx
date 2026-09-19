import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Nav } from "@/components/layout/Nav";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Agenda Comunidad",
    template: "%s · Agenda Comunidad",
  },
  description:
    "Agendas públicas composables para promotores, artistas y organizadores de eventos.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={inter.variable}>
      <body className="min-h-screen font-sans">
        <Nav />
        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
        <footer className="border-t border-border py-8 text-center text-sm text-ink-faint">
          <p>Agenda Comunidad — eventos con atribución</p>
        </footer>
      </body>
    </html>
  );
}
