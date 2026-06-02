import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Plus, Search, Filter, MoreHorizontal, Edit, Trash2, Send, FileText, X, ChevronDown } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatKES } from "@/lib/store";

export const Route = createFileRoute("/quotations")({
  component: Quotations,
  head: () => ({
    meta: [
      { title: "Quotations — Nest Pilot" },
      { name: "description", content: "Manage your quotations and convert to invoices." },
    ],
  }),
});

function Quotations() {
  const [quotations, setQuotations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchQuotations();
  }, []);

  const fetchQuotations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('quotations')
        .select(`
          *,
          customers (
            business_name,
            contact_name
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      setQuotations(data || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching quotations:', error);
      setLoading(false);
    }
  };

  const filteredQuotations = quotations.filter((quotation) => {
    const matchesFilter = filter === "all" || quotation.status === filter;
    const matchesSearch = 
      quotation.quotation_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      quotation.customers?.business_name?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const convertToInvoice = async (quotation: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Generate invoice number
      const { data: lastInvoice } = await supabase
        .from("invoices")
        .select("invoice_number")
        .eq("user_id", user.id)
        .order("invoice_number", { ascending: false })
        .limit(1);

      let invoiceNumber = "INV-0001";
      if (lastInvoice && lastInvoice.length > 0) {
        const lastNumber = parseInt(lastInvoice[0].invoice_number.replace("INV-", ""));
        invoiceNumber = `INV-${String(lastNumber + 1).padStart(4, '0')}`;
      }

      // Create invoice from quotation
      const { data: invoice, error: invoiceError } = await supabase
        .from("invoices")
        .insert({
          user_id: user.id,
          customer_id: quotation.customer_id,
          invoice_number,
          issue_date: new Date().toISOString().split('T')[0],
          due_date: quotation.valid_until || null,
          status: "sent",
          subtotal: quotation.subtotal,
          vat_rate: quotation.vat_rate,
          vat_amount: quotation.vat_amount,
          total_amount: quotation.total_amount,
          amount_paid: 0,
          notes: quotation.notes,
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Copy quotation items to invoice items
      const { data: quotationItems } = await supabase
        .from("quotation_items")
        .select("*")
        .eq("quotation_id", quotation.id);

      if (quotationItems) {
        const itemsToInsert = quotationItems.map((item: any) => ({
          invoice_id: invoice.id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
        }));

        await supabase.from("invoice_items").insert(itemsToInsert);
      }

      // Update quotation status
      await supabase
        .from("quotations")
        .update({ status: "converted" })
        .eq("id", quotation.id);

      fetchQuotations();
    } catch (error) {
      console.error("Error converting quotation to invoice:", error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Quotations</h1>
          <p className="text-sm text-muted-foreground">Manage your quotations and convert to invoices</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-[#3B82F6] px-4 py-2 text-sm font-semibold text-white hover:bg-[#3B82F6]/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Quotation
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search quotations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 w-full rounded-lg border border-[#E2E8F0] bg-white pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/20 transition-all"
          />
        </div>
        <div className="flex gap-2">
          {["all", "draft", "sent", "accepted", "rejected", "converted"].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                filter === status
                  ? "bg-[#EFF6FF] text-[#3B82F6]"
                  : "text-muted-foreground hover:bg-secondary/50"
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Quotations Table */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading quotations...</div>
        ) : filteredQuotations.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No quotations found</p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-[#3B82F6] px-4 py-2 text-sm font-semibold text-white hover:bg-[#3B82F6]/90 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Create your first quotation
            </button>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#E2E8F0] text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-6 py-3 font-medium">Customer</th>
                <th className="px-6 py-3 font-medium">Quotation #</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium text-right">Amount</th>
                <th className="px-6 py-3 font-medium">Valid Until</th>
                <th className="px-6 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredQuotations.map((quotation) => (
                <tr key={quotation.id} className="border-b border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EFF6FF] text-[#3B82F6] text-sm font-medium">
                        {(quotation.customers?.business_name || 'C').charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{quotation.customers?.business_name || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground">{quotation.customers?.contact_name || ''}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-mono text-muted-foreground">{quotation.quotation_number}</td>
                  <td className="px-6 py-4">
                    <QuotationStatusBadge status={quotation.status} />
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-sm font-medium text-foreground">
                    {formatKES(quotation.total_amount)}
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {quotation.valid_until ? new Date(quotation.valid_until).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {quotation.status === 'accepted' && (
                        <button
                          onClick={() => convertToInvoice(quotation)}
                          className="text-xs font-medium text-[#3B82F6] hover:text-[#3B82F6]/80 transition-colors"
                        >
                          Convert to Invoice
                        </button>
                      )}
                      <button className="text-muted-foreground hover:text-foreground transition-colors">
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showCreateForm && <CreateQuotationForm onClose={() => setShowCreateForm(false)} onSuccess={fetchQuotations} />}
    </div>
  );
}

function QuotationStatusBadge({ status }: { status: string }) {
  const styles = {
    draft: 'bg-[#F1F5F9] text-[#64748B]',
    sent: 'bg-[#DBEAFE] text-[#1E40AF]',
    accepted: 'bg-[#D1FAE5] text-[#065F46]',
    rejected: 'bg-[#FEE2E2] text-[#991B1B]',
    converted: 'bg-[#F1F5F9] text-[#64748B]',
  };

  const labels = {
    draft: 'Draft',
    sent: 'Sent',
    accepted: 'Accepted',
    rejected: 'Rejected',
    converted: 'Converted',
  };

  const style = styles[status as keyof typeof styles] || styles.draft;
  const label = labels[status as keyof typeof labels] || status;

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${style}`}>
      {label}
    </span>
  );
}

