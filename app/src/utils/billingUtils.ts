export const computeStaffBillingTransactions = (txData: any[], tasksData: any[]): any[] => {
  const txTaskIds = new Set<string>();
  const txEntries = txData.map((t: any) => {
    if (t.task_id) txTaskIds.add(t.task_id);
    let computedStatus = 'Unpaid';
    if (t.status === 'Fully Paid' || t.status === 'Paid' || (t.col_staff_paid && t.staff_paid)) computedStatus = 'Fully Paid';
    else if (t.col_staff_paid && !t.staff_paid) computedStatus = 'Awaiting Staff';
    else if (!t.col_staff_paid && t.staff_paid) computedStatus = 'Awaiting Collection Staff';

    return {
      metal: t.metal || 'Gold', id: t.id, customerId: t.customer_id, customerName: t.customer_name,
      customerPhone: t.customer_phone, customerAddress: t.customer_address, type: t.type || 'Service Fee', workType: t.work_type,
      amount: `₹${Number(t.amount).toLocaleString('en-IN')}`,
      date: t.date || (t.created_at ? new Date(t.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : ''),
      isoDate: t.iso_date || (t.created_at ? t.created_at.split('T')[0] : ''),
      timestamp: t.timestamp || (t.created_at ? new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''),
      status: computedStatus,
      colStaffPaid: !!t.col_staff_paid,
      staffPaid: !!t.staff_paid,
      impureWeight: t.impure_weight, pureWeight: t.pure_weight, purityPercentage: t.purity_percentage, pieceType: t.piece_type,
      pointsCount: t.points_count, pointsType: t.points_type, caratMarking: t.carat_marking, details: t.details || ''
    };
  });

  const taskEntries = tasksData.filter((task: any) => task.status === 'Completed' && !txTaskIds.has(task.id)).map((task: any) => {
    const dateStr = task.created_at ? new Date(task.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : task.date_given || '';
    const timeStr = task.created_at ? new Date(task.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
    const settlementVal = task.settlement_condition || '';
    const amountMatch = settlementVal.match(/[₹?](\d[\d,]*)/);
    const amount = amountMatch ? amountMatch[1].replace(/,/g, '') : '0';
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
      type: 'Service Fee',
      workType: task.work_type || 'Tunch',
      amount: `₹${Number(amount).toLocaleString('en-IN')}`,
      date: dateStr,
      isoDate: task.created_at ? task.created_at.split('T')[0] : '',
      timestamp: timeStr,
      status: computedStatus,
      colStaffPaid: colStaffPaidVal,
      staffPaid: staffPaidVal,
      impureWeight: task.impure_weight || task.total_weight,
      pureWeight: task.pure_weight,
      purityPercentage: task.purity,
      pieceType: task.product_type,
      pointsCount: task.point_suggestion ? parseInt(task.point_suggestion) : undefined,
      pointsType: task.metal === 'Silver' ? 'Silver' : 'Gold',
      caratMarking: task.carat,
      details: settlementVal
    };
  });

  return [...txEntries, ...taskEntries];
};

export const computeCollectionStaffBillingTransactions = (txData: any[], tasksData: any[]): any[] => {
  const txTaskIds = new Set<string>();
  const txEntries = txData.map((t: any) => {
    if (t.task_id) txTaskIds.add(t.task_id);
    let computedStatus = 'Unpaid';
    if (t.status === 'Fully Paid' || t.status === 'Paid' || (t.col_staff_paid && t.staff_paid)) computedStatus = 'Fully Paid';
    else if (t.col_staff_paid && !t.staff_paid) computedStatus = 'Awaiting Staff';
    else if (!t.col_staff_paid && t.staff_paid) computedStatus = 'Awaiting Collection Staff';

    return {
      metal: t.metal || 'Gold', id: t.id, customerId: t.customer_id, customerName: t.customer_name,
      customerPhone: t.customer_phone, customerAddress: t.customer_address, type: t.type || 'Service Fee', workType: t.work_type,
      amount: Number(t.amount).toLocaleString('en-IN'),
      date: t.date || (t.created_at ? new Date(t.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : ''),
      isoDate: t.iso_date || (t.created_at ? t.created_at.split('T')[0] : ''),
      timestamp: t.timestamp || (t.created_at ? new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''),
      status: computedStatus,
      colStaffPaid: !!t.col_staff_paid,
      staffPaid: !!t.staff_paid,
      impureWeight: t.impure_weight, pureWeight: t.pure_weight, purityPercentage: t.purity_percentage, pieceType: t.piece_type,
      pieces: t.pieces || '1',
      pointsCount: t.points_count, pointsType: t.points_type, caratMarking: t.carat_marking, details: t.details || '',
      createdBy: t.created_by
    };
  });

  const taskEntries = tasksData.filter((task: any) => task.status === 'Completed' && !txTaskIds.has(task.id)).map((task: any) => {
    const dateStr = task.created_at ? new Date(task.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : task.date_given || '';
    const timeStr = task.created_at ? new Date(task.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
    const settlementVal = task.settlement_condition || '';
    const amountMatch = settlementVal.match(/[₹?](\d[\d,]*)/);
    const amount = amountMatch ? amountMatch[1].replace(/,/g, '') : '0';
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
      type: 'Service Fee',
      workType: task.work_type || 'Tunch',
      amount: Number(amount).toLocaleString('en-IN'),
      date: dateStr,
      isoDate: task.created_at ? task.created_at.split('T')[0] : '',
      timestamp: timeStr,
      status: computedStatus,
      colStaffPaid: colStaffPaidVal,
      staffPaid: staffPaidVal,
      impureWeight: task.impure_weight || task.total_weight,
      pureWeight: task.pure_weight,
      purityPercentage: task.purity,
      pieceType: task.product_type,
      pieces: task.pieces || '1',
      pointsCount: task.point_suggestion ? parseInt(task.point_suggestion) : undefined,
      pointsType: task.metal === 'Silver' ? 'Silver' : 'Gold',
      caratMarking: task.carat,
      details: settlementVal,
      createdBy: task.created_by
    };
  });

  return [...txEntries, ...taskEntries];
};
