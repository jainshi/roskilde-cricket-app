# Server Actions & API Contracts: Club Inventory & Equipment Management

**Feature Branch**: `002-inventory-equipment-management`  
**Date**: 2026-10-25  
**Module**: `src/modules/inventory/`

---

## 1. Catalog Management Contracts (`catalog.contract.ts`)

### `createEquipmentItemAction`
- **Authorized Roles**: `ADMIN`
- **Input Schema**:
```typescript
export const createEquipmentItemSchema = z.object({
  assetTag: z.string().trim().min(2).max(50).nullable().optional(),
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(500).optional(),
  trackingType: z.enum(["SERIALIZED", "BULK"]),
  category: z.enum(["BATTING", "PROTECTIVE", "BOWLING_BALLS", "TRAINING_GROUND", "FACILITY_KEYS", "APPAREL_KIT"]),
  ageGroup: z.enum(["JUNIOR", "YOUTH", "SENIOR", "UNIVERSAL"]),
  condition: z.enum(["NEW", "GOOD", "FAIR", "NEEDS_REPAIR"]).default("GOOD"),
  storageLocation: z.string().trim().min(2).max(100),
  totalQuantity: z.number().int().min(1).default(1),
  lowStockThreshold: z.number().int().min(0).nullable().optional(),
  purchasePriceMinorUnits: z.number().int().min(0).nullable().optional(), // øre
  acquisitionDate: z.string().datetime().nullable().optional(),
  warrantyExpiresAt: z.string().datetime().nullable().optional(),
});
```
- **Output**: `{ success: boolean; item?: EquipmentItem; error?: string }`

### `updateEquipmentItemAction`
- **Authorized Roles**: `ADMIN`
- **Input Schema**:
```typescript
export const updateEquipmentItemSchema = createEquipmentItemSchema.partial().extend({
  id: z.string().uuid(),
  status: z.enum(["AVAILABLE", "UNDER_MAINTENANCE", "RETIRED"]).optional(),
  retiredReason: z.string().max(200).optional(),
});
```
- **Output**: `{ success: boolean; item?: EquipmentItem; error?: string }`

---

## 2. Pitch-Side Check-Out & Check-In Contracts (`loan.contract.ts`)

### `checkoutEquipmentAction`
- **Authorized Roles**: `ADMIN`, `COACH`, `AD_HOC_COACH`
- **Input Schema**:
```typescript
export const checkoutEquipmentSchema = z.object({
  equipmentItemId: z.string().uuid(),
  borrowerProfileId: z.string().uuid(),
  quantity: z.number().int().min(1).default(1),
  teamOrSquadName: z.string().trim().max(100).optional(),
  expectedReturnAt: z.string().datetime().optional(), // If omitted, calculated via category defaults
  checkoutCondition: z.enum(["NEW", "GOOD", "FAIR"]).default("GOOD"),
  checkoutNotes: z.string().trim().max(500).optional(),
});
```
- **Output**: `{ success: boolean; loanId?: string; expectedReturnAt?: Date; isMinor?: boolean; error?: string }`
- **Side Effects**:
  - Sets item `status = ON_LOAN` (if serialized).
  - Decrements `availableQuantity` by `quantity`.
  - Dispatches email notification to borrower (and linked parents if minor) via `notificationService`.
  - Creates `AuditLog` entry.

### `checkinEquipmentAction`
- **Authorized Roles**: `ADMIN`, `COACH`, `AD_HOC_COACH`
- **Input Schema**:
```typescript
export const checkinEquipmentSchema = z.object({
  loanId: z.string().uuid(),
  returnCondition: z.enum(["NEW", "GOOD", "FAIR", "NEEDS_REPAIR", "RETIRED"]),
  returnNotes: z.string().trim().max(500).optional(),
  returnedQuantity: z.number().int().min(0).optional(), // For bulk returns
  lostQuantity: z.number().int().min(0).default(0),
});
```
- **Output**: `{ success: boolean; newStatus: ItemStatus; error?: string }`
- **Side Effects**:
  - Marks loan `status = RETURNED` (or `LOST`).
  - Sets asset `status = AVAILABLE` if condition in `[NEW, GOOD, FAIR]`, or `status = UNDER_MAINTENANCE` if condition `NEEDS_REPAIR`.
  - Restores `availableQuantity`. If `lostQuantity > 0`, records `StockTransaction(WRITE_OFF)`.
  - Creates `AuditLog` entry.

---

## 3. Direct Stock Consumption & Restocking Contracts (`stock.contract.ts`)

