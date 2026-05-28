import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Plus, Receipt } from "lucide-react";
import { actions, formatKES, TAG_PRESETS, useStore, type TxnType } from "@/lib/store";

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
      {/* Sky blue summary banner */}
      <section className="-mx-6 mb-6 bg-sky px-6 py-7 text-sky-foreground">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <BannerStat
            label="Total In"
            value={totals.tin}
            active={filter === "in"}
            onClick={() => setFilter(filter === "in" ? "all" : "in")}
            tone="in"
          />
          <BannerStat
            label="Total Out"
            value={totals.tout}
            active={filter === "out"}
            onClick={() => setFilter(filter === "out" ? "all" : "out")}
            tone="out"
          />
          <BannerStat
            label="Net Balance"
            value={totals.net}
            active={filter === "all"}
            onClick={() => setFilter("all")}
            tone="net"
          />
        </div>
      </section>

      {/* Quick Actions */}
      <section className="mb-6 flex flex-wrap items-center gap-3">
        <button
          onClick={() => setOpenSheet("in")}
          className="inline-flex items-center gap-2 rounded-sm bg-success px-5 py-3 text-sm font-semibold text-success-foreground hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> Record Sale
        </button>
        <button
          onClick={() => setOpenSheet("out")}
          className="inline-flex items-center gap-2 rounded-sm bg-destructive px-5 py-3 text-sm font-semibold text-destructive-foreground hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> Record Expense
        </button>
        <Link
          to="/receipts"
          className="inline-flex items-center gap-2 rounded-sm border border-border bg-card px-5 py-3 text-sm font-semibold hover:bg-secondary"
        >
          <Receipt className="h-4 w-4" /> Generate Receipt
        </Link>
        <div className="ml-auto text-xs text-muted-foreground">
          Showing <span className="font-semibold text-foreground">{filtered.length}</span> of {transactions.length} transactions
          {filter !== "all" && (
            <button onClick={() => setFilter("all")} className="ml-2 underline">clear filter</button>
          )}
        </div>
      </section>

      {/* Ledger */}
      <section>
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="text-base font-semibold">Recent Transactions</h2>
          <span className="text-xs uppercase tracking-wider text-muted-foreground">Ledger</span>
        </div>
        <div className="border-t border-border">
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
      </section>

      {openSheet && <RecordSheet type={openSheet} onClose={() => setOpenSheet(null)} />}
    </main>
  );
}

function BannerStat({
  label, value, active, onClick, tone,
}: { label: string; value: number; active: boolean; onClick: () => void; tone: "in" | "out" | "net" }) {
  const Icon = tone === "in" ? ArrowDownLeft : tone === "out" ? ArrowUpRight : null;
  return (
    <button
      onClick={onClick}
      className={
        "group flex flex-col items-start rounded-sm border-2 px-5 py-4 text-left transition-colors " +
        (active ? "border-foreground bg-card text-foreground" : "border-transparent hover:bg-card/40")
      }
    >
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider opacity-80">
        {Icon && <Icon className="h-3.5 w-3.5" />} {label}
      </div>
      <div className="mt-1 font-mono text-3xl font-bold leading-tight tabular-nums">
        {formatKES(Math.abs(value))}
      </div>
      <div className="mt-1 text-xs opacity-80">
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

  const toggleTag = (t: string) => setTags((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]));

  const submit = () => {
    const n = parseFloat(amount);
    if (!desc || !n) return;
    actions.addTransaction({
      date: new Date().toISOString(),
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
          <Field label="Description">
            <input value={desc} onChange={(e) => setDesc(e.target.value)} className="h-10 w-full rounded-sm border border-input bg-background px-3 text-sm outline-none focus:border-ring" placeholder={type === "in" ? "Bread x 5, sukuma…" : "Restock — sugar 25kg"} />
          </Field>
          <Field label="Amount (KES)">
            <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-10 w-full rounded-sm border border-input bg-background px-3 font-mono text-sm outline-none focus:border-ring" placeholder="0" />
          </Field>
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
          <button onClick={submit} className="flex-1 rounded-sm bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90">Save</button>
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
