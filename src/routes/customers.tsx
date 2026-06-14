import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { Search, Plus, MessageCircle, X, Clock, DollarSign, MoreHorizontal, Phone, Mail, MapPin } from "lucide-react";
import { supabase, type Transaction } from "@/lib/supabase";
import { formatDistanceToNow } from "date-fns";
import { formatKES, useStore } from "@/lib/store";

interface Customer {
  id: string;
  user_id: string;
  business_name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  kra_pin: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
}

interface CustomerWithStats extends Customer {
  total_purchased: number;
  outstanding_balance: number;
  last_transaction_date: string | null;
  transaction_count: number;
  reliability_score: 'excellent' | 'good' | 'late' | 'high_risk';
}

export const Route = createFileRoute("/customers")({
  component: Customers,
  head: () => ({
    meta: [
      { title: "Customers — Nest Pilot" },
      { name: "description", content: "Manage your customer relationships." },
    ],
  }),
});

function Customers() {
  const session = useStore((s) => s.session);
  const [searchQuery, setSearchQuery] = useState("");
  const [customers, setCustomers] = useState<CustomerWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerWithStats | null>(null);
  const [customerTransactions, setCustomerTransactions] = useState<Transaction[]>([]);
  
  // Add Customer form state
  const [newBusinessName, setNewBusinessName] = useState("");
  const [newContactName, setNewContactName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [newCustomerEmail, setNewCustomerEmail] = useState("");
  const [newKraPin, setNewKraPin] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newCustomerNotes, setNewCustomerNotes] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [duplicateWarning, setDuplicateWarning] = useState("");
  const [saveError, setSaveError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      if (!session?.user) return;

      // Fetch customers
      const { data: customersData, error: customersError } = await supabase
        .from("customers")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (customersError) throw customersError;

      // Fetch invoices for each customer to calculate stats
      const customersWithStats = await Promise.all(
        (customersData || []).map(async (customer) => {
          const { data: invoicesData } = await supabase
            .from("invoices")
            .select("total_amount, amount_due, created_at, status")
            .eq("customer_id", customer.id);

          const invoices = invoicesData || [];
          const total_purchased = invoices.reduce((sum, i) => sum + Number(i.total_amount), 0);
          const outstanding_balance = invoices
            .filter(i => i.status === 'unpaid' || i.status === 'partial' || i.status === 'overdue')
            .reduce((sum, i) => sum + Number(i.amount_due), 0);
          const last_transaction_date = invoices.length > 0
            ? invoices.reduce((latest, i) => 
                new Date(i.created_at) > new Date(latest.created_at) ? i : latest
              ).created_at
            : null;

          // Calculate reliability score based on payment history
          const paidInvoices = invoices.filter(i => i.status === 'paid').length;
          const totalInvoices = invoices.length;
          let reliability_score: 'excellent' | 'good' | 'late' | 'high_risk' = 'good';
          if (totalInvoices > 0) {
            const onTimeRatio = paidInvoices / totalInvoices;
            if (onTimeRatio >= 0.9) reliability_score = 'excellent';
            else if (onTimeRatio >= 0.7) reliability_score = 'good';
            else if (onTimeRatio >= 0.5) reliability_score = 'late';
            else reliability_score = 'high_risk';
          }

          return {
            ...customer,
            total_purchased,
            outstanding_balance,
            last_transaction_date,
            transaction_count: invoices.length,
            reliability_score,
          };
        })
      );

      setCustomers(customersWithStats);
    } catch (error) {
      console.error("Error fetching customers:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return customers;
    
    const query = searchQuery.toLowerCase();
    return customers.filter(
      (customer) =>
        customer.business_name.toLowerCase().includes(query) ||
        (customer.contact_name && customer.contact_name.toLowerCase().includes(query)) ||
        (customer.phone && customer.phone.includes(query))
    );
  }, [customers, searchQuery]);

  const validatePhone = (phone: string) => {
    const regex = /^(07|01)[0-9]{8}$/;
    if (!phone) {
      setPhoneError("Phone number is required");
      return false;
    }
    if (!regex.test(phone)) {
      setPhoneError("Enter a valid Kenyan number e.g. 0712345678");
      return false;
    }
    setPhoneError("");
    return true;
  };

  const checkDuplicatePhone = async (phone: string) => {
    try {
      if (!session?.user) return;

      const { data } = await supabase
        .from("customers")
        .select("business_name")
        .eq("user_id", session.user.id)
        .eq("phone", phone)
        .single();

      if (data) {
        setDuplicateWarning(`This number is already saved as ${data.business_name}`);
        return true;
      }
      setDuplicateWarning("");
      return false;
    } catch (error) {
      // No duplicate found
      setDuplicateWarning("");
      return false;
    }
  };

  const handleAddCustomer = async () => {
    if (!newBusinessName.trim()) {
      setSaveError("Business name is required");
      return;
    }
    
    const isValidPhone = validatePhone(newCustomerPhone);
    if (!isValidPhone) return;

    const isDuplicate = await checkDuplicatePhone(newCustomerPhone);
    if (isDuplicate) return;

    setIsSaving(true);
    setSaveError("");
    try {
      if (!session?.user) {
        setSaveError("User not authenticated");
        return;
      }

      const { error } = await supabase
        .from("customers")
        .insert({
          user_id: session.user.id,
          business_name: newBusinessName,
          contact_name: newContactName || null,
          phone: newCustomerPhone,
          email: newCustomerEmail || null,
          kra_pin: newKraPin || null,
          address: newAddress || null,
          notes: newCustomerNotes || null,
        });

      if (error) throw error;

      setNewBusinessName("");
      setNewContactName("");
      setNewCustomerPhone("");
      setNewCustomerEmail("");
      setNewKraPin("");
      setNewAddress("");
      setNewCustomerNotes("");
      setPhoneError("");
      setDuplicateWarning("");
      setShowAddModal(false);
      fetchCustomers();
    } catch (error: any) {
      console.error("Error adding customer:", error);
      setSaveError(error.message || "Failed to save customer");
    } finally {
      setIsSaving(false);
    }
  };

  const handleViewHistory = async (customer: CustomerWithStats) => {
    setSelectedCustomer(customer);
    setShowHistoryModal(true);
    
    try {
      const { data } = await supabase
        .from("transactions")
        .select("*")
        .eq("customer_id", customer.id)
        .order("created_at", { ascending: false });

      setCustomerTransactions(data || []);
    } catch (error) {
      console.error("Error fetching customer transactions:", error);
    }
  };

  const handleWhatsApp = (customer: Customer) => {
    if (!customer.phone) return;
    const message = `Habari ${customer.business_name}!`;
    const encodedMessage = encodeURIComponent(message);
    const phoneWithoutZero = customer.phone.replace(/^0/, "");
    window.open(`https://wa.me/254${phoneWithoutZero}?text=${encodedMessage}`, "_blank");
  };

  const formatKES = (amount: number) => {
    return `KES ${amount.toLocaleString("en-KE", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  };

  if (loading) {
    return (
      <main className="mx-auto max-w-[1600px] px-6 pb-16">
        <div className="flex items-center justify-center py-20">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-[1600px] px-6 pb-16">
      {/* Header with Search and Add Button */}
      <section className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Customers</h1>
          <p className="text-sm text-muted-foreground">
            Manage your customer relationships
          </p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              placeholder="Search customers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 w-64 rounded-sm border border-input bg-background pl-8 pr-3 text-sm outline-none focus:border-ring"
            />
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center justify-center gap-2 rounded-sm bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> Add Customer
          </button>
        </div>
      </section>

      {/* Customer List */}
      {filteredCustomers.length === 0 ? (
        <section className="flex flex-col items-center justify-center py-20">
          <div className="text-center">
            <p className="text-lg font-medium text-muted-foreground">
              {searchQuery ? "No customers match your search." : "No customers yet."}
            </p>
          </div>
        </section>
      ) : (
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredCustomers.map((customer) => (
            <div key={customer.id} className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-lg text-foreground">{customer.business_name}</h3>
                  <ReliabilityBadge score={customer.reliability_score} />
                </div>
                {customer.contact_name && (
                  <p className="text-sm text-muted-foreground">{customer.contact_name}</p>
                )}
                {customer.phone && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {customer.phone}
                  </p>
                )}
              </div>
              
              <div className="mb-4 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Total Purchased:</span>
                  <span className="font-mono font-semibold text-foreground">{formatKES(customer.total_purchased)}</span>
                </div>
                {customer.outstanding_balance > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="h-4 w-4 text-destructive" />
                    <span className="text-muted-foreground">Outstanding:</span>
                    <span className="font-mono font-semibold text-destructive">{formatKES(customer.outstanding_balance)}</span>
                  </div>
                )}
                {customer.last_transaction_date && (
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Last transaction:</span>
                    <span>{formatDistanceToNow(new Date(customer.last_transaction_date), { addSuffix: true })}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleViewHistory(customer)}
                  className="flex-1 rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm font-medium hover:bg-[#F8FAFC] transition-colors"
                >
                  View History
                </button>
                {customer.phone && (
                  <button
                    onClick={() => handleWhatsApp(customer)}
                    className="flex-1 rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm font-medium hover:bg-[#F8FAFC] transition-colors"
                  >
                    <MessageCircle className="h-4 w-4 inline mr-1" /> WhatsApp
                  </button>
                )}
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30">
          <div className="w-full max-w-md rounded-sm border border-border bg-card p-6 m-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Add Customer</h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewBusinessName("");
                  setNewContactName("");
                  setNewCustomerPhone("");
                  setNewCustomerEmail("");
                  setNewKraPin("");
                  setNewAddress("");
                  setNewCustomerNotes("");
                  setPhoneError("");
                  setDuplicateWarning("");
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Business Name *
                </label>
                <input
                  type="text"
                  value={newBusinessName}
                  onChange={(e) => setNewBusinessName(e.target.value)}
                  className="h-10 w-full rounded-lg border border-[#E2E8F0] bg-white px-3 text-sm outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/20"
                  placeholder="Business name"
                />
              </div>
              
              <div>
                <label className="block mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Contact Name
                </label>
                <input
                  type="text"
                  value={newContactName}
                  onChange={(e) => setNewContactName(e.target.value)}
                  className="h-10 w-full rounded-lg border border-[#E2E8F0] bg-white px-3 text-sm outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/20"
                  placeholder="Contact person name"
                />
              </div>
              
              <div>
                <label className="block mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Phone *
                </label>
                <input
                  type="tel"
                  value={newCustomerPhone}
                  onChange={(e) => {
                    setNewCustomerPhone(e.target.value);
                    validatePhone(e.target.value);
                  }}
                  onBlur={() => {
                    if (newCustomerPhone) checkDuplicatePhone(newCustomerPhone);
                  }}
                  className="h-10 w-full rounded-lg border border-[#E2E8F0] bg-white px-3 text-sm outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/20"
                  placeholder="0712345678"
                />
                {phoneError && (
                  <p className="mt-1 text-xs text-destructive">{phoneError}</p>
                )}
                {duplicateWarning && (
                  <p className="mt-1 text-xs text-warning">{duplicateWarning}</p>
                )}
              </div>

              <div>
                <label className="block mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Email
                </label>
                <input
                  type="email"
                  value={newCustomerEmail}
                  onChange={(e) => setNewCustomerEmail(e.target.value)}
                  className="h-10 w-full rounded-lg border border-[#E2E8F0] bg-white px-3 text-sm outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/20"
                  placeholder="email@example.com"
                />
              </div>

              <div>
                <label className="block mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  KRA PIN
                </label>
                <input
                  type="text"
                  value={newKraPin}
                  onChange={(e) => setNewKraPin(e.target.value)}
                  className="h-10 w-full rounded-lg border border-[#E2E8F0] bg-white px-3 text-sm outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/20"
                  placeholder="A00XXXXXXXXX"
                />
              </div>

              <div>
                <label className="block mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Address
                </label>
                <input
                  type="text"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  className="h-10 w-full rounded-lg border border-[#E2E8F0] bg-white px-3 text-sm outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/20"
                  placeholder="Physical address"
                />
              </div>
              
              <div>
                <label className="block mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Notes (optional)
                </label>
                <textarea
                  value={newCustomerNotes}
                  onChange={(e) => setNewCustomerNotes(e.target.value)}
                  className="h-20 w-full rounded-lg border border-[#E2E8F0] bg-white px-3 text-sm outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/20 resize-none"
                  placeholder="Additional notes about this customer..."
                />
              </div>
            </div>

            {saveError && (
              <div className="p-3 rounded-lg bg-[#FEE2E2] text-[#991B1B] text-sm">
                {saveError}
              </div>
            )}
            <div className="mt-6 flex gap-2">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewBusinessName("");
                  setNewContactName("");
                  setNewCustomerPhone("");
                  setNewCustomerEmail("");
                  setNewKraPin("");
                  setNewAddress("");
                  setNewCustomerNotes("");
                  setPhoneError("");
                  setDuplicateWarning("");
                  setSaveError("");
                }}
                className="flex-1 rounded-lg border border-[#E2E8F0] bg-white px-4 py-2.5 text-sm font-medium hover:bg-[#F8FAFC] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddCustomer}
                disabled={isSaving}
                className="flex-1 rounded-lg bg-[#3B82F6] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#3B82F6]/90 transition-colors disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View History Modal */}
      {showHistoryModal && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-2xl rounded-xl border border-[#E2E8F0] bg-white p-6 m-4 max-h-[90vh] overflow-y-auto shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground">{selectedCustomer.business_name}</h3>
                {selectedCustomer.contact_name && (
                  <p className="text-sm text-muted-foreground">{selectedCustomer.contact_name}</p>
                )}
                {selectedCustomer.phone && (
                  <p className="text-sm text-muted-foreground">{selectedCustomer.phone}</p>
                )}
              </div>
              <button
                onClick={() => {
                  setShowHistoryModal(false);
                  setSelectedCustomer(null);
                  setCustomerTransactions([]);
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              {customerTransactions.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No invoices yet.</p>
              ) : (
                customerTransactions.map((txn) => (
                  <div key={txn.id} className="border-t border-[#E2E8F0] pt-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium text-foreground">{txn.tag || "Uncategorized"}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(txn.created_at).toLocaleDateString("en-KE", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      <p className="font-mono font-semibold text-success">
                        +{formatKES(Number(txn.amount))}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {customerTransactions.length > 0 && (
              <div className="mt-4 pt-4 border-t border-[#E2E8F0]">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-foreground">Total Spent</span>
                  <span className="font-mono font-bold text-lg text-[#3B82F6]">{formatKES(selectedCustomer.total_purchased)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

function ReliabilityBadge({ score }: { score: 'excellent' | 'good' | 'late' | 'high_risk' }) {
  const styles = {
    excellent: 'bg-[#D1FAE5] text-[#065F46]',
    good: 'bg-[#DBEAFE] text-[#1E40AF]',
    late: 'bg-[#FEF3C7] text-[#92400E]',
    high_risk: 'bg-[#FEE2E2] text-[#991B1B]',
  };

  const labels = {
    excellent: 'Excellent',
    good: 'Good',
    late: 'Late',
    high_risk: 'High Risk',
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[score]}`}>
      {labels[score]}
    </span>
  );
}
