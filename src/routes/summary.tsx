import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { ArrowDownLeft, ArrowUpRight, Share2, Plus } from "lucide-react";
import { supabase, type Transaction } from "@/lib/supabase";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { startOfDay, startOfWeek, endOfDay, endOfWeek, format } from "date-fns";

type Period = "today" | "week";

export const Route = createFileRoute("/summary")({
  component: Summary,
  head: () => ({
    meta: [
      { title: "Summary — Nest Pilot" },
      { name: "description", content: "Daily and weekly financial summary report." },
    ],
  }),
});

function Summary() {
  const [period, setPeriod] = useState<Period>("today");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTransactions();
    
    // Set up realtime subscription
    const channel = supabase
      .channel("transactions-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "transactions",
        },
        () => {
          fetchTransactions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [period]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let startDate: Date;
      const endDate = new Date();

      if (period === "today") {
        startDate = startOfDay(new Date());
      } else {
        startDate = startOfWeek(new Date(), { weekStartsOn: 1 }); // Monday
      }

      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString())
        .order("created_at", { ascending: true });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  const totals = useMemo(() => {
    const totalIn = transactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const totalOut = transactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const net = totalIn - totalOut;
    return { totalIn, totalOut, net };
  }, [transactions]);

  const chartData = useMemo(() => {
    if (period === "today") {
      // Group by hour (0-23)
      const hourlyData = Array.from({ length: 24 }, (_, hour) => ({
        label: `${hour}:00`,
        income: 0,
        expense: 0,
      }));

      transactions.forEach((t) => {
        const hour = new Date(t.created_at).getHours();
        if (t.type === "income") {
          hourlyData[hour].income += Number(t.amount);
        } else {
          hourlyData[hour].expense += Number(t.amount);
        }
      });

      return hourlyData;
    } else {
      // Group by day (Mon-Sun)
      const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      const weeklyData = days.map((day) => ({
        label: day,
        income: 0,
        expense: 0,
      }));

      transactions.forEach((t) => {
        const dayIndex = new Date(t.created_at).getDay();
        const adjustedIndex = dayIndex === 0 ? 6 : dayIndex - 1; // Convert Sunday (0) to 6, Monday to 0
        if (t.type === "income") {
          weeklyData[adjustedIndex].income += Number(t.amount);
        } else {
          weeklyData[adjustedIndex].expense += Number(t.amount);
        }
      });

      return weeklyData;
    }
  }, [transactions, period]);

  const formatKES = (amount: number) => {
    return `KES ${amount.toLocaleString("en-KE", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  };

  const handleShare = () => {
    const date = period === "today" 
      ? format(new Date(), "MMM d, yyyy")
      : `${format(startOfWeek(new Date(), { weekStartsOn: 1 }), "MMM d")} - ${format(endOfWeek(new Date(), { weekStartsOn: 1 }), "MMM d, yyyy")}`;
    
    const message = `📊 Nest Pilot – ${date}
Total In: ${formatKES(totals.totalIn)}
Total Out: ${formatKES(totals.totalOut)}
Net: ${formatKES(totals.net)}
via nestfinance.xyz`;

    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encodedMessage}`, "_blank");
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
      {/* Header with Toggle */}
      <section className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Summary Report</h1>
          <p className="text-sm text-muted-foreground">
            {period === "today" ? "Today's" : "This week's"} financial overview
          </p>
        </div>
        <div className="flex rounded-sm border border-border bg-card">
          <button
            onClick={() => setPeriod("today")}
            className={
              "px-4 py-2 text-sm font-medium transition-colors " +
              (period === "today"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-secondary")
            }
          >
            Today
          </button>
          <button
            onClick={() => setPeriod("week")}
            className={
              "px-4 py-2 text-sm font-medium transition-colors " +
              (period === "week"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-secondary")
            }
          >
            This Week
          </button>
        </div>
      </section>

      {transactions.length === 0 ? (
        /* Empty State */
        <section className="flex flex-col items-center justify-center py-20">
          <div className="text-center">
            <p className="text-lg font-medium text-muted-foreground">
              No transactions recorded yet {period === "today" ? "today" : "this week"}.
            </p>
            <Link
              to="/dashboard"
              className="mt-4 inline-flex items-center justify-center gap-2 rounded-sm bg-success px-5 py-3 text-sm font-semibold text-success-foreground hover:opacity-90"
            >
              <Plus className="h-4 w-4" /> Log Sale
            </Link>
          </div>
        </section>
      ) : (
        <>
          {/* Summary Cards */}
          <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            <SummaryCard
              label="Total In"
              value={totals.totalIn}
              tone="in"
              icon={<ArrowDownLeft className="h-4 w-4" />}
            />
            <SummaryCard
              label="Total Out"
              value={totals.totalOut}
              tone="out"
              icon={<ArrowUpRight className="h-4 w-4" />}
            />
            <SummaryCard
              label="Net"
              value={totals.net}
              tone={totals.net >= 0 ? "positive" : "negative"}
            />
          </section>

          {/* Bar Chart */}
          <section className="mb-6">
            <div className="rounded-sm border border-border bg-card p-6">
              <h2 className="mb-4 text-base font-semibold">
                {period === "today" ? "Hourly" : "Daily"} Breakdown
              </h2>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis
                      dataKey="label"
                      className="text-xs text-muted-foreground"
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis
                      className="text-xs text-muted-foreground"
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => formatKES(value)}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--color-card)",
                        border: "1px solid var(--color-border)",
                        borderRadius: "var(--radius-sm)",
                      }}
                      formatter={(value: number) => formatKES(value)}
                    />
                    <Bar dataKey="income" fill="var(--color-success)" name="Income" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="expense" fill="var(--color-destructive)" name="Expense" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          {/* Share Button */}
          <section>
            <button
              onClick={handleShare}
              className="inline-flex items-center justify-center gap-2 rounded-sm border border-border bg-card px-5 py-3 text-sm font-semibold hover:bg-secondary"
            >
              <Share2 className="h-4 w-4" /> Share Summary
            </button>
          </section>
        </>
      )}
    </main>
  );
}

function SummaryCard({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: number;
  tone: "in" | "out" | "positive" | "negative";
  icon?: React.ReactNode;
}) {
  const formatKES = (amount: number) => {
    return `KES ${Math.abs(amount).toLocaleString("en-KE", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  };

  const getToneClass = () => {
    switch (tone) {
      case "in":
      case "positive":
        return "text-success";
      case "out":
      case "negative":
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
      <div className={`mt-2 font-mono text-3xl font-bold leading-tight tabular-nums ${getToneClass()}`}>
        {formatKES(value)}
      </div>
    </div>
  );
}
