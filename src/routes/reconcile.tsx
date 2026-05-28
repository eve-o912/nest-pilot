import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Check, Copy, Download, Link2, Unlink, Zap } from "lucide-react";
import { actions, formatKES, useStore } from "@/lib/store";

// Parse "on 14/11/25 at 9:14 AM" from M-Pesa raw text → Date (assumes 20YY).
function parseMpesaDate(raw: string): Date | null {
  const m = raw.match(/on (\d{1,2})\/(\d{1,2})\/(\d{2,4}) at (\d{1,2}):(\d{2})\s?(AM|PM)?/i);
  if (!m) return null;
  const [, dd, mm, yy, hh, mi, ap] = m;
  let h = parseInt(hh, 10);
  if (ap) {
    const isPM = ap.toUpperCase() === "PM";
    if (isPM && h < 12) h += 12;
    if (!isPM && h === 12) h = 0;
  }
  const year = yy.length === 2 ? 2000 + parseInt(yy, 10) : parseInt(yy, 10);
  return new Date(year, parseInt(mm, 10) - 1, parseInt(dd, 10), h, parseInt(mi, 10));
}

function formatGap(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h < 24) return m ? `${h}h ${m}m` : `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h`;
}

export const Route = createFileRoute("/reconcile")({
  component: Reconcile,
  head: () => ({ meta: [{ title: "Reconcile M-Pesa — Nest Pilot" }] }),
});

