import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ShieldCheck } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0c2340] via-slate-900 to-[#071526] flex flex-col items-center justify-center p-4 selection:bg-sky-500 selection:text-white">
      <div className="w-full max-w-md flex flex-col items-center">
        {/* Official RCC Brand Logo & Header */}
        <Link
          href="/"
          className="flex items-center gap-3.5 mb-6 group focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 rounded-xl p-2 transition-transform duration-200 hover:scale-[1.02]"
        >
          <div className="relative w-12 h-12 rounded-lg overflow-hidden shadow-md shadow-black/50 border border-sky-400/30 flex-shrink-0">
            <Image
              src="/cyan-logo.jpg"
              alt="Roskilde Cricket Club Logo"
              width={48}
              height={48}
              priority
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex flex-col justify-center">
            <span className="text-xl font-serif font-bold text-white tracking-widest uppercase leading-none mb-0.5 group-hover:text-sky-400 transition-colors">
              Roskilde
            </span>
            <span className="text-[0.65rem] font-sans font-medium text-sky-200 tracking-[0.25em] uppercase">
              Cricket Club
            </span>
          </div>
        </Link>

        {/* Auth Content Card */}
        <div className="w-full bg-[#0c2340]/80 border border-slate-700/60 shadow-2xl shadow-black/80 rounded-2xl backdrop-blur-md p-6 sm:p-8">
          {children}
        </div>

        {/* Security Footer Notice */}
        <div className="mt-8 flex items-center gap-2 text-xs text-slate-400">
          <ShieldCheck className="w-4 h-4 text-sky-400" />
          <span>Official Members-Only Portal &bull; Encrypted Sessions</span>
        </div>
      </div>
    </div>
  );
}
