/**
 * Pure domain logic for GDPR data anonymization and account erasure (FR-074, FR-075).
 * 
 * Preserves historical cricket match statistics by transforming the member into an
 * anonymized shell ("Former Member #...") while permanently scrubbing all PII.
 */

export interface AnonymizableMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  postalCode: string | null;
  dateOfBirth: Date | null;
  isAnonymized: boolean;
}

export interface AnonymizedShellResult {
  id: string;
  firstName: string;
  lastName: string;
  email: null;
  phone: null;
  address: null;
  city: null;
  postalCode: null;
  dateOfBirth: null;
  isAnonymized: true;
}

/**
 * Computes the scrubbed anonymized shell for a member record.
 * Retains the immutable profile ID to maintain statistical foreign keys.
 */
export function computeAnonymizedShell(
  member: AnonymizableMember,
  referenceTag?: string
): AnonymizedShellResult {
  const tag = referenceTag || member.id.substring(0, 6).toUpperCase();

  return {
    id: member.id,
    firstName: "Former",
    lastName: `Member #${tag}`,
    email: null,
    phone: null,
    address: null,
    city: null,
    postalCode: null,
    dateOfBirth: null,
    isAnonymized: true,
  };
}

/**
 * Validates that an anonymized shell does NOT contain any residual personal data.
 */
export function verifyPiiPurged(shell: AnonymizedShellResult): boolean {
  return (
    shell.isAnonymized === true &&
    shell.email === null &&
    shell.phone === null &&
    shell.address === null &&
    shell.city === null &&
    shell.postalCode === null &&
    shell.dateOfBirth === null &&
    shell.firstName === "Former" &&
    shell.lastName.startsWith("Member #")
  );
}
