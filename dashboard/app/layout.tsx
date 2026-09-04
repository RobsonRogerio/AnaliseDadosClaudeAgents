import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dashboard E-commerce",
  description: "Vendas, pricing e clientes — visão executiva",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="font-sans min-h-screen bg-plane text-ink-primary">
        {children}
      </body>
    </html>
  );
}
