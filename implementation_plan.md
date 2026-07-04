# Implementation Plan - Branch-Wise Customer Work Metrics, Monetary Totals & Pure Weights in SuperAdmin

This plan details the modifications to the **Work Metrics** screen in the Super Admin dashboard. Currently, this screen displays operational metrics on a per-staff-member basis. The updated request is to completely restructure this screen to show aggregate operational and monetary metrics grouped by branch. These metrics will reflect total workloads, monetary values, and pure metal weights across branches for specific activities, derived from customer records, completed tasks, and transaction ledger data, with options for time filtering (month-wise, annually, lifetime, or custom).

---

## Proposed Changes

We will modify [SuperAdminWorkScreen.tsx](file:///c:/Users/HP/Downloads/ppp/pkl/app/src/components/SuperAdminWorkScreen.tsx) to achieve the branch-wise aggregation of metrics.

### [Component] SuperAdmin Dashboard

#### [MODIFY] [SuperAdminWorkScreen.tsx](file:///c:/Users/HP/Downloads/ppp/pkl/app/src/components/SuperAdminWorkScreen.tsx)

- **Database Queries (`fetchData`):**
  - Fetch `users`, `tasks`, `transactions`, `branches`, and `customers` to map customers to their creator's branch.
  - Implement date range constraints based on the active Time Range Mode.
- **Time Range Sub-feature:**
  - Add a selector for **Time Range Mode** with the following options:
    - **Month-wise**: Select a month (Jan - Dec) and a year. Sets date range from the 1st to the last day of that month.
    - **Annually**: Select a year. Sets date range from Jan 1st to Dec 31st.
    - **Lifetime**: Disables date filtering in DB query/aggregation.
    - **Custom Range**: Existing inputs for start and end dates.
- **Operational, Monetary & Weight Metrics Aggregation:**
  - Replicate the logic of the "By Customer" feature to aggregate the following 8 work metrics, capturing the **Count (Pieces)**, the **Monetary Amount (₹)**, and the **Pure Weight (g)** where applicable:
    - **Tunch Pcs**: Total pieces and total amount (₹).
    - **Marking Pcs**: Total pieces and total amount (₹).
    - **Shouldering Pcs**: Total pieces and total amount (₹).
    - **Buy against Tunch**: Total pieces, total amount (₹), and sum of pure weights (g) from cash exchanges.
    - **Gold against Tunch**: Total pieces, total amount (₹), and sum of pure gold weights (g) from pure gold exchanges.
    - **Silver against Tunch**: Total pieces, total amount (₹), and sum of pure silver weights (g) from pure silver exchanges.
    - **Buy Works**: Total count, total amount (₹), and sum of pure weights (g) (split by Gold/Silver).
    - **Sell Works**: Total count, total amount (₹), and sum of pure weights (g) (split by Gold/Silver).
- **User Interface Restructuring (Single Unified Screen):**
  - All branch data will be displayed on this **single, unified screen at the same time**.
  - We will replace the user-level list with a **Branch Breakdown** section.
  - For each separate branch, we will display a dedicated card with the **Branch Name clearly printed at the top** as a header.
  - Directly under each branch header, all **8 operational metrics** will be displayed simultaneously in a structured grid.
  - Each card in the grid will show its piece count, its total monetary amount, and its metal weights (e.g., `45 Pcs • 120.350g • ₹22,500` or `12 Jobs • 35.120g Au / 140.000g Ag • ₹1,20,000`).
  - Introduce a **Global Performance Summary** section at the very top of the screen to show combined totals (count, weights, and monetary amounts) of all 8 metrics across all branches.
  - Adjust the search functionality to filter the branches on this screen in real-time.

---

## Verification Plan

### Automated Tests
- Build verification: `npm run build`

### Manual Verification
1. **Access Route:** Login as Super Admin, navigate to the Dashboard, open Command Center, and click on **Work** (Operational Metrics).
2. **Time Filters:** Toggle between Month-wise, Annually, Lifetime, and Custom Range filters. Verify that date ranges update correctly and reload data.
3. **Weight Accuracy:** Verify that the weights shown for Buy/Gold/Silver against Tunch, and Buy/Sell works are mapped to the sum of pure weights of those transaction types.
4. **Data Correctness:** Verify that the counts and amounts shown under each branch correspond to the transaction values and task settlements matching that branch.
5. **Search Filter:** Type a branch name (e.g., Zurich Main, BR-01) in the search bar and verify that only matching branches are displayed.
6. **Responsiveness:** Ensure that the 8-metric grid scales gracefully on both desktop and mobile viewports.
