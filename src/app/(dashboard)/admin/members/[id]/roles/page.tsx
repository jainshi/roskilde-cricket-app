import { notFound } from "next/navigation";
import { requirePermission } from "@/modules/auth-rbac/services/auth-guard";
import { getMemberRoleDetails } from "@/modules/auth-rbac/services/role.service";
import { RoleManagementForm } from "./role-form";

export const metadata = {
  title: "Manage Member Roles | Roskilde Cricket Club",
  description: "Assign and revoke roles for Roskilde Cricket Club members.",
};

interface RolePageProps {
  params: Promise<{ id: string }>;
}

export default async function MemberRolesPage({ params }: RolePageProps) {
  // Enforce server-side RBAC guard (FR-003, FR-006)
  await requirePermission("ROLE_ASSIGNMENT");

  const { id } = await params;
  const memberDetails = await getMemberRoleDetails(id);

  if (!memberDetails) {
    notFound();
  }

  return (
    <div className="py-6 px-4 sm:px-6">
      <RoleManagementForm
        member={{
          id: memberDetails.id,
          firstName: memberDetails.firstName,
          lastName: memberDetails.lastName,
          email: memberDetails.email,
          dateOfBirth: memberDetails.dateOfBirth?.toISOString() || null,
          isMinor: memberDetails.isMinor,
          roles: memberDetails.roles,
          totalActiveAdmins: memberDetails.totalActiveAdmins,
        }}
      />
    </div>
  );
}
