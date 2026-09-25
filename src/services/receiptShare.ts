import type { ReceiptData } from './pdf/receiptPDF';

// ── Helpers ───────────────────────────────────────────────────────────────────

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

function buildConfirmationMessage(data: ReceiptData): string {
  const studentName = String(data.student.values['student_name'] ?? 'Member');
  const currency = data.settings.defaultCurrency ?? 'INR';
  const symbol   = currency === 'INR' ? '₹' : currency;
  const amount   = `${symbol}${data.payment.amount.toLocaleString('en-IN')}`;
  const date     = new Date(data.payment.paymentDate).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    `Hi ${studentName},\n\n` +
    `Your payment of *${amount}* has been received on ${date}.\n` +
    `Receipt No: *${data.receipt.receiptNumber}*\n` +
    (data.payment.purpose ? `Period: ${data.payment.purpose}\n` : '') +
    `\nThank you!\n${data.settings.business.businessName || 'FeeLedger'}`
  );
}

// ── Share receipt on WhatsApp ────────────────────────────────────────────────
//
// WhatsApp's document/file share target does not support an accompanying
// caption/text — only image shares get a caption. So the text confirmation
// and the PDF attachment can never travel as a single WhatsApp share; they
// have to be sent as two separate messages in the same chat:
//
//   1. Share the PDF via the Web Share API (opens the native share sheet —
//      the user picks WhatsApp and sends it as a document).
//   2. Once that's done (sent or cancelled), open the wa.me link with the
//      text pre-filled, exactly as before, so the confirmation text goes
//      through as its own message.
//
// On platforms that can't share files at all (mainly desktop browsers), the
// PDF is downloaded instead so it can be attached manually, and the wa.me
// text link still opens so the confirmation text isn't lost.

export async function shareReceiptOnWhatsApp(data: ReceiptData): Promise<void> {
  const waNumber = String(
    data.student.values['whatsapp_number'] ??
    data.student.values['parent_phone'] ?? ''
  );
  const msg = buildConfirmationMessage(data);

  const { getReceiptPDFBlob } = await import('./pdf/receiptPDF');
  const blob     = await getReceiptPDFBlob(data);
  const fileName = `${data.receipt.receiptNumber}.pdf`;
  const file     = new File([blob], fileName, { type: 'application/pdf' });

  const canShareFile =
    typeof navigator.share === 'function' &&
    typeof navigator.canShare === 'function' &&
    navigator.canShare({ files: [file] });

  if (canShareFile) {
    try {
      await navigator.share({ files: [file] });
    } catch (err) {
      // User cancelled the share sheet, or the platform rejected the share —
      // either way, still go on to open the text message below.
      if (!(err instanceof DOMException && err.name === 'AbortError')) {
        console.error('WhatsApp file share error:', err);
      }
    }
  } else {
    downloadBlob(blob, fileName);
  }

  if (waNumber) {
    const phone     = waNumber.replace(/\D/g, '');
    const fullPhone = phone.startsWith('91') ? phone : '91' + phone;
    const url = `https://wa.me/${fullPhone}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    if (!canShareFile) {
      alert('Your browser can\'t attach files to WhatsApp directly, so the receipt PDF has been downloaded — please attach it to the chat that just opened.');
    }
  } else if (!canShareFile) {
    alert('The receipt PDF has been downloaded. This member has no WhatsApp/phone number on file to open a chat automatically.');
  }
}
