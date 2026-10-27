"use client";

import React, { useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserMinus } from "lucide-react";
import { unassignPlayerFromPlanAction } from "@/modules/finance/actions/subscription.actions";

interface UnassignSubscriptionButtonProps {
  subscriptionId: string;
  playerName: string;
  planName: string;
}

export function UnassignSubscriptionButton({
  subscriptionId,
  playerName,
  planName,
}: UnassignSubscriptionButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleUnassign = () => {
    if (
      !window.confirm(
        `Are you sure you want to remove ${playerName} from "${planName}"? Any open, unpaid invoice will be cancelled.`
      )
    ) {
      return;
    }

    startTransition(async () => {
      const res = await unassignPlayerFromPlanAction({ subscriptionId });
      if (!res.success) {
        alert(res.error || "Failed to remove subscription.");
      } else {
        router.refresh();
      }
    });
  };

  return (
    <button
      type="button"
      onClick={handleUnassign}
      disabled={isPending}
      className="px-2.5 py-1 rounded-lg border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
      title={`Remove ${playerName} from ${planName}`}
    >
      <UserMinus className="w-3 h-3" />
      <span>{isPending ? "Removing..." : "Remove"}</span>
    </button>
  );
}
