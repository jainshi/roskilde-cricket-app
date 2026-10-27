# Server Actions & API Contracts: Membership Subscriptions, Club Fees & Finance

**Feature Branch**: `004-membership-fees-finance`  
**Date**: 2026-10-27  
**Module**: `src/modules/finance/`

---

## 1. Membership Plan Contracts (`plan.contract.ts`)

### `createMembershipPlanAction`
- **Authorized Roles**: `ADMIN`
- **Input Schema**:
```typescript
export const createMembershipPlanSchema = z.object({
  code: z.string().trim().min(3).max(50).toUpperCase(),
  name: z.string().trim().min(3).max(100),
  category: z.enum([
    "SENIOR_COMPETITIVE",
    "YOUTH_U15_U13",
    "SOCIAL_PASSIVE",
    "INDOOR_WINTER_ADDON",
  ]),
  billingCycle: z.enum(["ANNUAL", "SUMMER_OUTDOOR", "WINTER_INDOOR"]),
  amountOere: z.number().int().positive("Plan fee must be a positive integer in øre"),
  siblingDiscountPercent: z.number().int().min(0).max(100).default(25),
  description: z.string().trim().max(500).optional(),
});
export type CreateMembershipPlanInput = z.infer<typeof createMembershipPlanSchema>;
```
- **Output**: `{ success: boolean; data?: MembershipPlan; error?: string }`

### `updateMembershipPlanAction`
- **Authorized Roles**: `ADMIN`
- **Input Schema**:
```typescript
export const updateMembershipPlanSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(3).max(100).optional(),
  amountOere: z.number().int().positive().optional(),
  siblingDiscountPercent: z.number().int().min(0).max(100).optional(),
  description: z.string().trim().max(500).optional(),
  isActive: z.boolean().optional(),
});
export type UpdateMembershipPlanInput = z.infer<typeof updateMembershipPlanSchema>;
```
- **Output**: `{ success: boolean; data?: MembershipPlan; error?: string }`

---

## 2. Subscription Enrollment & Override Contracts (`subscription.contract.ts`)

### `enrollMemberSubscriptionAction`
- **Authorized Roles**: `ADMIN`, `PARENT` (for linked child), `PLAYER` (self)
- **Input Schema**:
```typescript
export const enrollMemberSubscriptionSchema = z.object({
  memberProfileId: z.string().uuid(),
  planId: z.string().uuid(),
  seasonYear: z.number().int().min(2025).max(2050),
  manualDiscountOere: z.number().int().min(0).optional(),
  overrideReason: z.string().trim().max(300).optional(),
});
export type EnrollMemberSubscriptionInput = z.infer<typeof enrollMemberSubscriptionSchema>;
```
- **Output**: `{ success: boolean; data?: MemberSubscription; error?: string }`

---

## 3. Invoicing Contracts (`invoice.contract.ts`)

### `generateSeasonalInvoicesAction`
- **Authorized Roles**: `ADMIN`
- **Input Schema**:
```typescript
export const generateSeasonalInvoicesSchema = z.object({
  seasonYear: z.number().int().min(2025).max(2050),
  seasonCycle: z.enum(["ANNUAL", "SUMMER_OUTDOOR", "WINTER_INDOOR"]),
  planId: z.string().uuid().optional(),      // Optional: limit to a single plan
  teamSquadId: z.string().uuid().optional(), // Optional: limit to squad roster
  dueDateDays: z.number().int().min(7).max(90).default(30),
});
export type GenerateSeasonalInvoicesInput = z.infer<typeof generateSeasonalInvoicesSchema>;
```
- **Output**: `{ success: boolean; count?: number; error?: string }`

