"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ShieldPlus } from "lucide-react";
import { createSquadAction } from "@/modules/teams-matches/actions/squad.actions";

export default function NewSquadPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [category, setCategory] = useState<"SENIOR" | "YOUTH" | "SOCIAL">("SENIOR");
  const [ageGroupRule, setAgeGroupRule] = useState("OPEN");
  const [defaultLineupSize, setDefaultLineupSize] = useState(11);
  const [genderGroup, setGenderGroup] = useState("MIXED");
  const [description, setDescription] = useState("");

  const handleCategoryChange = (val: "SENIOR" | "YOUTH" | "SOCIAL") => {
    setCategory(val);
    if (val === "YOUTH") {
      setAgeGroupRule("U15");
      setDefaultLineupSize(10);
    } else {
      setAgeGroupRule("OPEN");
      setDefaultLineupSize(11);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const res = await createSquadAction({
        name,
        category,
        ageGroupRule,
        defaultLineupSize,
        genderGroup,
        description: description || null,
      });

      if (res.success && res.data) {
        router.push(`/teams/${(res.data as any).id}`);
      } else {
        setError(res.error || "Failed to create squad.");
      }
    });
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <Link
        href="/teams"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Teams Directory
      </Link>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-6">
        <div className="flex items-center gap-3 border-b border-border pb-4">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500">
            <ShieldPlus className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Create Club Team / Squad</h1>
            <p className="text-xs text-muted-foreground">
              Define squad division, age boundaries, and default lineup targets
            </p>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Squad Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Roskilde 1st XI or Roskilde U15 Youth"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => handleCategoryChange(e.target.value as any)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none"
              >
                <option value="SENIOR">Senior Competitive</option>
                <option value="YOUTH">Youth Age-Group</option>
                <option value="SOCIAL">Social & Recreational</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Age Boundary Rule
              </label>
              {category === "YOUTH" ? (
                <select
                  value={ageGroupRule}
                  onChange={(e) => setAgeGroupRule(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none"
                >
                  <option value="U11">Under 11 (U11)</option>
                  <option value="U13">Under 13 (U13)</option>
                  <option value="U15">Under 15 (U15)</option>
                  <option value="U17">Under 17 (U17)</option>
                  <option value="U19">Under 19 (U19)</option>
                </select>
              ) : (
                <input
                  type="text"
                  value={ageGroupRule}
                  onChange={(e) => setAgeGroupRule(e.target.value)}
                  placeholder="OPEN"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none"
                />
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Default Target Lineup Size
              </label>
              <input
                type="number"
                min="6"
                max="15"
                required
                value={defaultLineupSize}
                onChange={(e) => setDefaultLineupSize(parseInt(e.target.value, 10))}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none"
              />
              <span className="text-[10px] text-muted-foreground">
                Typically 11 for Senior, 8-10 for Youth.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Gender Classification
              </label>
              <select
                value={genderGroup}
                onChange={(e) => setGenderGroup(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none"
              >
                <option value="MIXED">Mixed / Open</option>
                <option value="MENS">Men's Division</option>
                <option value="WOMENS">Women's Division</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Description (optional)
            </label>
            <textarea
              rows={3}
              placeholder="Division details, practice schedule notes, or team goals..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <Link
              href="/teams"
              className="rounded-lg border border-input bg-background px-4 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isPending || !name.trim()}
              className="rounded-lg bg-emerald-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              {isPending ? "Creating..." : "Create Squad"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