function CreateQuotationForm({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [quotationNumber, setQuotationNumber] = useState("");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [validUntil, setValidUntil] = useState("");
  const [lineItems, setLineItems] = useState([{ description: "", quantity: 1, unitPrice: 0 }]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCustomers();
    generateQuotationNumber();
  }, []);

  const fetchCustomers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("customers")
        .select("*")
        .eq("user_id", user.id)
        .order("business_name", { ascending: true });

      setCustomers(data || []);
    } catch (error) {
      console.error("Error fetching customers:", error);
    }
  };

  const generateQuotationNumber = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("quotations")
        .select("quotation_number")
        .eq("user_id", user.id)
        .order("quotation_number", { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        const lastNumber = parseInt(data[0].quotation_number.replace("QT-", ""));
        setQuotationNumber(`QT-${String(lastNumber + 1).padStart(4, '0')}`);
      } else {
        setQuotationNumber("QT-0001");
      }
    } catch (error) {
      console.error("Error generating quotation number:", error);
      setQuotationNumber("QT-0001");
    }
  };

  const filteredCustomers = customers.filter((c) =>
    c.business_name?.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.contact_name?.toLowerCase().includes(customerSearch.toLowerCase())
  );

  const subtotal = lineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  const vatAmount = subtotal * 0.16;
  const totalAmount = subtotal + vatAmount;

  const addLineItem = () => {
    setLineItems([...lineItems, { description: "", quantity: 1, unitPrice: 0 }]);
  };

  const removeLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const updateLineItem = (index: number, field: string, value: any) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    setLineItems(updated);
  };

  const handleSubmit = async () => {
    if (!selectedCustomer || lineItems.length === 0) return;
    
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: quotation, error: quotationError } = await supabase
        .from("quotations")
        .insert({
          user_id: user.id,
          customer_id: selectedCustomer.id,
          quotation_number: quotationNumber,
          issue_date: issueDate,
          valid_until: validUntil || null,
          status: "draft",
          subtotal,
          vat_rate: 16,
          vat_amount: vatAmount,
          total_amount: totalAmount,
          notes,
        })
        .select()
        .single();

      if (quotationError) throw quotationError;

      // Insert line items
      const itemsToInsert = lineItems.map((item) => ({
        quotation_id: quotation.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unitPrice,
      }));

      const { error: itemsError } = await supabase
        .from("quotation_items")
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error creating quotation:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl bg-white p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-foreground">New Quotation</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Customer Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="relative">
              <label className="block text-sm font-medium text-muted-foreground mb-1">Customer</label>
              <div className="relative">
                <input
                  type="text"
                  value={selectedCustomer ? selectedCustomer.business_name : customerSearch}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value);
                    setShowCustomerDropdown(true);
                  }}
                  onFocus={() => setShowCustomerDropdown(true)}
                  className="h-10 w-full rounded-lg border border-[#E2E8F0] bg-white px-3 text-sm outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/20"
                  placeholder="Search or add customer..."
                />
                {showCustomerDropdown && filteredCustomers.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full rounded-lg border border-[#E2E8F0] bg-white shadow-lg max-h-48 overflow-y-auto">
                    {filteredCustomers.map((customer) => (
                      <button
                        key={customer.id}
                        onClick={() => {
                          setSelectedCustomer(customer);
                          setCustomerSearch(customer.business_name);
                          setShowCustomerDropdown(false);
                        }}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-[#F8FAFC] transition-colors"
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
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Quotation Number</label>
              <input
                type="text"
                value={quotationNumber}
                onChange={(e) => setQuotationNumber(e.target.value)}
                className="h-10 w-full rounded-lg border border-[#E2E8F0] bg-white px-3 text-sm outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/20"
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Issue Date</label>
              <input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="h-10 w-full rounded-lg border border-[#E2E8F0] bg-white px-3 text-sm outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Valid Until</label>
              <input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="h-10 w-full rounded-lg border border-[#E2E8F0] bg-white px-3 text-sm outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/20"
              />
            </div>
          </div>

          {/* Line Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-muted-foreground">Line Items</label>
              <button onClick={addLineItem} className="text-sm text-[#3B82F6] hover:text-[#3B82F6]/80">
                + Add Item
              </button>
            </div>
            <div className="border border-[#E2E8F0] rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-[#F8FAFC]">
                  <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-2 font-medium">Description</th>
                    <th className="px-4 py-2 font-medium w-24">Qty</th>
                    <th className="px-4 py-2 font-medium w-32">Unit Price</th>
                    <th className="px-4 py-2 font-medium w-32 text-right">Total</th>
                    <th className="px-4 py-2 font-medium w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item, index) => (
                    <tr key={index} className="border-t border-[#E2E8F0]">
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => updateLineItem(index, "description", e.target.value)}
                          className="h-8 w-full rounded border border-[#E2E8F0] bg-white px-2 text-sm outline-none focus:border-[#3B82F6]"
                          placeholder="Item description"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateLineItem(index, "quantity", parseFloat(e.target.value) || 0)}
                          className="h-8 w-full rounded border border-[#E2E8F0] bg-white px-2 text-sm outline-none focus:border-[#3B82F6]"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) => updateLineItem(index, "unitPrice", parseFloat(e.target.value) || 0)}
                          className="h-8 w-full rounded border border-[#E2E8F0] bg-white px-2 text-sm outline-none focus:border-[#3B82F6]"
                        />
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-sm">
                        {formatKES(item.quantity * item.unitPrice)}
                      </td>
                      <td className="px-4 py-2">
                        <button
                          onClick={() => removeLineItem(index)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-mono">{formatKES(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">VAT (16%)</span>
                <span className="font-mono">{formatKES(vatAmount)}</span>
              </div>
              <div className="flex justify-between text-lg font-semibold pt-2 border-t border-[#E2E8F0]">
                <span>Total</span>
                <span className="font-mono text-[#3B82F6]">{formatKES(totalAmount)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/20"
              placeholder="Add any notes or terms..."
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-[#E2E8F0]">
            <button
              onClick={onClose}
              className="flex-1 rounded-lg border border-[#E2E8F0] px-4 py-2 text-sm font-medium text-foreground hover:bg-[#F8FAFC] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || !selectedCustomer}
              className="flex-1 rounded-lg bg-[#3B82F6] px-4 py-2 text-sm font-semibold text-white hover:bg-[#3B82F6]/90 transition-colors disabled:opacity-50"
            >
              {loading ? "Saving..." : "Save Quotation"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
