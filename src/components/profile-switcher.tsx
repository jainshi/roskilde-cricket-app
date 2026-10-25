"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { switchContextAction } from "@/modules/auth-rbac/actions/context.actions";
import { User, Users, ChevronDown, Check, ArrowRightLeft } from "lucide-react";

interface LinkedChild {
  id: string;
  name: string;
}

interface ProfileSwitcherProps {
  parentProfileId: string;
  parentName: string;
  activeProfileId: string;
  isDelegated: boolean;
  linkedChildren: LinkedChild[];
}

export function ProfileSwitcher({
  parentProfileId,
  parentName,
  activeProfileId,
  isDelegated,
  linkedChildren,
}: ProfileSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (targetId: string) => {
    if (targetId === activeProfileId) {
      setIsOpen(false);
      return;
    }
    setIsOpen(false);
    startTransition(async () => {
      await switchContextAction(targetId);
    });
  };

  if (linkedChildren.length === 0) {
    return null;
  }

  const activeChild = linkedChildren.find((c) => c.id === activeProfileId);
  const displayName = isDelegated && activeChild ? activeChild.name : parentName;

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isPending}
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
          isDelegated
            ? "bg-amber-950/80 border-amber-600/70 text-amber-200 hover:bg-amber-900/80 shadow-sm"
            : "bg-[#0c2340] border-sky-600/50 text-sky-200 hover:bg-slate-800"
        } ${isPending ? "opacity-60 cursor-wait" : ""}`}
        title="Switch active profile context"
      >
        <ArrowRightLeft className="w-3.5 h-3.5 text-sky-400 shrink-0" />
        <span className="max-w-[130px] truncate">
          {displayName} {isDelegated ? "(Youth)" : "(Self)"}
        </span>
        <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 rounded-xl bg-[#0c2340] border border-slate-700 shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3 py-1.5 border-b border-slate-700/80">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
              Active Profile Context
            </span>
          </div>

          {/* Option: Parent Self */}
          <button
            type="button"
            onClick={() => handleSelect(parentProfileId)}
            className={`w-full text-left px-3 py-2 flex items-center justify-between text-xs hover:bg-slate-800/80 transition-colors ${
              !isDelegated ? "bg-sky-950/60 text-sky-300 font-bold" : "text-slate-200"
            }`}
          >
            <div className="flex items-center gap-2 truncate">
              <User className="w-4 h-4 text-sky-400 shrink-0" />
              <div className="truncate">
                <p className="truncate">{parentName}</p>
                <p className="text-[10px] text-slate-400 font-normal">My Account (Parent)</p>
              </div>
            </div>
            {!isDelegated && <Check className="w-4 h-4 text-sky-400 shrink-0" />}
          </button>

          {/* Section: Linked Children */}
          <div className="px-3 pt-2 pb-1 border-t border-slate-700/80">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
              Linked Youth Players ({linkedChildren.length})
            </span>
          </div>

          {linkedChildren.map((child) => {
            const isSelected = activeProfileId === child.id;
            return (
              <button
                key={child.id}
                type="button"
                onClick={() => handleSelect(child.id)}
                className={`w-full text-left px-3 py-2 flex items-center justify-between text-xs hover:bg-slate-800/80 transition-colors ${
                  isSelected
                    ? "bg-amber-950/60 text-amber-300 font-bold"
                    : "text-slate-200"
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <Users className="w-4 h-4 text-amber-400 shrink-0" />
                  <div className="truncate">
                    <p className="truncate">{child.name}</p>
                    <p className="text-[10px] text-slate-400 font-normal">Youth Player</p>
                  </div>
                </div>
                {isSelected && (
                  <Check className="w-4 h-4 text-amber-400 shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
