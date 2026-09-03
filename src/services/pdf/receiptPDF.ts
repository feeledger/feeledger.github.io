import jsPDF from 'jspdf';
import type { Receipt, Payment, Student, AppSettings, StudentFieldDefinition } from '../../types';

// ── Receipt data bundle ───────────────────────────────────────────────────────

export interface ReceiptData {
  receipt:   Receipt;
  payment:   Payment;
  student:   Student;
  settings:  AppSettings;
  fields:    StudentFieldDefinition[];
  batchName?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatAmount(amount: number, currency = 'INR') {
  const symbol = currency === 'INR' ? 'Rs.' : currency;
  return `${symbol} ${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function getStudentFieldValue(
  student: Student,
  fields: StudentFieldDefinition[],
  fieldId: string
): string {
  const val = student.values[fieldId];
  if (val === undefined || val === null || val === '') return '';
  const field = fields.find(f => f.id === fieldId);
  if (!field) return String(val);
  if (field.type === 'select') {
    return field.options?.find(o => o.value === val)?.label ?? String(val);
  }
  if (field.type === 'multiselect' && Array.isArray(val)) {
    return (val as string[]).join(', ');
  }
  if (field.type === 'date' && typeof val === 'string') {
    return formatDate(val);
  }
  return String(val);
}

// ── PDF generator ─────────────────────────────────────────────────────────────

export async function generateReceiptPDF(data: ReceiptData): Promise<jsPDF> {
  const { receipt, payment, student, settings, fields, batchName } = data;

  const doc = new jsPDF({
    unit: 'mm',
    format: 'a5',        // A5 is a common receipt size — compact and printable
    orientation: 'portrait',
  });

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentW = pageW - margin * 2;
  const currency = settings.defaultCurrency ?? 'INR';

  // ── Colour palette ───────────────────────────────────────────────────────────
  const inkRGB:    [number, number, number] = [20, 20, 19];
  const slateRGB:  [number, number, number] = [105, 105, 105];
  const dustRGB:   [number, number, number] = [209, 205, 199];
  const signalRGB: [number, number, number] = [243, 115, 56];
  const canvasRGB: [number, number, number] = [243, 240, 238];

  let y = 0;

  // ── Header band ──────────────────────────────────────────────────────────────
  doc.setFillColor(...inkRGB);
  doc.rect(0, 0, pageW, 38, 'F');

  // Business name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(243, 240, 238);
  const bizName = settings.business.businessName || 'FeeLedger';
  doc.text(bizName, margin, 14);

  // Receipt number label
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...signalRGB);
  doc.text('PAYMENT RECEIPT', pageW - margin, 10, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(243, 240, 238);
  doc.text(receipt.receiptNumber, pageW - margin, 16, { align: 'right' });

  // Business sub-info
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(180, 175, 170);
  const subLines: string[] = [];
  if (settings.business.phone) subLines.push(settings.business.phone);
  if (settings.business.email) subLines.push(settings.business.email);
  if (settings.business.gstin) subLines.push(`GSTIN: ${settings.business.gstin}`);
  if (subLines.length > 0) doc.text(subLines.join('  |  '), margin, 22);
  if (settings.business.address) {
    doc.text(settings.business.address, margin, 28, { maxWidth: contentW * 0.65 });
  }

  y = 44;

  // ── Date line ────────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...slateRGB);
  doc.text(`Date: ${formatDate(payment.paymentDate)}`, margin, y);
  doc.text(`Issued: ${formatDate(receipt.issuedAt)}`, pageW - margin, y, { align: 'right' });
  y += 8;

  // ── Divider ──────────────────────────────────────────────────────────────────
  doc.setDrawColor(...dustRGB);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageW - margin, y);
  y += 6;

  // ── Member section ───────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...slateRGB);
  doc.text('MEMBER', margin, y);
  y += 4;

  const studentName = String(student.values['student_name'] ?? 'Unknown');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...inkRGB);
  doc.text(studentName, margin, y);
  y += 6;

  // Receipt-visible student fields
  const receiptFields = fields.filter(f => f.enabled && f.showOnReceipt && f.id !== 'student_name');
  if (receiptFields.length > 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...slateRGB);
    const detailParts = receiptFields
      .map(f => `${f.label}: ${getStudentFieldValue(student, fields, f.id)}`)
      .filter(s => !s.endsWith(': '));
    if (detailParts.length > 0) {
      doc.text(detailParts.join('   '), margin, y, { maxWidth: contentW });
      y += 5;
    }
  }

  if (batchName) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...slateRGB);
    doc.text(`Batch: ${batchName}`, margin, y);
    y += 5;
  }

  y += 2;
  doc.setDrawColor(...dustRGB);
  doc.line(margin, y, pageW - margin, y);
  y += 6;

  // ── Payment details ───────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...slateRGB);
  doc.text('PAYMENT DETAILS', margin, y);
  y += 5;

  const details: [string, string][] = [
    ['Payment Mode', payment.paymentMode],
    ['Payment Date', formatDate(payment.paymentDate)],
  ];
  if (payment.purpose) details.push(['Purpose / Period', payment.purpose]);
  if (payment.notes)   details.push(['Notes', payment.notes]);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  for (const [label, value] of details) {
    doc.setTextColor(...slateRGB);
    doc.text(label, margin, y);
    doc.setTextColor(...inkRGB);
    doc.text(value, pageW - margin, y, { align: 'right' });
    y += 6;
  }

  y += 2;
  doc.setDrawColor(...dustRGB);
  doc.line(margin, y, pageW - margin, y);
  y += 4;

  // ── Amount box ───────────────────────────────────────────────────────────────
  doc.setFillColor(...canvasRGB);
  doc.roundedRect(margin, y, contentW, 18, 3, 3, 'F');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...slateRGB);
  doc.text('AMOUNT PAID', margin + 5, y + 7);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...inkRGB);
  doc.text(formatAmount(payment.amount, currency), pageW - margin - 5, y + 12, { align: 'right' });

  y += 24;

  // ── Footer ───────────────────────────────────────────────────────────────────
  const footerY = pageH - 14;
  doc.setDrawColor(...dustRGB);
  doc.setLineWidth(0.2);
  doc.line(margin, footerY - 6, pageW - margin, footerY - 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...slateRGB);
  doc.text('Thank you for your payment.', margin, footerY - 2);
  doc.text(`Generated by FeeLedger · ${receipt.receiptNumber}`, pageW - margin, footerY - 2, { align: 'right' });

  return doc;
}

// ── Download helper ───────────────────────────────────────────────────────────

export async function downloadReceiptPDF(data: ReceiptData): Promise<void> {
  const doc = await generateReceiptPDF(data);
  doc.save(`${data.receipt.receiptNumber}.pdf`);
}

// ── Get PDF as Blob (for Drive upload in Phase 10) ────────────────────────────

export async function getReceiptPDFBlob(data: ReceiptData): Promise<Blob> {
  const doc = await generateReceiptPDF(data);
  return doc.output('blob');
}
