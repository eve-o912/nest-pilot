import { CheckCircle, MessageCircle, Printer, X, Phone } from "lucide-react";
import { useState } from "react";

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  saleData: {
    customerName?: string;
    customerPhone?: string;
    items: Array<{ name: string; quantity: number; price: number }>;
    totalAmount: number;
    paymentMethod: "Cash" | "M-Pesa" | "Card" | "Bank";
    mpesaReference?: string;
    timestamp: Date;
    businessName?: string;
  };
}

export function ReceiptModal({ isOpen, onClose, saleData }: ReceiptModalProps) {
  const [sending, setSending] = useState(false);

  if (!isOpen) return null;

  const formatKES = (amount: number) => {
    return `KES ${amount.toLocaleString("en-KE", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-KE", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const buildWhatsAppMessage = () => {
    const businessName = saleData.businessName || "Business";
    const itemsList = saleData.items
      .map((item) => `${item.name} x${item.quantity} = ${formatKES(item.quantity * item.price)}`)
      .join("\n");
    
    let message = `*${businessName}*\n`;
    message += `Receipt — ${formatDate(saleData.timestamp)}\n`;
    message += `Items:\n${itemsList}\n`;
    message += `Total: ${formatKES(saleData.totalAmount)}\n`;
    message += `Payment: ${saleData.paymentMethod}`;
    if (saleData.paymentMethod === "M-Pesa" && saleData.mpesaReference) {
      message += `\nRef: ${saleData.mpesaReference}`;
    }
    message += `\nThank you for your business!`;

    return message;
  };

  const handleWhatsApp = () => {
    const message = buildWhatsAppMessage();
    const phone = saleData.customerPhone || "";
    const encodedMessage = encodeURIComponent(message);
    const url = phone 
      ? `https://wa.me/254${phone.replace(/^0/, "")}?text=${encodedMessage}`
      : `https://wa.me/?text=${encodedMessage}`;
    window.open(url, "_blank");
  };

  const handleSMS = async () => {
    setSending(true);
    try {
      // Placeholder for Africa's Talking SMS API
      // In production, this would call your backend API which integrates with Africa's Talking
      const message = buildWhatsAppMessage(); // Use same message format for SMS
      const phone = saleData.customerPhone;
      
      if (!phone) {
        alert("Customer phone number not available");
        return;
      }

      // TODO: Implement Africa's Talking API integration
      // Example API call structure:
      // await fetch('/api/send-sms', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ phone: `254${phone.replace(/^0/, "")}`, message })
      // });

      console.log("SMS would be sent to:", phone);
      console.log("Message:", message);
      alert("SMS functionality requires Africa's Talking API integration");
    } catch (error) {
      console.error("Error sending SMS:", error);
      alert("Failed to send SMS");
    } finally {
      setSending(false);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const businessName = saleData.businessName || "Business";
    const itemsList = saleData.items
      .map((item) => `<tr><td>${item.name} x${item.quantity}</td><td style="text-align: right;">${formatKES(item.quantity * item.price)}</td></tr>`)
      .join("");

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt - ${businessName}</title>
        <style>
          body {
            font-family: 'Courier New', monospace;
            max-width: 300px;
            margin: 0 auto;
            padding: 20px;
            font-size: 12px;
          }
          .header {
            text-align: center;
            margin-bottom: 20px;
            border-bottom: 1px dashed #000;
            padding-bottom: 10px;
          }
          .business-name {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 5px;
          }
          .receipt-info {
            margin-bottom: 15px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
          }
          td {
            padding: 5px 0;
          }
          .total-section {
            border-top: 1px dashed #000;
            padding-top: 10px;
            margin-bottom: 15px;
          }
          .total-row {
            font-size: 14px;
            font-weight: bold;
          }
          .footer {
            text-align: center;
            margin-top: 20px;
            border-top: 1px dashed #000;
            padding-top: 10px;
            font-size: 10px;
            color: #666;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="business-name">${businessName}</div>
          <div>RECEIPT</div>
        </div>
        
        <div class="receipt-info">
          <div>Date: ${formatDate(saleData.timestamp)}</div>
          <div>Payment: ${saleData.paymentMethod}</div>
          ${saleData.paymentMethod === "M-Pesa" && saleData.mpesaReference ? `<div>Ref: ${saleData.mpesaReference}</div>` : ""}
        </div>

        <table>
          ${itemsList}
        </table>

        <div class="total-section">
          <div class="total-row" style="display: flex; justify-content: space-between;">
            <span>TOTAL</span>
            <span>${formatKES(saleData.totalAmount)}</span>
          </div>
        </div>

        <div class="footer">
          <div>Thank you for your business!</div>
          <div style="margin-top: 5px;">Powered by Nest Pilot</div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
  };

  const handleSkip = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg" style={{ backgroundColor: "#0B1F3A" }}>
        {/* Header with green checkmark */}
        <div className="flex flex-col items-center mb-6">
          <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-green-500">
            <CheckCircle className="h-10 w-10 text-white" />
          </div>
          <h2 className="text-xl font-semibold text-white">Sale Recorded</h2>
          <p className="text-2xl font-bold text-white mt-1">{formatKES(saleData.totalAmount)}</p>
        </div>

        {/* Sale Details */}
        <div className="mb-6 rounded-lg bg-white/10 p-4">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-white">
              <span className="text-gray-300">Payment Method</span>
              <span className="font-medium">{saleData.paymentMethod}</span>
            </div>
            {saleData.paymentMethod === "M-Pesa" && saleData.mpesaReference && (
              <div className="flex justify-between text-white">
                <span className="text-gray-300">M-Pesa Ref</span>
                <span className="font-medium">{saleData.mpesaReference}</span>
              </div>
            )}
            <div className="flex justify-between text-white">
              <span className="text-gray-300">Date</span>
              <span className="font-medium">{formatDate(saleData.timestamp)}</span>
            </div>
            {saleData.customerName && (
              <div className="flex justify-between text-white">
                <span className="text-gray-300">Customer</span>
                <span className="font-medium">{saleData.customerName}</span>
              </div>
            )}
          </div>
        </div>

        {/* Prompt */}
        <div className="mb-6 text-center">
          <p className="text-white text-lg font-medium">Send receipt to customer?</p>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleWhatsApp}
            className="flex h-14 flex-col items-center justify-center gap-1 rounded-lg bg-green-500 px-4 py-3 text-white hover:bg-green-600 transition-colors"
            disabled={sending}
          >
            <MessageCircle className="h-5 w-5" />
            <span className="text-sm font-semibold">WhatsApp</span>
          </button>

          <button
            onClick={handleSMS}
            className="flex h-14 flex-col items-center justify-center gap-1 rounded-lg bg-blue-500 px-4 py-3 text-white hover:bg-blue-600 transition-colors"
            disabled={sending}
          >
            <Phone className="h-5 w-5" />
            <span className="text-sm font-semibold">SMS</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex h-14 flex-col items-center justify-center gap-1 rounded-lg bg-gray-600 px-4 py-3 text-white hover:bg-gray-700 transition-colors"
            disabled={sending}
          >
            <Printer className="h-5 w-5" />
            <span className="text-sm font-semibold">Print</span>
          </button>

          <button
            onClick={handleSkip}
            className="flex h-14 flex-col items-center justify-center gap-1 rounded-lg border-2 border-white/30 px-4 py-3 text-white hover:bg-white/10 transition-colors"
            disabled={sending}
          >
            <X className="h-5 w-5" />
            <span className="text-sm font-semibold">Skip</span>
          </button>
        </div>
      </div>
    </div>
  );
}
