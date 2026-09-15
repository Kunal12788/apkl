import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '../supabaseClient';

export const exportFullDatabaseBackup = async () => {
  try {
    // 1. Fetch tables in parallel
    const [ledgerRes, txRes, reportsRes, customersRes, allocationsRes] = await Promise.all([
      supabase.from('ledger_entries').select('*').order('created_at', { ascending: false }),
      supabase.from('transactions').select('*').order('created_at', { ascending: false }),
      supabase.from('branch_daily_reports').select('*').order('created_at', { ascending: false }),
      supabase.from('customers').select('*').order('created_at', { ascending: false }),
      supabase.from('stock_allocations').select('*').order('created_at', { ascending: false })
    ]);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

    // Convert array of objects to CSV
    const convertToCSV = (data: any[], title: string) => {
      if (!data || !data.length) return `${title}\nNo records found\n\n`;
      const headers = Object.keys(data[0]);
      const rows = data.map(obj =>
        headers
          .map(header => {
            const val = obj[header];
            if (val === null || val === undefined) return '""';
            return `"${String(val).replace(/"/g, '""')}"`;
          })
          .join(',')
      );
      return `### ${title.toUpperCase()} ###\n${headers.join(',')}\n${rows.join('\n')}\n\n`;
    };

    let fullCSV = `AURORA DIVINE MASTER DATABASE BACKUP\nGenerated At: ${new Date().toLocaleString('en-IN')}\n\n`;
    fullCSV += convertToCSV(ledgerRes.data || [], 'Ledger Entries');
    fullCSV += convertToCSV(txRes.data || [], 'Transactions & Billing');
    fullCSV += convertToCSV(reportsRes.data || [], 'Branch Daily Reports');
    fullCSV += convertToCSV(customersRes.data || [], 'Customer Directory');
    fullCSV += convertToCSV(allocationsRes.data || [], 'Stock Allocations');

    // Trigger download
    const blob = new Blob([fullCSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Aurora_Divine_Master_Backup_${timestamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return { success: true };
  } catch (err: any) {
    console.error('Backup export error:', err);
    throw err;
  }
};

export const exportExecutivePDF = async () => {
  try {
    const [reportsRes, allocationsRes] = await Promise.all([
      supabase.from('branch_daily_reports').select('*').order('created_at', { ascending: false }).limit(20),
      supabase.from('stock_allocations').select('*').order('created_at', { ascending: false }).limit(20)
    ]);

    const doc = new jsPDF('p', 'mm', 'a4');
    const primaryColor: [number, number, number] = [0, 30, 64];

    // Header
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, 210, 35, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('AURORA DIVINE JEWELLERS & BULLION', 14, 18);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Executive Master Report — Generated: ${new Date().toLocaleString('en-IN')}`, 14, 27);

    // Section 1: Recent Daily Reports
    doc.setTextColor(0, 30, 64);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Recent Branch Daily Reports & Closing Stocks', 14, 45);

    const reportRows = (reportsRes.data || []).map((r: any) => [
      r.iso_date || r.date,
      r.branch_name || r.branch_id,
      `₹${Number(r.closing_cash || 0).toLocaleString('en-IN')}`,
      `${Number(r.closing_pure_gold || 0).toFixed(3)}g`,
      `${Number(r.closing_pure_silver || 0).toFixed(3)}g`,
      r.status || 'Submitted'
    ]);

    autoTable(doc, {
      startY: 49,
      head: [['Date', 'Branch', 'Closing Cash', 'Closing Gold', 'Closing Silver', 'Status']],
      body: reportRows.length ? reportRows : [['No recent reports found', '', '', '', '', '']],
      theme: 'grid',
      headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 8.5 }
    });

    // Section 2: Recent Stock Allocations
    const finalY1 = (doc as any).lastAutoTable?.finalY || 100;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Vault Stock Allocations (Super Admin to Branches)', 14, finalY1 + 12);

    const allocRows = (allocationsRes.data || []).map((a: any) => [
      a.iso_date || a.date,
      a.branch_name || a.branch_id,
      a.metal || 'Gold',
      `${Number(a.pure_weight || 0).toFixed(3)}g`,
      `₹${Number(a.cash_amount || 0).toLocaleString('en-IN')}`,
      a.allocated_by || 'Super Admin'
    ]);

    autoTable(doc, {
      startY: finalY1 + 16,
      head: [['Date', 'Branch', 'Metal', 'Pure Weight', 'Cash Allocated', 'Allocated By']],
      body: allocRows.length ? allocRows : [['No recent allocations found', '', '', '', '', '']],
      theme: 'grid',
      headStyles: { fillColor: [180, 130, 30], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 8.5 }
    });

    // Footer
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    doc.save(`Aurora_Divine_Executive_Summary_${timestamp}.pdf`);
    return { success: true };
  } catch (err: any) {
    console.error('PDF export error:', err);
    throw err;
  }
};
