import { useStore, formatKES } from "@/lib/store";
import { Building2, Users, TrendingUp, TrendingDown, DollarSign, Store, BarChart3, AlertTriangle } from "lucide-react";
import { useState } from "react";

interface MetricCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  subtitle?: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
}

function MetricCard({ title, value, icon, subtitle, change, changeType }: MetricCardProps) {
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
          {change}
        </div>
      )}
    </div>
  );
}

interface BranchData {
  name: string;
  income: number;
  expenses: number;
  profit: number;
  staff: number;
}

export function SMEDashboard() {
  const transactions = useStore((s) => s.transactions);
  const [selectedBranch, setSelectedBranch] = useState<string>("all");

  // Mock branch data (in real app, this would come from backend)
  const branches: BranchData[] = [
    { name: "Nairobi CBD", income: 850000, expenses: 620000, profit: 230000, staff: 8 },
    { name: "Westlands", income: 720000, expenses: 540000, profit: 180000, staff: 6 },
    { name: "Mombasa Road", income: 580000, expenses: 490000, profit: 90000, staff: 5 },
  ];

  const calculateSMEMetrics = () => {
    const totalIncome = branches.reduce((sum, b) => sum + b.income, 0);
    const totalExpenses = branches.reduce((sum, b) => sum + b.expenses, 0);
    const totalProfit = totalIncome - totalExpenses;
    const totalStaff = branches.reduce((sum, b) => sum + b.staff, 0);
    const profitMargin = totalIncome > 0 ? (totalProfit / totalIncome) * 100 : 0;
    const staffCostPerRevenue = totalIncome > 0 ? (totalExpenses / totalIncome) * 100 : 0;

    // Calculate stock value (mock)
    const stockValue = 2400000; // KES 2.4M tied up in inventory

    return {
      totalIncome,
      totalExpenses,
      totalProfit,
      totalStaff,
      profitMargin,
      staffCostPerRevenue,
      stockValue,
      branches,
    };
  };

  const metrics = calculateSMEMetrics();

  const filteredBranches = selectedBranch === "all" 
    ? branches 
    : branches.filter(b => b.name === selectedBranch);

  const displayMetrics = selectedBranch === "all" 
    ? metrics 
    : {
        totalIncome: filteredBranches.reduce((sum, b) => sum + b.income, 0),
        totalExpenses: filteredBranches.reduce((sum, b) => sum + b.expenses, 0),
        totalProfit: filteredBranches.reduce((sum, b) => sum + b.profit, 0),
        totalStaff: filteredBranches.reduce((sum, b) => sum + b.staff, 0),
        profitMargin: filteredBranches.length > 0 
          ? (filteredBranches.reduce((sum, b) => sum + b.profit, 0) / filteredBranches.reduce((sum, b) => sum + b.income, 0)) * 100 
          : 0,
        stockValue: metrics.stockValue / branches.length,
      };

  return (
    <div className="space-y-6">
      {/* Branch Selector */}
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium text-foreground">View:</label>
        <select 
          value={selectedBranch}
          onChange={(e) => setSelectedBranch(e.target.value)}
          className="h-9 rounded-sm border border-input bg-background px-3 text-sm outline-none focus:border-ring"
        >
          <option value="all">All Branches</option>
          {branches.map(branch => (
            <option key={branch.name} value={branch.name}>{branch.name}</option>
          ))}
        </select>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Revenue"
          value={formatKES(displayMetrics.totalIncome)}
          icon={<DollarSign className="h-5 w-5 text-green-600" />}
        />
        <MetricCard
          title="Total Expenses"
          value={formatKES(displayMetrics.totalExpenses)}
          icon={<TrendingDown className="h-5 w-5 text-red-600" />}
        />
        <MetricCard
          title="Net Profit"
          value={formatKES(displayMetrics.totalProfit)}
          subtitle={`${displayMetrics.profitMargin.toFixed(1)}% margin`}
          change={displayMetrics.profitMargin >= 20 ? "Healthy margin" : "Review margins"}
          changeType={displayMetrics.profitMargin >= 20 ? "positive" : "negative"}
          icon={<TrendingUp className="h-5 w-5 text-blue-600" />}
        />
        <MetricCard
          title="Staff Count"
          value={displayMetrics.totalStaff.toString()}
          subtitle="employees"
          icon={<Users className="h-5 w-5 text-purple-600" />}
        />
      </div>

      {/* Branch Performance */}
      <div className="border border-border bg-card p-6">
        <h3 className="text-lg font-semibold mb-4">Branch Performance</h3>
        <div className="space-y-4">
          {branches.map((branch, index) => {
            const profitMargin = branch.income > 0 ? (branch.profit / branch.income) * 100 : 0;
            return (
              <div key={index} className="border-b border-border pb-4 last:border-0 last:pb-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Store className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-foreground">{branch.name}</span>
                  </div>
                  <span className={`text-sm font-semibold ${profitMargin >= 20 ? "text-green-600" : "text-orange-600"}`}>
                    {profitMargin.toFixed(1)}% margin
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Revenue</p>
                    <p className="font-medium text-foreground">{formatKES(branch.income)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Expenses</p>
                    <p className="font-medium text-foreground">{formatKES(branch.expenses)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Profit</p>
                    <p className={`font-medium ${branch.profit >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {formatKES(branch.profit)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Stock/Inventory */}
      <div className="border border-border bg-card p-6">
        <h3 className="text-lg font-semibold mb-4">Inventory & Stock</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-3xl font-bold text-foreground">{formatKES(metrics.stockValue)}</p>
            <p className="text-sm text-muted-foreground mt-1">Cash tied up in inventory</p>
          </div>
          <div className="rounded-full bg-orange-100 dark:bg-orange-950/20 p-4">
            <BarChart3 className="h-8 w-8 text-orange-600" />
          </div>
        </div>
        <div className="mt-4 p-3 bg-orange-50 dark:bg-orange-950/20 rounded-sm">
          <p className="text-sm text-orange-900 dark:text-orange-100">
            High inventory value affects cash flow. Consider stock optimization.
          </p>
        </div>
      </div>

      {/* Staff Costs vs Revenue */}
      <div className="border border-border bg-card p-6">
        <h3 className="text-lg font-semibold mb-4">Staff Costs vs Revenue</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Staff Cost Ratio</span>
            <span className="text-2xl font-bold text-foreground">{metrics.staffCostPerRevenue.toFixed(1)}%</span>
          </div>
          <div className="h-3 bg-secondary rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full ${metrics.staffCostPerRevenue <= 40 ? "bg-green-500" : "bg-orange-500"}`}
              style={{ width: `${Math.min(metrics.staffCostPerRevenue, 100)}%` }} 
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Target: Staff costs should be below 40% of revenue
          </p>
        </div>
      </div>

      {/* Alerts */}
      <div className="border border-border bg-card p-6">
        <h3 className="text-lg font-semibold mb-4">Alerts</h3>
        <div className="space-y-3">
          {metrics.profitMargin < 20 && (
            <div className="flex items-start gap-3 p-3 bg-orange-50 dark:bg-orange-950/20 rounded-sm">
              <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
              <div>
                <p className="font-medium text-foreground">Low Profit Margin</p>
                <p className="text-sm text-muted-foreground">
                  Overall margin is {metrics.profitMargin.toFixed(1)}%. Review pricing and costs.
                </p>
              </div>
            </div>
          )}
          {metrics.stockValue > 2000000 && (
            <div className="flex items-start gap-3 p-3 bg-orange-50 dark:bg-orange-950/20 rounded-sm">
              <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
              <div>
                <p className="font-medium text-foreground">High Inventory Value</p>
                <p className="text-sm text-muted-foreground">
                  {formatKES(metrics.stockValue)} tied up in stock affects cash flow.
                </p>
              </div>
            </div>
          )}
          {metrics.profitMargin >= 20 && metrics.stockValue <= 2000000 && (
            <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-950/20 rounded-sm">
              <Building2 className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium text-foreground">Business Healthy</p>
                <p className="text-sm text-muted-foreground">
                  All metrics are within target ranges. Good performance.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
