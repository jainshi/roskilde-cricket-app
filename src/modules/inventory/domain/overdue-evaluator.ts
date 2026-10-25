export interface LoanOverdueStatusInput {
  expectedReturnAt: Date;
  returnedAt?: Date | null;
}

export interface ReminderCooldownInput {
  lastReminderSentAt?: Date | null;
}

export interface OverdueEvaluationResult {
  isOverdue: boolean;
  canSendReminder: boolean;
  hoursUntilEligible: number;
}

/**
 * Checks whether an active loan has passed its return deadline.
 * Returned loans are never overdue.
 */
export function isLoanOverdue(
  loan: LoanOverdueStatusInput,
  now: Date = new Date()
): boolean {
  if (loan.returnedAt) {
    return false;
  }
  return now.getTime() > loan.expectedReturnAt.getTime();
}

/**
 * Evaluates whether an overdue reminder can be dispatched under the 24-hour cooldown rule
 * (Clarification 5). Prevents duplicate spamming of borrowers and linked parents.
 */
export function canSendOverdueReminder(
  loan: ReminderCooldownInput,
  now: Date = new Date(),
  cooldownHours = 24
): boolean {
  if (!loan.lastReminderSentAt) {
    return true;
  }

  const elapsedMs = now.getTime() - loan.lastReminderSentAt.getTime();
  const cooldownMs = cooldownHours * 60 * 60 * 1000;

  return elapsedMs >= cooldownMs;
}

/**
 * Performs a combined overdue and notification eligibility evaluation for a loan.
 */
export function evaluateLoanOverdueState(
  loan: LoanOverdueStatusInput & ReminderCooldownInput,
  now: Date = new Date(),
  cooldownHours = 24
): OverdueEvaluationResult {
  const overdue = isLoanOverdue(loan, now);

  if (!overdue) {
    return {
      isOverdue: false,
      canSendReminder: false,
      hoursUntilEligible: 0,
    };
  }

  if (!loan.lastReminderSentAt) {
    return {
      isOverdue: true,
      canSendReminder: true,
      hoursUntilEligible: 0,
    };
  }

  const elapsedMs = now.getTime() - loan.lastReminderSentAt.getTime();
  const cooldownMs = cooldownHours * 60 * 60 * 1000;

  if (elapsedMs >= cooldownMs) {
    return {
      isOverdue: true,
      canSendReminder: true,
      hoursUntilEligible: 0,
    };
  }

  const remainingMs = cooldownMs - elapsedMs;
  const hoursUntilEligible = Math.ceil(remainingMs / (60 * 60 * 1000));

  return {
    isOverdue: true,
    canSendReminder: false,
    hoursUntilEligible,
  };
}
