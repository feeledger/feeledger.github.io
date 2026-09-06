import { useState } from 'react';
import { Modal, Spinner } from '../../components/ui/index';
import { ReceiptPreview } from './ReceiptPreview';
import type { ReceiptData } from '../../services/pdf/receiptPDF';

interface ReceiptViewerProps {
  open: boolean;
  data: ReceiptData | null;
  onClose: () => void;
}

export function ReceiptViewer({ open, data, onClose }: ReceiptViewerProps) {
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded]   = useState(false);

  if (!data) return null;

  const studentName = String(data.student.values['student_name'] ?? 'Member');
  const waNumber    = String(
    data.student.values['whatsapp_number'] ??
    data.student.values['parent_phone'] ?? ''
  );

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const { downloadReceiptPDF } = await import('../../services/pdf/receiptPDF');
      await downloadReceiptPDF(data);
      setDownloaded(true);
      setTimeout(() => setDownloaded(false), 3000);
    } catch (err) {
      console.error('PDF generation error:', err);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const handleWhatsApp = () => {
    if (!waNumber) return;
    const currency = data.settings.defaultCurrency ?? 'INR';
    const symbol   = currency === 'INR' ? '₹' : currency;
    const amount   = `${symbol}${data.payment.amount.toLocaleString('en-IN')}`;
    const date     = new Date(data.payment.paymentDate).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'long', year: 'numeric',
    });

    const msg =
      `Hi ${studentName},\n\n` +
      `Your payment of *${amount}* has been received on ${date}.\n` +
      `Receipt No: *${data.receipt.receiptNumber}*\n` +
      (data.payment.purpose ? `Period: ${data.payment.purpose}\n` : '') +
      `\nThank you!\n${data.settings.business.businessName || 'FeeLedger'}`;

    const phone = waNumber.replace(/\D/g, '');
    const url   = `https://wa.me/${phone.startsWith('91') ? phone : '91' + phone}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Receipt — ${data.receipt.receiptNumber}`}
      width={480}
      footer={
        <div style={{ display: 'flex', gap: 10, width: '100%', flexWrap: 'wrap' }}>
          {waNumber && (
            <button
              onClick={handleWhatsApp}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: '#25D366', border: 'none', borderRadius: 'var(--radius-btn)',
                padding: '9px 18px', cursor: 'pointer',
                color: 'white', fontSize: 14, fontWeight: 600,
                fontFamily: 'var(--font-sans)',
              }}
            >
              <span style={{ fontSize: 16 }}>💬</span> WhatsApp
            </button>
          )}
          <div style={{ flex: 1 }} />
          <button className="btn-secondary" onClick={onClose} style={{ fontSize: 14, padding: '9px 18px' }}>
            Close
          </button>
          <button
            className="btn-primary"
            onClick={handleDownload}
            disabled={downloading}
            style={{ fontSize: 14, padding: '9px 20px', gap: 8 }}
          >
            {downloading
              ? <><Spinner size={14} /> Generating…</>
              : downloaded
              ? '✓ Downloaded'
              : '⬇ Download PDF'
            }
          </button>
        </div>
      }
    >
      <ReceiptPreview data={data} compact={false} />
    </Modal>
  );
}
