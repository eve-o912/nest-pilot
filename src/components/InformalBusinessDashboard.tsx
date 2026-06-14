import { useStore, formatKES } from "@/lib/store";
import { TrendingUp, Wallet, ArrowDown, Calendar, CheckCircle } from "lucide-react";
import { useState } from "react";

interface MetricCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  subtitle?: string;
  positive?: boolean;
}

function MetricCard({ title, value, icon, subtitle, positive }: MetricCardProps) {
  return (
    <div className="border border-border bg-card p-6">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        <div className={`rounded-sm p-2 ${positive ? "bg-green-100 dark:bg-green-950/20" : "bg-secondary"}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

export function InformalBusinessDashboard() {
  const transactions = useStore((s) => s.transactions);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const calculateDailyMetrics = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    const todayTransactions = transactions.filter(t => {
      const txnDate = new Date(t.date);
      return txnDate >= today && txnDate <= endOfDay;
    });

    const todayIncome = todayTransactions.filter(t => t.type === "in").reduce((sum, t) => sum + t.amount, 0);
    const todayExpenses = todayTransactions.filter(t => t.type === "out").reduce((sum, t) => sum + t.amount, 0);
    const netProfit = todayIncome - todayExpenses;

    // Calculate this month's totals
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthTransactions = transactions.filter(t => new Date(t.date) >= startOfMonth);
    const monthIncome = monthTransactions.filter(t => t.type === "in").reduce((sum, t) => sum + t.amount, 0);
    const monthExpenses = monthTransactions.filter(t => t.type === "out").reduce((sum, t) => sum + t.amount, 0);

    // Calculate cash position (simplified)
    const allIncome = transactions.filter(t => t.type === "in").reduce((sum, t) => sum + t.amount, 0);
    const allExpenses = transactions.filter(t => t.type === "out").reduce((sum, t) => sum + t.amount, 0);
    const cashPosition = allIncome - allExpenses;

    return {
      todayIncome,
      todayExpenses,
      netProfit,
      monthIncome,
      monthExpenses,
      cashPosition,
      todayTransactionCount: todayTransactions.length,
    };
  };

  const metrics = calculateDailyMetrics();

  return (
    <div className="space-y-6">
      {/* Today's Summary Banner */}
      <div className="border-l-4 border-green-500 bg-green-50 dark:bg-green-950/20 p-4">
        <p className="text-sm font-medium text-green-900 dark:text-green-100">
          {metrics.netProfit >= 0 
            ? `You made ${formatKES(metrics.netProfit)} profit today. Good work!`
            : `You spent ${formatKES(Math.abs(metrics.netProfit))} more than you made today.`
          }
        </p>
      </div>

      {/* Today's Key Metrics */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Today</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard
            title="Money You Made"
            value={formatKES(metrics.todayIncome)}
            icon={<TrendingUp className="h-5 w-5 text-green-600" />}
            positive
          />
          <MetricCard
            title="Money You Spent"
            value={formatKES(metrics.todayExpenses)}
            icon={<ArrowDown className="h-5 w-5 text-red-600" />}
          />
          <MetricCard
            title="Net Profit"
            value={formatKES(metrics.netProfit)}
            subtitle={`${metrics.todayTransactionCount} transactions`}
            icon={<Wallet className="h-5 w-5 text-blue-600" />}
            positive={metrics.netProfit >= 0}
          />
        </div>
      </div>

      {/* This Month */}
      <div>
        <h2 className="text-lg font-semibold mb-4">This Month</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <MetricCard
            title="Total Income"
            value={formatKES(metrics.monthIncome)}
            icon={<TrendingUp className="h-5 w-5 text-green-600" />}
            positive
          />
          <MetricCard
            title="Total Expenses"
            value={formatKES(metrics.monthExpenses)}
            icon={<ArrowDown className="h-5 w-5 text-red-600" />}
          />
        </div>
      </div>

      {/* Cash Position */}
      <div className="border border-border bg-card p-6">
        <h3 className="text-lg font-semibold mb-4">Your Savings</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-3xl font-bold text-foreground">{formatKES(metrics.cashPosition)}</p>
            <p className="text-sm text-muted-foreground mt-1">Total cash position</p>
          </div>
          <div className="rounded-full bg-secondary p-4">
            <Wallet className="h-8 w-8 text-muted-foreground" />
          </div>
        </div>
        {metrics.cashPosition > 0 && (
          <div className="mt-4 flex items-center gap-2 text-sm text-green-600">
            <CheckCircle className="h-4 w-4" />
            <span>You have enough to keep going</span>
          </div>
        )}
      </div>

      {/* Recent Transactions */}
      <div className="border border-border bg-card p-6">
        <h3 className="text-lg font-semibold mb-4">Recent Transactions</h3>
        <div className="space-y-3">
          {transactions.slice(0, 5).map((txn) => (
            <div key={txn.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <div className="flex-1">
                <p className="font-medium text-foreground">{txn.description}</p>
                <p className="text-xs text-muted-foreground">{new Date(txn.date).toLocaleDateString('en-KE')}</p>
              </div>
              <div className={`font-semibold ${txn.type === 'in' ? 'text-green-600' : 'text-red-600'}`}>
                {txn.type === 'in' ? '+' : '-'}{formatKES(txn.amount)}
              </div>
            </div>
          ))}
          {transactions.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No transactions yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
