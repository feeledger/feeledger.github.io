import { useState } from 'react';
import { Modal, Spinner } from '../../components/ui/index';
import { ReceiptPreview } from './ReceiptPreview';
import type { ReceiptData } from '../../services/pdf/receiptPDF';

interface ReceiptViewerProps {
  open: boolean;
  data: ReceiptData | null;
  onClose: () => void;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function ReceiptViewer({ open, data, onClose }: ReceiptViewerProps) {
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded]   = useState(false);
  const [sendingWa, setSendingWa]     = useState(false);

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

  const handleWhatsApp = async () => {
    if (!waNumber || sendingWa) return;
    setSendingWa(true);
    try {
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

      const phone     = waNumber.replace(/\D/g, '');
      const fullPhone = phone.startsWith('91') ? phone : '91' + phone;

      const { getReceiptPDFBlob } = await import('../../services/pdf/receiptPDF');
      const blob     = await getReceiptPDFBlob(data);
      const fileName = `${data.receipt.receiptNumber}.pdf`;
      const file     = new File([blob], fileName, { type: 'application/pdf' });

      // The Web Share API is the only browser mechanism that can hand a
      // file straight to WhatsApp (via the device's native share sheet) —
      // a wa.me link can only ever carry text. Use it when the platform
      // supports sharing files.
      if (
        typeof navigator.share === 'function' &&
        typeof navigator.canShare === 'function' &&
        navigator.canShare({ files: [file] })
      ) {
        try {
          await navigator.share({ files: [file], text: msg });
          return;
        } catch (err) {
          if (err instanceof DOMException && err.name === 'AbortError') return; // user cancelled
          // otherwise fall through to the fallback below
        }
      }

      // Fallback for browsers (mainly desktop) that can't share files:
      // download the PDF and open WhatsApp with the text pre-filled so it
      // can be attached to the chat manually.
      downloadBlob(blob, fileName);
      const url = `https://wa.me/${fullPhone}?text=${encodeURIComponent(msg)}`;
      window.open(url, '_blank', 'noopener,noreferrer');
      alert('Your browser can\'t attach files to WhatsApp directly, so the receipt PDF has been downloaded — please attach it to the chat that just opened.');
    } catch (err) {
      console.error('WhatsApp share error:', err);
      alert('Failed to share the receipt. Please try again.');
    } finally {
      setSendingWa(false);
    }
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
              disabled={sendingWa}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: '#25D366', border: 'none', borderRadius: 'var(--radius-btn)',
                padding: '9px 18px', cursor: sendingWa ? 'default' : 'pointer',
                opacity: sendingWa ? 0.75 : 1,
                color: 'white', fontSize: 14, fontWeight: 600,
                fontFamily: 'var(--font-sans)',
              }}
            >
              {sendingWa
                ? <><Spinner size={14} /> Preparing…</>
                : <><span style={{ fontSize: 16 }}>💬</span> WhatsApp</>
              }
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
