import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import toast from 'react-hot-toast';

// Custom vector diamond watermark
const drawDiamondWatermark = (doc: jsPDF, x: number, y: number, size: number) => {
  const origDraw = doc.getDrawColor();
  const origWidth = doc.getLineWidth();

  // Set very light sapphire tint
  doc.setDrawColor(230, 235, 245);
  doc.setLineWidth(0.3);

  const half = size / 2;
  
  // Outer Diamond border
  doc.line(x, y - half, x + half, y);
  doc.line(x + half, y, x, y + half);
  doc.line(x, y + half, x - half, y);
  doc.line(x - half, y, x, y - half);

  // Facet details
  const cW = half * 0.45;
  const cH = half * 0.25;

  // Upper crown facets
  doc.line(x, y - half, x - cW, y - cH);
  doc.line(x, y - half, x + cW, y - cH);
  doc.line(x - cW, y - cH, x + cW, y - cH);

  // Side facets
  doc.line(x - cW, y - cH, x - half, y);
  doc.line(x + cW, y - cH, x + half, y);

  // Lower pavilion facets
  doc.line(x - cW, y - cH, x, y + half);
  doc.line(x + cW, y - cH, x, y + half);

  // Girdle line
  doc.line(x - half, y, x + half, y);

  // Reset drawing states
  doc.setDrawColor(origDraw);
  doc.setLineWidth(origWidth);
};

const applyPageBackground = (doc: jsPDF, title: string, pageNum: number, totalPages: number) => {
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  // Watermark
  drawDiamondWatermark(doc, pageWidth / 2, pageHeight / 2, 85);

  // Header separator line
  doc.setDrawColor(0, 30, 64, 0.1);
  doc.setLineWidth(0.4);
  doc.line(14, 18, pageWidth - 14, 18);

  // Header text
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(110, 120, 135);
  doc.text('AURORA DIVINE • TRANSACTION STATEMENT', 14, 14);

  // Section Indicator
  doc.setFont('helvetica', 'normal');
  doc.text(title.toUpperCase(), pageWidth - 14, 14, { align: 'right' });

  // Footer line
  doc.line(14, pageHeight - 18, pageWidth - 14, pageHeight - 18);

  // Footer text
  doc.text('CONFIDENTIAL • SYSTEM GENERATED CLIENT LEDGER', 14, pageHeight - 13);
  doc.text(`PAGE ${pageNum} OF ${totalPages}`, pageWidth - 14, pageHeight - 13, { align: 'right' });
};

