import type { Metadata, Viewport } from "next";
import { DM_Sans } from "next/font/google";
import { Nav } from "@/components/layout/Nav";
import { SiteFooter } from "@/components/layout/SiteFooter";
import "./globals.css";

const sans = DM_Sans({
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

export const viewport: Viewport = {
  themeColor: "#0C0A16",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={sans.variable}>
      <body className="min-h-dvh bg-canvas font-sans">
        <div
          className="pointer-events-none fixed inset-x-0 top-0 z-0 h-64 bg-[radial-gradient(ellipse_at_top,rgba(155,135,245,0.2),transparent_70%)]"
          aria-hidden
        />
        <Nav />
        <main className="relative pt-[calc(3.5rem+env(safe-area-inset-top))]">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
