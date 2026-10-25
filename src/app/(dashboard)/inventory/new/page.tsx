import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireActivatedSession } from "@/modules/auth-rbac/services/session-guard";
import { CreateEquipmentItemForm } from "@/components/inventory/create-item-form";
import { PackagePlus, ArrowLeft } from "lucide-react";

export default async function NewEquipmentPage() {
  const session = await requireActivatedSession();

  if (!session.roles.includes("ADMIN")) {
    redirect("/inventory");
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/inventory"
          className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-serif font-bold text-white tracking-tight flex items-center gap-2">
            <PackagePlus className="w-6 h-6 text-sky-400" />
            Add New Equipment
          </h1>
          <p className="text-xs text-slate-400">
            Register a serialized club asset or add a new bulk consumable stock item.
          </p>
        </div>
      </div>

      <CreateEquipmentItemForm />
    </div>
  );
}
