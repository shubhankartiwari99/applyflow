import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StratumApply — Multi-Portal Career & Internship Command Center",
  description: "A unified, human-controlled workspace for discovering and preparing AI/ML, engineering, and quant applications.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
