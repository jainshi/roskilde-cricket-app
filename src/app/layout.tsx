import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Roskilde Cricket Club (RCC)",
  description: "Members-Only Web Application for Roskilde Cricket Club",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-background font-sans">
        {children}
      </body>
    </html>
  );
}
