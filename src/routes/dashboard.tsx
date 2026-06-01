import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { ArrowDownLeft, ArrowUpRight, Plus, Receipt, Search, X } from "lucide-react";
import { actions, formatKES, TAG_PRESETS, useStore, type TxnType } from "@/lib/store";
import { supabase } from "@/lib/supabase";

type Filter = "all" | "in" | "out";

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
  head: () => ({
    meta: [
      { title: "Dashboard — Nest Pilot" },
      { name: "description", content: "Total in, total out, and net balance at a glance." },
    ],
  }),
});

function Dashboard() {
  const transactions = useStore((s) => s.transactions);
  const [filter, setFilter] = useState<Filter>("all");
  const [openSheet, setOpenSheet] = useState<TxnType | null>(null);

  const totals = useMemo(() => {
    const tin = transactions.filter((t) => t.type === "in").reduce((a, b) => a + b.amount, 0);
    const tout = transactions.filter((t) => t.type === "out").reduce((a, b) => a + b.amount, 0);
    return { tin, tout, net: tin - tout };
  }, [transactions]);

  const filtered = useMemo(
    () => (filter === "all" ? transactions : transactions.filter((t) => t.type === filter)),
    [transactions, filter],
  );

  return (
    <main className="mx-auto max-w-[1600px] px-6 pb-16">
      {/* Header */}
      <section className="mb-6">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Total in, total out, and net balance at a glance
        </p>
      </section>

      {/* Summary Cards */}
      <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <SummaryCard
          label="Total In"
          value={totals.tin}
          color="success"
          icon={<ArrowDownLeft className="h-4 w-4" />}
          active={filter === "in"}
          onClick={() => setFilter(filter === "in" ? "all" : "in")}
        />
        <SummaryCard
          label="Total Out"
          value={totals.tout}
          color="destructive"
          icon={<ArrowUpRight className="h-4 w-4" />}
          active={filter === "out"}
          onClick={() => setFilter(filter === "out" ? "all" : "out")}
        />
        <SummaryCard
          label="Net Balance"
          value={totals.net}
          color={totals.net >= 0 ? "success" : "destructive"}
          icon={null}
          active={filter === "all"}
          onClick={() => setFilter("all")}
        />
      </section>

      {/* Quick Actions */}
      <section className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
        <button
          onClick={() => setOpenSheet("in")}
          className="inline-flex items-center justify-center gap-2 rounded-sm bg-success px-5 py-3 text-sm font-semibold text-success-foreground hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> Record Sale
        </button>
        <button
          onClick={() => setOpenSheet("out")}
          className="inline-flex items-center justify-center gap-2 rounded-sm bg-destructive px-5 py-3 text-sm font-semibold text-destructive-foreground hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> Record Expense
        </button>
        <Link
          to="/receipts"
          className="inline-flex items-center justify-center gap-2 rounded-sm border border-border bg-card px-5 py-3 text-sm font-semibold hover:bg-secondary"
        >
          <Receipt className="h-4 w-4" /> Generate Receipt
        </Link>
        <div className="mt-2 text-xs text-muted-foreground sm:ml-auto sm:mt-0">
          Showing <span className="font-semibold text-foreground">{filtered.length}</span> of {transactions.length} transactions
          {filter !== "all" && (
            <button onClick={() => setFilter("all")} className="ml-2 underline">clear filter</button>
          )}
        </div>
      </section>

      {/* Ledger */}
      <section>
        <div className="mb-2 flex flex-col items-baseline gap-1 sm:flex-row sm:justify-between">
          <h2 className="text-base font-semibold">Recent Transactions</h2>
          <span className="text-xs uppercase tracking-wider text-muted-foreground">Ledger</span>
        </div>
        <div className="border-t border-border">
          {/* Desktop Table */}
          <div className="hidden md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">Date</th>
                  <th className="py-2 pr-4 font-medium">Description</th>
                  <th className="py-2 pr-4 font-medium">Method</th>
                  <th className="py-2 pr-4 font-medium">Tags</th>
                  <th className="py-2 pr-4 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t.id} className="border-t border-border align-top">
                    <td className="py-3 pr-4 font-mono text-xs text-muted-foreground">
                      {new Date(t.date).toLocaleDateString("en-KE", { day: "2-digit", month: "short" })}
                    </td>
                    <td className="py-3 pr-4">
                      <div className="font-medium">{t.description}</div>
                      {t.reference && (
                        <div className="font-mono text-xs text-muted-foreground">{t.reference}</div>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">{t.method}</td>
                    <td className="py-3 pr-4">
                      <div className="flex flex-wrap gap-1">
                        {t.tags.map((tag) => (
                          <span key={tag} className="rounded-sm bg-secondary px-1.5 py-0.5 font-mono text-xs">{tag}</span>
                        ))}
                      </div>
                    </td>
                    <td className={"py-3 pr-4 text-right font-mono font-semibold " + (t.type === "in" ? "text-success" : "text-destructive")}>
                      {t.type === "in" ? "+" : "−"} {formatKES(t.amount)}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={5} className="py-10 text-center text-sm text-muted-foreground border-t border-border">No transactions for this filter.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {filtered.map((t) => (
              <div key={t.id} className="border-t border-border py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{t.description}</div>
                    {t.reference && (
                      <div className="font-mono text-xs text-muted-foreground">{t.reference}</div>
                    )}
                    <div className="mt-1 flex flex-wrap gap-1">
                      {t.tags.map((tag) => (
                        <span key={tag} className="rounded-sm bg-secondary px-1.5 py-0.5 font-mono text-xs">{tag}</span>
                      ))}
                    </div>
                  </div>
                  <div className={"font-mono font-semibold text-sm " + (t.type === "in" ? "text-success" : "text-destructive")}>
                    {t.type === "in" ? "+" : "−"} {formatKES(t.amount)}
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{new Date(t.date).toLocaleDateString("en-KE", { day: "2-digit", month: "short" })}</span>
                  <span>{t.method}</span>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="py-10 text-center text-sm text-muted-foreground border-t border-border">No transactions for this filter.</div>
            )}
          </div>
        </div>
      </section>

      {openSheet && <RecordSheet type={openSheet} onClose={() => setOpenSheet(null)} />}
    </main>
  );
}

function SummaryCard({
  label, value, color, icon, active, onClick,
}: { label: string; value: number; color: string; icon: React.ReactNode; active: boolean; onClick: () => void }) {
  const getColorClass = () => {
    switch (color) {
      case "success":
        return "text-success";
      case "destructive":
        return "text-destructive";
      default:
        return "text-foreground";
    }
  };

  return (
    <button
      onClick={onClick}
      className={
        "group rounded-sm border-2 px-5 py-4 text-left transition-colors " +
        (active ? "border-foreground bg-card text-foreground" : "border-transparent hover:bg-card/40")
      }
    >
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className={`mt-1 font-mono text-3xl font-bold leading-tight tabular-nums ${getColorClass()}`}>
        {formatKES(Math.abs(value))}
      </div>
      <div className="mt-1 text-xs text-muted-foreground">
        {active ? "Filtering ledger" : "Click to filter"}
      </div>
    </button>
  );
}

function RecordSheet({ type, onClose }: { type: TxnType; onClose: () => void }) {
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [tags, setTags] = useState<string[]>(type === "in" ? ["#sale"] : []);
  const [method, setMethod] = useState<"Cash" | "M-Pesa" | "Card" | "Bank">("Cash");
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("customers")
        .select("*")
        .eq("user_id", user.id)
        .order("name", { ascending: true });

      setCustomers(data || []);
    } catch (error) {
      console.error("Error fetching customers:", error);
    }
  };

  const toggleTag = (t: string) => setTags((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]));

  const filteredCustomers = customers.filter((c) =>
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    (c.phone && c.phone.includes(customerSearch))
  );

  const submit = () => {
    const n = parseFloat(amount);
    if (!desc || !n) return;
    actions.addTransaction({
      date: date ? new Date(date).toISOString() : new Date().toISOString(),
      description: desc,
      type,
      amount: n,
      tags,
      method,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/30 sm:items-center" onClick={onClose}>
      <div className="w-full max-w-md rounded-t-md border border-border bg-card p-6 sm:rounded-md" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-4 text-lg font-semibold">{type === "in" ? "Record Sale" : "Record Expense"}</h3>
        <div className="space-y-3">
          <Field label="Date">
            <input 
              type="date" 
              value={date} 
              onChange={(e) => setDate(e.target.value)} 
              className="h-10 w-full rounded-sm border border-input bg-background px-3 text-sm outline-none focus:border-ring" 
            />
          </Field>
          <Field label="Description">
            <input value={desc} onChange={(e) => setDesc(e.target.value)} className="h-10 w-full rounded-sm border border-input bg-background px-3 text-sm outline-none focus:border-ring" placeholder={type === "in" ? "Bread x 5, sukuma…" : "Restock — sugar 25kg"} />
          </Field>
          <Field label="Amount (KES)">
            <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-10 w-full rounded-sm border border-input bg-background px-3 font-mono text-sm outline-none focus:border-ring" placeholder="0" />
          </Field>
          {type === "in" && (
            <Field label="Link Customer (optional)">
              <div className="relative">
                <div className="flex items-center gap-2">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={selectedCustomer ? selectedCustomer.name : customerSearch}
                    onChange={(e) => {
                      setCustomerSearch(e.target.value);
                      setShowCustomerDropdown(true);
                    }}
                    onFocus={() => setShowCustomerDropdown(true)}
                    className="h-10 w-full rounded-sm border border-input bg-background pl-8 pr-3 text-sm outline-none focus:border-ring"
                    placeholder="Search customers..."
                  />
                  {selectedCustomer && (
                    <button
                      onClick={() => {
                        setSelectedCustomer(null);
                        setCustomerSearch("");
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                {showCustomerDropdown && filteredCustomers.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full rounded-sm border border-border bg-card shadow-lg max-h-48 overflow-y-auto">
                    {filteredCustomers.map((customer) => (
                      <button
                        key={customer.id}
                        onClick={() => {
                          setSelectedCustomer(customer);
                          setCustomerSearch(customer.name);
                          setShowCustomerDropdown(false);
                        }}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-secondary transition-colors"
                      >
                        <div className="font-medium">{customer.name}</div>
                        {customer.phone && (
                          <div className="text-xs text-muted-foreground">{customer.phone}</div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </Field>
          )}
          <Field label="Method">
            <div className="flex flex-wrap gap-2">
              {(["Cash", "M-Pesa", "Card", "Bank"] as const).map((m) => (
                <button key={m} onClick={() => setMethod(m)} className="pill" data-active={method === m}>{m}</button>
              ))}
            </div>
          </Field>
          <Field label="Tags">
            <div className="flex flex-wrap gap-2">
              {(type === "in" ? ["#sale", "#service", "#tip"] : TAG_PRESETS).map((t) => (
                <button key={t} onClick={() => toggleTag(t)} className="pill" data-active={tags.includes(t)}>{t}</button>
              ))}
            </div>
          </Field>
        </div>
        <div className="mt-6 flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-sm border border-border bg-background py-2.5 text-sm font-medium hover:bg-secondary">Cancel</button>
          <button onClick={submit} disabled={!desc || !amount || !date} className="flex-1 rounded-sm bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50">Save</button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
