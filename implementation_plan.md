# Implementation Plan - Detailed Customer Work Analytics in Billing (Super Admin Only)

This plan details the modifications to the **Customer Detail View** inside the **Billing & Records** screen (`StaffBillingScreen.tsx`). Currently, the customer card shows only piece/job counts for the 8 operational metrics. We will extend this to display total monetary amounts and pure weights for each category. Crucially, this detailed data will be visible **only to the Super Admin role**.

---

## Proposed Changes

We will modify [StaffBillingScreen.tsx](file:///c:/Users/HP/Downloads/ppp/pkl/app/src/components/StaffBillingScreen.tsx) to capture and conditionalize these details.

### [Component] Billing & Records Screen

#### [MODIFY] [StaffBillingScreen.tsx](file:///c:/Users/HP/Downloads/ppp/pkl/app/src/components/StaffBillingScreen.tsx)

- **`Customer` Interface Definition:**
  - Update `workBreakdown` properties to include optional aggregation properties:
    - Amounts: `tunchAmount`, `markingAmount`, `shoulderingAmount`, `buyAmount`, `sellAmount`, `buyAgainstTunchAmount`, `pureGoldAgainstTunchAmount`, `pureSilverAgainstTunchAmount`.
    - Weights: `buyAgainstTunchWeight`, `pureGoldAgainstTunchWeight`, `pureSilverAgainstTunchWeight`, `buyGoldWeight`, `buySilverWeight`, `sellGoldWeight`, `sellSilverWeight`.
- **Aggregation Logic (`dynamicCustomers`):**
  - Update the loops over completed tasks and transactions to sum monetary amounts (₹) and pure metal weights (g) alongside the existing piece/job counts.
- **UI Customization (Customer Details Cards):**
  - Read the `isSuperSa` flag (checks if user role is `Super Admin`).
  - In the 8-card metrics grid, render the monetary totals and pure weights (e.g. `120.350g` and `₹45,000`) **only if** `isSuperSa` is `true`.
  - For all other roles (e.g. Admin, Staff), render only the piece/job counts exactly as they are displayed today.

---

## Verification Plan

### Automated Tests
- Build verification: `npm run build`

### Manual Verification
1. **Super Admin Perspective:** Log in as Super Admin, navigate to Billing & Records -> By Customer, select a customer card. Verify that each of the 8 cards shows:
   - Count (Pieces or Jobs)
   - Pure weight in grams (if applicable)
   - Total amount in ₹
2. **Admin/Staff Perspective:** Log in as regular Admin or Staff, navigate to Billing & Records -> By Customer, select a customer card. Verify that the cards **only** show the piece/job counts without any weights or monetary totals.
3. **Data Integrity:** Check that the totals shown on the customer detail cards exactly match the values calculated in the Work Metrics page.
