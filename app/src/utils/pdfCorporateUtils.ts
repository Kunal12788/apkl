import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { supabase } from '../supabaseClient';

// Custom vector diamond watermark
const drawDiamondWatermark = (doc: jsPDF, x: number, y: number, size: number) => {
  const origDraw = doc.getDrawColor();
  const origWidth = doc.getLineWidth();

  doc.setDrawColor(230, 235, 245);
  doc.setLineWidth(0.3);

  const half = size / 2;
  
  doc.line(x, y - half, x + half, y);
  doc.line(x + half, y, x, y + half);
  doc.line(x, y + half, x - half, y);
  doc.line(x - half, y, x, y - half);

  const cW = half * 0.45;
  const cH = half * 0.25;

  doc.line(x, y - half, x - cW, y - cH);
  doc.line(x, y - half, x + cW, y - cH);
  doc.line(x - cW, y - cH, x + cW, y - cH);

  doc.line(x - cW, y - cH, x - half, y);
  doc.line(x + cW, y - cH, x + half, y);

  doc.line(x - cW, y - cH, x, y + half);
  doc.line(x + cW, y - cH, x, y + half);

  doc.line(x - half, y, x + half, y);

  doc.setDrawColor(origDraw);
  doc.setLineWidth(origWidth);
};

const applyPageBackground = (doc: jsPDF, title: string, pageNum: number, totalPages: number) => {
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  drawDiamondWatermark(doc, pageWidth / 2, pageHeight / 2, 85);

  doc.setDrawColor(0, 30, 64, 0.1);
  doc.setLineWidth(0.4);
  doc.line(14, 18, pageWidth - 14, 18);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(110, 120, 135);
  doc.text('AURORA CORPORATE HEAD OFFICE • AUDIT STATEMENT', 14, 14);

  doc.setFont('helvetica', 'normal');
  doc.text(title.toUpperCase(), pageWidth - 14, 14, { align: 'right' });

  doc.line(14, pageHeight - 18, pageWidth - 14, pageHeight - 18);

  doc.text('CONFIDENTIAL • SYSTEM GENERATED CORPORATE LEDGER', 14, pageHeight - 13);
  doc.text(`PAGE ${pageNum} OF ${totalPages}`, pageWidth - 14, pageHeight - 13, { align: 'right' });
};

