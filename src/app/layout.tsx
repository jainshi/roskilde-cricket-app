import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#020617",
};

export const metadata: Metadata = {
  title: "Roskilde Cricket Club (RCC)",
  description: "Members-Only Web Application for Roskilde Cricket Club",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Roskilde CC",
  },
  icons: {
    icon: "/cyan-logo.jpg",
    apple: "/cyan-logo.jpg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-sky-500 selection:text-white pb-safe">
        {children}
      </body>
    </html>
  );
}
