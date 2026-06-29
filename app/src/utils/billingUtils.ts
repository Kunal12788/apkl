export const computeStaffBillingTransactions = (txData: any[], tasksData: any[]): any[] => {
  const txTaskIds = new Set<string>();
  const txEntries = txData.map((t: any) => {
    if (t.task_id) txTaskIds.add(t.task_id);
    const amtNum = Number(t.amount) || 0;
    const paidNum = Number(t.paid_amount || 0);
    let computedStatus = 'Unpaid';
    if (paidNum > 0 && paidNum < amtNum) {
      computedStatus = 'Partially Paid';
    } else if (t.status === 'Fully Paid' || t.status === 'Paid' || (t.col_staff_paid && t.staff_paid) || (amtNum > 0 && paidNum >= amtNum)) {
      computedStatus = 'Fully Paid';
    } else if (t.col_staff_paid && !t.staff_paid) {
      computedStatus = 'Awaiting Staff';
    } else if (!t.col_staff_paid && t.staff_paid) {
      computedStatus = 'Awaiting Collection Staff';
    }

    return {
      metal: t.metal || 'Gold', id: t.id, customerId: t.customer_id, customerName: t.customer_name,
      customerPhone: t.customer_phone, customerAddress: t.customer_address, type: t.type || 'Service Fee',
      workType: t.work_type,
      amount: `₹${Number(t.amount).toLocaleString('en-IN')}`,
      date: t.date || (t.created_at ? new Date(t.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : ''),
      isoDate: t.iso_date || (t.created_at ? t.created_at.split('T')[0] : ''),
      timestamp: t.timestamp || (t.created_at ? new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''),
      status: computedStatus,
      colStaffPaid: !!t.col_staff_paid,
      staffPaid: !!t.staff_paid,
      paidAmount: paidNum,
      impureWeight: t.impure_weight, pureWeight: t.pure_weight, purityPercentage: t.purity_percentage, pieceType: t.piece_type,
      pointsCount: t.points_count, pointsType: t.points_type, caratMarking: t.carat_marking, details: t.details || '',
      createdBy: t.created_by,
      createdAt: t.created_at,
      isCashExchange: !!t.is_cash_exchange,
      taskId: t.task_id,
      staffSubmittedAt: t.staff_submitted_at,
      adminSubmittedAt: t.admin_submitted_at,
      cashRatePerGram: t.cash_rate_per_gram,
      cashAmount: t.cash_amount
    };
  });

  const taskEntries = tasksData.filter((task: any) => task.status === 'Completed' && !task.was_settlement_category && !task.wasSettlementCategory && !txTaskIds.has(task.id)).map((task: any) => {
    const dateStr = task.created_at ? new Date(task.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : task.date_given || '';
    const timeStr = task.created_at ? new Date(task.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
    const settlementVal = task.settlement_condition || '';
    const isCash = settlementVal.toLowerCase().includes('cash');
    let amount = '0';
    if (isCash && (task.cash_amount !== null && task.cash_amount !== undefined)) {
      amount = String(task.cash_amount);
    } else {
      const amountMatch = settlementVal.match(/[₹?](\d[\d,]*)/);
      amount = amountMatch ? amountMatch[1].replace(/,/g, '') : '0';
    }
    const isPaid = settlementVal.toLowerCase().includes('[collected]') || settlementVal.toLowerCase().includes('paid');

    const colStaffPaidVal = task.col_staff_paid !== null && task.col_staff_paid !== undefined ? !!task.col_staff_paid : isPaid;
    const staffPaidVal = task.staff_paid !== null && task.staff_paid !== undefined ? !!task.staff_paid : isPaid;

    let computedStatus = 'Unpaid';
    if (colStaffPaidVal && staffPaidVal) computedStatus = 'Fully Paid';
    else if (colStaffPaidVal && !staffPaidVal) computedStatus = 'Awaiting Staff';
    else if (!colStaffPaidVal && staffPaidVal) computedStatus = 'Awaiting Collection Staff';

    return {
      metal: task.metal || 'Gold',
      id: `TASK-${task.id}`,
      customerId: task.customer_id || 'CUST-COL',
      customerName: task.customer_name || 'Walk-in Customer',
      customerPhone: task.customer_phone,
      customerAddress: task.customer_address,
      type: settlementVal.toLowerCase().includes('upi') ? 'UPI' : (settlementVal.toLowerCase().includes('cash') ? 'Cash' : 'Service Fee'),
      workType: (task.work_type === 'Buy' || task.work_type === 'Sell') ? task.work_type : (task.work_type || 'Tunch'),
      amount: `₹${Number(amount).toLocaleString('en-IN')}`,
      date: dateStr,
      isoDate: task.created_at ? task.created_at.split('T')[0] : '',
      timestamp: timeStr,
      status: computedStatus,
      colStaffPaid: colStaffPaidVal,
      staffPaid: staffPaidVal,
      paidAmount: 0,
      impureWeight: task.impure_weight || task.total_weight,
      pureWeight: task.pure_weight,
      purityPercentage: task.purity,
      pieceType: task.product_type,
      pointsCount: task.point_suggestion ? parseInt(task.point_suggestion) : undefined,
      pointsType: task.metal === 'Silver' ? 'Silver' : 'Gold',
      caratMarking: task.carat,
      details: settlementVal,
      createdBy: task.created_by,
      createdAt: task.created_at,
      isCashExchange: isCash,
      taskId: task.id,
      staffSubmittedAt: task.staff_submitted_at,
      adminSubmittedAt: task.admin_submitted_at,
      cashRatePerGram: task.cash_rate_per_gram,
      cashAmount: task.cash_amount
    };
  });

  const merged = [...txEntries, ...taskEntries];
  merged.sort((a: any, b: any) => {
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return timeB - timeA;
  });
  return merged;
};

export const computeCollectionStaffBillingTransactions = (txData: any[], tasksData: any[]): any[] => {
  const txTaskIds = new Set<string>();
  const txEntries = txData.map((t: any) => {
    if (t.task_id) txTaskIds.add(t.task_id);
    const amtNum = Number(t.amount) || 0;
    const paidNum = Number(t.paid_amount || 0);
    let computedStatus = 'Unpaid';
    if (paidNum > 0 && paidNum < amtNum) {
      computedStatus = 'Partially Paid';
    } else if (t.status === 'Fully Paid' || t.status === 'Paid' || (t.col_staff_paid && t.staff_paid) || (amtNum > 0 && paidNum >= amtNum)) {
      computedStatus = 'Fully Paid';
    } else if (t.col_staff_paid && !t.staff_paid) {
      computedStatus = 'Awaiting Staff';
    } else if (!t.col_staff_paid && t.staff_paid) {
      computedStatus = 'Awaiting Collection Staff';
    }

    return {
      metal: t.metal || 'Gold', id: t.id, customerId: t.customer_id, customerName: t.customer_name,
      customerPhone: t.customer_phone, customerAddress: t.customer_address, type: t.type || 'Service Fee',
      workType: t.work_type,
      amount: Number(t.amount).toLocaleString('en-IN'),
      date: t.date || (t.created_at ? new Date(t.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : ''),
      isoDate: t.iso_date || (t.created_at ? t.created_at.split('T')[0] : ''),
      timestamp: t.timestamp || (t.created_at ? new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''),
      status: computedStatus,
      colStaffPaid: !!t.col_staff_paid,
      staffPaid: !!t.staff_paid,
      paidAmount: paidNum,
      impureWeight: t.impure_weight, pureWeight: t.pure_weight, purityPercentage: t.purity_percentage, pieceType: t.piece_type,
      pieces: t.pieces || '1',
      pointsCount: t.points_count, pointsType: t.points_type, caratMarking: t.carat_marking, details: t.details || '',
      createdBy: t.created_by,
      createdAt: t.created_at,
      isCashExchange: !!t.is_cash_exchange,
      taskId: t.task_id,
      staffSubmittedAt: t.staff_submitted_at,
      adminSubmittedAt: t.admin_submitted_at,
      cashRatePerGram: t.cash_rate_per_gram,
      cashAmount: t.cash_amount
    };
  });

  const taskEntries = tasksData.filter((task: any) => task.status === 'Completed' && !task.was_settlement_category && !task.wasSettlementCategory && !txTaskIds.has(task.id)).map((task: any) => {
    const dateStr = task.created_at ? new Date(task.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : task.date_given || '';
    const timeStr = task.created_at ? new Date(task.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
    const settlementVal = task.settlement_condition || '';
    const isCash = settlementVal.toLowerCase().includes('cash');
    let amount = '0';
    if (isCash && (task.cash_amount !== null && task.cash_amount !== undefined)) {
      amount = String(task.cash_amount);
    } else {
      const amountMatch = settlementVal.match(/[₹?](\d[\d,]*)/);
      amount = amountMatch ? amountMatch[1].replace(/,/g, '') : '0';
    }
    const isPaid = settlementVal.toLowerCase().includes('[collected]') || settlementVal.toLowerCase().includes('paid');

    const colStaffPaidVal = task.col_staff_paid !== null && task.col_staff_paid !== undefined ? !!task.col_staff_paid : isPaid;
    const staffPaidVal = task.staff_paid !== null && task.staff_paid !== undefined ? !!task.staff_paid : isPaid;

    let computedStatus = 'Unpaid';
    if (colStaffPaidVal && staffPaidVal) computedStatus = 'Fully Paid';
    else if (colStaffPaidVal && !staffPaidVal) computedStatus = 'Awaiting Staff';
    else if (!colStaffPaidVal && staffPaidVal) computedStatus = 'Awaiting Collection Staff';

    return {
      metal: task.metal || 'Gold',
      id: `TASK-${task.id}`,
      customerId: task.customer_id || 'CUST-COL',
      customerName: task.customer_name || 'Walk-in Customer',
      customerPhone: task.customer_phone,
      customerAddress: task.customer_address,
      type: settlementVal.toLowerCase().includes('upi') ? 'UPI' : (settlementVal.toLowerCase().includes('cash') ? 'Cash' : 'Service Fee'),
      workType: (task.work_type === 'Buy' || task.work_type === 'Sell') ? task.work_type : (task.work_type || 'Tunch'),
      amount: Number(amount).toLocaleString('en-IN'),
      date: dateStr,
      isoDate: task.created_at ? task.created_at.split('T')[0] : '',
      timestamp: timeStr,
      status: computedStatus,
      colStaffPaid: colStaffPaidVal,
      staffPaid: staffPaidVal,
      paidAmount: 0,
      impureWeight: task.impure_weight || task.total_weight,
      pureWeight: task.pure_weight,
      purityPercentage: task.purity,
      pieceType: task.product_type,
      pieces: task.pieces || '1',
      pointsCount: task.point_suggestion ? parseInt(task.point_suggestion) : undefined,
      pointsType: task.metal === 'Silver' ? 'Silver' : 'Gold',
      caratMarking: task.carat,
      details: settlementVal,
      createdBy: task.created_by,
      createdAt: task.created_at,
      isCashExchange: isCash,
      taskId: task.id,
      staffSubmittedAt: task.staff_submitted_at,
      adminSubmittedAt: task.admin_submitted_at,
      cashRatePerGram: task.cash_rate_per_gram,
      cashAmount: task.cash_amount
    };
  });

  const merged = [...txEntries, ...taskEntries];
  merged.sort((a: any, b: any) => {
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return timeB - timeA;
  });
  return merged;
};

export interface BehaviorAnalysis {
  score: number;
  level: 'Excellent' | 'Good' | 'Fine' | 'Poor' | 'Impossible';
  onTimeRate: number;
  avgDaysToPay: number;
  maxDelay: number;
  totalDuesCount: number;
  lateDuesCount: number;
  overdueDuesCount: number;
}

export const analyzeCustomerBehavior = (
  ledger: any[],
  payments: any[],
  policy: { excellent: number; good: number; fine: number; poor: number } = { excellent: 7, good: 14, fine: 30, poor: 60 }
): BehaviorAnalysis => {
  // Filter out payment receipts or zero-amount items
  const billingItems = ledger.filter(
    (t: any) => t.workType !== 'Dues Payment' && t.status !== 'Awaiting Staff' && t.status !== 'Awaiting Collection Staff'
  );

  if (billingItems.length === 0) {
    return {
      score: 100,
      level: 'Excellent',
      onTimeRate: 100,
      avgDaysToPay: 0,
      maxDelay: 0,
      totalDuesCount: 0,
      lateDuesCount: 0,
      overdueDuesCount: 0
    };
  }

  let totalDuesCount = 0;
  let onTimeDuesCount = 0;
  let lateDuesCount = 0;
  let overdueDuesCount = 0;
  
  let totalDaysToPay = 0;
  let resolvedDuesCount = 0;
  let maxDelay = 0;
  
  let scoreDeduction = 0;
  const now = new Date();

  billingItems.forEach((item: any) => {
    const createdDate = item.createdAt ? new Date(item.createdAt) : (item.isoDate ? new Date(item.isoDate) : now);
    const amtStr = typeof item.amount === 'string' ? item.amount.replace(/[^\d.]/g, '') : item.amount;
    const amt = parseFloat(amtStr) || 0;
    
    if (amt <= 0) return;

    totalDuesCount++;

    const isFullyPaid = item.status === 'Fully Paid';
    
    if (isFullyPaid) {
      // Find payments that cleared this item
      const matchingPayments = payments.filter((p: any) => {
        try {
          const allocs = typeof p.allocations === 'string' ? JSON.parse(p.allocations) : p.allocations;
          return Array.isArray(allocs) && allocs.some((a: any) => a.id === item.id);
        } catch {
          return false;
        }
      });

      if (matchingPayments.length === 0) {
        // Paid immediately
        onTimeDuesCount++;
        resolvedDuesCount++;
      } else {
        // Find latest payment date
        let latestPaymentDate = createdDate;
        matchingPayments.forEach((p: any) => {
          const pDate = new Date(p.created_at);
          if (pDate > latestPaymentDate) {
            latestPaymentDate = pDate;
          }
        });

        const diffTime = Math.max(0, latestPaymentDate.getTime() - createdDate.getTime());
        const days = Math.round(diffTime / (1000 * 60 * 60 * 24));
        
        totalDaysToPay += days;
        resolvedDuesCount++;

        if (days <= policy.excellent) {
          onTimeDuesCount++;
        } else {
          lateDuesCount++;
          const delay = days - policy.excellent;
          if (delay > maxDelay) maxDelay = delay;
          
          // Deduct based on limits
          if (days <= policy.good) scoreDeduction += 5;
          else if (days <= policy.fine) scoreDeduction += 12;
          else if (days <= policy.poor) scoreDeduction += 25;
          else scoreDeduction += 40;
        }
      }
    } else {
      // Unpaid / Partially Paid
      const diffTime = Math.max(0, now.getTime() - createdDate.getTime());
      const days = Math.round(diffTime / (1000 * 60 * 60 * 24));

      if (days <= policy.excellent) {
        onTimeDuesCount++;
      } else {
        overdueDuesCount++;
        const delay = days - policy.excellent;
        if (delay > maxDelay) maxDelay = delay;

        // Deduct based on overdue limits (higher penalty for current unpaid dues)
        if (days <= policy.good) scoreDeduction += 8;
        else if (days <= policy.fine) scoreDeduction += 20;
        else if (days <= policy.poor) scoreDeduction += 35;
        else scoreDeduction += 50;
      }
    }
  });

  const score = Math.max(0, Math.round(100 - scoreDeduction));
  
  let level: 'Excellent' | 'Good' | 'Fine' | 'Poor' | 'Impossible' = 'Excellent';
  if (score >= 90) level = 'Excellent';
  else if (score >= 75) level = 'Good';
  else if (score >= 55) level = 'Fine';
  else if (score >= 30) level = 'Poor';
  else level = 'Impossible';

  const onTimeRate = totalDuesCount > 0 ? Math.round((onTimeDuesCount / totalDuesCount) * 100) : 100;
  const avgDaysToPay = resolvedDuesCount > 0 ? Math.round((totalDaysToPay / resolvedDuesCount) * 10) / 10 : 0;

  return {
    score,
    level,
    onTimeRate,
    avgDaysToPay,
    maxDelay,
    totalDuesCount,
    lateDuesCount,
    overdueDuesCount
  };
};

