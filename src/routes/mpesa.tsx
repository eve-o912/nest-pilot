import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo, useRef } from "react";
import { Plus, Check, AlertTriangle, X, DollarSign, Clock, Bell } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { format, formatDistanceToNow } from "date-fns";
import { useStore } from "@/lib/store";

interface MpesaTransaction {
  id: string;
  user_id: string;
  mpesa_receipt_no: string;
  transaction_type: string;
  amount: number;
  phone_number: string | null;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  bill_ref_number: string | null;
  org_account_balance: number | null;
  transaction_time: string;
  raw_payload: any;
  matched: boolean;
  transaction_id: string | null;
  created_at: string;
}

interface Transaction {
  id: string;
  user_id: string;
  type: 'income' | 'expense';
  amount: number;
  tag: string;
  created_at: string;
}

export const Route = createFileRoute("/mpesa")({
  component: Mpesa,
  head: () => ({
    meta: [
      { title: "M-Pesa — Nest Pilot" },
      { name: "description", content: "View and manage M-Pesa transactions." },
    ],
  }),
});

function Mpesa() {
  const session = useStore((s) => s.session);
  const [transactions, setTransactions] = useState<MpesaTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<MpesaTransaction | null>(null);
  const [nearbyTransactions, setNearbyTransactions] = useState<Transaction[]>([]);
  const [toast, setToast] = useState<{ show: boolean; message: string }>({ show: false, message: "" });
  const audioContextRef = useRef<AudioContext | null>(null);
  const [showSandboxTest, setShowSandboxTest] = useState(false);
  const [testAmount, setTestAmount] = useState("100");
  const [testPhone, setTestPhone] = useState("254708374149");
  const [testRef, setTestRef] = useState("test001");

  useEffect(() => {
    fetchTransactions();
    setupRealtimeSubscription();
  }, []);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      if (!session?.user) return;

      const { data, error } = await supabase
        .from("mpesa_transactions")
        .select("*")
        .eq("user_id", session.user.id)
        .order("transaction_time", { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error("Error fetching M-Pesa transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel("mpesa_transactions")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "mpesa_transactions",
        },
        (payload) => {
          const newTx = payload.new as MpesaTransaction;
          setTransactions((prev) => [newTx, ...prev]);
          showNotification(newTx);
          playChime();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "mpesa_transactions",
        },
        (payload) => {
          const updatedTx = payload.new as MpesaTransaction;
          setTransactions((prev) =>
            prev.map((tx) => (tx.id === updatedTx.id ? updatedTx : tx))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const showNotification = (tx: MpesaTransaction) => {
    const name = [tx.first_name, tx.middle_name, tx.last_name].filter(Boolean).join(" ");
    setToast({
      show: true,
      message: `💚 M-Pesa Imepokelewa! KES ${tx.amount.toLocaleString()} kutoka ${name}`,
    });
    setTimeout(() => setToast({ show: false, message: "" }), 5000);
  };

  const playChime = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    const audioContext = audioContextRef.current;
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = "sine";
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  };

  const summary = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayTransactions = transactions.filter(
      (tx) => new Date(tx.transaction_time) >= today
    );

    const todayTotal = todayTransactions.reduce((sum, tx) => sum + Number(tx.amount), 0);
    const todayCount = todayTransactions.length;
    const unmatched = transactions.filter((tx) => !tx.matched).length;

    return { todayTotal, todayCount, unmatched };
  }, [transactions]);

  const formatKES = (amount: number) => {
    return `KES ${amount.toLocaleString("en-KE", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  };

  const handleMatch = async (tx: MpesaTransaction) => {
    setSelectedTransaction(tx);
    setShowMatchModal(true);

    try {
      if (!session?.user) return;

      const tenMinutesAgo = new Date(new Date(tx.transaction_time).getTime() - 10 * 60 * 1000).toISOString();
      const tenMinutesLater = new Date(new Date(tx.transaction_time).getTime() + 10 * 60 * 1000).toISOString();
      const amount = Number(tx.amount);

      const { data } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", session.user.id)
        .eq("type", "income")
        .gte("amount", amount - 1)
        .lte("amount", amount + 1)
        .gte("created_at", tenMinutesAgo)
        .lte("created_at", tenMinutesLater)
        .is("matched_receipt", null);

      setNearbyTransactions(data || []);
    } catch (error) {
      console.error("Error fetching nearby transactions:", error);
    }
  };

  const handleSelectTransaction = async (transactionId: string) => {
    if (!selectedTransaction) return;

    try {
      await supabase
        .from("mpesa_transactions")
        .update({ matched: true, transaction_id: transactionId })
        .eq("id", selectedTransaction.id);

      await supabase
        .from("transactions")
        .update({ matched_receipt: selectedTransaction.mpesa_receipt_no })
        .eq("id", transactionId);

      setShowMatchModal(false);
      setSelectedTransaction(null);
      setNearbyTransactions([]);
      fetchTransactions();
    } catch (error) {
      console.error("Error matching transaction:", error);
    }
  };

  const handleCreateTransaction = async (tx: MpesaTransaction) => {
    try {
      if (!session?.user) return;

      const name = [tx.first_name, tx.middle_name, tx.last_name].filter(Boolean).join(" ");
      const description = `${name} - ${tx.bill_ref_number || "M-Pesa"}`;

      const { data: newTx, error } = await supabase
        .from("transactions")
        .insert({
          user_id: session.user.id,
          type: "income",
          amount: Number(tx.amount),
          tag: "#mpesa",
          created_at: tx.transaction_time,
        })
        .select()
        .single();

      if (error) throw error;

      await supabase
        .from("mpesa_transactions")
        .update({ matched: true, transaction_id: newTx.id })
        .eq("id", tx.id);

      fetchTransactions();
    } catch (error) {
      console.error("Error creating transaction:", error);
    }
  };

  const handleSandboxTest = async () => {
    try {
      if (!session?.user) return;

      // Get user's shortcode from mpesa_settings
      const { data: settings } = await supabase
        .from("mpesa_settings")
        .select("shortcode")
        .eq("user_id", session.user.id)
        .single();

      if (!settings?.shortcode) {
        alert("Please set up your M-Pesa shortcode first");
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mpesa-sandbox-test`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ShortCode: settings.shortcode,
            CommandID: "CustomerPayBillOnline",
            Amount: parseInt(testAmount),
            Msisdn: testPhone,
            BillRefNumber: testRef,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to trigger sandbox test");
      }

      alert("Sandbox test triggered successfully!");
      setShowSandboxTest(false);
    } catch (error) {
      console.error("Error triggering sandbox test:", error);
      alert("Failed to trigger sandbox test");
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
          <h1 className="text-2xl font-semibold">M-Pesa</h1>
          <p className="text-sm text-muted-foreground">
            View and manage M-Pesa transactions
          </p>
        </div>
        {import.meta.env.DEV && (
          <button
            onClick={() => setShowSandboxTest(true)}
            className="inline-flex items-center justify-center gap-2 rounded-sm border border-border bg-background px-4 py-2 text-sm font-semibold hover:bg-secondary"
          >
            Test Sandbox
          </button>
        )}
      </section>

      {/* Summary Stats */}
      <section className="mb-6 flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            Today's M-Pesa In: <span className="font-semibold text-foreground">{formatKES(summary.todayTotal)}</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            Transactions Today: <span className="font-semibold text-foreground">{summary.todayCount}</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <AlertTriangle className={`h-4 w-4 ${summary.unmatched > 0 ? "text-warning" : "text-muted-foreground"}`} />
          <span className={`text-sm ${summary.unmatched > 0 ? "text-warning font-semibold" : "text-muted-foreground"}`}>
            Unmatched: <span className="text-foreground">{summary.unmatched}</span>
          </span>
        </div>
      </section>

      {/* Transaction List */}
      {transactions.length === 0 ? (
        <section className="flex flex-col items-center justify-center py-20">
          <div className="text-center">
            <p className="text-lg font-medium text-muted-foreground mb-4">
              No M-Pesa transactions yet
            </p>
            <p className="text-sm text-muted-foreground">
              Transactions will appear here when you receive payments
            </p>
          </div>
        </section>
      ) : (
        <section className="space-y-3">
          {transactions.map((tx) => {
            const name = [tx.first_name, tx.middle_name, tx.last_name].filter(Boolean).join(" ");
            return (
              <div key={tx.id} className="rounded-sm border border-border bg-card p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-lg">{name || "Unknown"}</h3>
                      {tx.phone_number && (
                        <span className="text-sm text-muted-foreground">{tx.phone_number}</span>
                      )}
                      {tx.matched ? (
                        <span className="px-2 py-1 rounded-full text-xs font-semibold bg-success text-success-foreground">
                          ✅ Imeoanishwa
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded-full text-xs font-semibold bg-warning text-warning-foreground">
                          ⚠️ Inasubiri
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="font-mono font-semibold text-lg">{formatKES(Number(tx.amount))}</span>
                      <span className="text-muted-foreground">Receipt: {tx.mpesa_receipt_no}</span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(tx.transaction_time), { addSuffix: true })}
                    </div>
                  </div>

                  {!tx.matched && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleMatch(tx)}
                        className="px-4 py-2 text-sm font-medium rounded-sm bg-primary text-primary-foreground hover:opacity-90"
                      >
                        Oanisha
                      </button>
                      <button
                        onClick={() => handleCreateTransaction(tx)}
                        className="px-4 py-2 text-sm font-medium rounded-sm border border-border bg-background hover:bg-secondary"
                      >
                        Unda Mpya
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </section>
      )}

      {/* Match Modal */}
      {showMatchModal && selectedTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30">
          <div className="w-full max-w-md rounded-sm border border-border bg-card p-6 m-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Match Transaction</h3>
              <button
                onClick={() => {
                  setShowMatchModal(false);
                  setSelectedTransaction(null);
                  setNearbyTransactions([]);
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-muted-foreground">
                {formatKES(Number(selectedTransaction.amount))} - {selectedTransaction.mpesa_receipt_no}
              </p>
            </div>
            
            {nearbyTransactions.length === 0 ? (
              <p className="text-sm text-muted-foreground mb-4">No nearby transactions found</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {nearbyTransactions.map((tx) => (
                  <button
                    key={tx.id}
                    onClick={() => handleSelectTransaction(tx.id)}
                    className="w-full p-3 rounded-sm border border-border bg-background hover:bg-secondary text-left"
                  >
                    <div className="font-mono font-semibold">{formatKES(tx.amount)}</div>
                    <div className="text-xs text-muted-foreground">{tx.tag}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(tx.created_at), { addSuffix: true })}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast.show && (
        <div className="fixed bottom-4 right-4 z-50 rounded-sm bg-success text-success-foreground px-6 py-4 shadow-lg animate-in slide-in-from-bottom-4">
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5" />
            <span className="font-medium">{toast.message}</span>
          </div>
        </div>
      )}

      {/* Sandbox Test Modal */}
      {showSandboxTest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30">
          <div className="w-full max-w-md rounded-sm border border-border bg-card p-6 m-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Test Sandbox</h3>
              <button
                onClick={() => setShowSandboxTest(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Amount
                </label>
                <input
                  type="number"
                  value={testAmount}
                  onChange={(e) => setTestAmount(e.target.value)}
                  className="h-10 w-full rounded-sm border border-input bg-background px-3 font-mono text-sm outline-none focus:border-ring"
                  placeholder="100"
                />
              </div>
              
              <div>
                <label className="block mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  className="h-10 w-full rounded-sm border border-input bg-background px-3 text-sm outline-none focus:border-ring"
                  placeholder="254708374149"
                />
              </div>
              
              <div>
                <label className="block mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Bill Reference
                </label>
                <input
                  type="text"
                  value={testRef}
                  onChange={(e) => setTestRef(e.target.value)}
                  className="h-10 w-full rounded-sm border border-input bg-background px-3 text-sm outline-none focus:border-ring"
                  placeholder="test001"
                />
              </div>
            </div>

            <div className="mt-6 flex gap-2">
              <button
                onClick={() => setShowSandboxTest(false)}
                className="flex-1 rounded-sm border border-border bg-background py-2.5 text-sm font-medium hover:bg-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleSandboxTest}
                className="flex-1 rounded-sm bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
              >
                Trigger Test
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