export const generateCorporatePDFReport = async (data: {
  saLedger: any[];
  allocations: any[];
  transactions: any[];
  tasks: any[];
  users: any[];
  branches: any[];
  branchReports: any[];
}) => {
  try {
    const { saLedger, allocations, transactions, tasks, users, branches, branchReports } = data;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    // Resolve user IDs to Names mapping
    const usersMap: Record<string, string> = users.reduce((acc, u) => {
      acc[u.id] = u.name;
      return acc;
    }, {} as Record<string, string>);

    // Resolve branch IDs to Names mapping
    const branchesMap: Record<string, string> = branches.reduce((acc, b) => {
      acc[b.id] = b.name;
      return acc;
    }, {} as Record<string, string>);

    // Compute live corporate balances
    const livePureGold = saLedger.reduce((sum, e) => sum + (Number(e.pureGoldChange) || 0), 0);
    const liveImpureGold = saLedger.reduce((sum, e) => sum + (Number(e.impureGoldChange) || 0), 0);
    const livePureSilver = saLedger.reduce((sum, e) => sum + (Number(e.pureSilverChange) || 0), 0);
    const liveImpureSilver = saLedger.reduce((sum, e) => sum + (Number(e.impureSilverChange) || 0), 0);
    const liveCash = saLedger.reduce((sum, e) => sum + (Number(e.cashChange) || 0), 0);

    // Compute allocation aggregates (Head Office allocations where staff_id is null)
    const hoAllocations = allocations.filter(a => a.staff_id === null || !a.staff_id);
    const allocatedCash = hoAllocations.reduce((sum, a) => sum + (Number(a.cash_amount) || 0), 0);
    const allocatedGold = hoAllocations.filter(a => a.metal === 'Gold').reduce((sum, a) => sum + (Number(a.pure_weight) || 0), 0);
    const allocatedSilver = hoAllocations.filter(a => a.metal === 'Silver').reduce((sum, a) => sum + (Number(a.pure_weight) || 0), 0);

    // Compute task counts (Completed ones)
    const completedTasks = tasks.filter(t => t.status === 'Completed');
    const tunchCount = completedTasks.filter(t => !t.work_type || t.work_type === 'Tunch').reduce((sum, t) => sum + (parseInt(t.pieces || '1') || 1), 0);
    const markingCount = completedTasks.filter(t => t.work_type === 'Marking').reduce((sum, t) => sum + (parseInt(t.pieces || '1') || 1), 0);
    const shoulderingCount = completedTasks.filter(t => t.work_type === 'Shouldering').reduce((sum, t) => sum + (parseInt(t.pieces || '1') || 1), 0);
    const buyCount = completedTasks.filter(t => t.work_type === 'Buy').reduce((sum, t) => sum + (parseInt(t.pieces || '1') || 1), 0);
    const sellCount = completedTasks.filter(t => t.work_type === 'Sell').reduce((sum, t) => sum + (parseInt(t.pieces || '1') || 1), 0);

    // -------------------------------------------------------------------------
    // PAGE 1: TITLE PAGE & EXECUTIVE DASHBOARD
    // -------------------------------------------------------------------------
    // Solid Sapphire Blue Banner Header
    doc.setFillColor(0, 30, 64);
    doc.rect(0, 0, pageWidth, 42, 'F');

    // Title
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('AURORA DIVINE', 14, 18);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(200, 210, 225);
    doc.text('CONSOLIDATED AUDIT & CORPORATE LEDGER STATEMENT', 14, 25);
    doc.text(`COMPILED ON: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}`, 14, 32);

    // Title Page Border Decor
    doc.setDrawColor(212, 175, 55); // Gold Accent Line
    doc.setLineWidth(1.5);
    doc.line(0, 42, pageWidth, 42);

    // Grid 1: Live Head-Office Stock Balances
    doc.setTextColor(0, 30, 64);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('LIVE HEAD OFFICE STOCK BALANCES', 14, 55);

    doc.setDrawColor(0, 30, 64, 0.1);
    doc.setLineWidth(0.4);
    doc.rect(14, 60, pageWidth - 28, 38);

    doc.setTextColor(50, 50, 50);
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`Pure Gold Balance: ${livePureGold.toFixed(3)} g`, 20, 68);
    doc.text(`Impure Gold Balance: ${liveImpureGold.toFixed(3)} g`, 20, 76);
    doc.text(`Pure Silver Balance: ${livePureSilver.toFixed(3)} g`, 20, 84);
    doc.text(`Impure Silver Balance: ${liveImpureSilver.toFixed(3)} g`, 120, 68);
    doc.text(`Super Cash Stock: ₹${liveCash.toLocaleString('en-IN')}`, 120, 76);

    // Grid 2: Branch Allocations & Operations Summary
    doc.setTextColor(0, 30, 64);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('BRANCH ALLOCATIONS & OPERATIONAL SUMMARY', 14, 110);

    doc.rect(14, 115, pageWidth - 28, 42);

    doc.setTextColor(50, 50, 50);
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total Gold Allocated: ${allocatedGold.toFixed(3)} g`, 20, 123);
    doc.text(`Total Silver Allocated: ${allocatedSilver.toFixed(3)} g`, 20, 131);
    doc.text(`Total Cash Allocated: ₹${allocatedCash.toLocaleString('en-IN')}`, 20, 139);
    
    doc.text(`Total Tunch Assays: ${tunchCount} pieces`, 120, 123);
    doc.text(`Total Laser Markings: ${markingCount} pieces`, 120, 131);
    doc.text(`Total Soldering Jobs: ${shoulderingCount} pieces`, 120, 139);
    doc.text(`Bullion Trade Volume: ${buyCount + sellCount} deals (Buy: ${buyCount} / Sell: ${sellCount})`, 20, 147);

    // Metadata & Sign-off Info
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(8.5);
    doc.text('This statement provides a verified log of corporate stock adjustments, branch dispatches, and daily processing queues.', 14, 175);
    doc.text('Authorized Super Admin digital verification active.', 14, 180);

    // -------------------------------------------------------------------------
    // PAGE 2: CORPORATE STOCK HISTORY
    // -------------------------------------------------------------------------
    doc.addPage();
    doc.setTextColor(0, 30, 64);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('CORPORATE STOCK ADJUSTMENTS LEDGER', 14, 28);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('Historical log of allocations, refining returns, and corporate stock setup/corrections.', 14, 34);

    const saLedgerData = saLedger.map((e: any) => {
      const gPure = e.pureGoldChange !== 0 ? `${e.pureGoldChange > 0 ? '+' : ''}${e.pureGoldChange.toFixed(3)}g` : '-';
      const gImpure = e.impureGoldChange !== 0 ? `${e.impureGoldChange > 0 ? '+' : ''}${e.impureGoldChange.toFixed(3)}g` : '-';
      const sPure = e.pureSilverChange !== 0 ? `${e.pureSilverChange > 0 ? '+' : ''}${e.pureSilverChange.toFixed(3)}g` : '-';
      const sImpure = e.impureSilverChange !== 0 ? `${e.impureSilverChange > 0 ? '+' : ''}${e.impureSilverChange.toFixed(3)}g` : '-';
      const cash = e.cashChange !== 0 ? `${e.cashChange > 0 ? '+' : ''}₹${e.cashChange.toLocaleString('en-IN')}` : '-';
      return [
        e.date || e.isoDate || '-',
        e.type || '-',
        e.branchName || 'HEAD-OFFICE',
        gPure,
        gImpure,
        sPure,
        sImpure,
        cash,
        e.details || ''
      ];
    });

    autoTable(doc, {
      startY: 38,
      margin: { top: 25, bottom: 25 },
      head: [['Date', 'Type', 'Branch/Source', 'Gold Pure', 'Gold Imp', 'Silver Pure', 'Silver Imp', 'Cash Change', 'Details']],
      body: saLedgerData.length > 0 ? saLedgerData : [['-', '-', '-', '-', '-', '-', '-', '-', 'No stock adjustments recorded']],
      theme: 'grid',
      headStyles: { fillColor: [0, 30, 64], textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
      styles: { fontSize: 6.8, textColor: [40, 40, 40], cellPadding: 1.2, overflow: 'linebreak' },
      columnStyles: { 0: { cellWidth: 16 }, 1: { cellWidth: 20 }, 2: { cellWidth: 18 }, 8: { cellWidth: 40 } }
    });

    // -------------------------------------------------------------------------
    // PAGE 3: BRANCH ALLOCATIONS
    // -------------------------------------------------------------------------
    doc.addPage();
    doc.setTextColor(0, 30, 64);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('BRANCH STOCK ALLOCATIONS', 14, 28);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('Corporate gold, silver, and cash allocations dispatched to active branch offices.', 14, 34);

    const allocationData = allocations.map((a: any) => {
      const staffName = usersMap[a.staff_id] || 'Branch Stock';
      return [
        a.date || a.iso_date || '-',
        a.id || '-',
        branchesMap[a.branch_id] || a.branch_name || a.branch_id || '-',
        staffName,
        a.metal || 'Gold',
        a.pure_weight ? `${Number(a.pure_weight).toFixed(3)}g` : '-',
        a.cash_amount ? `₹${Number(a.cash_amount).toLocaleString('en-IN')}` : '-',
        a.notes || ''
      ];
    });

    autoTable(doc, {
      startY: 38,
      margin: { top: 25, bottom: 25 },
      head: [['Date', 'Alloc ID', 'Branch', 'Assigned To', 'Metal', 'Pure Weight', 'Cash Allocated', 'Notes']],
      body: allocationData.length > 0 ? allocationData : [['-', '-', '-', '-', '-', '-', '-', 'No branch allocations found']],
      theme: 'grid',
      headStyles: { fillColor: [0, 30, 64], textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
      styles: { fontSize: 6.8, textColor: [40, 40, 40], cellPadding: 1.2, overflow: 'linebreak' },
      columnStyles: { 0: { cellWidth: 18 }, 1: { cellWidth: 18 }, 7: { cellWidth: 45 } }
    });

    // -------------------------------------------------------------------------
    // PAGE 4: OPERATIONS & PROCESS TASKS
    // -------------------------------------------------------------------------
    doc.addPage();
    doc.setTextColor(0, 30, 64);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('COMPLETED OPERATIONS & INTAKE TASKS', 14, 28);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('Detailed logs of completed assaying (Tunch), marking, and shouldering tasks.', 14, 34);

    const taskData = completedTasks.map((t: any) => {
      const type = t.work_type || 'Tunch';
      const staffName = usersMap[t.assigned_to] || t.assigned_to || 'N/A';
      const wt = t.work_type === 'Tunch' ? (t.impure_weight || t.weight || '-') : (t.total_weight || t.weight || '-');
      const pWt = t.pure_weight ? `${t.pure_weight}g` : '-';
      const purity = t.purity ? `${t.purity}%` : '-';
      const feeVal = t.settlement_condition?.includes('Collected') 
        ? t.settlement_condition.split('₹')[1] || '0'
        : '0';
      return [
        t.date_given || '-',
        t.id || '-',
        t.customer_name || 'Walk-in',
        type,
        t.metal || 'Gold',
        wt ? `${wt}g` : '-',
        purity,
        pWt,
        feeVal !== '0' ? `₹${feeVal}` : '-',
        staffName
      ];
    });

    autoTable(doc, {
      startY: 38,
      margin: { top: 25, bottom: 25 },
      head: [['Date', 'Job ID', 'Customer', 'Type', 'Metal', 'Intake Wt', 'Purity', 'Pure Weight', 'Fee Charged', 'Handled By']],
      body: taskData.length > 0 ? taskData : [['-', '-', '-', '-', '-', '-', '-', '-', '-', 'No completed tasks found']],
      theme: 'grid',
      headStyles: { fillColor: [0, 30, 64], textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
      styles: { fontSize: 6.8, textColor: [40, 40, 40], cellPadding: 1.2, overflow: 'linebreak' },
      columnStyles: { 0: { cellWidth: 16 }, 1: { cellWidth: 16 }, 2: { cellWidth: 20 }, 9: { cellWidth: 20 } }
    });

    // -------------------------------------------------------------------------
    // PAGE 5: FINANCIAL TRANSACTIONS
    // -------------------------------------------------------------------------
    doc.addPage();
    doc.setTextColor(0, 30, 64);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('CLIENT BILLINGS & CASH FLOW LEDGER', 14, 28);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('Complete transaction ledger of cash receipts, settlements, and bullion payouts.', 14, 34);

    const txData = transactions.map((t: any) => {
      const amountVal = Number(t.amount || 0);
      const isOut = Number(t.cash_paid || 0) > 0 || t.work_type === 'Sell';
      const staffName = usersMap[t.created_by] || t.created_by || 'N/A';
      return [
        t.date || '-',
        t.id || '-',
        t.customer_name || 'Walk-in',
        t.work_type || t.type || 'Service Fee',
        t.metal || 'Gold',
        t.pure_weight ? `${t.pure_weight}g` : '-',
        t.cash_rate_per_gram ? `₹${t.cash_rate_per_gram}` : '-',
        `₹${amountVal.toLocaleString('en-IN')}`,
        isOut ? 'Cash Out' : 'Cash In',
        staffName
      ];
    });

    autoTable(doc, {
      startY: 38,
      margin: { top: 25, bottom: 25 },
      head: [['Date', 'Tx ID', 'Customer', 'Operation', 'Metal', 'Pure Wt', 'Rate/g', 'Amount', 'Flow Direction', 'Handled By']],
      body: txData.length > 0 ? txData : [['-', '-', '-', '-', '-', '-', '-', '-', '-', 'No billing transactions found']],
      theme: 'grid',
      headStyles: { fillColor: [0, 30, 64], textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
      styles: { fontSize: 6.8, textColor: [40, 40, 40], cellPadding: 1.2, overflow: 'linebreak' },
      columnStyles: { 0: { cellWidth: 16 }, 1: { cellWidth: 16 }, 2: { cellWidth: 20 }, 9: { cellWidth: 20 } }
    });

    // -------------------------------------------------------------------------
    // PAGE 6: BRANCH END-OF-DAY REPORTS
    // -------------------------------------------------------------------------
    doc.addPage();
    doc.setTextColor(0, 30, 64);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('BRANCH END-OF-DAY CLOSURES', 14, 28);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('Daily end-of-day balances and material usage summaries reported by branches.', 14, 34);

    const reportData = branchReports.map((r: any) => {
      return [
        r.iso_date || '-',
        r.branch_name || r.branch_id || '-',
        r.gold_used ? `${Number(r.gold_used).toFixed(3)}g` : '-',
        r.silver_used ? `${Number(r.silver_used).toFixed(3)}g` : '-',
        r.cash_used ? `₹${Number(r.cash_used).toLocaleString('en-IN')}` : '-',
        r.closing_pure_gold ? `${Number(r.closing_pure_gold).toFixed(3)}g` : '-',
        r.closing_pure_silver ? `${Number(r.closing_pure_silver).toFixed(3)}g` : '-',
        r.closing_cash ? `₹${Number(r.closing_cash).toLocaleString('en-IN')}` : '-',
        r.status || 'Approved'
      ];
    });

    autoTable(doc, {
      startY: 38,
      margin: { top: 25, bottom: 25 },
      head: [['Date', 'Branch', 'Gold Used', 'Silver Used', 'Cash Paid', 'Closing Gold', 'Closing Silver', 'Closing Cash', 'Status']],
      body: reportData.length > 0 ? reportData : [['-', '-', '-', '-', '-', '-', '-', '-', 'No daily closures submitted']],
      theme: 'grid',
      headStyles: { fillColor: [0, 30, 64], textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
      styles: { fontSize: 6.8, textColor: [40, 40, 40], cellPadding: 1.2, overflow: 'linebreak' },
      columnStyles: { 0: { cellWidth: 18 }, 1: { cellWidth: 22 } }
    });

    // -------------------------------------------------------------------------
    // PAGE 7: REFINING TRANSFERS & MELT QUEUE
    // -------------------------------------------------------------------------
    doc.addPage();
    doc.setTextColor(0, 30, 64);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('REFINING MELT QUEUE & DISPATCHES', 14, 28);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('Log of branch transfers of accumulated impure scrap gold & silver dispatched to the refinery.', 14, 34);

    // Fetch refining transfers (both pending and processed)
    const { data: allTransfers } = await supabase
      .from('refining_transfers')
      .select('*')
      .order('date_sent', { ascending: false });

    const transfersList = allTransfers || [];
    const refiningData = transfersList.map((t: any) => {
      const sentWt = t.metal === 'Silver' ? (Number(t.impure_silver_sent || 0)) : (Number(t.impure_gold_sent || 0));
      const calcWt = t.metal === 'Silver' ? (Number(t.calculated_pure_silver || 0)) : (Number(t.calculated_pure_gold || 0));
      const actWt = t.metal === 'Silver' ? t.refined_pure_silver_achieved : t.refined_pure_achieved;
      return [
        t.date_sent || '-',
        t.id || '-',
        t.branch_name || t.branch_id || '-',
        t.metal || 'Gold',
        `${sentWt.toFixed(3)}g`,
        `${calcWt.toFixed(3)}g`,
        actWt ? `${Number(actWt).toFixed(3)}g` : '-',
        t.status || 'Pending'
      ];
    });

    autoTable(doc, {
      startY: 38,
      margin: { top: 25, bottom: 25 },
      head: [['Date Sent', 'Transfer ID', 'Origin Branch', 'Metal', 'Impure Sent', 'Target Yield', 'Actual Yield', 'Status']],
      body: refiningData.length > 0 ? refiningData : [['-', '-', '-', '-', '-', '-', '-', 'No refining transfers found']],
      theme: 'grid',
      headStyles: { fillColor: [0, 30, 64], textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
      styles: { fontSize: 6.8, textColor: [40, 40, 40], cellPadding: 1.2, overflow: 'linebreak' },
      columnStyles: { 0: { cellWidth: 20 }, 1: { cellWidth: 20 }, 2: { cellWidth: 22 } }
    });

    // -------------------------------------------------------------------------
    // POST-GENERATION PASS: APPLY BACKGROUND, WATERMARKS, HEADERS, FOOTERS
    // -------------------------------------------------------------------------
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      
      let pageTitle = 'Executive Summary';
      if (i === 2) pageTitle = 'Corporate Ledger';
      else if (i === 3) pageTitle = 'Branch Allocations';
      else if (i === 4) pageTitle = 'Process Operations';
      else if (i === 5) pageTitle = 'Client Billings';
      else if (i === 6) pageTitle = 'Daily Closures';
      else if (i === 7) pageTitle = 'Refining Queue';
      
      applyPageBackground(doc, pageTitle, i, totalPages);
    }

    // Save PDF
    const fileName = `Aurora_Corporate_Audit_${new Date().toISOString().split('T')[0]}.pdf`;
    if (Capacitor.isNativePlatform()) {
      const pdfBase64 = doc.output('datauristring').split(',')[1];
      const writeResult = await Filesystem.writeFile({
        path: fileName,
        data: pdfBase64,
        directory: Directory.Documents
      });
      await Share.share({
        title: 'Aurora Corporate Audit',
        url: writeResult.uri,
        dialogTitle: 'Share Aurora Corporate Ledger Statement'
      });
    } else {
      doc.save(fileName);
    }
  } catch (err) {
    console.error('Error generating corporate PDF report:', err);
    throw err;
  }
};