### `recordStockConsumptionAction`
- **Authorized Roles**: `ADMIN`, `COACH`
- **Input Schema**:
```typescript
export const recordStockConsumptionSchema = z.object({
  equipmentItemId: z.string().uuid(),
  quantity: z.number().int().min(1),
  recipientProfileId: z.string().uuid().optional(),
  teamOrSquadName: z.string().trim().max(100).optional(),
  reason: z.string().trim().min(3).max(250), // e.g. "League match balls - 1st XI vs Svanholm"
});
```
- **Output**: `{ success: boolean; totalRemaining: number; availableRemaining: number; error?: string }`
- **Side Effects**:
  - Decrements both `totalQuantity` and `availableQuantity`.
  - Inserts `StockTransaction` of type `CONSUMPTION`.
  - Checks `lowStockThreshold` and logs alert if breached.

### `restockBulkEquipmentAction`
- **Authorized Roles**: `ADMIN`
- **Input Schema**:
```typescript
export const restockBulkEquipmentSchema = z.object({
  equipmentItemId: z.string().uuid(),
  quantityToAdd: z.number().int().min(1),
  reason: z.string().trim().max(250).default("Club replenishment purchase"),
});
```
- **Output**: `{ success: boolean; newTotal: number; newAvailable: number; error?: string }`

---

## 4. "My Gear" & Extension Request Contracts (`extension.contract.ts`)

### `requestLoanExtensionAction`
- **Authorized Roles**: `PLAYER`, `PARENT` (via active context or linked child), `COACH`, `ADMIN`
- **Input Schema**:
```typescript
export const requestLoanExtensionSchema = z.object({
  loanId: z.string().uuid(),
  proposedReturnAt: z.string().datetime(),
  reason: z.string().trim().min(5).max(300),
});
```
- **Output**: `{ success: boolean; extensionId?: string; error?: string }`
- **Security**: Verifies caller is the borrower or an authorized parent of the minor borrower.

### `reviewLoanExtensionAction`
- **Authorized Roles**: `ADMIN`, `COACH`
- **Input Schema**:
```typescript
export const reviewLoanExtensionSchema = z.object({
  extensionId: z.string().uuid(),
  decision: z.enum(["APPROVED", "REJECTED"]),
  rejectionReason: z.string().trim().max(300).optional(),
});
```
- **Output**: `{ success: boolean; newReturnDate?: Date; error?: string }`
- **Side Effects**:
  - If approved, updates `EquipmentLoan.expectedReturnAt` to `proposedReturnAt`.
  - Notifies borrower and linked parents of decision.
  - Logs `AuditLog` entry.

---

## 5. Damage & Loss Reporting Contracts (`damage.contract.ts`)

### `reportDamageAction`
- **Authorized Roles**: `PLAYER`, `PARENT`, `COACH`, `ADMIN`
- **Input Schema**:
```typescript
export const reportDamageSchema = z.object({
  equipmentItemId: z.string().uuid(),
  loanId: z.string().uuid().optional(),
  severity: z.enum(["MINOR", "MAJOR", "BEYOND_REPAIR", "LOST"]),
  description: z.string().trim().min(10).max(1000),
});
```
- **Output**: `{ success: boolean; reportId?: string; error?: string }`

### `resolveDamageReportAction`
- **Authorized Roles**: `ADMIN`
- **Input Schema**:
```typescript
export const resolveDamageReportSchema = z.object({
  reportId: z.string().uuid(),
  resolution: z.enum(["REPAIRED", "RETIRED_WRITTEN_OFF", "DISMISSED"]),
  resolutionNotes: z.string().trim().min(5).max(500),
});
```
- **Output**: `{ success: boolean; error?: string }`

---

## 6. Overdue Reminder Contracts & Cron Endpoint (`reminder.contract.ts`)

### `sendOverdueRemindersAction`
- **Authorized Roles**: `ADMIN`, `COACH`
- **Input**: `{ dryRun?: boolean }`
- **Output**:
```typescript
export interface ReminderDispatchResult {
  evaluatedCount: number;
  remindersSentCount: number;
  skippedCooldownCount: number;
  loansNotified: Array<{
    loanId: string;
    borrowerName: string;
    itemName: string;
    recipients: string[];
  }>;
}
```

### Route Handler: `POST /api/inventory/cron/overdue`
- **Authentication**: `Bearer ${CRON_SECRET}` in `Authorization` header
- **Response**: `200 OK` with `ReminderDispatchResult` payload, or `401 Unauthorized`.
- **Hosting Portability**: Callable by any external scheduler (Vercel Cron, Coolify Docker cron, GitHub Actions, system crontab).
