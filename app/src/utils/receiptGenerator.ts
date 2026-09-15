import { jsPDF } from 'jspdf';

export interface CustomerReceiptData {
  receiptId: string;
  customerName: string;
  customerPhone?: string;
  workType: string;
  metal: string;
  grossWeight?: string | number;
  purity?: string | number;
  pureWeight?: string | number;
  carat?: string;
  amount?: string | number;
  paymentMode?: string;
  status: string;
  branchName?: string;
  date: string;
}

export const generateCustomerReceiptPDF = (data: CustomerReceiptData) => {
  const doc = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: [105, 148] // A6 compact receipt format
  });

  const navy: [number, number, number] = [0, 30, 64];
  const gold: [number, number, number] = [184, 134, 11];

  // Header Banner
  doc.setFillColor(...navy);
  doc.rect(0, 0, 105, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('AURORA DIVINE', 52.5, 9, { align: 'center' });
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('BULLION, ASSAY & SETTLEMENT ENGINE', 52.5, 15, { align: 'center' });
  doc.text(`${data.branchName || 'Head Office'} • Verified Digital Slip`, 52.5, 20, { align: 'center' });

  // Receipt Meta
  doc.setTextColor(80, 80, 80);
  doc.setFontSize(7);
  doc.text(`Receipt: #${data.receiptId}`, 8, 30);
  doc.text(`Date: ${data.date}`, 97, 30, { align: 'right' });

  // Divider
  doc.setDrawColor(220, 220, 220);
  doc.line(8, 33, 97, 33);

  // Customer Details Box
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(8, 36, 89, 16, 2, 2, 'F');
  doc.setTextColor(0, 30, 64);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(`Customer: ${data.customerName}`, 12, 43);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(`Mobile: ${data.customerPhone || 'N/A'}`, 12, 48);

  // Item & Metal Particulars Table
  let y = 58;
  doc.setFillColor(...gold);
  doc.rect(8, y, 89, 6, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('PARTICULARS', 12, y + 4.2);
  doc.text('DETAILS / SPEC', 93, y + 4.2, { align: 'right' });

  y += 7;
  const rows: [string, string][] = [
    ['Transaction Type', data.workType],
    ['Metal & Carat', `${data.metal} (${data.carat || '22K'})`],
    ['Gross Weight', data.grossWeight ? `${Number(data.grossWeight).toFixed(3)}g` : '-'],
    ['Assay Purity %', data.purity ? `${data.purity}%` : '-'],
    ['Net Pure Weight', data.pureWeight ? `${Number(data.pureWeight).toFixed(3)}g` : '-'],
    ['Payment Mode', data.paymentMode || 'Cash'],
    ['Settlement Status', data.status || 'Completed']
  ];

  rows.forEach(([label, val], idx) => {
    const shade = idx % 2 === 0 ? 255 : 250;
    doc.setFillColor(shade, shade, shade);
    doc.rect(8, y, 89, 5.5, 'F');
    doc.setTextColor(90, 90, 90);
    doc.setFont('helvetica', 'normal');
    doc.text(label, 12, y + 4);
    doc.setTextColor(0, 30, 64);
    doc.setFont('helvetica', 'bold');
    doc.text(String(val), 93, y + 4, { align: 'right' });
    y += 5.5;
  });

  // Total Amount Box
  if (data.amount !== undefined && data.amount !== null && data.amount !== '') {
    y += 3;
    doc.setFillColor(236, 253, 245);
    doc.setDrawColor(167, 243, 208);
    doc.roundedRect(8, y, 89, 12, 2, 2, 'FD');
    doc.setTextColor(6, 95, 70);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('TOTAL SETTLEMENT VALUE', 12, y + 5);
    doc.setFontSize(11);
    doc.text(`Rs. ${Number(data.amount).toLocaleString('en-IN')}`, 93, y + 8.5, { align: 'right' });
    y += 14;
  }

  // Footer & Security Seal
  y += 6;
  doc.setTextColor(140, 140, 140);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.text('This is a computer generated certificate. No signature required.', 52.5, y, { align: 'center' });
  doc.text('Thank you for trusting Aurora Divine.', 52.5, y + 4, { align: 'center' });

  doc.save(`Receipt_${data.customerName.replace(/\s+/g, '_')}_${data.receiptId}.pdf`);
};

export const sendReceiptViaWhatsApp = (data: CustomerReceiptData) => {
  let cleanPhone = (data.customerPhone || '').replace(/\D/g, '');
  if (cleanPhone.length === 10) cleanPhone = `91${cleanPhone}`;

  const message = 
`✨ *AURORA DIVINE JEWELLERS & BULLION* ✨
━━━━━━━━━━━━━━━━━━━━
📄 *Transaction Receipt:* #${data.receiptId}
👤 *Customer:* ${data.customerName}
📅 *Date:* ${data.date}
━━━━━━━━━━━━━━━━━━━━
🔹 *Type:* ${data.workType}
🔹 *Metal:* ${data.metal} (${data.carat || '22K'})
⚖️ *Gross Weight:* ${data.grossWeight ? Number(data.grossWeight).toFixed(3) + 'g' : '-'}
🔬 *Purity:* ${data.purity ? data.purity + '%' : '-'}
✨ *Pure Weight:* ${data.pureWeight ? Number(data.pureWeight).toFixed(3) + 'g' : '-'}
💰 *Settlement Amount:* ${data.amount ? '₹' + Number(data.amount).toLocaleString('en-IN') : '-'}
💳 *Mode:* ${data.paymentMode || 'Cash'}
━━━━━━━━━━━━━━━━━━━━
✅ *Status:* ${data.status}
Thank you for trusting Aurora Divine!`;

  const encoded = encodeURIComponent(message);
  const waUrl = cleanPhone 
    ? `https://wa.me/${cleanPhone}?text=${encoded}`
    : `https://api.whatsapp.com/send?text=${encoded}`;

  window.open(waUrl, '_blank');
};
