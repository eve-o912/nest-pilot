import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Copy, Share2 } from "lucide-react";
import { formatKES, useStore } from "@/lib/store";

export const Route = createFileRoute("/receipts")({
  component: Receipts,
  head: () => ({ meta: [{ title: "Receipts — Nest Pilot" }] }),
});

function Receipts() {
  const transactions = useStore((s) => s.transactions);
  const business = useStore((s) => s.business);
  const sales = useMemo(() => transactions.filter((t) => t.type === "in"), [transactions]);
  const [selectedId, setSelectedId] = useState<string>(sales[0]?.id ?? "");
  const selected = sales.find((s) => s.id === selectedId) ?? sales[0];
  const [copied, setCopied] = useState(false);

  const shareLink = selected ? `${typeof window !== "undefined" ? window.location.origin : ""}/r/${selected.id}` : "";

  const copy = async () => {
    await navigator.clipboard.writeText(shareLink);
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  };

  return (
    <main className="mx-auto max-w-[1600px] px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Digital Receipts</h1>
        <p className="mt-1 text-sm text-muted-foreground">Thermal-style receipts with payment instructions. Share via WhatsApp link.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="border border-border bg-card">
          <header className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider">Sales</h2>
          </header>
          <ul>
            {sales.map((t) => (
              <li key={t.id} className="border-b border-border last:border-b-0">
                <button
                  onClick={() => setSelectedId(t.id)}
                  className={"w-full px-4 py-3 text-left text-sm transition-colors " + (selected?.id === t.id ? "bg-accent" : "hover:bg-secondary")}
                >
                  <div className="flex items-baseline justify-between">
                    <span className="font-medium">{t.customer ?? "Walk-in"}</span>
                    <span className="font-mono text-xs">{formatKES(t.amount)}</span>
                  </div>
                  <div className="mt-0.5 truncate text-xs text-muted-foreground">{t.description}</div>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <section>
          {selected && (
            <>
              <div className="mb-3 flex items-center gap-2">
                <button onClick={copy} className="inline-flex items-center gap-2 rounded-sm border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-secondary">
                  <Copy className="h-4 w-4" /> {copied ? "Copied" : "Copy link"}
                </button>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`Receipt from ${business.name}: ${shareLink}`)}`}
                  target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-sm bg-success px-3 py-2 text-sm font-semibold text-success-foreground hover:opacity-90"
                >
                  <Share2 className="h-4 w-4" /> Share to WhatsApp
                </a>
                <span className="ml-auto font-mono text-xs text-muted-foreground">{shareLink}</span>
              </div>

              <div className="mx-auto max-w-md border border-border bg-card p-6 font-mono text-[13px] leading-relaxed">
                <div className="text-center">
                  <div className="text-base font-bold uppercase">{business.name}</div>
                  <div className="text-xs">Receipt #{selected.id.toUpperCase()}</div>
                  <div className="text-xs">{new Date(selected.date).toLocaleString("en-KE")}</div>
                </div>
                <Divider />
                <Row label="Served by" value={business.owner} />
                <Row label="Customer" value={selected.customer ?? "Walk-in"} />
                <Row label="Method" value={selected.method} />
                {selected.reference && <Row label="Ref" value={selected.reference} />}
                <Divider />
                <div className="flex justify-between">
                  <span className="pr-2">{selected.description}</span>
                  <span>{formatKES(selected.amount)}</span>
                </div>
                <Divider />
                <div className="flex justify-between text-base font-bold">
                  <span>TOTAL</span>
                  <span>{formatKES(selected.amount)}</span>
                </div>
                <Divider />
                <div className="text-center">
                  <div className="text-xs">— PAYMENT INSTRUCTIONS —</div>
                  <div className="mt-1 text-sm font-bold">PAY VIA M-PESA</div>
                  <div className="mt-0.5">Lipa na M-Pesa</div>
                  <div>Buy Goods · Till No.</div>
                  <div className="my-1 text-2xl font-bold tracking-widest">{business.till}</div>
                  <div className="text-xs">Confirm name: {business.name.toUpperCase()}</div>
                </div>
                <Divider />
                <div className="text-center text-xs">
                  Asante sana! Karibu tena.
                  <br />Powered by Nest Pilot
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}
function Divider() {
  return <div className="my-2 select-none text-center text-muted-foreground">{"-".repeat(34)}</div>;
}
