# Implementation Plan - Split Cash Ledger, Staff Cash Blindness, Daily Submission & Liabilities

This plan outlines the changes needed to implement:
1. **Cash Settlement Routing (Front vs. Back)**: Split metal weights and cash routing depending on Staff ("Front") vs. Admin ("Back") selections.
2. **Staff Cash Blindness**: Prevent Staff from viewing cash rates or totals in Dashboard, Ledger, Billings, and Customer History.
3. **Daily submission / Clear screen**: Let Staff and Admin submit daily logs, causing them to clear from their respective screens unless searching by date.
4. **Liabilities**: Add a "Pending Cash Liability" tracking card and support shortage validations.
5. **Customer Directory Restrictions**: Filter intake history and outstanding dues according to role-based visibility rules.

---

## User Review Required

> [!IMPORTANT]
> - Staff users will be completely restricted from seeing gold/silver cash rates or total settlement cash amounts on their Dashboard, Ledger, Billings, and Customer detail views.
> - The new "Submit" button on the Ledger panel clears data from active views to clean operational screens. To see old data, the "Search by Date" fields must be filled.

---

## Proposed Changes

### 1. Database Mapping & Calculations
We will use existing Supabase columns (`pure_gold_in`, `pure_silver_in`, `cash_rate_per_gram`, `cash_amount`, `pending_pure_liability`, `pending_cash_liability`, `staff_submitted_at`, `admin_submitted_at`, `cash_handling_mode`) in both Frontend components and Supabase queries.

### 2. Components

#### [MODIFY] [StaffTasksScreen.tsx](file:///c:/Users/HP/Downloads/ppp/pkl/app/src/components/StaffTasksScreen.tsx)
- When **Cash** settlement is selected in the completion modal, prompt Staff for **Front** or **Back** handling.
- **`handleProcessTask`**:
  - If **Front** is chosen:
    - Create a ledger entry under the Staff's user ID with `transaction_type = 'Exchange'`, `status = 'Pending Cash'`, `pending_cash_liability = task.pending_cash_liability`, and `pure_gold_in` or `pure_silver_in` = task's pure weight. This registers the metal in the Staff's ledger.
  - If **Back** is chosen:
    - Do not insert any ledger entry under the Staff's ID.
- **`handleFinalizePricing`** (Admin approval):
  - If handling mode is **Front**:
    - Update the Staff's existing ledger entry to `status = (shortage ? 'Pending Cash' : 'Completed')`, `cash_rate_per_gram`, and `cash_amount`.
    - Create a new ledger entry under the Admin's name with `cash_paid` or `cash_amount` (with status `Pending Cash` if shortage).
  - If handling mode is **Back**:
    - Create a single ledger entry under the Admin's name containing both metal weights (inflow) and cash amounts/payment.
- Mask cash rates/totals if logged-in user is `Staff` or `Collection Staff`.

#### [MODIFY] [StaffLedgerScreen.tsx](file:///c:/Users/HP/Downloads/ppp/pkl/app/src/components/StaffLedgerScreen.tsx)
- Update mappers `mapDbToEntry` and `mapEntryToDb` to support `pure_gold_in`, `pure_silver_in`, `cash_rate_per_gram`, `cash_amount`, `pending_cash_liability`, `staff_submitted_at`, and `admin_submitted_at`.
- Update `currentPureStock` calculation to:
  `currentPureStock = totalAllocated + totalPureIn - totalPureOut`
- Add a new **Pending Cash Liability** card visible only to Admin/Super Admin.
- Add a **Submit daily data** button:
  - Staff: "Submit to Admin" (sets `staff_submitted_at = now()` for their records).
  - Admin: "Submit to Super Admin" (sets `admin_submitted_at = now()` for their branch).
- Add `startDate`/`endDate` inputs to allow searching archived ledger records by date.
- Update data fetches to filter out submitted records unless a date search is active.

#### [MODIFY] [StaffDashboardScreen.tsx](file:///c:/Users/HP/Downloads/ppp/pkl/app/src/components/StaffDashboardScreen.tsx)
- Filter out records where `staff_submitted_at` / `admin_submitted_at` is set, unless viewing by date.
- Hide "Total Cash Collected", "Cash Collection" breakdown, and "UPI Collection" cards if the logged-in user is a Staff member.
- Strip cash details from task list and transaction lists for Staff.

#### [MODIFY] [StaffBillingScreen.tsx](file:///c:/Users/HP/Downloads/ppp/pkl/app/src/components/StaffBillingScreen.tsx)
- Filter billing list by submission status.
- In "By Customer" directory:
  - Staff: Display only service fee dues (exclude cash settlements) and mask cash figures in intake details with `[Restricted]`.
  - Admin/Super Admin: Display all dues and complete history.

#### [MODIFY] [CollectionStaffTasksScreen.tsx](file:///c:/Users/HP/Downloads/ppp/pkl/app/src/components/CollectionStaffTasksScreen.tsx)
- Apply `staff_submitted_at IS NULL` filters to active tasks.

#### [MODIFY] [CollectionStaffBillingScreen.tsx](file:///c:/Users/HP/Downloads/ppp/pkl/app/src/components/CollectionStaffBillingScreen.tsx)
- Apply `staff_submitted_at IS NULL` filters to active transactions.

#### [MODIFY] [CollectionStaffDashboardScreen.tsx](file:///c:/Users/HP/Downloads/ppp/pkl/app/src/components/CollectionStaffDashboardScreen.tsx)
- Apply default filters to hide submitted tasks.

---

## Verification Plan

### Automated Tests
- Build verification: `npm run build` or equivalent script validation.

### Manual Verification
- Log in as Staff, complete a Tunch task with **Cash** settlement. Confirm:
  - Prompt for Front/Back appears.
  - Selecting "Front" writes metal in the Staff's ledger.
  - Cash rate/amount is not visible on Staff screens.
- Log in as Admin, confirm:
  - "Pending Cash Liability" card appears on Ledger.
  - Priced task registers cash paid under Admin ledger.
  - Clicking "Submit to Super Admin" clears the active dashboard, ledger, tasks, and billings.
- Test "Search by Date" on both roles to query historical cleared data.