export const generateCustomerPDFReport = async (
  customer: any,
  behavior: any,
  usersMap: Record<string, any> = {},
  reportType: 'super_admin' | 'customer' = 'customer'
) => {
  try {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    
    // -------------------------------------------------------------------------
    // PAGE 1: EXECUTIVE PROFILE & METRICS SUMMARY
    // -------------------------------------------------------------------------
    
    // Brand Banner
    doc.setFillColor(0, 30, 64); // #001e40
    doc.rect(0, 0, pageWidth, 42, 'F');
    
    // Aurora Branding Logo / Title
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(26);
    doc.setFont('helvetica', 'bold');
    doc.text('AURORA DIVINE', pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('PREMIUM CLIENT LEDGER STATEMENT', pageWidth / 2, 30, { align: 'center' });
    doc.text(`Generated: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`, pageWidth / 2, 36, { align: 'center' });

    // Section 1: Customer Details
    doc.setTextColor(0, 30, 64);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('CLIENT PROFILE DETAILS', 14, 55);
    
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    
    doc.text(`Client ID: ${customer?.id || 'N/A'}`, 14, 63);
    doc.text(`Name: ${customer?.name || 'Unknown'}`, 14, 69);
    doc.text(`Contact: ${customer?.phone || 'N/A'}`, 14, 75);
    doc.text(`Location: ${customer?.address || 'N/A'}`, 14, 81);

    // Section 2: Account Overview Metrics
    doc.setTextColor(0, 30, 64);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('FINANCIAL OVERVIEW', 120, 55);

    doc.setTextColor(50, 50, 50);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    
    doc.text(`Outstanding Dues: ${customer?.outstanding || '₹0'}`, 120, 63);
    doc.text(`Total Paid / Settled: ${customer?.paid || '₹0'}`, 120, 69);
    doc.text(`Active Billing Jobs: ${customer?.activeJobs || 0}`, 120, 75);

    // Section 3: Lifetime Trade Calculations
    let goldBought = 0; // Sell to customer
    let goldSold = 0;   // Buy from customer
    let silverBought = 0;
    let silverSold = 0;

    const ledger = customer.ledger || [];
    ledger.forEach((txn: any) => {
      const isGold = txn.metal === 'Gold';
      const isSilver = txn.metal === 'Silver';
      const pure = parseFloat(String(txn.pureWeight || '0').replace(/[^\d.]/g, '')) || 0;

      if (txn.workType === 'Sell') {
        if (isGold) goldBought += pure;
        if (isSilver) silverBought += pure;
      } else if (txn.workType === 'Buy') {
        if (isGold) goldSold += pure;
        if (isSilver) silverSold += pure;
      }
    });

    doc.setTextColor(0, 30, 64);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('LIFETIME TRADE VOLUME', 14, 95);

    doc.setTextColor(50, 50, 50);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Pure Gold Bought (From Store): ${goldBought.toFixed(3)} g`, 14, 103);
    doc.text(`Pure Gold Sold (To Store): ${goldSold.toFixed(3)} g`, 14, 109);
    doc.text(`Pure Silver Bought (From Store): ${silverBought.toFixed(3)} g`, 14, 115);
    doc.text(`Pure Silver Sold (To Store): ${silverSold.toFixed(3)} g`, 14, 121);

    // Section 4: Work Breakdown Counters
    doc.setTextColor(0, 30, 64);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('JOB SEGMENTATION', 120, 95);

    doc.setTextColor(50, 50, 50);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Assaying / Tunch Jobs: ${customer?.workBreakdown?.tunch || 0}`, 120, 103);
    doc.text(`Hallmarking / Marking Jobs: ${customer?.workBreakdown?.marking || 0}`, 120, 109);
    doc.text(`Soldering / Shouldering Jobs: ${customer?.workBreakdown?.shouldering || 0}`, 120, 115);

    // Conditionally Render Behavior Profile (Only if Super Admin Report is Selected)
    if (reportType === 'super_admin') {
      doc.setTextColor(0, 30, 64);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('CREDIT RISK & PAYMENT BEHAVIOR PROFILE', 14, 138);

      doc.setDrawColor(0, 30, 64, 0.1);
      doc.rect(14, 143, pageWidth - 28, 35);

      doc.setTextColor(50, 50, 50);
      doc.setFontSize(9.5);
      doc.text(`Client Credit Score: ${behavior?.score || 0} / 100`, 18, 149);
      doc.text(`On-Time Settlement Rate: ${behavior?.onTimeRate || 0}%`, 18, 156);
      doc.text(`Average Settlement Delay: ${behavior?.avgDaysToPay || 0} days`, 18, 163);
      doc.text(`Maximum Settlement Delay: ${behavior?.maxDelay || 0} days`, 18, 170);

      // Warning text based on rating
      let warningText = '';
      doc.setFont('helvetica', 'bold');
      if (behavior?.level === 'Excellent') {
        doc.setTextColor(16, 124, 65); // Emerald Green
        warningText = 'EXCELLENT: Low risk client. High payment reliability.';
      } else if (behavior?.level === 'Good') {
        doc.setTextColor(13, 148, 136); // Teal
        warningText = 'GOOD: Consistent clearance habits with low delay metrics.';
      } else if (behavior?.level === 'Fine') {
        doc.setTextColor(180, 83, 9); // Amber
        warningText = 'SATISFACTORY: General compliance, moderate delay observed.';
      } else {
        doc.setTextColor(220, 38, 38); // Red
        warningText = 'HIGH RISK: Substantial delays detected. Enforce payment before further intake.';
      }
      doc.text(warningText, 18, 174);
      doc.setFont('helvetica', 'normal');
    }

    // -------------------------------------------------------------------------
    // PAGE 2: TUNCH WORK HISTORY
    // -------------------------------------------------------------------------
    doc.addPage();
    doc.setTextColor(0, 30, 64);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('ASSAYING & PURITY TESTING (TUNCH WORK)', 14, 28);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('Comprehensive list of purity assaying jobs performed for this client.', 14, 34);

    const tunchItems = ledger.filter((txn: any) => txn.workType === 'Tunch');
    const tunchData = tunchItems.map((txn: any) => {
      const creator = usersMap[txn.createdBy]?.name || txn.createdBy || 'System';
      const clearance = txn.status === 'Fully Paid' 
        ? `Paid (${txn.adminSubmittedAt || txn.staffSubmittedAt || 'Approved'})`
        : txn.status;
      return [
        `${txn.date} ${txn.timestamp}`,
        txn.id,
        txn.metal || 'Gold',
        txn.impureWeight || '0.000 g',
        txn.purityPercentage ? `${txn.purityPercentage}%` : 'N/A',
        txn.pureWeight ? `${txn.pureWeight}g` : 'N/A',
        txn.amount || '0',
        clearance,
        creator
      ];
    });

    autoTable(doc, {
      startY: 38,
      margin: { top: 25, bottom: 25 },
      head: [['Date & Time', 'Job ID', 'Metal', 'Impure Wt', 'Purity', 'Pure Wt', 'Fee', 'Clearance Status', 'Assayed By']],
      body: tunchData.length > 0 ? tunchData : [['-', 'No assaying / tunch records found', '-', '-', '-', '-', '-', '-', '-']],
      theme: 'grid',
      headStyles: { fillColor: [0, 30, 64], textColor: 255, fontStyle: 'bold', fontSize: 8 },
      styles: { fontSize: 7.5, textColor: [40, 40, 40] },
      columnStyles: { 1: { cellWidth: 20 }, 7: { cellWidth: 28 } }
    });

    // -------------------------------------------------------------------------
    // PAGE 3: MARKING & SHOULDERING LEDGER
    // -------------------------------------------------------------------------
    doc.addPage();
    doc.setTextColor(0, 30, 64);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('HALLMARKING, LASER MARKING & SHOULDERING', 14, 28);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('Detailed logs of laser marking and soldering processes.', 14, 34);

    const markingItems = ledger.filter((txn: any) => txn.workType === 'Marking' || txn.workType === 'Shouldering');
    const markingData = markingItems.map((txn: any) => {
      const creator = usersMap[txn.createdBy]?.name || txn.createdBy || 'System';
      const clearance = txn.status === 'Fully Paid' 
        ? `Paid (${txn.adminSubmittedAt || txn.staffSubmittedAt || 'Approved'})`
        : txn.status;
      return [
        `${txn.date} ${txn.timestamp}`,
        txn.id,
        txn.workType,
        txn.pieceType || 'N/A',
        txn.caratMarking || 'N/A',
        txn.pointsCount ? `${txn.pointsCount} (${txn.pointsType || 'Gold'})` : 'N/A',
        txn.amount || '0',
        clearance,
        creator
      ];
    });

    autoTable(doc, {
      startY: 38,
      margin: { top: 25, bottom: 25 },
      head: [['Date & Time', 'Job ID', 'Category', 'Pieces Type', 'Marking', 'Points Suggest', 'Fee', 'Clearance Status', 'Marked By']],
      body: markingData.length > 0 ? markingData : [['-', 'No marking or shouldering records found', '-', '-', '-', '-', '-', '-', '-']],
      theme: 'grid',
      headStyles: { fillColor: [0, 30, 64], textColor: 255, fontStyle: 'bold', fontSize: 8 },
      styles: { fontSize: 7.5, textColor: [40, 40, 40] },
      columnStyles: { 1: { cellWidth: 20 }, 7: { cellWidth: 28 } }
    });

    // -------------------------------------------------------------------------
    // PAGE 4: BULLION TRADING (BUY & SELL)
    // -------------------------------------------------------------------------
    doc.addPage();
    doc.setTextColor(0, 30, 64);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('BULLION TRADING & EXCHANGE (BUY / SELL)', 14, 28);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('Operational purchase (Buy) and sales (Sell) entries conducted with this client.', 14, 34);

    const tradeItems = ledger.filter((txn: any) => txn.workType === 'Buy' || txn.workType === 'Sell');
    const tradeData = tradeItems.map((txn: any) => {
      const creator = usersMap[txn.createdBy]?.name || txn.createdBy || 'System';
      const clearance = txn.status === 'Fully Paid' || txn.status === 'Paid' || txn.status === 'Settled'
        ? `Settled (${txn.adminSubmittedAt || txn.staffSubmittedAt || 'Cleared'})`
        : txn.status;
      return [
        `${txn.date} ${txn.timestamp}`,
        txn.id,
        txn.workType === 'Buy' ? 'Buy (Client Sell)' : 'Sell (Client Buy)',
        txn.metal || 'Gold',
        txn.purityPercentage ? `${txn.purityPercentage}%` : 'N/A',
        txn.pureWeight ? `${txn.pureWeight}g` : 'N/A',
        txn.cashRatePerGram ? `₹${txn.cashRatePerGram}/g` : 'N/A',
        txn.amount || '0',
        clearance,
        creator
      ];
    });

    autoTable(doc, {
      startY: 38,
      margin: { top: 25, bottom: 25 },
      head: [['Date & Time', 'Tx ID', 'Operation', 'Metal', 'Purity', 'Pure Weight', 'Rate/Gram', 'Amount', 'Settlement', 'Traded By']],
      body: tradeData.length > 0 ? tradeData : [['-', 'No bullion trading records found', '-', '-', '-', '-', '-', '-', '-', '-']],
      theme: 'grid',
      headStyles: { fillColor: [0, 30, 64], textColor: 255, fontStyle: 'bold', fontSize: 8 },
      styles: { fontSize: 7.5, textColor: [40, 40, 40] },
      columnStyles: { 1: { cellWidth: 20 }, 8: { cellWidth: 28 } }
    });

    // -------------------------------------------------------------------------
    // PAGE 5: DUES SETTLEMENTS & CASH PAYMENTS
    // -------------------------------------------------------------------------
    doc.addPage();
    doc.setTextColor(0, 30, 64);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('DUES SETTLEMENT PAYMENTS & CASH RECEIPTS', 14, 28);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('Detailed history of payments recorded to clear outstanding client dues.', 14, 34);

    const paymentItems = ledger.filter((txn: any) => txn.workType === 'Dues Payment');
    const paymentData = paymentItems.map((txn: any) => {
      const creator = usersMap[txn.createdBy]?.name || txn.createdBy || 'System';
      return [
        `${txn.date} ${txn.timestamp}`,
        txn.id,
        txn.type || 'Cash / UPI',
        txn.details || 'Balance Settlement',
        txn.amount || '0',
        creator
      ];
    });

    autoTable(doc, {
      startY: 38,
      margin: { top: 25, bottom: 25 },
      head: [['Date & Time', 'Receipt ID', 'Method', 'Allocation Details', 'Amount Settled', 'Collected By']],
      body: paymentData.length > 0 ? paymentData : [['-', 'No dues settlement records found', '-', '-', '-', '-']],
      theme: 'grid',
      headStyles: { fillColor: [0, 30, 64], textColor: 255, fontStyle: 'bold', fontSize: 8 },
      styles: { fontSize: 7.5, textColor: [40, 40, 40] }
    });

    // -------------------------------------------------------------------------
    // POST-GENERATION PASS: APPLY BACKGROUND, HEADERS, FOOTERS & WATERMARKS
    // -------------------------------------------------------------------------
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      
      // Categorize the header page labels dynamically
      let pageTitle = 'Executive Summary';
      if (i === 2) pageTitle = 'Assaying Ledger (Tunch)';
      else if (i === 3) pageTitle = 'Marking Ledger';
      else if (i === 4) pageTitle = 'Bullion Trading';
      else if (i === 5) pageTitle = 'Settlements Ledger';
      
      applyPageBackground(doc, pageTitle, i, totalPages);
    }
    
    // Save/Download PDF
    const cleanName = customer.name.replace(/\s+/g, '_');
    const typeLabel = reportType === 'super_admin' ? 'Internal' : 'Statement';
    const fileName = `${cleanName}_${typeLabel}_${new Date().toISOString().split('T')[0]}.pdf`;
    
    if (Capacitor.isNativePlatform()) {
      const pdfBase64 = doc.output('datauristring').split(',')[1];
      const savedFile = await Filesystem.writeFile({
        path: fileName,
        data: pdfBase64,
        directory: Directory.Cache
      });
      
      await Share.share({
        title: 'Aurora Divine Billing Statement',
        text: `Here is the billing report statement for ${customer.name}`,
        url: savedFile.uri,
        dialogTitle: 'Share Statement PDF'
      });
    } else {
      doc.save(fileName);
    }
    
    toast.success('Billing report downloaded successfully!');
  } catch (error) {
    console.error('Error generating detailed report:', error);
    toast.error('Failed to generate report.');
  }
};
