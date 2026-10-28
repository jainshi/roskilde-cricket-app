import React from "react";
import { CheckCircle2, AlertCircle, ArrowRightLeft, Users } from "lucide-react";
import { EventVolunteerFulfillment } from "@/modules/volunteers/domain/volunteer-roster";

interface VolunteerBadgeProps {
  fulfillment: EventVolunteerFulfillment;
  className?: string;
  size?: "sm" | "md";
}

export function VolunteerBadge({
  fulfillment,
  className = "",
  size = "md",
}: VolunteerBadgeProps) {
  const { badgeLabel, badgeVariant, swapRequestedSlots } = fulfillment;

  const sizeClasses =
    size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs";

  const getVariantStyles = () => {
    switch (badgeVariant) {
      case "success":
        return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20";
      case "warning":
        return "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30";
      case "destructive":
        return "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30";
      case "neutral":
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  const getIcon = () => {
    if (swapRequestedSlots > 0) {
      return <ArrowRightLeft className="w-3.5 h-3.5 shrink-0 text-amber-500" />;
    }
    switch (badgeVariant) {
      case "success":
        return <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-500" />;
      case "warning":
        return <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-500" />;
      case "destructive":
        return <Users className="w-3.5 h-3.5 shrink-0 text-rose-500" />;
      case "neutral":
      default:
        return null;
    }
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold border ${sizeClasses} ${getVariantStyles()} ${className}`}
    >
      {getIcon()}
      <span>{badgeLabel}</span>
    </span>
  );
}
