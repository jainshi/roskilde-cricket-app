# Developer Quickstart: Club Inventory & Equipment Management

**Feature Branch**: `002-inventory-equipment-management`  
**Date**: 2026-10-25  
**Module**: Module 2 (`src/modules/inventory/`)

---

## 1. Prerequisites & Database Migration

Ensure your local PostgreSQL database is running and environment variables are populated:

```bash
# 1. Verify environment configuration
cat .env | grep -E "DATABASE_URL|DIRECT_URL|CRON_SECRET"

# 2. Run Prisma migration for Module 2 schema additions
npx prisma migrate dev --name add_inventory_equipment_module

# 3. Regenerate Prisma client types
npx prisma generate
```

---

## 2. Running Unit & Domain Test Suites

Unit tests for Module 2 execute in Vitest without requiring a live database connection:

```bash
# Run all unit tests
npm run test:unit

# Run specifically the inventory domain tests
npx vitest run tests/unit/inventory/
```

### Key Domain Test Suites
- `equipment-state-machine.test.ts`: Verifies checkout from `AVAILABLE`, return to `AVAILABLE` / `UNDER_MAINTENANCE`, forbidden transitions, and terminal `RETIRED` state.
- `stock-math.test.ts`: Verifies bulk stock arithmetic for `RETURNABLE_LOAN` vs `DIRECT_CONSUMPTION`, low-stock triggers, and write-offs.
- `return-deadline.test.ts`: Verifies category-based intelligent return deadline calculation (same-day keys/balls, 7-day protective gear, 180-day kit bags).
- `overdue-evaluator.test.ts`: Verifies overdue calculation and 24-hour reminder cooldown enforcement.
- `inventory-gdpr-guard.test.ts`: Verifies GDPR account deletion is blocked when active or overdue loans exist, and succeeds when all items are returned.

---

## 3. Seeding Sample Inventory & Seed Script

Seed realistic club equipment across all categories and tracking types:

```bash
npx tsx scripts/seed-inventory.ts
```

### Seeded Assets Overview:
1. **Serialized Match Bats** (`BATTING`): Kookaburra Kahuna Senior (`BAT-2026-001`, `AVAILABLE`, 1,299.00 DKK) and Gray-Nicolls Junior Bat (`BAT-2026-002`, `AVAILABLE`).
2. **Safety Equipment** (`PROTECTIVE`): Masuri Vision Helmet Junior (`HLM-2026-001`), Club Batting Pads Youth (`PAD-2026-001`).
3. **High-Value Club Assets**: BOLA Professional Bowling Machine (`MCH-2026-001`, `AVAILABLE`, 24,500.00 DKK, Poppelgårdsvej Container).
4. **Facility Access** (`FACILITY_KEYS`): Poppelgårdsvej Shed Padlock Key (`KEY-001`).
5. **Bulk Consumables** (`BOWLING_BALLS`, `TRAINING_GROUND`):
   - County Match Red Leather Balls (Bulk: 24 total, 24 available, low stock threshold = 6).
   - Training Cones Set (Bulk: 50 total, 50 available).
   - Yellow Fielding Bibs (Bulk: 20 total, 20 available).

---

## 4. Manual Pitch-Side Workflow Verification

### Step A: Pitch-Side Checkout (<30 Seconds on Mobile)
1. Open Chrome DevTools, switch to Mobile Device Viewport (iPhone SE, **375×667** or **360×740** px).
2. Log in as a Coach (`coach@roskildecricket.dk` / standard test credentials).
3. Navigate to `/inventory` or `/inventory/checkout`.
4. Scan or type `BAT-2026-001` in the predictive selector.
5. Select a youth player (e.g., "Lucas Nielsen").
6. Verify category return deadline is automatically pre-populated (+7 days).
7. Tap **"Confirm Check-Out"**.
8. Verify:
   - Item status becomes `ON_LOAN`.
   - Toast confirms checkout and displays linked parent notification notice.
   - Server console logs email dispatched to Lucas's linked parents via `notificationService`.

### Step B: Parent View in "My Gear"
1. Log in as Lucas's parent (`parent@roskildecricket.dk`).
2. Navigate to `/profile/gear` ("My Gear").
3. Use the **Header Profile Switcher** to switch active context to "Lucas Nielsen".
4. Verify `BAT-2026-001` appears under "Active Loans" with return deadline and condition.
5. Tap **"Request Extension"**, enter `+3 days` and reason: "Match postponed due to rain".
6. Switch back to Coach account; navigate to `/inventory/extensions` and tap **"Approve"**.
7. Confirm Lucas's loan expected return date is updated immediately.

### Step C: Pitch-Side Check-In & Damage Routing
1. In Coach view, navigate to `/inventory/checkin`.
2. Select `BAT-2026-001`.
3. Inspect condition: select `NEEDS_REPAIR` and note: "Rubber grip unravelling, handle binding loose".
4. Tap **"Confirm Return"**.
5. Verify:
   - Loan is marked `RETURNED`.
   - Asset status automatically transitions to `UNDER_MAINTENANCE` (locked from re-loaning).

---

## 5. Verifying Overdue Reminders & Cron Endpoint

Test the automated overdue evaluator locally:

```bash
# Trigger the overdue check endpoint with bearer secret
curl -X POST http://localhost:3000/api/inventory/cron/overdue \
  -H "Authorization: Bearer ${CRON_SECRET:-test-cron-secret-123}" \
  -H "Content-Type: application/json"
```

Verify the JSON response returns `evaluatedCount`, `remindersSentCount`, and that running the command twice in succession reports `skippedCooldownCount` > 0 due to the 24-hour guard.
