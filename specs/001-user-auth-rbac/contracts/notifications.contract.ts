export interface ResolvedContact {
  emails: string[];
  phones: string[];
  isFallback: boolean;
  parentNames?: string[];
}

export interface MemberContactResolver {
  /**
   * Resolves email and phone numbers for a member profile.
   * If profile email/phone are empty and profile is a youth, resolves to linked parents' contacts.
   * If youth has two parents, returns both emails/phones for simultaneous routing.
   */
  resolveContact(memberProfileId: string): Promise<ResolvedContact>;
}

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

export interface NotificationService {
  /**
   * Pluggable notification service dispatching emails.
   */
  sendEmail(
    options: SendEmailOptions
  ): Promise<{ success: boolean; messageId?: string; error?: string }>;
}
