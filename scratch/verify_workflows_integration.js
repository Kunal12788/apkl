import pkg from 'pg';
const { Client } = pkg;

async function runVerification() {
  const client = new Client({
    user: process.env.DB_USER || 'postgres.quqcfbairoevddjcxiyi',
    host: process.env.DB_HOST || 'aws-1-ap-south-1.pooler.supabase.com',
    database: process.env.DB_NAME || 'postgres',
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || '6543'),
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log("Connected to Supabase PostgreSQL Database.");

    // Clean up any old test records
    console.log("Cleaning up old test data...");
    await client.query("DELETE FROM public.ledger_entries WHERE customer_name LIKE 'Test Customer%'");
    await client.query("DELETE FROM public.transactions WHERE customer_name LIKE 'Test Customer%'");
    await client.query("DELETE FROM public.tasks WHERE customer_name LIKE 'Test Customer%'");
    console.log("Cleanup finished.\n");

    const collectionStaffId = 'COLL-8961'; // KAKA
    const staffId = 'STAFF-8476'; // AMOL
    const adminId = 'ADMIN-3565'; // PRAKASH
    
    // ==========================================
    // CASE 1: Collection Staff Intake -> Staff Process (Front Mode) -> Admin Verify -> Admin Price
    // ==========================================
    console.log("--- STARTING CASE 1 TEST (FRONT MODE) ---");

    const task1Id = `TASK-TEST1-${Math.floor(1000 + Math.random() * 9000)}`;
    const customer1Name = 'Test Customer Case 1';
    
    // Step 1.1: Collection Staff creates a task
    // Status is 'Pending', progress 0%, settlement_condition 'Cash' (or similar)
    console.log(`[Case 1] Step 1: Collection Staff creating task ${task1Id}...`);
    await client.query(`
      INSERT INTO public.tasks (
        id, customer_name, customer_id, work_type, status, progress_percentage,
        settlement_condition, brought_by, created_by, metal, created_at, 
        date_given, iso_date, estimated_completion,
        source, assigned_to
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), 'Today', CURRENT_DATE, 'Today', $11, 'Staff')
    `, [
      task1Id, customer1Name, 'CUST-TEST1', 'Tunch', 'Pending', 0,
      'Cash', 'Collection Staff', collectionStaffId, 'Gold', 'Collection Staff'
    ]);

    // Check visibility for Staff/ColStaff vs Admin in Pending Tab
    // Plan: Pending = status === 'Pending' && purity === null
    let taskCheck = await client.query("SELECT status, purity FROM public.tasks WHERE id = $1", [task1Id]);
    const tRow = taskCheck.rows[0];
    const isStaffPendingVisible = (tRow.status === 'Pending' && tRow.purity === null);
    const isAdminPendingVisible = (tRow.status === 'Pending' && tRow.purity !== null);
    console.log(`[Case 1] Task created. purity is ${tRow.purity}.`);
    console.log(` - Visible under Staff Pending Tab? ${isStaffPendingVisible} (Expected: true)`);
    console.log(` - Visible under Admin Pending Tab? ${isAdminPendingVisible} (Expected: false)`);
    if (!isStaffPendingVisible || isAdminPendingVisible) {
      throw new Error("Case 1 Task visibility constraints failed at Step 1!");
    }

    // Step 1.2: Staff verifies task ownership
    console.log("[Case 1] Step 2: Staff verifying task ownership (handleVerifySuccess)...");
    await client.query(`
      UPDATE public.tasks 
      SET assigned_to = $1
      WHERE id = $2
    `, [staffId, task1Id]);

    // Step 1.3: Staff processes task (details input, service fee collected in cash, Front mode selected)
    console.log("[Case 1] Step 3: Staff processing task (handleProcessTask) - Front Mode...");
    const impureWeight1 = '100.000';
    const purity1 = '90.000';
    const pureWeight1 = '90.000';
    const serviceFee1 = '500';
    
    // Updates task: purity and weights populated, cash_handling_mode set to 'Front'
    // Status stays 'Pending' (waiting for Admin) but progress is now 90
    await client.query(`
      UPDATE public.tasks
      SET purity = $1, impure_weight = $2, pure_weight = $3, 
          cash_handling_mode = 'Front', progress_percentage = 90,
          settlement_condition = 'Cash - [Collected] Cash ₹500'
      WHERE id = $4
    `, [purity1, impureWeight1, pureWeight1, task1Id]);

    // Staff inserts their initial Pending Cash ledger entry (since Front mode)
    const staffLgr1Id = `LGR-S-TEST1`;
    await client.query(`
      INSERT INTO public.ledger_entries (
        id, date, iso_date, customer_name, transaction_type, status, purity,
        staff_id, created_at, pending_cash_liability,
        cash_received, cash_paid, cash_amount, cash_rate_per_gram,
        impure_gold_in, pure_gold_in, impure_silver_in, pure_silver_in,
        pure_gold_out, pure_silver_out, pure_gold_due, pure_silver_due
      ) VALUES (
        $1, 'Today', CURRENT_DATE, $2, 'Exchange', 'Pending Cash', $3,
        $4, NOW(), true,
        $5, 0, 0, 0,
        $6, $7, 0, 0,
        0, 0, 0, 0
      )
    `, [
      staffLgr1Id, customer1Name, purity1, staffId, 
      Number(serviceFee1), Number(impureWeight1), Number(pureWeight1)
    ]);

    // Recheck visibility:
    // Staff/ColStaff In Progress: status === 'In Progress' || (status === 'Pending' && purity !== null)
    // Admin Pending: status === 'Pending' && purity !== null
    taskCheck = await client.query("SELECT status, purity FROM public.tasks WHERE id = $1", [task1Id]);
    const tRow2 = taskCheck.rows[0];
    const isStaffInProgressVisible = (tRow2.status === 'In Progress' || (tRow2.status === 'Pending' && tRow2.purity !== null));
    const isAdminPendingVisibleAfterProcess = (tRow2.status === 'Pending' && tRow2.purity !== null);
    
    console.log(`[Case 1] Task processed. purity is ${tRow2.purity}. status is ${tRow2.status}.`);
    console.log(` - Visible under Staff In Progress Tab? ${isStaffInProgressVisible} (Expected: true)`);
    console.log(` - Visible under Admin Pending Tab? ${isAdminPendingVisibleAfterProcess} (Expected: true)`);
    if (!isStaffInProgressVisible || !isAdminPendingVisibleAfterProcess) {
      throw new Error("Case 1 Task visibility constraints failed at Step 3!");
    }

    // Step 1.4: Admin verifies details (clicks Verify Details button in Admin Pending tab)
    console.log("[Case 1] Step 4: Admin verifying task details (handleUpdateStatus)...");
    await client.query(`
      UPDATE public.tasks
      SET status = 'In Progress', progress_percentage = 70
      WHERE id = $1
    `, [task1Id]);

    // Recheck visibility:
    // Admin In Progress: status === 'In Progress' && purity !== null
    taskCheck = await client.query("SELECT status, purity FROM public.tasks WHERE id = $1", [task1Id]);
    const tRow3 = taskCheck.rows[0];
    const isAdminInProgressVisible = (tRow3.status === 'In Progress' && tRow3.purity !== null);
    console.log(`[Case 1] Task verified by Admin. status is ${tRow3.status}.`);
    console.log(` - Visible under Admin In Progress Tab? ${isAdminInProgressVisible} (Expected: true)`);
    if (!isAdminInProgressVisible) {
      throw new Error("Case 1 Task visibility constraints failed at Step 4!");
    }

    // Step 1.5: Admin finalizes pricing (clicks Approve & Price in Admin In Progress tab)
    console.log("[Case 1] Step 5: Admin finalizes pricing (handleFinalizePricing)...");
    const rateGram1 = 7000;
    const payoutAmount1 = rateGram1 * Number(pureWeight1); // 630,000

    // Complete task in DB
    await client.query(`
      UPDATE public.tasks
      SET status = 'Completed', progress_percentage = 100,
          cash_rate_per_gram = $1, cash_amount = $2,
          settlement_condition = 'Cash - [Collected] Cash ₹500 - [Collected] Cash ₹630000'
      WHERE id = $3
    `, [rateGram1, payoutAmount1, task1Id]);

    // Front mode ledger operations:
    // 1. Staff's Pending Cash entry is updated to Completed and sets rate & amount.
    await client.query(`
      UPDATE public.ledger_entries
      SET status = 'Completed', cash_rate_per_gram = $1, cash_amount = $2, pending_cash_liability = false
      WHERE id = $3
    `, [rateGram1, payoutAmount1, staffLgr1Id]);

    // 2. Admin's disbursement ledger entry is created
    const adminLgr1Id = `LGR-A-TEST1`;
    await client.query(`
      INSERT INTO public.ledger_entries (
        id, date, iso_date, customer_name, transaction_type, status, purity,
        staff_id, created_at, pending_cash_liability,
        cash_received, cash_paid, cash_amount, cash_rate_per_gram,
        impure_gold_in, pure_gold_in, impure_silver_in, pure_silver_in,
        pure_gold_out, pure_silver_out, pure_gold_due, pure_silver_due
      ) VALUES (
        $1, 'Today', CURRENT_DATE, $2, 'Exchange', 'Completed', $3,
        $4, NOW(), false,
        0, $5, $6, $7,
        0, 0, 0, 0,
        0, 0, 0, 0
      )
    `, [
      adminLgr1Id, customer1Name, purity1, adminId,
      payoutAmount1, payoutAmount1, rateGram1
    ]);

    // 3. Create billing transaction (for service fee, or overall task, if not wasSettlementCategory)
    const txn1Id = `TXN-TEST1`;
    await client.query(`
      INSERT INTO public.transactions (
        id, customer_name, customer_id, task_id, metal, type, work_type,
        amount, date, iso_date, status, details, impure_weight, pure_weight,
        purity_percentage, created_by, timestamp
      ) VALUES (
        $1, $2, 'CUST-TEST1', $3, 'Gold', 'Cash', 'Tunch',
        $4, 'Today', CURRENT_DATE, 'Unpaid', 'Tunch task completed.', $5, $6,
        $7, $8, '12:00 PM'
      )
    `, [txn1Id, customer1Name, task1Id, serviceFee1, impureWeight1, pureWeight1, purity1, adminId]);

    // CASE 1 VERIFICATION
    console.log("\n>>> CASE 1 RESULTS VERIFICATION <<<");
    const staffEntry1 = (await client.query("SELECT * FROM public.ledger_entries WHERE id = $1", [staffLgr1Id])).rows[0];
    const adminEntry1 = (await client.query("SELECT * FROM public.ledger_entries WHERE id = $1", [adminLgr1Id])).rows[0];

    console.log("Staff Entry (Front Mode):");
    console.log(` - Status: ${staffEntry1.status} (Expected: Completed)`);
    console.log(` - Staff ID: ${staffEntry1.staff_id} (Expected: ${staffId})`);
    console.log(` - Service Fee cash_received: ${staffEntry1.cash_received} (Expected: ${serviceFee1})`);
    console.log(` - Gold metal pure_gold_in: ${staffEntry1.pure_gold_in} (Expected: ${pureWeight1})`);
    console.log(` - cash_paid: ${staffEntry1.cash_paid} (Expected: 0)`);
    console.log(` - pending_cash_liability: ${staffEntry1.pending_cash_liability} (Expected: false)`);

    console.log("Admin Entry (Front Mode):");
    console.log(` - Status: ${adminEntry1.status} (Expected: Completed)`);
    console.log(` - Staff ID (Admin): ${adminEntry1.staff_id} (Expected: ${adminId})`);
    console.log(` - Gold metal pure_gold_in: ${adminEntry1.pure_gold_in} (Expected: 0 - kept at front)`);
    console.log(` - Payout cash_paid: ${adminEntry1.cash_paid} (Expected: ${payoutAmount1})`);
    console.log(` - cash_received: ${adminEntry1.cash_received} (Expected: 0)`);

    if (
      staffEntry1.status !== 'Completed' ||
      Number(staffEntry1.cash_received) !== Number(serviceFee1) ||
      Number(staffEntry1.pure_gold_in) !== Number(pureWeight1) ||
      Number(adminEntry1.cash_paid) !== Number(payoutAmount1) ||
      Number(adminEntry1.pure_gold_in) !== 0
    ) {
      throw new Error("Case 1 ledger state validation failed!");
    }
    console.log("CASE 1 PASSED SUCCESSFULLY!\n");


    // ==========================================
    // CASE 2: Staff Intake -> Back Mode -> Admin Verify -> Admin Price
    // ==========================================
    console.log("--- STARTING CASE 2 TEST (BACK MODE) ---");

    const task2Id = `TASK-TEST2-${Math.floor(1000 + Math.random() * 9000)}`;
    const customer2Name = 'Test Customer Case 2';
    const impureWeight2 = '100.000';
    const purity2 = '90.000';
    const pureWeight2 = '90.000';
    const serviceFee2 = '300';

    // Step 2.1: Staff creates task directly with Back mode, status starts as 'Pending'
    console.log(`[Case 2] Step 1: Staff creating task ${task2Id} with Back mode...`);
    await client.query(`
      INSERT INTO public.tasks (
        id, customer_name, customer_id, work_type, status, progress_percentage,
        settlement_condition, brought_by, created_by, metal, created_at, 
        date_given, iso_date, estimated_completion,
        source, purity, impure_weight, pure_weight, cash_handling_mode, assigned_to
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), 'Today', CURRENT_DATE, 'Today', $11, $12, $13, $14, $15, $16)
    `, [
      task2Id, customer2Name, 'CUST-TEST2', 'Tunch', 'Pending', 0,
      'Cash - Fee Suggested ₹300 (Cash)', 'Customer', staffId, 'Gold', 'Staff',
      purity2, impureWeight2, pureWeight2, 'Back', staffId
    ]);

    // Back Mode: Staff's initial ledger entry is created immediately as COMPLETED with 0 metals and service fee
    const staffLgr2Id = `LGR-S-TEST2`;
    await client.query(`
      INSERT INTO public.ledger_entries (
        id, date, iso_date, customer_name, transaction_type, status, purity,
        staff_id, created_at, pending_cash_liability,
        cash_received, cash_paid, cash_amount, cash_rate_per_gram,
        impure_gold_in, pure_gold_in, impure_silver_in, pure_silver_in,
        pure_gold_out, pure_silver_out, pure_gold_due, pure_silver_due
      ) VALUES (
        $1, 'Today', CURRENT_DATE, $2, 'Exchange', 'Completed', $3,
        $4, NOW(), false,
        $5, 0, 0, 0,
        0, 0, 0, 0,
        0, 0, 0, 0
      )
    `, [
      staffLgr2Id, customer2Name, purity2, staffId, 
      Number(serviceFee2)
    ]);

    // Recheck visibility:
    // Admin Pending: status === 'Pending' && purity !== null
    taskCheck = await client.query("SELECT status, purity FROM public.tasks WHERE id = $1", [task2Id]);
    const tRow4 = taskCheck.rows[0];
    const isAdminPendingVisibleCase2 = (tRow4.status === 'Pending' && tRow4.purity !== null);
    console.log(`[Case 2] Task created. purity is ${tRow4.purity}. status is ${tRow4.status}.`);
    console.log(` - Visible under Admin Pending Tab? ${isAdminPendingVisibleCase2} (Expected: true)`);
    if (!isAdminPendingVisibleCase2) {
      throw new Error("Case 2 Task visibility constraints failed at Step 1!");
    }

    // Step 2.2: Admin verifies details (clicks Verify Details button in Admin Pending tab)
    console.log("[Case 2] Step 2: Admin verifying task details...");
    await client.query(`
      UPDATE public.tasks
      SET status = 'In Progress', progress_percentage = 70
      WHERE id = $1
    `, [task2Id]);

    // Step 2.3: Admin finalizes pricing (clicks Approve & Price in Admin In Progress tab)
    console.log("[Case 2] Step 3: Admin finalizes pricing...");
    const rateGram2 = 7100;
    const payoutAmount2 = rateGram2 * Number(pureWeight2); // 639,000

    // Complete task in DB
    await client.query(`
      UPDATE public.tasks
      SET status = 'Completed', progress_percentage = 100,
          cash_rate_per_gram = $1, cash_amount = $2,
          settlement_condition = 'Cash - [Collected] Cash ₹300 - [Collected] Cash ₹639000'
      WHERE id = $3
    `, [rateGram2, payoutAmount2, task2Id]);

    // Back mode ledger operations:
    // 1. Staff's entry remains as-is (already completed).
    // 2. Admin's ledger entry is created with BOTH the cash paid AND the metal weights (since it is kept at back).
    const adminLgr2Id = `LGR-A-TEST2`;
    await client.query(`
      INSERT INTO public.ledger_entries (
        id, date, iso_date, customer_name, transaction_type, status, purity,
        staff_id, created_at, pending_cash_liability,
        cash_received, cash_paid, cash_amount, cash_rate_per_gram,
        impure_gold_in, pure_gold_in, impure_silver_in, pure_silver_in,
        pure_gold_out, pure_silver_out, pure_gold_due, pure_silver_due
      ) VALUES (
        $1, 'Today', CURRENT_DATE, $2, 'Exchange', 'Completed', $3,
        $4, NOW(), false,
        0, $5, $6, $7,
        $8, $9, 0, 0,
        0, 0, 0, 0
      )
    `, [
      adminLgr2Id, customer2Name, purity2, adminId,
      payoutAmount2, payoutAmount2, rateGram2, Number(impureWeight2), Number(pureWeight2)
    ]);

    // CASE 2 VERIFICATION
    console.log("\n>>> CASE 2 RESULTS VERIFICATION <<<");
    const staffEntry2 = (await client.query("SELECT * FROM public.ledger_entries WHERE id = $1", [staffLgr2Id])).rows[0];
    const adminEntry2 = (await client.query("SELECT * FROM public.ledger_entries WHERE id = $1", [adminLgr2Id])).rows[0];

    console.log("Staff Entry (Back Mode):");
    console.log(` - Status: ${staffEntry2.status} (Expected: Completed)`);
    console.log(` - Staff ID: ${staffEntry2.staff_id} (Expected: ${staffId})`);
    console.log(` - Service Fee cash_received: ${staffEntry2.cash_received} (Expected: ${serviceFee2})`);
    console.log(` - Gold metal pure_gold_in: ${staffEntry2.pure_gold_in} (Expected: 0 - kept at back)`);
    console.log(` - cash_paid: ${staffEntry2.cash_paid} (Expected: 0)`);

    console.log("Admin Entry (Back Mode):");
    console.log(` - Status: ${adminEntry2.status} (Expected: Completed)`);
    console.log(` - Staff ID (Admin): ${adminEntry2.staff_id} (Expected: ${adminId})`);
    console.log(` - Gold metal pure_gold_in: ${adminEntry2.pure_gold_in} (Expected: ${pureWeight2} - kept at back)`);
    console.log(` - Payout cash_paid: ${adminEntry2.cash_paid} (Expected: ${payoutAmount2})`);
    console.log(` - cash_received: ${adminEntry2.cash_received} (Expected: 0)`);

    if (
      staffEntry2.status !== 'Completed' ||
      Number(staffEntry2.cash_received) !== Number(serviceFee2) ||
      Number(staffEntry2.pure_gold_in) !== 0 ||
      Number(adminEntry2.cash_paid) !== Number(payoutAmount2) ||
      Number(adminEntry2.pure_gold_in) !== Number(pureWeight2)
    ) {
      throw new Error("Case 2 ledger state validation failed!");
    }
    console.log("CASE 2 PASSED SUCCESSFULLY!\n");

    console.log("--- ALL INTEGRATION CHECKS PASSED PERFECTLY! ---");

  } catch (err) {
    console.error("\n❌ VERIFICATION FAILED:", err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runVerification();
