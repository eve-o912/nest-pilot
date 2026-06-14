import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { Plus, Search, Filter, Eye, MessageCircle, Phone, Printer, Download, X, Calendar } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatKES, useStore } from "@/lib/store";

export const Route = createFileRoute("/receipts")({
  component: Receipts,
  head: () => ({ meta: [{ title: "Receipts — Nest Pilot" }] }),
});

interface Receipt {
  id: string;
  receipt_number: string;
  customer_name: string;
  customer_phone?: string;
  line_items: Array<{ description: string; quantity: number; unit_price: number }>;
  total_amount: number;
  payment_method: "cash" | "mpesa" | "credit";
  mpesa_reference?: string;
  notes?: string;
  sent_via: string[];
  created_at: string;
}

interface Customer {
  id: string;
  business_name: string;
  contact_name?: string;
  phone: string;
}

function Receipts() {
  const business = useStore((s) => s.business);
  const session = useStore((s) => s.session);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  
  // Create receipt modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().split('T')[0]);
  const [lineItems, setLineItems] = useState([{ description: "", quantity: 1, unit_price: 0 }]);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "mpesa" | "credit">("cash");
  const [mpesaReference, setMpesaReference] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // View receipt modal state
  const [viewReceipt, setViewReceipt] = useState<Receipt | null>(null);

  useEffect(() => {
    fetchReceipts();
    fetchCustomers();
  }, []);

  const fetchReceipts = async () => {
    setLoading(true);
    try {
      if (!session?.user) return;

      const { data, error } = await supabase
        .from("receipts")
        .select("*")
        .eq("business_id", business.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setReceipts(data || []);
    } catch (error) {
      console.error("Error fetching receipts:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      if (!session?.user) return;

      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("user_id", session.user.id)
        .order("business_name");

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error("Error fetching customers:", error);
    }
  };

  const filteredReceipts = useMemo(() => {
    return receipts.filter((receipt) => {
      const matchesSearch = 
        receipt.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        receipt.receipt_number.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesPayment = paymentFilter === "all" || receipt.payment_method === paymentFilter;
      
      let matchesDate = true;
      if (dateFilter === "today") {
        const today = new Date().toISOString().split('T')[0];
        matchesDate = receipt.created_at.startsWith(today);
      } else if (dateFilter === "week") {
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        matchesDate = receipt.created_at >= weekAgo;
      } else if (dateFilter === "month") {
        const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        matchesDate = receipt.created_at >= monthAgo;
      }

      return matchesSearch && matchesPayment && matchesDate;
    });
  }, [receipts, searchQuery, dateFilter, paymentFilter]);

  const handleAddLineItem = () => {
    setLineItems([...lineItems, { description: "", quantity: 1, unit_price: 0 }]);
  };

  const handleRemoveLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const handleLineItemChange = (index: number, field: string, value: any) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    setLineItems(updated);
  };

  const getTotalAmount = () => {
    return lineItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  };

  const handleCreateReceipt = async () => {
    if (!selectedCustomer) {
      setError("Please select a customer");
      return;
    }
    if (lineItems.some(item => !item.description || item.quantity <= 0 || item.unit_price <= 0)) {
      setError("Please fill in all line items with valid values");
      return;
    }
    if (paymentMethod === "mpesa" && !mpesaReference) {
      setError("M-Pesa reference is required for M-Pesa payments");
      return;
    }

    setIsSubmitting(true);
    setError("");
    try {
      if (!session?.user) return;

      // Generate receipt number
      const { data: receiptNumber } = await supabase.rpc("generate_receipt_number", { 
        business_uuid: business.id 
      });

      const { error } = await supabase
        .from("receipts")
        .insert({
          receipt_number: receiptNumber,
          business_id: business.id,
          customer_id: selectedCustomer.id,
          customer_name: selectedCustomer.business_name,
          customer_phone: selectedCustomer.phone,
          line_items: lineItems,
          total_amount: getTotalAmount(),
          payment_method: paymentMethod,
          mpesa_reference: paymentMethod === "mpesa" ? mpesaReference : null,
          notes: notes || null,
        });

      if (error) throw error;

      // Reset form
      setSelectedCustomer(null);
      setCustomerSearch("");
      setReceiptDate(new Date().toISOString().split('T')[0]);
      setLineItems([{ description: "", quantity: 1, unit_price: 0 }]);
      setPaymentMethod("cash");
      setMpesaReference("");
      setNotes("");
      setShowCreateModal(false);
      fetchReceipts();
    } catch (error) {
      console.error("Error creating receipt:", error);
      setError("Failed to create receipt");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendWhatsApp = (receipt: Receipt) => {
    const message = buildReceiptMessage(receipt);
    const phone = receipt.customer_phone || "";
    const encodedMessage = encodeURIComponent(message);
    const url = phone 
      ? `https://wa.me/254${phone.replace(/^0/, "")}?text=${encodedMessage}`
      : `https://wa.me/?text=${encodedMessage}`;
    window.open(url, "_blank");
  };

  const handleSendSMS = async (receipt: Receipt) => {
    const message = buildReceiptMessage(receipt);
    const phone = receipt.customer_phone;
    
    if (!phone) {
      alert("Customer phone number not available");
      return;
    }

    // Placeholder for Africa's Talking API
    console.log("SMS would be sent to:", phone);
    console.log("Message:", message);
    alert("SMS functionality requires Africa's Talking API integration");
  };

  const handlePrint = (receipt: Receipt) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const itemsList = receipt.line_items
      .map((item) => `<tr><td>${item.description} x${item.quantity}</td><td style="text-align: right;">${formatKES(item.quantity * item.unit_price)}</td></tr>`)
      .join("");

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt - ${receipt.receipt_number}</title>
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
          <div class="business-name">${business.name}</div>
          <div>RECEIPT #${receipt.receipt_number}</div>
        </div>
        
        <div class="receipt-info">
          <div>Date: ${new Date(receipt.created_at).toLocaleDateString("en-KE")}</div>
          <div>Customer: ${receipt.customer_name}</div>
          <div>Payment: ${receipt.payment_method.toUpperCase()}</div>
          ${receipt.mpesa_reference ? `<div>Ref: ${receipt.mpesa_reference}</div>` : ""}
        </div>

        <table>
          ${itemsList}
        </table>

        <div class="total-section">
          <div class="total-row" style="display: flex; justify-content: space-between;">
            <span>TOTAL</span>
            <span>${formatKES(receipt.total_amount)}</span>
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

  const buildReceiptMessage = (receipt: Receipt) => {
    const itemsList = receipt.line_items
      .map((item) => `${item.description} x${item.quantity} = ${formatKES(item.quantity * item.unit_price)}`)
      .join("\n");
    
    let message = `*${business.name}*\n`;
    message += `Receipt #${receipt.receipt_number}\n`;
    message += `Date: ${new Date(receipt.created_at).toLocaleDateString("en-KE")}\n`;
    message += `Customer: ${receipt.customer_name}\n`;
    message += `Items:\n${itemsList}\n`;
    message += `Total: ${formatKES(receipt.total_amount)}\n`;
    message += `Payment: ${receipt.payment_method.toUpperCase()}`;
    if (receipt.mpesa_reference) {
      message += `\nRef: ${receipt.mpesa_reference}`;
    }
    message += `\nThank you for your business!`;

    return message;
  };

  const filteredCustomers = customers.filter((c) =>
    c.business_name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    (c.contact_name && c.contact_name.toLowerCase().includes(customerSearch.toLowerCase()))
  );

  return (
    <main className="mx-auto max-w-[1600px] px-6 pb-16">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Receipts</h1>
          <p className="mt-1 text-sm text-muted-foreground">Create and manage customer receipts</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 rounded-sm bg-[#00AEEF] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> New Receipt
        </button>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by customer or receipt number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 w-full rounded-sm border border-input bg-background pl-9 pr-3 text-sm outline-none focus:border-ring"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="h-10 rounded-sm border border-input bg-background px-3 text-sm outline-none focus:border-ring"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="h-10 rounded-sm border border-input bg-background px-3 text-sm outline-none focus:border-ring"
          >
            <option value="all">All Methods</option>
            <option value="cash">Cash</option>
            <option value="mpesa">M-Pesa</option>
            <option value="credit">Credit</option>
          </select>
        </div>
      </div>

      {/* Receipts Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      ) : filteredReceipts.length === 0 ? (
        <div className="rounded-sm border border-border bg-card p-12 text-center">
          <p className="text-muted-foreground mb-4">No receipts found</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 rounded-sm bg-[#00AEEF] px-4 py-2 text-sm font-semibold text-white"
          >
            <Plus className="h-4 w-4" /> Create your first receipt
          </button>
        </div>
      ) : (
        <div className="rounded-sm border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-6 py-3 font-medium">Receipt #</th>
                  <th className="px-6 py-3 font-medium">Customer</th>
                  <th className="px-6 py-3 font-medium">Date</th>
                  <th className="px-6 py-3 font-medium text-right">Amount</th>
                  <th className="px-6 py-3 font-medium">Payment</th>
                  <th className="px-6 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredReceipts.map((receipt) => (
                  <tr key={receipt.id} className="border-b border-border hover:bg-secondary/30">
                    <td className="px-6 py-4 font-mono">{receipt.receipt_number}</td>
                    <td className="px-6 py-4">{receipt.customer_name}</td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {new Date(receipt.created_at).toLocaleDateString("en-KE")}
                    </td>
                    <td className="px-6 py-4 text-right font-mono">{formatKES(receipt.total_amount)}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-sm px-2 py-1 text-xs font-medium ${
                        receipt.payment_method === "cash" ? "bg-green-500/10 text-green-600" :
                        receipt.payment_method === "mpesa" ? "bg-blue-500/10 text-blue-600" :
                        "bg-yellow-500/10 text-yellow-600"
                      }`}>
                        {receipt.payment_method.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setViewReceipt(receipt)}
                          className="text-muted-foreground hover:text-foreground"
                          title="View"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleSendWhatsApp(receipt)}
                          className="text-muted-foreground hover:text-foreground"
                          title="Send via WhatsApp"
                        >
                          <MessageCircle className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleSendSMS(receipt)}
                          className="text-muted-foreground hover:text-foreground"
                          title="Send via SMS"
                        >
                          <Phone className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handlePrint(receipt)}
                          className="text-muted-foreground hover:text-foreground"
                          title="Print"
                        >
                          <Printer className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Receipt Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-4xl rounded-xl bg-white p-6 shadow-lg" style={{ backgroundColor: "#0B1F3A" }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">New Receipt</h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setSelectedCustomer(null);
                  setCustomerSearch("");
                  setLineItems([{ description: "", quantity: 1, unit_price: 0 }]);
                  setPaymentMethod("cash");
                  setMpesaReference("");
                  setNotes("");
                  setError("");
                }}
                className="text-white hover:text-gray-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Form */}
              <div className="space-y-4">
                <div>
                  <label className="block mb-1 text-xs font-semibold uppercase tracking-wider text-gray-300">
                    Customer
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={customerSearch}
                      onChange={(e) => {
                        setCustomerSearch(e.target.value);
                        setShowCustomerDropdown(true);
                      }}
                      onFocus={() => setShowCustomerDropdown(true)}
                      className="h-10 w-full rounded-sm border border-input bg-white px-3 text-sm outline-none focus:border-ring"
                      placeholder="Search customer..."
                    />
                    {showCustomerDropdown && filteredCustomers.length > 0 && (
                      <div className="absolute z-10 mt-1 w-full rounded-sm border border-border bg-white shadow-lg max-h-48 overflow-y-auto">
                        {filteredCustomers.map((customer) => (
                          <button
                            key={customer.id}
                            onClick={() => {
                              setSelectedCustomer(customer);
                              setCustomerSearch(customer.business_name);
                              setShowCustomerDropdown(false);
                            }}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-secondary"
                          >
                            <div className="font-medium">{customer.business_name}</div>
                            {customer.contact_name && (
                              <div className="text-xs text-muted-foreground">{customer.contact_name}</div>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {selectedCustomer && (
                    <div className="mt-1 text-xs text-gray-400">
                      Phone: {selectedCustomer.phone}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block mb-1 text-xs font-semibold uppercase tracking-wider text-gray-300">
                    Date
                  </label>
                  <input
                    type="date"
                    value={receiptDate}
                    onChange={(e) => setReceiptDate(e.target.value)}
                    className="h-10 w-full rounded-sm border border-input bg-white px-3 text-sm outline-none focus:border-ring"
                  />
                </div>

                <div>
                  <label className="block mb-1 text-xs font-semibold uppercase tracking-wider text-gray-300">
                    Line Items
                  </label>
                  <div className="space-y-2">
                    {lineItems.map((item, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => handleLineItemChange(index, "description", e.target.value)}
                          className="flex-1 h-10 rounded-sm border border-input bg-white px-3 text-sm outline-none focus:border-ring"
                          placeholder="Item description"
                        />
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleLineItemChange(index, "quantity", parseFloat(e.target.value))}
                          className="w-20 h-10 rounded-sm border border-input bg-white px-3 text-sm outline-none focus:border-ring"
                          placeholder="Qty"
                        />
                        <input
                          type="number"
                          value={item.unit_price}
                          onChange={(e) => handleLineItemChange(index, "unit_price", parseFloat(e.target.value))}
                          className="w-24 h-10 rounded-sm border border-input bg-white px-3 text-sm outline-none focus:border-ring"
                          placeholder="Price"
                        />
                        <button
                          onClick={() => handleRemoveLineItem(index)}
                          className="text-red-500 hover:text-red-600"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={handleAddLineItem}
                      className="w-full h-10 rounded-sm border border-dashed border-gray-500 text-sm font-medium hover:bg-white/10 text-gray-300"
                    >
                      + Add Item
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block mb-1 text-xs font-semibold uppercase tracking-wider text-gray-300">
                    Payment Method
                  </label>
                  <div className="flex gap-4">
                    {["cash", "mpesa", "credit"].map((method) => (
                      <label key={method} className="flex items-center gap-2">
                        <input
                          type="radio"
                          value={method}
                          checked={paymentMethod === method}
                          onChange={(e) => setPaymentMethod(e.target.value as any)}
                          className="h-4 w-4"
                        />
                        <span className="text-sm text-white capitalize">{method}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {paymentMethod === "mpesa" && (
                  <div>
                    <label className="block mb-1 text-xs font-semibold uppercase tracking-wider text-gray-300">
                      M-Pesa Reference
                    </label>
                    <input
                      type="text"
                      value={mpesaReference}
                      onChange={(e) => setMpesaReference(e.target.value)}
                      className="h-10 w-full rounded-sm border border-input bg-white px-3 text-sm outline-none focus:border-ring"
                      placeholder="e.g., SJK7T2QH"
                    />
                  </div>
                )}

                <div>
                  <label className="block mb-1 text-xs font-semibold uppercase tracking-wider text-gray-300">
                    Notes (optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full h-20 rounded-sm border border-input bg-white px-3 py-2 text-sm resize-none outline-none focus:border-ring"
                    placeholder="Additional notes..."
                  />
                </div>

                {error && (
                  <div className="p-3 rounded-sm bg-red-500/10 text-red-600 text-sm">
                    {error}
                  </div>
                )}

                <div className="bg-white/10 p-3 rounded-sm">
                  <p className="text-sm text-gray-300">Total Amount</p>
                  <p className="text-2xl font-bold text-white">{formatKES(getTotalAmount())}</p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowCreateModal(false);
                      setSelectedCustomer(null);
                      setCustomerSearch("");
                      setLineItems([{ description: "", quantity: 1, unit_price: 0 }]);
                      setPaymentMethod("cash");
                      setMpesaReference("");
                      setNotes("");
                      setError("");
                    }}
                    className="flex-1 h-10 rounded-sm border border-white/30 bg-transparent text-white text-sm font-medium hover:bg-white/10"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateReceipt}
                    disabled={isSubmitting}
                    className="flex-1 h-10 rounded-sm bg-[#00AEEF] text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50"
                  >
                    {isSubmitting ? "Creating..." : "Create Receipt"}
                  </button>
                </div>
              </div>

              {/* Live Preview */}
              <div className="bg-white rounded-sm p-6 font-mono text-[13px] leading-relaxed">
                <div className="text-center">
                  <div className="text-base font-bold uppercase">{business.name}</div>
                  <div className="text-xs">Receipt #NP-XXXX</div>
                  <div className="text-xs">{new Date(receiptDate).toLocaleDateString("en-KE")}</div>
                </div>
                <div className="my-2 select-none text-center text-gray-400">{"-".repeat(34)}</div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Customer</span>
                  <span>{selectedCustomer?.business_name || "..."}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Method</span>
                  <span>{paymentMethod.toUpperCase()}</span>
                </div>
                {paymentMethod === "mpesa" && mpesaReference && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Ref</span>
                    <span>{mpesaReference}</span>
                  </div>
                )}
                <div className="my-2 select-none text-center text-gray-400">{"-".repeat(34)}</div>
                {lineItems.map((item, index) => (
                  item.description && (
                    <div key={index} className="flex justify-between">
                      <span className="pr-2">{item.description} x{item.quantity}</span>
                      <span>{formatKES(item.quantity * item.unit_price)}</span>
                    </div>
                  )
                ))}
                <div className="my-2 select-none text-center text-gray-400">{"-".repeat(34)}</div>
                <div className="flex justify-between text-base font-bold">
                  <span>TOTAL</span>
                  <span>{formatKES(getTotalAmount())}</span>
                </div>
                <div className="my-2 select-none text-center text-gray-400">{"-".repeat(34)}</div>
                <div className="text-center text-xs">
                  Thank you for your business!
                  <br />Powered by Nest Pilot
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Receipt Modal */}
      {viewReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Receipt #{viewReceipt.receipt_number}</h2>
              <button
                onClick={() => setViewReceipt(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="font-mono text-[13px] leading-relaxed">
              <div className="text-center">
                <div className="text-base font-bold uppercase">{business.name}</div>
                <div className="text-xs">Receipt #{viewReceipt.receipt_number}</div>
                <div className="text-xs">{new Date(viewReceipt.created_at).toLocaleDateString("en-KE")}</div>
              </div>
              <div className="my-2 select-none text-center text-gray-400">{"-".repeat(34)}</div>
              <div className="flex justify-between">
                <span className="text-gray-600">Customer</span>
                <span>{viewReceipt.customer_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Method</span>
                <span>{viewReceipt.payment_method.toUpperCase()}</span>
              </div>
              {viewReceipt.mpesa_reference && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Ref</span>
                  <span>{viewReceipt.mpesa_reference}</span>
                </div>
              )}
              <div className="my-2 select-none text-center text-gray-400">{"-".repeat(34)}</div>
              {viewReceipt.line_items.map((item, index) => (
                <div key={index} className="flex justify-between">
                  <span className="pr-2">{item.description} x{item.quantity}</span>
                  <span>{formatKES(item.quantity * item.unit_price)}</span>
                </div>
              ))}
              <div className="my-2 select-none text-center text-gray-400">{"-".repeat(34)}</div>
              <div className="flex justify-between text-base font-bold">
                <span>TOTAL</span>
                <span>{formatKES(viewReceipt.total_amount)}</span>
              </div>
              <div className="my-2 select-none text-center text-gray-400">{"-".repeat(34)}</div>
              <div className="text-center text-xs">
                Thank you for your business!
                <br />Powered by Nest Pilot
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              {viewReceipt.customer_phone && (
                <>
                  <button
                    onClick={() => handleSendWhatsApp(viewReceipt)}
                    className="flex h-12 flex-col items-center justify-center gap-1 rounded-lg bg-green-500 px-4 py-2 text-white hover:bg-green-600 transition-colors"
                  >
                    <MessageCircle className="h-4 w-4" />
                    <span className="text-xs font-semibold">WhatsApp</span>
                  </button>
                  <button
                    onClick={() => handleSendSMS(viewReceipt)}
                    className="flex h-12 flex-col items-center justify-center gap-1 rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 transition-colors"
                  >
                    <Phone className="h-4 w-4" />
                    <span className="text-xs font-semibold">SMS</span>
                  </button>
                </>
              )}
              <button
                onClick={() => handlePrint(viewReceipt)}
                className="flex h-12 flex-col items-center justify-center gap-1 rounded-lg bg-gray-600 px-4 py-2 text-white hover:bg-gray-700 transition-colors"
              >
                <Printer className="h-4 w-4" />
                <span className="text-xs font-semibold">Print</span>
              </button>
              <button
                onClick={() => setViewReceipt(null)}
                className="flex h-12 flex-col items-center justify-center gap-1 rounded-lg border-2 border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <X className="h-4 w-4" />
                <span className="text-xs font-semibold">Close</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
