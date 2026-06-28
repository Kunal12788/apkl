import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import toast from 'react-hot-toast';

export const generateCustomerPDFReport = async (customer: any, behavior: any) => {
  try {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    
    // Branding Header
    doc.setFillColor(0, 30, 64); // #001e40 - Sapphire Blue
    doc.rect(0, 0, pageWidth, 40, 'F');
    
    // Aurora Title
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(28);
    doc.setFont('helvetica', 'bold');
    doc.text('AURORA', pageWidth / 2, 22, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Customer Billing Report', pageWidth / 2, 32, { align: 'center' });
    
    // Customer Info Section
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Customer Details', 14, 55);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Name: ${customer?.name || 'Unknown'}`, 14, 65);
    doc.text(`ID: ${customer?.id || 'Unknown'}`, 14, 72);
    doc.text(`Phone: ${customer?.phone || 'N/A'}`, 14, 79);
    doc.text(`Address: ${customer?.address || 'N/A'}`, 14, 86);
    
    // Account Summary
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Account Summary', 120, 55);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Active Jobs: ${customer?.activeJobs || 0}`, 120, 65);
    doc.text(`Outstanding Dues: ${customer?.outstanding || '0'}`, 120, 72);
    
    // Behavior Section
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Payment Behavior Profile', 14, 105);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Rating: ${behavior?.level || 'N/A'} (${behavior?.score || 0}/100)`, 14, 115);
    doc.text(`On-Time Rate: ${behavior?.onTimeRate || 0}%`, 14, 122);
    doc.text(`Avg Delay: ${behavior?.avgDaysToPay || 0} days`, 14, 129);
    doc.text(`Max Delay: ${behavior?.maxDelay || 0} days`, 14, 136);
    
    // Transactions Table
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Transaction Ledger', 14, 155);
    
    const tableData = (customer?.ledger || []).map((txn: any) => [
      txn.date || '',
      txn.workType || '',
      String(txn.amount || '0').replace(/[^0-9.]/g, ''), // Clean currency
      txn.status || '',
      txn.details ? String(txn.details).substring(0, 40) + '...' : 'N/A'
    ]);
    
    autoTable(doc, {
      startY: 160,
      head: [['Date', 'Type', 'Amount (INR)', 'Status', 'Details']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [0, 48, 102], textColor: 255 }, // Sapphire variant
      styles: { fontSize: 8 },
    });
    
    const fileName = `${customer.name.replace(/\s+/g, '_')}_Report_${new Date().toISOString().split('T')[0]}.pdf`;
    
    if (Capacitor.isNativePlatform()) {
      // Generate base64 string
      const pdfBase64 = doc.output('datauristring').split(',')[1];
      
      const savedFile = await Filesystem.writeFile({
        path: fileName,
        data: pdfBase64,
        directory: Directory.Cache
      });
      
      await Share.share({
        title: 'Customer Report',
        text: `Here is the billing report for ${customer.name}`,
        url: savedFile.uri,
        dialogTitle: 'Share PDF Report'
      });
      
    } else {
      // Standard browser download
      doc.save(fileName);
    }
    
    toast.success('Report generated successfully!');
  } catch (error) {
    console.error('Error generating PDF:', error);
    toast.error('Failed to generate report.');
  }
};
