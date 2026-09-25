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
  const [sendingWa, setSendingWa]     = useState(false);

  if (!data) return null;

  const waNumber = String(
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
      const { shareReceiptOnWhatsApp } = await import('../../services/receiptShare');
      await shareReceiptOnWhatsApp(data);
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
