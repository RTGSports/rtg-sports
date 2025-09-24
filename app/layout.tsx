import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Rise to Greatness Scores",
  description: "Live scores across the WNBA, NWSL, and PWHL in one place.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="bg-background text-white">
      <body className={`${inter.variable} font-sans bg-background text-white antialiased`}>{children}</body>
    </html>
  );
}