function Reconcile() {
  const mpesa = useStore((s) => s.mpesa);
  const transactions = useStore((s) => s.transactions);
  const [selectedMpesa, setSelectedMpesa] = useState<string | null>(null);
  const [tab, setTab] = useState<"unmatched" | "completed">("unmatched");
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set());
  const [bulkResult, setBulkResult] = useState<{ linked: number; unmatched: number; linkedIds: string[] } | null>(null);
  type Proposal = { mpesaId: string; mpesaCode: string; mpesaAmount: number; mpesaDate: Date | null; txnId: string | null; reason: string };
  const [preview, setPreview] = useState<Proposal[] | null>(null);

  const unmatchedMpesa = useMemo(() => mpesa.filter((m) => !m.matchedTxnId), [mpesa]);
  const completedMpesa = useMemo(() => mpesa.filter((m) => !!m.matchedTxnId), [mpesa]);
  const visibleMpesa = tab === "unmatched" ? unmatchedMpesa : completedMpesa;

  const unmatchedSales = useMemo(
    () => transactions.filter((t) => t.type === "in" && !mpesa.some((m) => m.matchedTxnId === t.id)),
    [transactions, mpesa],
  );
  const selected = mpesa.find((m) => m.id === selectedMpesa);

  const bulkSelectedAmounts = useMemo(() => {
    const s = new Set<number>();
    bulkSelected.forEach((id) => {
      const m = mpesa.find((x) => x.id === id);
      if (m) s.add(m.amount);
    });
    return s;
  }, [bulkSelected, mpesa]);

  const link = (txnId: string) => {
    if (!selected) return;
    actions.matchMpesa(selected.id, txnId);
    setSelectedMpesa(null);
  };

  const toggleBulk = (id: string) => {
    setBulkResult(null);
    setBulkSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAllUnmatched = () => {
    setBulkResult(null);
    setBulkSelected(new Set(unmatchedMpesa.map((m) => m.id)));
  };

  const clearBulk = () => { setBulkSelected(new Set()); setBulkResult(null); };

  const enterBulkMode = () => {
    setBulkMode(true);
    setSelectedMpesa(null);
    setTab("unmatched");
    setBulkResult(null);
  };

  const exitBulkMode = () => {
    setBulkMode(false);
    setBulkSelected(new Set());
    setBulkResult(null);
  };

  const computeProposals = (): Proposal[] => {
    const claimedTxnIds = new Set<string>();
    const WINDOW_MS = 24 * 60 * 60 * 1000;
    const selectedList = Array.from(bulkSelected)
      .map((id) => mpesa.find((x) => x.id === id))
      .filter((m): m is typeof mpesa[number] => !!m && !m.matchedTxnId)
      .map((m) => ({ m, date: parseMpesaDate(m.raw) }))
      .sort((a, b) => (a.date?.getTime() ?? 0) - (b.date?.getTime() ?? 0));

    const proposals: Proposal[] = [];
    selectedList.forEach(({ m, date: mDate }) => {
      const base = { mpesaId: m.id, mpesaCode: m.code, mpesaAmount: m.amount, mpesaDate: mDate };
      const candidates = unmatchedSales.filter((t) => t.amount === m.amount && !claimedTxnIds.has(t.id));
      if (candidates.length === 0) {
        proposals.push({ ...base, txnId: null, reason: "No sale with this amount" });
        return;
      }
      if (candidates.length === 1 || !mDate) {
        claimedTxnIds.add(candidates[0].id);
        proposals.push({ ...base, txnId: candidates[0].id, reason: candidates.length === 1 ? "Only candidate" : "Amount match" });
        return;
      }
      const scored = candidates
        .map((t) => ({ t, diff: Math.abs(new Date(t.date).getTime() - mDate.getTime()) }))
        .sort((a, b) => a.diff - b.diff);
      if (scored[0].diff <= WINDOW_MS) {
        claimedTxnIds.add(scored[0].t.id);
        const mins = Math.round(scored[0].diff / 60000);
        proposals.push({ ...base, txnId: scored[0].t.id, reason: `Closest in time (±${formatGap(mins)})` });
      } else {
        proposals.push({ ...base, txnId: null, reason: "No candidate within 24h" });
      }
    });
    return proposals;
  };

  const previewAutoLink = () => {
    const p = computeProposals();
    setBulkResult(null);
    setPreview(p);
  };

  const cancelPreview = () => setPreview(null);

  const confirmAutoLink = () => {
    if (!preview) return;
    const linkedIds: string[] = [];
    preview.forEach((p) => {
      if (p.txnId) {
        actions.matchMpesa(p.mpesaId, p.txnId);
        linkedIds.push(p.mpesaId);
      }
    });
    setBulkResult({ linked: linkedIds.length, unmatched: preview.length - linkedIds.length, linkedIds });
    setBulkSelected(new Set());
    setPreview(null);
  };

  const undoBulk = () => {
    if (!bulkResult) return;
    bulkResult.linkedIds.forEach((id) => actions.matchMpesa(id, undefined));
    setBulkResult(null);
  };

  const [shareToast, setShareToast] = useState<string | null>(null);
  const flashToast = (msg: string) => {
    setShareToast(msg);
    setTimeout(() => setShareToast(null), 2000);
  };

  const buildSummaryText = (): string => {
    if (!preview) return "";
    const willLink = preview.filter((p) => p.txnId).length;
    const skipped = preview.length - willLink;
    const lines: string[] = [];
    lines.push(`M-Pesa Reconciliation Preview`);
    lines.push(`Generated ${new Date().toLocaleString("en-KE")}`);
    lines.push(`${willLink} will link · ${skipped} skipped · ${preview.length} total`);
    lines.push(``);
    preview.forEach((p, i) => {
      const txn = p.txnId ? transactions.find((t) => t.id === p.txnId) : null;
      const dateStr = p.mpesaDate
        ? p.mpesaDate.toLocaleString("en-KE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
        : "—";
      const right = txn
        ? `${txn.description} · ${new Date(txn.date).toLocaleString("en-KE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })} · ${txn.method}`
        : `SKIPPED`;
      lines.push(`${i + 1}. ${p.mpesaCode}  +${formatKES(p.mpesaAmount)}  ${dateStr}`);
      lines.push(`   → ${right}`);
      lines.push(`   (${p.reason})`);
    });
    return lines.join("\n");
  };

  const copySummary = async () => {
    try {
      await navigator.clipboard.writeText(buildSummaryText());
      flashToast("Summary copied to clipboard");
    } catch {
      flashToast("Copy failed");
    }
  };

  const downloadSummaryImage = () => {
    if (!preview) return;
    const W = 900;
    const padding = 32;
    const rowH = 64;
    const headerH = 110;
    const H = headerH + preview.length * rowH + padding;
    const canvas = document.createElement("canvas");
    const dpr = window.devicePixelRatio || 1;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = "#0a0a0a";
    ctx.font = "600 22px ui-sans-serif, system-ui, -apple-system, sans-serif";
    ctx.fillText("M-Pesa Reconciliation Preview", padding, padding + 8);

    const willLink = preview.filter((p) => p.txnId).length;
    const skipped = preview.length - willLink;
    ctx.fillStyle = "#525252";
    ctx.font = "400 13px ui-sans-serif, system-ui, -apple-system, sans-serif";
    ctx.fillText(
      `${willLink} will link · ${skipped} skipped · ${preview.length} total · ${new Date().toLocaleString("en-KE")}`,
      padding,
      padding + 34,
    );

    ctx.strokeStyle = "#e5e5e5";
    ctx.beginPath();
    ctx.moveTo(padding, headerH - 12);
    ctx.lineTo(W - padding, headerH - 12);
    ctx.stroke();

    preview.forEach((p, i) => {
      const y = headerH + i * rowH;
      const txn = p.txnId ? transactions.find((t) => t.id === p.txnId) : null;
      const dateStr = p.mpesaDate
        ? p.mpesaDate.toLocaleString("en-KE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
        : "—";

      ctx.fillStyle = "#737373";
      ctx.font = "500 11px ui-monospace, SFMono-Regular, monospace";
      ctx.fillText(p.mpesaCode, padding, y + 14);

      ctx.fillStyle = txn ? "#15803d" : "#b45309";
      ctx.font = "600 14px ui-monospace, SFMono-Regular, monospace";
      ctx.fillText(`+ ${formatKES(p.mpesaAmount)}  ${dateStr}`, padding, y + 32);

      ctx.fillStyle = "#262626";
      ctx.font = "400 13px ui-sans-serif, system-ui, sans-serif";
      const right = txn
        ? `→ ${txn.description} · ${new Date(txn.date).toLocaleString("en-KE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })} · ${txn.method}`
        : `→ SKIPPED — ${p.reason}`;
      const maxRight = W - padding * 2;
      let text = right;
      while (ctx.measureText(text).width > maxRight && text.length > 10) text = text.slice(0, -2) + "…";
      ctx.fillText(text, padding, y + 50);

      ctx.strokeStyle = "#f5f5f5";
      ctx.beginPath();
      ctx.moveTo(padding, y + rowH - 4);
      ctx.lineTo(W - padding, y + rowH - 4);
      ctx.stroke();
    });

    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mpesa-preview-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      flashToast("Image downloaded");
    }, "image/png");
  };



  return (
    <main className="mx-auto max-w-[1600px] px-6 py-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">M-Pesa Reconciliation</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {bulkMode
              ? "Select messages and auto-link each to a sale with the same amount, preferring the closest time match within 24h."
              : "Click an M-Pesa message on the left, then click a sale on the right to link them."}
          </p>
        </div>
        <button
          onClick={bulkMode ? exitBulkMode : enterBulkMode}
          className={
            "inline-flex items-center gap-1.5 border px-3 py-1.5 text-xs font-semibold whitespace-nowrap " +
            (bulkMode ? "bg-foreground text-background border-foreground" : "border-border text-foreground hover:bg-secondary")
          }
        >
          <Zap className="h-3.5 w-3.5" /> {bulkMode ? "Exit bulk mode" : "Bulk link mode"}
        </button>
      </div>

      {bulkMode && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border border-border bg-secondary/50 px-4 py-3">
          <div className="text-sm">
            <span className="font-semibold">{bulkSelected.size}</span>
            <span className="text-muted-foreground"> of {unmatchedMpesa.length} selected</span>
            {bulkResult && (
              <span className="ml-3 text-muted-foreground">
                · Last run: <span className="font-semibold text-success">{bulkResult.linked} linked</span>
                {bulkResult.unmatched > 0 && <>, <span className="font-semibold text-warning">{bulkResult.unmatched} unmatched</span></>}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {bulkResult && bulkResult.linked > 0 && (
              <button
                onClick={undoBulk}
                className="inline-flex items-center gap-1.5 border border-border px-3 py-1.5 text-xs font-semibold hover:bg-background"
              >
                <Unlink className="h-3.5 w-3.5" /> Undo last link ({bulkResult.linked})
              </button>
            )}
            <button
              onClick={selectAllUnmatched}
              disabled={unmatchedMpesa.length === 0}
              className="border border-border px-3 py-1.5 text-xs font-semibold hover:bg-background disabled:opacity-40"
            >
              Select all
            </button>
            <button
              onClick={clearBulk}
              disabled={bulkSelected.size === 0}
              className="border border-border px-3 py-1.5 text-xs font-semibold hover:bg-background disabled:opacity-40"
            >
              Clear
            </button>
            <button
              onClick={previewAutoLink}
              disabled={bulkSelected.size === 0}
              className="inline-flex items-center gap-1.5 bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-30"
            >
              <Link2 className="h-3.5 w-3.5" /> Preview auto-link ({bulkSelected.size})
            </button>
          </div>
        </div>
      )}

      {bulkMode && preview && (
        <div className="mb-4 border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              <h3 className="text-sm font-semibold">Review proposed links</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {preview.filter((p) => p.txnId).length} will link · {preview.filter((p) => !p.txnId).length} skipped. Confirm to apply.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={copySummary}
                className="inline-flex items-center gap-1.5 border border-border px-3 py-1.5 text-xs font-semibold hover:bg-secondary"
                title="Copy a text summary for sharing"
              >
                <Copy className="h-3.5 w-3.5" /> Copy summary
              </button>
              <button
                onClick={downloadSummaryImage}
                className="inline-flex items-center gap-1.5 border border-border px-3 py-1.5 text-xs font-semibold hover:bg-secondary"
                title="Download as PNG image"
              >
                <Download className="h-3.5 w-3.5" /> Download image
              </button>
              <button onClick={cancelPreview} className="border border-border px-3 py-1.5 text-xs font-semibold hover:bg-secondary">Cancel</button>
              <button
                onClick={confirmAutoLink}
                disabled={preview.every((p) => !p.txnId)}
                className="inline-flex items-center gap-1.5 bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-30"
              >
                <Check className="h-3.5 w-3.5" /> Confirm ({preview.filter((p) => p.txnId).length})
              </button>
            </div>
          </div>
          {shareToast && (
            <div className="border-b border-border bg-success/10 px-4 py-2 text-xs font-medium text-success">{shareToast}</div>
          )}

          <ul className="divide-y divide-border">
            {preview.map((p) => {
              const txn = p.txnId ? transactions.find((t) => t.id === p.txnId) : null;
              return (
                <li key={p.mpesaId} className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 py-3">
                  <div className="min-w-0">
                    <div className="font-mono text-xs text-muted-foreground">{p.mpesaCode}</div>
                    <div className="font-mono text-sm font-semibold text-success">+ {formatKES(p.mpesaAmount)}</div>
                    {p.mpesaDate && (
                      <div className="font-mono text-[11px] text-muted-foreground">
                        {p.mpesaDate.toLocaleString("en-KE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">→</div>
                  {txn ? (
                    <div className="min-w-0 text-right">
                      <div className="truncate text-sm font-medium">{txn.description}</div>
                      <div className="font-mono text-[11px] text-muted-foreground">
                        {new Date(txn.date).toLocaleString("en-KE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })} · {txn.method}
                      </div>
                      <div className="mt-0.5 text-[11px] text-muted-foreground">{p.reason}</div>
                    </div>
                  ) : (
                    <div className="min-w-0 text-right">
                      <div className="text-sm font-medium text-warning">Will be skipped</div>
                      <div className="text-[11px] text-muted-foreground">{p.reason}</div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}



      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left: M-Pesa */}
        <section className="border border-border bg-card">
          <header className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider">Imported M-Pesa Messages</h2>
            <div className="mt-2 flex gap-1">
              <button
                onClick={() => { setTab("unmatched"); setSelectedMpesa(null); }}
                className={"px-3 py-1 text-xs font-semibold border " + (tab === "unmatched" ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:bg-secondary")}
              >
                Unmatched ({unmatchedMpesa.length})
              </button>
              <button
                onClick={() => { setTab("completed"); setSelectedMpesa(null); }}
                disabled={bulkMode}
                className={"px-3 py-1 text-xs font-semibold border disabled:opacity-40 disabled:cursor-not-allowed " + (tab === "completed" ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:bg-secondary")}
              >
                Completed ({completedMpesa.length})
              </button>
            </div>
          </header>
          <ul>
            {visibleMpesa.map((m) => {
              const isSelected = m.id === selectedMpesa;
              const matched = !!m.matchedTxnId;
              const linkedTxn = matched ? transactions.find((t) => t.id === m.matchedTxnId) : undefined;
              const isBulkChecked = bulkSelected.has(m.id);

              if (bulkMode && tab === "unmatched") {
                return (
                  <li key={m.id} className="border-b border-border last:border-b-0">
                    <label className={"flex w-full cursor-pointer items-start gap-3 px-4 py-3 transition-colors " + (isBulkChecked ? "bg-accent" : "hover:bg-secondary")}>
                      <input
                        type="checkbox"
                        checked={isBulkChecked}
                        onChange={() => toggleBulk(m.id)}
                        className="mt-1 h-4 w-4 cursor-pointer accent-primary"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-3">
                          <div className="font-mono text-xs text-muted-foreground">{m.code}</div>
                          <div className="font-mono text-sm font-semibold text-success">+ {formatKES(m.amount)}</div>
                        </div>
                        <div className="mt-1 font-mono text-xs leading-relaxed">{m.raw}</div>
                      </div>
                    </label>
                  </li>
                );
              }

              return (
                <li key={m.id} className="border-b border-border last:border-b-0">
                  <button
                    onClick={() => setSelectedMpesa(isSelected ? null : m.id)}
                    className={
                      "w-full px-4 py-3 text-left transition-colors " +
                      (isSelected ? "bg-accent" : "hover:bg-secondary")
                    }
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <div className="font-mono text-xs text-muted-foreground">{m.code}</div>
                      <div className="font-mono text-sm font-semibold text-success">+ {formatKES(m.amount)}</div>
                    </div>
                    <div className="mt-1 font-mono text-xs leading-relaxed">{m.raw}</div>
                    {matched && (
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1 rounded-sm bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                          <Check className="h-3 w-3" /> Linked
                        </span>
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => { e.stopPropagation(); actions.matchMpesa(m.id, undefined); setTab("unmatched"); }}
                          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); actions.matchMpesa(m.id, undefined); setTab("unmatched"); } }}
                          className="inline-flex items-center gap-1 border border-border px-2 py-1 text-xs font-semibold hover:bg-secondary cursor-pointer"
                        >
                          <Unlink className="h-3 w-3" /> Undo
                        </span>
                      </div>
                    )}
                    {isSelected && matched && linkedTxn && (
                      <div className="mt-3 border border-border bg-background p-3">
                        <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Linked transaction</div>
                        <div className="text-sm font-medium">{linkedTxn.description}</div>
                        <div className="mt-1 flex items-center justify-between font-mono text-xs text-muted-foreground">
                          <span>{new Date(linkedTxn.date).toLocaleString("en-KE", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                          <span>{linkedTxn.method}</span>
                        </div>
                        <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
                          <span className="font-mono text-[11px] text-muted-foreground">ID {linkedTxn.id}</span>
                          <span className="font-mono text-sm font-semibold">{formatKES(linkedTxn.amount)}</span>
                        </div>
                      </div>
                    )}
                  </button>
                </li>
              );
            })}
            {visibleMpesa.length === 0 && (
              <li className="p-8 text-center text-sm text-muted-foreground">
                {tab === "unmatched" ? "Inbox zero — all messages reconciled." : "No completed matches yet."}
              </li>
            )}
          </ul>
        </section>

        {/* Right: System sales */}
        <section className="border border-border bg-card">
          <header className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider">Recorded Sales</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {bulkMode
                ? <>Sales matching the amount of any selected message are highlighted.</>
                : selected
                ? <>Linking to <span className="font-mono">{selected.code}</span> — pick a matching sale</>
                : "Select an M-Pesa message to start linking"}
            </p>
          </header>
          <ul>
            {unmatchedSales.map((t) => {
              const exactMatch = !bulkMode && selected && selected.amount === t.amount;
              const bulkHighlight = bulkMode && bulkSelectedAmounts.has(t.amount);
              return (
                <li key={t.id} className="border-b border-border last:border-b-0">
                  <div className={"flex items-center gap-3 px-4 py-3 " + (exactMatch || bulkHighlight ? "bg-warning/10" : "")}>
                    <div className="flex-1">
                      <div className="text-sm font-medium">{t.description}</div>
                      <div className="font-mono text-xs text-muted-foreground">
                        {new Date(t.date).toLocaleString("en-KE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })} · {t.method}
                      </div>
                    </div>
                    <div className="font-mono text-sm font-semibold">{formatKES(t.amount)}</div>
                    <button
                      disabled={!selected || bulkMode}
                      onClick={() => link(t.id)}
                      className="inline-flex items-center gap-1 rounded-sm bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <Link2 className="h-3 w-3" /> Link
                    </button>
                  </div>
                </li>
              );
            })}
            {unmatchedSales.length === 0 && (
              <li className="p-8 text-center text-sm text-muted-foreground">All sales reconciled.</li>
            )}
          </ul>
        </section>
      </div>
    </main>
  );
}
