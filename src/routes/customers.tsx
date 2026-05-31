import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { Search, Plus, MessageCircle, X, Clock, DollarSign } from "lucide-react";
import { supabase, type Transaction } from "@/lib/supabase";
import { formatDistanceToNow } from "date-fns";

interface Customer {
  id: string;
  user_id: string;
  name: string;
  phone: string | null;
  notes: string | null;
  created_at: string;
}

interface CustomerWithStats extends Customer {
  total_purchased: number;
  last_transaction_date: string | null;
  transaction_count: number;
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
  const [searchQuery, setSearchQuery] = useState("");
  const [customers, setCustomers] = useState<CustomerWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerWithStats | null>(null);
  const [customerTransactions, setCustomerTransactions] = useState<Transaction[]>([]);
  
  // Add Customer form state
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [newCustomerNotes, setNewCustomerNotes] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [duplicateWarning, setDuplicateWarning] = useState("");

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch customers
      const { data: customersData, error: customersError } = await supabase
        .from("customers")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (customersError) throw customersError;

      // Fetch transactions for each customer to calculate stats
      const customersWithStats = await Promise.all(
        (customersData || []).map(async (customer) => {
          const { data: transactionsData } = await supabase
            .from("transactions")
            .select("amount, created_at")
            .eq("customer_id", customer.id)
            .eq("type", "income");

          const transactions = transactionsData || [];
          const total_purchased = transactions.reduce((sum, t) => sum + Number(t.amount), 0);
          const last_transaction_date = transactions.length > 0
            ? transactions.reduce((latest, t) => 
                new Date(t.created_at) > new Date(latest.created_at) ? t : latest
              ).created_at
            : null;

          return {
            ...customer,
            total_purchased,
            last_transaction_date,
            transaction_count: transactions.length,
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
        customer.name.toLowerCase().includes(query) ||
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("customers")
        .select("name")
        .eq("user_id", user.id)
        .eq("phone", phone)
        .single();

      if (data) {
        setDuplicateWarning(`This number is already saved as ${data.name}`);
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
    if (!newCustomerName.trim()) return;
    
    const isValidPhone = validatePhone(newCustomerPhone);
    if (!isValidPhone) return;

    const isDuplicate = await checkDuplicatePhone(newCustomerPhone);
    if (isDuplicate) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("customers")
        .insert({
          user_id: user.id,
          name: newCustomerName,
          phone: newCustomerPhone,
          notes: newCustomerNotes || null,
        });

      if (error) throw error;

      setNewCustomerName("");
      setNewCustomerPhone("");
      setNewCustomerNotes("");
      setPhoneError("");
      setDuplicateWarning("");
      setShowAddModal(false);
      fetchCustomers();
    } catch (error) {
      console.error("Error adding customer:", error);
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
    const message = `Habari ${customer.name}!`;
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
            <div key={customer.id} className="rounded-sm border border-border bg-card p-5">
              <div className="mb-4">
                <h3 className="font-semibold text-lg">{customer.name}</h3>
                {customer.phone && (
                  <p className="text-sm text-muted-foreground">{customer.phone}</p>
                )}
              </div>
              
              <div className="mb-4 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Total Purchased:</span>
                  <span className="font-mono font-semibold">{formatKES(customer.total_purchased)}</span>
                </div>
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
                  className="flex-1 rounded-sm border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-secondary"
                >
                  View History
                </button>
                {customer.phone && (
                  <button
                    onClick={() => handleWhatsApp(customer)}
                    className="flex-1 rounded-sm border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-secondary"
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
                  setNewCustomerName("");
                  setNewCustomerPhone("");
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
                  Name *
                </label>
                <input
                  type="text"
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  className="h-10 w-full rounded-sm border border-input bg-background px-3 text-sm outline-none focus:border-ring"
                  placeholder="Customer name"
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
                  className="h-10 w-full rounded-sm border border-input bg-background px-3 text-sm outline-none focus:border-ring"
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
                  Notes (optional)
                </label>
                <textarea
                  value={newCustomerNotes}
                  onChange={(e) => setNewCustomerNotes(e.target.value)}
                  className="h-20 w-full rounded-sm border border-input bg-background px-3 text-sm outline-none focus:border-ring resize-none"
                  placeholder="Additional notes about this customer..."
                />
              </div>
            </div>

            <div className="mt-6 flex gap-2">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewCustomerName("");
                  setNewCustomerPhone("");
                  setNewCustomerNotes("");
                  setPhoneError("");
                  setDuplicateWarning("");
                }}
                className="flex-1 rounded-sm border border-border bg-background py-2.5 text-sm font-medium hover:bg-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleAddCustomer}
                className="flex-1 rounded-sm bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View History Modal */}
      {showHistoryModal && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30">
          <div className="w-full max-w-2xl rounded-sm border border-border bg-card p-6 m-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold">{selectedCustomer.name}</h3>
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
                <p className="text-center text-muted-foreground py-8">No transactions yet.</p>
              ) : (
                customerTransactions.map((txn) => (
                  <div key={txn.id} className="border-t border-border pt-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium">{txn.tag || "Uncategorized"}</p>
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
              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Total Spent</span>
                  <span className="font-mono font-bold text-lg">{formatKES(selectedCustomer.total_purchased)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
