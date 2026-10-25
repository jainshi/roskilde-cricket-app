import { redirect } from "next/navigation";
import { requireActivatedSession } from "@/modules/auth-rbac/services/session-guard";
import { getActiveContext } from "@/modules/auth-rbac/services/context.service";

export default async function ProfileDefaultRedirect() {
  const session = await requireActivatedSession();
  const context = await getActiveContext();

  const targetId = context?.activeProfileId || session.memberProfileId;
  redirect(`/profile/${targetId}`);
}