### `createAdHocInvoiceAction`
- **Authorized Roles**: `ADMIN`
- **Input Schema**:
```typescript
export const createAdHocInvoiceSchema = z.object({
  memberProfileId: z.string().uuid(),
  category: z.enum(["EVENT_FEE", "EQUIPMENT_CHARGE", "AD_HOC"]),
  title: z.string().trim().min(3).max(150),
  lineItems: z.array(
    z.object({
      description: z.string().trim().min(1).max(200),
      quantity: z.number().int().min(1).default(1),
      unitPriceOere: z.number().int().positive(),
    })
  ).min(1, "At least one line item is required"),
  dueDate: z.string().datetime(),
  notes: z.string().trim().max(500).optional(),
  linkedEquipmentLoanId: z.string().uuid().optional(),
  linkedScheduledEventId: z.string().uuid().optional(),
});
export type CreateAdHocInvoiceInput = z.infer<typeof createAdHocInvoiceSchema>;
```
- **Output**: `{ success: boolean; data?: Invoice; error?: string }`

---

## 4. Member Payment Self-Reporting (`payment.contract.ts`)

### `reportInvoicePaymentAction`
- **Authorized Roles**: `ADMIN`, `PLAYER` (self), `PARENT` (linked child)
- **Input Schema**:
```typescript
export const reportInvoicePaymentSchema = z.object({
  invoiceId: z.string().uuid(),
  amountOere: z.number().int().positive(),
  paymentMethod: z.enum(["MOBILEPAY", "BANK_TRANSFER", "CASH"]),
  transactionReference: z.string().trim().max(100).optional(),
  notes: z.string().trim().max(300).optional(),
});
export type ReportInvoicePaymentInput = z.infer<typeof reportInvoicePaymentSchema>;
```
- **Output**: `{ success: boolean; transactionId?: string; error?: string }`

---

## 5. Treasurer Reconciliation & Overdue Reminders (`reconciliation.contract.ts`)

### `verifyPaymentTransactionAction`
- **Authorized Roles**: `ADMIN`
- **Input Schema**:
```typescript
export const verifyPaymentTransactionSchema = z.object({
  transactionId: z.string().uuid(),
  settlementDate: z.string().datetime().optional(), // Defaults to now()
  notes: z.string().trim().max(300).optional(),
});
export type VerifyPaymentTransactionInput = z.infer<typeof verifyPaymentTransactionSchema>;
```
- **Output**: `{ success: boolean; invoiceStatus?: string; error?: string }`

### `waiveInvoiceAction`
- **Authorized Roles**: `ADMIN`
- **Input Schema**:
```typescript
export const waiveInvoiceSchema = z.object({
  invoiceId: z.string().uuid(),
  reason: z.string().trim().min(5, "A documented justification is required for fee waivers").max(500),
});
export type WaiveInvoiceInput = z.infer<typeof waiveInvoiceSchema>;
```
- **Output**: `{ success: boolean; error?: string }`

### `sendOverdueReminderAction` & `batchSendOverdueRemindersAction`
- **Authorized Roles**: `ADMIN`
- **Input Schema**:
```typescript
export const sendOverdueReminderSchema = z.object({
  invoiceId: z.string().uuid(),
});
export type SendOverdueReminderInput = z.infer<typeof sendOverdueReminderSchema>;

export const batchSendOverdueRemindersSchema = z.object({
  invoiceIds: z.array(z.string().uuid()).min(1),
});
export type BatchSendOverdueRemindersInput = z.infer<typeof batchSendOverdueRemindersSchema>;
```
- **Output**: `{ success: boolean; sentCount?: number; error?: string }`

---

## 6. Danish Bookkeeping Act Export (`ledger.contract.ts`)

### `exportBogfoeringslovenLedgerAction`
- **Authorized Roles**: `ADMIN`
- **Input Schema**:
```typescript
export const exportBogfoeringslovenLedgerSchema = z.object({
  fiscalYear: z.number().int().min(2020).max(2050).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});
export type ExportBogfoeringslovenLedgerInput = z.infer<typeof exportBogfoeringslovenLedgerSchema>;
```
- **Output**: `{ success: boolean; csv?: string; rowCount?: number; error?: string }`
