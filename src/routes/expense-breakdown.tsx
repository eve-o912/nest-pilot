import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Plus, Calendar } from "lucide-react";
import { supabase, type Transaction } from "@/lib/supabase";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, format } from "date-fns";

type DateRange = "week" | "month" | "custom";

interface ExpenseCategory {
  id: string;
  user_id: string;
  name: string;
  color: string;
  emoji: string;
  created_at: string;
}

interface CategoryBreakdown {
  name: string;
  emoji: string;
  color: string;
  amount: number;
  percentage: number;
}

const EMOJI_OPTIONS = [
  "📦", "🛒", "🍔", "⛽", "💡", "🏠", "🚗", "💊", "📱", "👔",
  "🎓", "✈️", "🎉", "🎁", "🏥", "🏋️", "🎮", "📚", "🎬", "🎵"
];

const COLOR_OPTIONS = [
  "#EF4444", "#F59E0B", "#10B981", "#3B82F6", "#8B5CF6",
  "#EC4899", "#14B8A6", "#F97316", "#6366F1", "#84CC16"
];

export const Route = createFileRoute("/expense-breakdown")({
  component: ExpenseBreakdown,
  head: () => ({
    meta: [
      { title: "Expense Breakdown — Nest Pilot" },
      { name: "description", content: "Analyze your expenses by category." },
    ],
  }),
});

