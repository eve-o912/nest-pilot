import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { ChevronDown, Filter } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatKES } from "@/lib/store";
import { format } from "date-fns";

export const Route = createFileRoute("/journal-entries")({
  component: JournalEntries,
  head: () => ({
    meta: [
      { title: "Journal Entries — Nest Pilot" },
      { name: "description", content: "View all double-entry journal entries and balances." },
    ],
  }),
});

function JournalEntries() {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState({ from: "", to: "" });

  useEffect(() => {
    fetchEntries();
  }, [dateFilter]);

  const fetchEntries = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from("journal_entries")
        .select(
          `
          *,
          lines:journal_entry_lines(*)
          `
        )
        .eq("user_id", user.id);

      if (dateFilter.from) {
        query = query.gte("date", dateFilter.from);
      }
      if (dateFilter.to) {
        query = query.lte("date", dateFilter.to);
      }

      const { data } = await query.order("date", { ascending: false });
      setEntries(data || []);
    } catch (error) {
      console.error("Error fetching journal entries:", error);
    } finally {
      setLoading(false);
    }
  };

  const totalDebits = entries.reduce(
    (sum, entry) =>
      sum +
      (entry.lines || []).reduce((lineSum: number, line: any) => lineSum + (line.debit || 0), 0),
    0
  );

  const totalCredits = entries.reduce(
    (sum, entry) =>
      sum +
      (entry.lines || []).reduce((lineSum: number, line: any) => lineSum + (line.credit || 0), 0),
    0
  );

  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;

  return (
    <main className="mx-auto max-w-[1600px] px-6 pb-16">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Journal Entries</h1>
        <p className="text-sm text-muted-foreground">All double-entry transactions</p>
      </div>

      {/* Summary */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-sm border border-border bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Total Debits</p>
          <p className="text-2xl font-bold font-mono">{formatKES(totalDebits)}</p>
        </div>
        <div className="rounded-sm border border-border bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Total Credits</p>
          <p className="text-2xl font-bold font-mono">{formatKES(totalCredits)}</p>
        </div>
        <div className={`rounded-sm border ${isBalanced ? "border-green-500 bg-green-500/10" : "border-red-500 bg-red-500/10"} p-4`}>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Balance</p>
          <p className={`text-2xl font-bold font-mono ${isBalanced ? "text-green-600" : "text-red-600"}`}>
            {isBalanced ? "✓ Balanced" : `Δ ${formatKES(Math.abs(totalDebits - totalCredits))}`}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex gap-2">
        <input
          type="date"
          value={dateFilter.from}
          onChange={(e) => setDateFilter({ ...dateFilter, from: e.target.value })}
          className="h-10 rounded-sm border border-input bg-background px-3 text-sm"
          placeholder="From"
        />
        <input
          type="date"
          value={dateFilter.to}
          onChange={(e) => setDateFilter({ ...dateFilter, to: e.target.value })}
          className="h-10 rounded-sm border border-input bg-background px-3 text-sm"
          placeholder="To"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      ) : entries.length === 0 ? (
        <div className="rounded-sm border border-border bg-card p-12 text-center">
          <p className="text-muted-foreground">No journal entries yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => {
            const entryDebits = (entry.lines || []).reduce((sum: number, line: any) => sum + (line.debit || 0), 0);
            const entryCredits = (entry.lines || []).reduce((sum: number, line: any) => sum + (line.credit || 0), 0);
            const isExpanded = expandedEntry === entry.id;

            return (
              <div key={entry.id} className="rounded-sm border border-border bg-card overflow-hidden">
                <button
                  onClick={() => setExpandedEntry(isExpanded ? null : entry.id)}
                  className="w-full flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors"
                >
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-3">
                      <p className="font-medium">{entry.description}</p>
                      {entry.source && <span className="text-xs bg-secondary px-2 py-1 rounded">{entry.source}</span>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(entry.date), "MMM d, yyyy")}
                      {entry.reference && ` • ${entry.reference}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Debit</p>
                      <p className="font-mono font-semibold">{formatKES(entryDebits)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Credit</p>
                      <p className="font-mono font-semibold">{formatKES(entryCredits)}</p>
                    </div>
                    <ChevronDown
                      className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`}
                    />
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-border bg-secondary/20 p-4">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-xs uppercase tracking-wider text-muted-foreground">
                          <th className="text-left pb-2 font-medium">Account</th>
                          <th className="text-right pb-2 font-medium">Debit</th>
                          <th className="text-right pb-2 font-medium">Credit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(entry.lines || []).map((line: any, idx: number) => (
                          <tr key={idx} className="border-t border-border/30">
                            <td className="py-2">{line.account_name}</td>
                            <td className="text-right font-mono">{formatKES(line.debit || 0)}</td>
                            <td className="text-right font-mono">{formatKES(line.credit || 0)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
