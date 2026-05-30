import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { actions, formatKES, TAG_PRESETS, useStore } from "@/lib/store";

export const Route = createFileRoute("/expenses")({
  component: Expenses,
  head: () => ({ meta: [{ title: "Expenses — Nest Pilot" }] }),
});

function Expenses() {
  const transactions = useStore((s) => s.transactions);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  const expenses = useMemo(() => transactions.filter((t) => t.type === "out"), [transactions]);
  const filtered = useMemo(
    () => (activeTag ? expenses.filter((t) => t.tags.includes(activeTag)) : expenses),
    [expenses, activeTag],
  );

  const allTags = useMemo(() => {
    const s = new Set<string>(TAG_PRESETS);
    expenses.forEach((e) => e.tags.forEach((t) => s.add(t)));
    return Array.from(s);
  }, [expenses]);

  const totalsByTag = useMemo(() => {
    const m = new Map<string, number>();
    expenses.forEach((e) => e.tags.forEach((t) => m.set(t, (m.get(t) ?? 0) + e.amount)));
    return m;
  }, [expenses]);

  const toggle = (t: string) => setTags((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]));

  const submit = () => {
    const n = parseFloat(amount);
    if (!desc || !n || tags.length === 0) return;
    actions.addTransaction({
      date: new Date().toISOString(),
      description: desc,
      type: "out",
      amount: n,
      tags,
      method: "Cash",
    });
    setDesc(""); setAmount(""); setTags([]);
  };

  return (
    <main className="mx-auto max-w-[1600px] px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Expenses</h1>
        <p className="mt-1 text-sm text-muted-foreground">Tap pills to categorize. No folders, no dropdowns.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px] xl:grid-cols-[1fr_400px]">
        <section>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <button onClick={() => setActiveTag(null)} className="pill" data-active={activeTag === null}>All ({expenses.length})</button>
            {allTags.map((t) => (
              <button key={t} onClick={() => setActiveTag(activeTag === t ? null : t)} className="pill" data-active={activeTag === t}>
                {t} · {formatKES(totalsByTag.get(t) ?? 0)}
              </button>
            ))}
          </div>

          <div className="border-t border-border">
            {/* Desktop Table */}
            <div className="hidden md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">Date</th>
                    <th className="py-2 pr-4 font-medium">Description</th>
                    <th className="py-2 pr-4 font-medium">Tags</th>
                    <th className="py-2 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((t) => (
                    <tr key={t.id} className="border-t border-border">
                      <td className="py-3 pr-4 font-mono text-xs text-muted-foreground">
                        {new Date(t.date).toLocaleDateString("en-KE", { day: "2-digit", month: "short" })}
                      </td>
                      <td className="py-3 pr-4 font-medium">{t.description}</td>
                      <td className="py-3 pr-4">
                        <div className="flex flex-wrap gap-1">
                          {t.tags.map((tag) => <span key={tag} className="rounded-sm bg-secondary px-1.5 py-0.5 font-mono text-xs">{tag}</span>)}
                        </div>
                      </td>
                      <td className="py-3 text-right font-mono font-semibold text-destructive">− {formatKES(t.amount)}</td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan={4} className="border-t border-border py-10 text-center text-sm text-muted-foreground">No expenses for this tag.</td></tr>
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
                      <div className="mt-1 flex flex-wrap gap-1">
                        {t.tags.map((tag) => <span key={tag} className="rounded-sm bg-secondary px-1.5 py-0.5 font-mono text-xs">{tag}</span>)}
                      </div>
                    </div>
                    <div className="font-mono font-semibold text-sm text-destructive">− {formatKES(t.amount)}</div>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {new Date(t.date).toLocaleDateString("en-KE", { day: "2-digit", month: "short" })}
                  </div>
                </div>
              ))}
              {filtered.length === 0 && (
                <div className="border-t border-border py-10 text-center text-sm text-muted-foreground">No expenses for this tag.</div>
              )}
            </div>
          </div>
        </section>

        <aside className="h-fit border border-border bg-card p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider">Log Expense</h2>
          <div className="mt-4 space-y-3">
            <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="What was it for?" className="h-10 w-full rounded-sm border border-input bg-background px-3 text-sm outline-none focus:border-ring" />
            <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount (KES)" className="h-10 w-full rounded-sm border border-input bg-background px-3 font-mono text-sm outline-none focus:border-ring" />
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tag it</div>
              <div className="flex flex-wrap gap-2">
                {TAG_PRESETS.map((t) => (
                  <button key={t} onClick={() => toggle(t)} className="pill" data-active={tags.includes(t)}>{t}</button>
                ))}
              </div>
            </div>
            <button onClick={submit} disabled={!desc || !amount || tags.length === 0} className="w-full rounded-sm bg-destructive py-2.5 text-sm font-semibold text-destructive-foreground hover:opacity-90 disabled:opacity-50">
              Record Expense
            </button>
          </div>
        </aside>
      </div>
    </main>
  );
}
