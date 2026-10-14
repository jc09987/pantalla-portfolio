import type { Metadata } from "next";
import { Lilita_One, Nunito, Pacifico } from "next/font/google";
import "./globals.css";

const display = Lilita_One({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
});

const script = Pacifico({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-script",
});

const body = Nunito({
  subsets: ["latin"],
  weight: ["600", "700", "800", "900"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "Pantalla",
  description: "Menú animado para pantallas de tienda",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es-MX"
      className={`${display.variable} ${script.variable} ${body.variable} h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
