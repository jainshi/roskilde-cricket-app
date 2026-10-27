"use client";

import React from "react";
import { Printer } from "lucide-react";

export function PrintStatementButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="print-trigger min-h-[38px] px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs sm:text-sm text-white font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
    >
      <Printer className="w-4 h-4 text-sky-400" />
      <span>Print Statement</span>
    </button>
  );
}