function ExpenseBreakdown() {
  const [dateRange, setDateRange] = useState<DateRange>("week");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryEmoji, setNewCategoryEmoji] = useState("📦");
  const [newCategoryColor, setNewCategoryColor] = useState("#F59E0B");

  useEffect(() => {
    fetchData();
  }, [dateRange, customStartDate, customEndDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from("expense_categories")
        .select("*")
        .eq("user_id", user.id);

      if (categoriesError) throw categoriesError;
      setCategories(categoriesData || []);

      // Calculate date range
      let startDate: Date;
      let endDate: Date;

      if (dateRange === "week") {
        startDate = startOfWeek(new Date(), { weekStartsOn: 1 });
        endDate = endOfWeek(new Date(), { weekStartsOn: 1 });
      } else if (dateRange === "month") {
        startDate = startOfMonth(new Date());
        endDate = endOfMonth(new Date());
      } else {
        startDate = customStartDate ? new Date(customStartDate) : startOfMonth(new Date());
        endDate = customEndDate ? new Date(customEndDate) : endOfMonth(new Date());
      }

      // Fetch expenses
      const { data: transactionsData, error: transactionsError } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .eq("type", "expense")
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      if (transactionsError) throw transactionsError;
      setTransactions(transactionsData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const categoryBreakdown = useMemo(() => {
    // Group transactions by tag
    const tagGroups = new Map<string, number>();
    transactions.forEach((t) => {
      const tag = t.tag || "Uncategorized";
      tagGroups.set(tag, (tagGroups.get(tag) || 0) + Number(t.amount));
    });

    // Match tags to categories
    const breakdown: CategoryBreakdown[] = [];
    const matchedTags = new Set<string>();

    categories.forEach((cat) => {
      const matchingTags = Array.from(tagGroups.entries()).filter(
        ([tag]) => tag.toLowerCase() === cat.name.toLowerCase()
      );

      if (matchingTags.length > 0) {
        const total = matchingTags.reduce((sum, [, amount]) => sum + amount, 0);
        breakdown.push({
          name: cat.name,
          emoji: cat.emoji || "📦",
          color: cat.color || "#9CA3AF",
          amount: total,
          percentage: 0, // Will calculate after total
        });
        matchingTags.forEach(([tag]) => matchedTags.add(tag));
      }
    });

    // Add unmatched tags as "Other"
    const otherTotal = Array.from(tagGroups.entries())
      .filter(([tag]) => !matchedTags.has(tag))
      .reduce((sum, [, amount]) => sum + amount, 0);

    if (otherTotal > 0) {
      breakdown.push({
        name: "Other",
        emoji: "🏷️",
        color: "#9CA3AF",
        amount: otherTotal,
        percentage: 0,
      });
    }

    // Calculate percentages
    const total = breakdown.reduce((sum, cat) => sum + cat.amount, 0);
    breakdown.forEach((cat) => {
      cat.percentage = total > 0 ? (cat.amount / total) * 100 : 0;
    });

    // Sort by amount (highest first)
    return breakdown.sort((a, b) => b.amount - a.amount);
  }, [transactions, categories]);

  const totalExpenses = categoryBreakdown.reduce((sum, cat) => sum + cat.amount, 0);

  const chartData = categoryBreakdown.map((cat) => ({
    name: cat.name,
    value: cat.amount,
    color: cat.color,
  }));

  const formatKES = (amount: number) => {
    return `KES ${amount.toLocaleString("en-KE", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("expense_categories")
        .insert({
          user_id: user.id,
          name: newCategoryName,
          emoji: newCategoryEmoji,
          color: newCategoryColor,
        });

      if (error) throw error;

      setNewCategoryName("");
      setNewCategoryEmoji("📦");
      setNewCategoryColor("#F59E0B");
      setShowCategoryModal(false);
      fetchData();
    } catch (error) {
      console.error("Error adding category:", error);
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
      {/* Header with Date Filter */}
      <section className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Expense Breakdown</h1>
          <p className="text-sm text-muted-foreground">
            Analyze your spending by category
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setDateRange("week")}
            className={
              "px-4 py-2 text-sm font-medium transition-colors rounded-sm border border-border " +
              (dateRange === "week"
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground hover:bg-secondary")
            }
          >
            This Week
          </button>
          <button
            onClick={() => setDateRange("month")}
            className={
              "px-4 py-2 text-sm font-medium transition-colors rounded-sm border border-border " +
              (dateRange === "month"
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground hover:bg-secondary")
            }
          >
            This Month
          </button>
          <button
            onClick={() => setDateRange("custom")}
            className={
              "px-4 py-2 text-sm font-medium transition-colors rounded-sm border border-border " +
              (dateRange === "custom"
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground hover:bg-secondary")
            }
          >
            Custom Range
          </button>
        </div>
      </section>

      {/* Custom Date Pickers */}
      {dateRange === "custom" && (
        <section className="mb-6 flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="h-10 rounded-sm border border-input bg-background px-3 text-sm outline-none focus:border-ring"
            />
          </div>
          <span className="text-muted-foreground">to</span>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="h-10 rounded-sm border border-input bg-background px-3 text-sm outline-none focus:border-ring"
            />
          </div>
        </section>
      )}

      {transactions.length === 0 ? (
        /* Empty State */
        <section className="flex flex-col items-center justify-center py-20">
          <div className="text-center">
            <p className="text-lg font-medium text-muted-foreground">
              No expenses logged yet.
            </p>
          </div>
        </section>
      ) : (
        <>
          {/* Donut Chart */}
          <section className="mb-6">
            <div className="rounded-sm border border-border bg-card p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={80}
                        outerRadius={120}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "var(--color-card)",
                          border: "1px solid var(--color-border)",
                          borderRadius: "var(--radius-sm)",
                        }}
                        formatter={(value: number) => formatKES(value)}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="text-center">
                  <div className="text-sm text-muted-foreground mb-2">Total Expenses</div>
                  <div className="font-mono text-4xl font-bold tabular-nums">
                    {formatKES(totalExpenses)}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Category List */}
          <section className="mb-6">
            <div className="rounded-sm border border-border bg-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold">Categories</h2>
                <button
                  onClick={() => setShowCategoryModal(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-sm bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
                >
                  <Plus className="h-4 w-4" /> New Category
                </button>
              </div>
              <div className="space-y-4">
                {categoryBreakdown.map((cat) => (
                  <div key={cat.name} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{cat.emoji}</span>
                        <span className="font-medium">{cat.name}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-mono font-semibold">{formatKES(cat.amount)}</span>
                        <span className="text-sm text-muted-foreground w-12 text-right">
                          {cat.percentage.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${cat.percentage}%`,
                          backgroundColor: cat.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </>
      )}

      {/* New Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30">
          <div className="w-full max-w-md rounded-sm border border-border bg-card p-6 m-4">
            <h3 className="mb-4 text-lg font-semibold">New Category</h3>
            <div className="space-y-4">
              <div>
                <label className="block mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Name
                </label>
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="h-10 w-full rounded-sm border border-input bg-background px-3 text-sm outline-none focus:border-ring"
                  placeholder="e.g., Restock"
                />
              </div>
              <div>
                <label className="block mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Emoji
                </label>
                <div className="grid grid-cols-10 gap-2">
                  {EMOJI_OPTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => setNewCategoryEmoji(emoji)}
                      className={`h-10 w-10 text-2xl flex items-center justify-center rounded-sm border-2 transition-colors ${
                        newCategoryEmoji === emoji
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-border/50"
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Color
                </label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_OPTIONS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setNewCategoryColor(color)}
                      className={`h-10 w-10 rounded-sm border-2 transition-colors ${
                        newCategoryColor === color
                          ? "border-primary"
                          : "border-border hover:border-border/50"
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-6 flex gap-2">
              <button
                onClick={() => setShowCategoryModal(false)}
                className="flex-1 rounded-sm border border-border bg-background py-2.5 text-sm font-medium hover:bg-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleAddCategory}
                className="flex-1 rounded-sm bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
