import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { formatKES } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { TrendingUp, TrendingDown, FileText, DollarSign } from "lucide-react";

export const Route = createFileRoute("/today")({
  component: Today,
  head: () => ({
    meta: [
      { title: "Today — Nest Pilot" },
      { name: "description", content: "Today's transactions and summary." },
    ],
  }),
});

function Today() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    todayRevenue: 0,
    todayExpenses: 0,
    recentInvoices: [] as any[],
    recentExpenses: [] as any[],
  });

  useEffect(() => {
    fetchTodayData();
  }, []);

  const fetchTodayData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = format(new Date(), "yyyy-MM-dd");

      // Fetch today's invoices
      const { data: invoices } = await supabase
        .from("invoices")
        .select("*")
        .eq("user_id", user.id)
        .gte("issue_date", today)
        .lte("issue_date", today)
        .order("created_at", { ascending: false });

      // Fetch today's expenses
      const { data: expenses } = await supabase
        .from("expenses")
        .select("*")
        .eq("user_id", user.id)
        .gte("date", today)
        .lte("date", today)
        .order("created_at", { ascending: false });

      const todayRevenue = invoices?.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0;
      const todayExpenses = expenses?.reduce((sum, exp) => sum + (exp.amount || 0), 0) || 0;

      setData({
        todayRevenue,
        todayExpenses,
        recentInvoices: invoices || [],
        recentExpenses: expenses || [],
      });
    } catch (error) {
      console.error("Error fetching today data:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-[1600px] px-6 pb-16">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Today</h1>
        <p className="text-sm text-muted-foreground mt-1">{format(new Date(), "EEEE, MMMM d, yyyy")}</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-sm border border-border bg-card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Today's Revenue</p>
                  <p className="text-3xl font-bold font-mono text-green-600">{formatKES(data.todayRevenue)}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600 opacity-20" />
              </div>
            </div>

            <div className="rounded-sm border border-border bg-card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Today's Expenses</p>
                  <p className="text-3xl font-bold font-mono text-red-600">{formatKES(data.todayExpenses)}</p>
                </div>
                <TrendingDown className="h-8 w-8 text-red-600 opacity-20" />
              </div>
            </div>
          </div>

          {/* Today's Invoices */}
          <div className="rounded-sm border border-border bg-card">
            <div className="border-b border-border px-6 py-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Today's Invoices
              </h2>
            </div>
            {data.recentInvoices.length === 0 ? (
              <div className="px-6 py-8 text-center text-muted-foreground">
                No invoices created today
              </div>
            ) : (
              <div className="divide-y divide-border">
                {data.recentInvoices.map((inv) => (
                  <div key={inv.id} className="px-6 py-4 hover:bg-secondary/30 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{inv.invoice_number}</p>
                        <p className="text-sm text-muted-foreground">{inv.customer_name}</p>
                      </div>
                      <p className="font-mono font-bold text-green-600">{formatKES(inv.total_amount || 0)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Today's Expenses */}
          <div className="rounded-sm border border-border bg-card">
            <div className="border-b border-border px-6 py-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Today's Expenses
              </h2>
            </div>
            {data.recentExpenses.length === 0 ? (
              <div className="px-6 py-8 text-center text-muted-foreground">
                No expenses recorded today
              </div>
            ) : (
              <div className="divide-y divide-border">
                {data.recentExpenses.map((exp) => (
                  <div key={exp.id} className="px-6 py-4 hover:bg-secondary/30 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{exp.description}</p>
                        <p className="text-sm text-muted-foreground">{exp.category}</p>
                      </div>
                      <p className="font-mono font-bold text-red-600">{formatKES(exp.amount || 0)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Net Profit Today */}
          <div className="rounded-sm border border-border bg-card p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Net Today</p>
            <p className={`text-3xl font-bold font-mono ${data.todayRevenue - data.todayExpenses >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatKES(data.todayRevenue - data.todayExpenses)}
            </p>
          </div>
        </div>
      )}
    </main>
  );
}
