import type { Metadata } from "next";
import { Archivo, Inter, Rajdhani } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-heading",
  weight: ["500", "600", "700"],
});
const rajdhani = Rajdhani({
  subsets: ["latin"],
  variable: "--font-score",
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Raising the Game Scores",
  description: "Live scores across the WNBA, NWSL, and PWHL in one place.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="bg-background text-white">
      <body
        className={`${inter.variable} ${archivo.variable} ${rajdhani.variable} font-sans bg-background text-white antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
