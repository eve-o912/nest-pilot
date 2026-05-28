import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { actions, formatKES, useStore, type ReceivableStatus, type Transaction } from "@/lib/store";

export const Route = createFileRoute("/receivables")({
  component: Receivables,
  head: () => ({ meta: [{ title: "Receivables — Nest Pilot" }] }),
});

const COLUMNS: { id: ReceivableStatus; title: string; tone: string }[] = [
  { id: "draft", title: "Draft", tone: "text-muted-foreground" },
  { id: "unpaid", title: "Unpaid", tone: "text-warning" },
  { id: "paid", title: "Paid", tone: "text-success" },
];

function Receivables() {
  const transactions = useStore((s) => s.transactions);
  const [dragId, setDragId] = useState<string | null>(null);
  const [hoverCol, setHoverCol] = useState<ReceivableStatus | null>(null);

  const grouped = useMemo(() => {
    const r = transactions.filter((t) => t.type === "in" && t.receivableStatus);
    return {
      draft: r.filter((t) => t.receivableStatus === "draft"),
      unpaid: r.filter((t) => t.receivableStatus === "unpaid"),
      paid: r.filter((t) => t.receivableStatus === "paid"),
    } as Record<ReceivableStatus, Transaction[]>;
  }, [transactions]);

  const onDrop = (col: ReceivableStatus) => {
    if (dragId) actions.setReceivableStatus(dragId, col);
    setDragId(null); setHoverCol(null);
  };

  return (
    <main className="mx-auto max-w-[1600px] px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Receivables</h1>
        <p className="mt-1 text-sm text-muted-foreground">Drag a card to “Paid” when payment lands.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {COLUMNS.map((col) => {
          const items = grouped[col.id];
          const total = items.reduce((a, b) => a + b.amount, 0);
          return (
            <section
              key={col.id}
              onDragOver={(e) => { e.preventDefault(); setHoverCol(col.id); }}
              onDragLeave={() => setHoverCol((c) => (c === col.id ? null : c))}
              onDrop={() => onDrop(col.id)}
              className={"flex min-h-[400px] flex-col border border-border bg-card " + (hoverCol === col.id ? "border-ring" : "")}
            >
              <header className="flex items-baseline justify-between border-b border-border px-4 py-3">
                <h2 className={"text-sm font-semibold uppercase tracking-wider " + col.tone}>{col.title}</h2>
                <span className="font-mono text-xs text-muted-foreground">{items.length} · {formatKES(total)}</span>
              </header>
              <div className="flex-1 space-y-2 p-3">
                {items.map((t) => (
                  <article
                    key={t.id}
                    draggable
                    onDragStart={() => setDragId(t.id)}
                    onDragEnd={() => setDragId(null)}
                    className={"cursor-grab border border-border bg-background p-3 active:cursor-grabbing " + (dragId === t.id ? "opacity-50" : "")}
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <div className="text-sm font-semibold">{t.customer ?? "Walk-in"}</div>
                      <div className="font-mono text-sm font-semibold">{formatKES(t.amount)}</div>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">{t.description}</div>
                    <div className="mt-2 flex items-center justify-between text-xs">
                      <span className="font-mono text-muted-foreground">
                        {new Date(t.date).toLocaleDateString("en-KE", { day: "2-digit", month: "short" })}
                      </span>
                      <span className="rounded-sm bg-secondary px-1.5 py-0.5 font-mono">{t.method}</span>
                    </div>
                  </article>
                ))}
                {items.length === 0 && (
                  <div className="grid h-24 place-items-center text-xs text-muted-foreground">Drop cards here</div>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}
