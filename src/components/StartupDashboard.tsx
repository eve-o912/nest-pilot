import { useStore, formatKES } from "@/lib/store";
import { TrendingUp, TrendingDown, AlertTriangle, Clock, DollarSign, ArrowUpRight, ArrowDownRight } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: React.ReactNode;
  subtitle?: string;
}

function MetricCard({ title, value, change, changeType, icon, subtitle }: MetricCardProps) {
  return (
    <div className="border border-border bg-card p-6">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        <div className="rounded-sm bg-secondary p-2">{icon}</div>
      </div>
      {change && (
        <div className={`mt-3 flex items-center gap-1 text-sm ${
          changeType === "positive" ? "text-green-600" : changeType === "negative" ? "text-red-600" : "text-muted-foreground"
        }`}>
          {changeType === "positive" && <ArrowUpRight className="h-4 w-4" />}
          {changeType === "negative" && <ArrowDownRight className="h-4 w-4" />}
          {change}
        </div>
      )}
    </div>
  );
}

export function StartupDashboard() {
  const transactions = useStore((s) => s.transactions);

  // Calculate metrics
  const calculateMetrics = () => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const recentTransactions = transactions.filter(t => new Date(t.date) >= thirtyDaysAgo);
    
    const income = recentTransactions.filter(t => t.type === "in").reduce((sum, t) => sum + t.amount, 0);
    const expenses = recentTransactions.filter(t => t.type === "out").reduce((sum, t) => sum + t.amount, 0);
    
    // Mock data for startup metrics (in real app, this would come from backend)
    const cashBalance = 4200000; // KES 4.2M
    const monthlyBurn = 467000; // KES 467K
    const runwayMonths = Math.floor(cashBalance / monthlyBurn);
    const runwayEndDate = new Date(now.getTime() + runwayMonths * 30 * 24 * 60 * 60 * 1000);
    
    const mrr = 180000; // KES 180K
    const arr = mrr * 12;
    const mrrGrowth = 14; // 14% MoM
    
    const burnMultiple = monthlyBurn / mrr;
    const revenueCoverage = (mrr / monthlyBurn) * 100;

    return {
      cashBalance,
      monthlyBurn,
      runwayMonths,
      runwayEndDate,
      mrr,
      arr,
      mrrGrowth,
      burnMultiple,
      revenueCoverage,
      income,
      expenses,
    };
  };

  const metrics = calculateMetrics();

  return (
    <div className="space-y-6">
      {/* Status Banner */}
      <div className="border-l-4 border-sky-500 bg-sky-50 dark:bg-sky-950/20 p-4">
        <p className="text-sm font-medium text-sky-900 dark:text-sky-100">
          You have {metrics.runwayMonths} months of runway at current burn — MRR is growing at {metrics.mrrGrowth}% MoM, which is strong.
        </p>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Runway"
          value={`${metrics.runwayMonths} months`}
          subtitle={`Ends ${metrics.runwayEndDate.toLocaleDateString('en-KE', { month: 'short', year: 'numeric' })}`}
          icon={<Clock className="h-5 w-5 text-sky-600" />}
        />
        <MetricCard
          title="Cash Balance"
          value={formatKES(metrics.cashBalance)}
          icon={<DollarSign className="h-5 w-5 text-green-600" />}
        />
        <MetricCard
          title="Monthly Burn"
          value={formatKES(metrics.monthlyBurn)}
          change={`${metrics.burnMultiple.toFixed(1)}x burn multiple`}
          changeType={metrics.burnMultiple < 2 ? "positive" : "negative"}
          icon={<TrendingDown className="h-5 w-5 text-red-600" />}
        />
        <MetricCard
          title="MRR"
          value={formatKES(metrics.mrr)}
          change={`+${metrics.mrrGrowth}% MoM`}
          changeType="positive"
          icon={<TrendingUp className="h-5 w-5 text-green-600" />}
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          title="ARR"
          value={formatKES(metrics.arr)}
          icon={<ArrowUpRight className="h-5 w-5 text-purple-600" />}
        />
        <MetricCard
          title="Revenue Coverage"
          value={`${metrics.revenueCoverage.toFixed(0)}%`}
          subtitle="of monthly burn"
          changeType={metrics.revenueCoverage >= 100 ? "positive" : "negative"}
          icon={<DollarSign className="h-5 w-5 text-orange-600" />}
        />
        <MetricCard
          title="Burn Multiple"
          value={`${metrics.burnMultiple.toFixed(2)}x`}
          subtitle="Target: &lt; 2x"
          changeType={metrics.burnMultiple < 2 ? "positive" : "negative"}
          icon={metrics.burnMultiple < 2 ? <TrendingDown className="h-5 w-5 text-green-600" /> : <AlertTriangle className="h-5 w-5 text-orange-600" />}
        />
      </div>

      {/* Fundraising Readiness */}
      <div className="border border-border bg-card p-6">
        <h3 className="text-lg font-semibold mb-4">Fundraising Readiness</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Readiness Score</span>
            <span className="text-2xl font-bold">72/100</span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div className="h-full bg-sky-500 rounded-full" style={{ width: '72%' }} />
          </div>
          <div className="text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-2">Missing items:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Cap table document</li>
              <li>12-month financial projections</li>
              <li>Unit economics (CAC, LTV)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
