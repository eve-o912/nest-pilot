import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { Plus, AlertTriangle, MessageCircle, X, Calendar, DollarSign, Users, Clock } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { format, isPast, isToday } from "date-fns";

interface Credit {
  id: string;
  user_id: string;
  customer_name: string;
  customer_phone: string | null;
  amount_owed: number;
  amount_paid: number;
  description: string | null;
  due_date: string | null;
  status: "unpaid" | "partial" | "paid";
  created_at: string;
}

export const Route = createFileRoute("/credits")({
  component: Credits,
  head: () => ({
    meta: [
      { title: "Mkopo — Nest Pilot" },
      { name: "description", content: "Track credits and debts owed to you." },
    ],
  }),
});

function Credits() {
  const [credits, setCredits] = useState<Credit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPaid, setShowPaid] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedCredit, setSelectedCredit] = useState<Credit | null>(null);
  
  // Add Credit form state
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  
  // Payment form state
  const [paymentAmount, setPaymentAmount] = useState("");

  useEffect(() => {
    fetchCredits();
  }, [showPaid]);

  const fetchCredits = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("credits")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCredits(data || []);
    } catch (error) {
      console.error("Error fetching credits:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCredits = useMemo(() => {
    let filtered = showPaid 
      ? credits 
      : credits.filter(c => c.status !== "paid");
    
    // Sort: overdue first, then by amount_owed DESC
    return filtered.sort((a, b) => {
      const aOverdue = a.due_date && isPast(new Date(a.due_date)) && a.status !== "paid";
      const bOverdue = b.due_date && isPast(new Date(b.due_date)) && b.status !== "paid";
      
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;
      
      const aBalance = Number(a.amount_owed) - Number(a.amount_paid);
      const bBalance = Number(b.amount_owed) - Number(b.amount_paid);
      return bBalance - aBalance;
    });
  }, [credits, showPaid]);

  const summary = useMemo(() => {
    const activeCredits = credits.filter(c => c.status !== "paid");
    const totalOwed = activeCredits.reduce((sum, c) => 
      sum + (Number(c.amount_owed) - Number(c.amount_paid)), 0
    );
    const debtorCount = activeCredits.length;
    const overdueCount = activeCredits.filter(c => 
      c.due_date && isPast(new Date(c.due_date))
    ).length;

    return { totalOwed, debtorCount, overdueCount };
  }, [credits]);

  const formatKES = (amount: number) => {
    return `KES ${amount.toLocaleString("en-KE", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  };

  const handleAddCredit = async () => {
    if (!newCustomerName.trim() || !newDescription.trim() || !newAmount) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("credits")
        .insert({
          user_id: user.id,
          customer_name: newCustomerName,
          customer_phone: newCustomerPhone || null,
          amount_owed: parseFloat(newAmount),
          amount_paid: 0,
          description: newDescription,
          due_date: newDueDate || null,
        });

      if (error) throw error;

      setNewCustomerName("");
      setNewCustomerPhone("");
      setNewDescription("");
      setNewAmount("");
      setNewDueDate("");
      setShowAddModal(false);
      fetchCredits();
    } catch (error) {
      console.error("Error adding credit:", error);
    }
  };

  const handleRecordPayment = async () => {
    if (!selectedCredit || !paymentAmount) return;

    try {
      const newAmountPaid = Number(selectedCredit.amount_paid) + parseFloat(paymentAmount);
      
      const { error } = await supabase
        .from("credits")
        .update({ amount_paid: newAmountPaid })
        .eq("id", selectedCredit.id);

      if (error) throw error;

      setPaymentAmount("");
      setShowPaymentModal(false);
      setSelectedCredit(null);
      fetchCredits();
    } catch (error) {
      console.error("Error recording payment:", error);
    }
  };

  const handleRemind = (credit: Credit) => {
    if (!credit.customer_phone) return;
    
    const balance = Number(credit.amount_owed) - Number(credit.amount_paid);
    const dueDateText = credit.due_date 
      ? format(new Date(credit.due_date), "MMM d, yyyy")
      : "as soon as possible";
    
    const message = `Habari ${credit.customer_name}, ukumbusho wa deni la ${formatKES(balance)}. Tafadhali lipa hadi ${dueDateText}. - Nest Pilot`;
    const encodedMessage = encodeURIComponent(message);
    const phoneWithoutZero = credit.customer_phone.replace(/^0/, "");
    window.open(`https://wa.me/254${phoneWithoutZero}?text=${encodedMessage}`, "_blank");
  };

  const getStatusBadge = (status: Credit["status"]) => {
    switch (status) {
      case "unpaid":
        return <span className="px-2 py-1 rounded-full text-xs font-semibold bg-destructive text-destructive-foreground">Hajalipa</span>;
      case "partial":
        return <span className="px-2 py-1 rounded-full text-xs font-semibold bg-warning text-warning-foreground">Amelipa Kidogo</span>;
      case "paid":
        return <span className="px-2 py-1 rounded-full text-xs font-semibold bg-success text-success-foreground">Amelipa</span>;
    }
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
      {/* Header */}
      <section className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Mkopo</h1>
          <p className="text-sm text-muted-foreground">
            Track credits and debts owed to you
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowPaid(!showPaid)}
            className={
              "px-4 py-2 text-sm font-medium transition-colors rounded-sm border border-border " +
              (showPaid
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground hover:bg-secondary")
            }
          >
            {showPaid ? "Hide Paid" : "Show Paid"}
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center justify-center gap-2 rounded-sm bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> Mkopo Mpya
          </button>
        </div>
      </section>

      {/* Summary Cards */}
      <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <SummaryCard
          label="Wanakudai"
          value={formatKES(summary.totalOwed)}
          color="red"
          icon={<DollarSign className="h-4 w-4" />}
        />
        <SummaryCard
          label="Wadeni"
          value={`${summary.debtorCount} people`}
          color="orange"
          icon={<Users className="h-4 w-4" />}
        />
        <SummaryCard
          label="Imechelewa"
          value={`${summary.overdueCount} entries`}
          color="dark-red"
          icon={<AlertTriangle className="h-4 w-4" />}
        />
      </section>

      {/* Credit List */}
      {filteredCredits.length === 0 ? (
        <section className="flex flex-col items-center justify-center py-20">
          <div className="text-center">
            <p className="text-lg font-medium text-muted-foreground">
              No debts. Congratulations!
            </p>
          </div>
        </section>
      ) : (
        <section className="space-y-3">
          {filteredCredits.map((credit) => {
            const balance = Number(credit.amount_owed) - Number(credit.amount_paid);
            const progressPercent = (Number(credit.amount_paid) / Number(credit.amount_owed)) * 100;
            const isOverdue = credit.due_date && isPast(new Date(credit.due_date)) && credit.status !== "paid";

            return (
              <div key={credit.id} className="rounded-sm border border-border bg-card p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-lg">{credit.customer_name}</h3>
                      {getStatusBadge(credit.status)}
                    </div>
                    {credit.customer_phone && (
                      <p className="text-sm text-muted-foreground mb-2">{credit.customer_phone}</p>
                    )}
                    {credit.description && (
                      <p className="text-sm text-muted-foreground mb-2">{credit.description}</p>
                    )}
                    
                    {/* Progress Bar */}
                    <div className="mb-2">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground">
                          {formatKES(Number(credit.amount_paid))} paid of {formatKES(Number(credit.amount_owed))}
                        </span>
                        <span className="font-mono font-semibold">{formatKES(balance)} remaining</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300 bg-success"
                          style={{ width: `${Math.min(progressPercent, 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Due Date */}
                    {credit.due_date && (
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className={isOverdue ? "text-destructive font-semibold" : "text-muted-foreground"}>
                          Due: {format(new Date(credit.due_date), "MMM d, yyyy")}
                        </span>
                        {isOverdue && (
                          <span className="text-destructive font-semibold flex items-center gap-1">
                            <AlertTriangle className="h-4 w-4" /> Imechelewa
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 sm:flex-col">
                    {credit.status !== "paid" && (
                      <button
                        onClick={() => {
                          setSelectedCredit(credit);
                          setShowPaymentModal(true);
                        }}
                        className="px-4 py-2 text-sm font-medium rounded-sm bg-primary text-primary-foreground hover:opacity-90"
                      >
                        Lipa
                      </button>
                    )}
                    {credit.customer_phone && (
                      <button
                        onClick={() => handleRemind(credit)}
                        className="px-4 py-2 text-sm font-medium rounded-sm border border-border bg-background hover:bg-secondary"
                      >
                        <MessageCircle className="h-4 w-4 inline mr-1" /> Kumbushia
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </section>
      )}

      {/* Add Credit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30">
          <div className="w-full max-w-md rounded-sm border border-border bg-card p-6 m-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Mkopo Mpya</h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewCustomerName("");
                  setNewCustomerPhone("");
                  setNewDescription("");
                  setNewAmount("");
                  setNewDueDate("");
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Jina *
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
                  Simu (optional)
                </label>
                <input
                  type="tel"
                  value={newCustomerPhone}
                  onChange={(e) => setNewCustomerPhone(e.target.value)}
                  className="h-10 w-full rounded-sm border border-input bg-background px-3 text-sm outline-none focus:border-ring"
                  placeholder="0712345678"
                />
              </div>
              
              <div>
                <label className="block mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Alichonunua *
                </label>
                <input
                  type="text"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="h-10 w-full rounded-sm border border-input bg-background px-3 text-sm outline-none focus:border-ring"
                  placeholder="What they bought on credit"
                />
              </div>
              
              <div>
                <label className="block mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Kiasi *
                </label>
                <input
                  type="number"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  className="h-10 w-full rounded-sm border border-input bg-background px-3 font-mono text-sm outline-none focus:border-ring"
                  placeholder="0"
                />
              </div>
              
              <div>
                <label className="block mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Tarehe ya Kulipa (optional)
                </label>
                <input
                  type="date"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  className="h-10 w-full rounded-sm border border-input bg-background px-3 text-sm outline-none focus:border-ring"
                />
              </div>
            </div>

            <div className="mt-6 flex gap-2">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewCustomerName("");
                  setNewCustomerPhone("");
                  setNewDescription("");
                  setNewAmount("");
                  setNewDueDate("");
                }}
                className="flex-1 rounded-sm border border-border bg-background py-2.5 text-sm font-medium hover:bg-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleAddCredit}
                className="flex-1 rounded-sm bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedCredit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30">
          <div className="w-full max-w-md rounded-sm border border-border bg-card p-6 m-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Lipa</h3>
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setSelectedCredit(null);
                  setPaymentAmount("");
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">{selectedCredit.customer_name}</p>
                <p className="text-2xl font-mono font-bold">
                  {formatKES(Number(selectedCredit.amount_owed) - Number(selectedCredit.amount_paid))}
                </p>
                <p className="text-xs text-muted-foreground">current balance</p>
              </div>
              
              <div>
                <label className="block mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Kiasi alicholipa?
                </label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="h-10 w-full rounded-sm border border-input bg-background px-3 font-mono text-sm outline-none focus:border-ring"
                  placeholder="0"
                />
              </div>
            </div>

            <div className="mt-6 flex gap-2">
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setSelectedCredit(null);
                  setPaymentAmount("");
                }}
                className="flex-1 rounded-sm border border-border bg-background py-2.5 text-sm font-medium hover:bg-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleRecordPayment}
                className="flex-1 rounded-sm bg-success py-2.5 text-sm font-semibold text-success-foreground hover:opacity-90"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function SummaryCard({ label, value, color, icon }: { label: string; value: string; color: string; icon: React.ReactNode }) {
  const getColorClass = () => {
    switch (color) {
      case "red":
        return "text-destructive";
      case "orange":
        return "text-warning";
      case "dark-red":
        return "text-destructive";
      default:
        return "text-foreground";
    }
  };

  return (
    <div className="rounded-sm border border-border bg-card p-5">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className={`mt-2 font-mono text-3xl font-bold leading-tight tabular-nums ${getColorClass()}`}>
        {value}
      </div>
    </div>
  );
}
