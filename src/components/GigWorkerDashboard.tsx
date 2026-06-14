import { useStore, formatKES } from "@/lib/store";
import { TrendingUp, CreditCard, Calendar, BarChart3, Award, AlertCircle } from "lucide-react";
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

export function GigWorkerDashboard() {
  const transactions = useStore((s) => s.transactions);

  const calculateGigMetrics = () => {
    // Group transactions by description to simulate income streams
    const incomeStreams = new Map<string, number>();
    transactions
      .filter(t => t.type === "in")
      .forEach(t => {
        const current = incomeStreams.get(t.description) || 0;
        incomeStreams.set(t.description, current + t.amount);
      });

    // Calculate monthly income
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const recentIncome = transactions
      .filter(t => t.type === "in" && new Date(t.date) >= thirtyDaysAgo)
      .reduce((sum, t) => sum + t.amount, 0);

    // Calculate consistency (months with income)
    const monthsWithData = new Set<string>();
    transactions
      .filter(t => t.type === "in")
      .forEach(t => {
        const date = new Date(t.date);
        const key = `${date.getFullYear()}-${date.getMonth()}`;
        monthsWithData.add(key);
      });

    // Calculate credit score (simplified)
    const totalIncome = transactions.filter(t => t.type === "in").reduce((sum, t) => sum + t.amount, 0);
    const transactionCount = transactions.length;
    const consistencyScore = Math.min(monthsWithData.size * 15, 50); // Max 50 points for consistency
    const volumeScore = Math.min((totalIncome / 100000) * 10, 30); // Max 30 points for volume
    const activityScore = Math.min(transactionCount * 2, 20); // Max 20 points for activity
    const creditScore = consistencyScore + volumeScore + activityScore;

    // Calculate average monthly income
    const avgMonthlyIncome = monthsWithData.size > 0 ? totalIncome / monthsWithData.size : 0;

    return {
      incomeStreams: Array.from(incomeStreams.entries()).map(([name, amount]) => ({ name, amount })),
      monthlyIncome: recentIncome,
      monthsWithData: monthsWithData.size,
      creditScore: Math.round(creditScore),
      avgMonthlyIncome,
      totalIncome,
      transactionCount,
    };
  };

  const metrics = calculateGigMetrics();

  const getCreditScoreColor = (score: number) => {
    if (score >= 70) return "text-green-600";
    if (score >= 50) return "text-yellow-600";
    return "text-red-600";
  };

  const getCreditScoreLabel = (score: number) => {
    if (score >= 70) return "Good";
    if (score >= 50) return "Fair";
    return "Building";
  };

  return (
    <div className="space-y-6">
      {/* Credit Score Banner */}
      <div className="border-l-4 border-purple-500 bg-purple-50 dark:bg-purple-950/20 p-4">
        <p className="text-sm font-medium text-purple-900 dark:text-purple-100">
          Your financial history is {getCreditScoreLabel(metrics.creditScore).toLowerCase()}. Keep recording income to build your credit score.
        </p>
      </div>

      {/* Credit Score */}
      <div className="border border-border bg-card p-6">
        <h3 className="text-lg font-semibold mb-4">Your Credit Score</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className={`text-5xl font-bold ${getCreditScoreColor(metrics.creditScore)}`}>
              {metrics.creditScore}
            </p>
            <p className="text-sm text-muted-foreground mt-1">out of 100</p>
          </div>
          <div className="rounded-full bg-purple-100 dark:bg-purple-950/20 p-6">
            <CreditCard className="h-10 w-10 text-purple-600" />
          </div>
        </div>
        <div className="mt-4 h-3 bg-secondary rounded-full overflow-hidden">
          <div 
            className="h-full bg-purple-500 rounded-full transition-all" 
            style={{ width: `${metrics.creditScore}%` }} 
          />
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Lenders look for consistency and regular income
        </p>
      </div>

      {/* Income Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          title="Monthly Income"
          value={formatKES(metrics.monthlyIncome)}
          icon={<TrendingUp className="h-5 w-5 text-green-600" />}
          positive
        />
        <MetricCard
          title="Avg Monthly"
          value={formatKES(metrics.avgMonthlyIncome)}
          subtitle={`${metrics.monthsWithData} months of data`}
          icon={<Calendar className="h-5 w-5 text-blue-600" />}
        />
        <MetricCard
          title="Total Earned"
          value={formatKES(metrics.totalIncome)}
          icon={<BarChart3 className="h-5 w-5 text-purple-600" />}
        />
      </div>

      {/* Income Streams */}
      <div className="border border-border bg-card p-6">
        <h3 className="text-lg font-semibold mb-4">Income Streams</h3>
        <div className="space-y-3">
          {metrics.incomeStreams.length > 0 ? (
            metrics.incomeStreams.map((stream, index) => {
              const percentage = metrics.totalIncome > 0 ? (stream.amount / metrics.totalIncome) * 100 : 0;
              return (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-foreground">{stream.name}</span>
                    <span className="text-sm text-muted-foreground">{formatKES(stream.amount)}</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-500 rounded-full" 
                      style={{ width: `${percentage}%` }} 
                    />
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No income streams recorded yet</p>
          )}
        </div>
      </div>

      {/* What Lenders See */}
      <div className="border border-border bg-card p-6">
        <h3 className="text-lg font-semibold mb-4">What Lenders See</h3>
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <Award className="h-5 w-5 text-green-600 mt-0.5" />
            <div>
              <p className="font-medium text-foreground">Consistent Income</p>
              <p className="text-sm text-muted-foreground">
                {metrics.monthsWithData} months of recorded income shows stability
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <BarChart3 className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <p className="font-medium text-foreground">Income Volume</p>
              <p className="text-sm text-muted-foreground">
                Total of {formatKES(metrics.totalIncome)} demonstrates earning capacity
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
            <div>
              <p className="font-medium text-foreground">Keep Recording</p>
              <p className="text-sm text-muted-foreground">
                More transactions improve your credit score over time
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
