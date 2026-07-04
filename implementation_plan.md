# Implementation Plan - Purchase & Sales Analytics Dashboard (Super Admin Stock)

This plan details the replacement of the existing Vault Inventory screen (`SuperAdminStockScreen.tsx`) with a high-fidelity **Purchase & Sales Analytics** dashboard. The screen will aggregate transaction-level data to show total purchases (Buy against Tunch + Buy Works) and total sales (Sell Works).

---

## Proposed Changes

We will completely rewrite [SuperAdminStockScreen.tsx](file:///c:/Users/HP/Downloads/ppp/pkl/app/src/components/SuperAdminStockScreen.tsx).

### [Component] Stock Screen Replacement

#### [MODIFY] [SuperAdminStockScreen.tsx](file:///c:/Users/HP/Downloads/ppp/pkl/app/src/components/SuperAdminStockScreen.tsx)

1.  **Remove Existing Content:**
    *   Delete the old vault status cards, metal toggle (Gold/Silver), and raw ledger list.
2.  **Fetch Relevant Data:**
    *   Query `transactions`, `tasks` (completed), `branches`, and `users` tables from Supabase.
3.  **Data Aggregation Logic:**
    *   **Total Purchase:**
        *   **Buy against Tunch:** Filter transactions with `workType === 'Tunch'` where details/type indicate a cash exchange. Extract count, cash amount, and pure weight.
        *   **Buy Works:** Filter transactions with `workType === 'Buy'`. Extract count, cash amount, and pure gold/silver weight.
    *   **Total Sales:**
        *   **Sell Works:** Filter transactions with `workType === 'Sell'`. Extract count, cash amount, and pure gold/silver weight.
4.  **UI Layout Design:**
    *   **Time Period Selectors:** Month-wise, Annually, Lifetime, and Custom Range options.
    *   **Branch-wise Breakdowns:** A dropdown or branch card grids showing the breakdown of Purchase and Sales metrics for each branch.
    *   **Summary Hero Panel:**
        *   **Total Purchases:** Displays cumulative count (Pcs), total cash spent (₹), and sum of gold/silver weights.
        *   **Total Sales:** Displays cumulative count (Pcs), total cash received (₹), and sum of gold/silver weights.

---

## Verification Plan

### Automated Tests
- TypeScript compilation check: `npm run build`

### Manual Verification
1. Navigate to Super Admin -> Dashboard -> Command Center -> Stock.
2. Verify that the screen is completely replaced with the **Purchase & Sales** dashboard.
3. Select different time ranges (Month, Annual, Lifetime) and verify that the counts, weights, and monetary sums update.
4. Verify that Purchases include both "Buy against Tunch" and "Buy Works", while Sales include "Sell Works".
