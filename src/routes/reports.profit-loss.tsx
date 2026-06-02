import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatKES } from "@/lib/store";

export const Route = createFileRoute("/reports/profit-loss")({
  component: ProfitLoss,
  head: () => ({
    meta: [
      { title: "Profit & Loss — Nest Pilot" },
      { name: "description", content: "Revenue, expenses, and net profit report." },
    ],
  }),
});

function ProfitLoss() {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("this_month");
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetchProfitLoss();
  }, [period]);

  const fetchProfitLoss = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Calculate date range based on period
      const now = new Date();
      let startDate = new Date();
      
      if (period === "this_month") {
        startDate.setDate(1);
      } else if (period === "last_month") {
        startDate.setMonth(startDate.getMonth() - 1);
        startDate.setDate(1);
        startDate.setMonth(startDate.getMonth() + 1);
        startDate.setDate(0);
      } else if (period === "this_quarter") {
        startDate.setMonth(Math.floor(now.getMonth() / 3) * 3);
        startDate.setDate(1);
      } else if (period === "this_year") {
        startDate.setMonth(0);
        startDate.setDate(1);
      }

      const startDateStr = startDate.toISOString().split('T')[0];

      // Fetch revenue from invoices
      const { data: invoices } = await supabase
        .from('invoices')
        .select('total_amount, issue_date')
        .eq('user_id', user.id)
        .eq('status', 'paid')
        .gte('issue_date', startDateStr);

      const totalRevenue = (invoices || []).reduce((sum: number, i: any) => sum + Number(i.total_amount), 0);

      // Fetch expenses
      const { data: expenses } = await supabase
        .from('expenses')
        .select('amount, date')
        .eq('user_id', user.id)
        .eq('status', 'approved')
        .gte('date', startDateStr);

      const totalExpenses = (expenses || []).reduce((sum: number, e: any) => sum + Number(e.amount), 0);

      const netProfit = totalRevenue - totalExpenses;
      const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

      setData({
        totalRevenue,
        totalExpenses,
        netProfit,
        profitMargin,
      });

      setLoading(false);
    } catch (error) {
      console.error('Error fetching profit & loss:', error);
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Profit & Loss</h2>
          <p className="text-sm text-muted-foreground">Revenue, expenses, and net profit</p>
        </div>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="h-10 rounded-lg border border-[#E2E8F0] bg-white px-3 text-sm outline-none focus:border-[#3B82F6]"
        >
          <option value="this_month">This Month</option>
          <option value="last_month">Last Month</option>
          <option value="this_quarter">This Quarter</option>
          <option value="this_year">This Year</option>
        </select>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-8 text-center text-muted-foreground">
          Loading...
        </div>
      ) : data ? (
        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard
              label="Total Revenue"
              value={data.totalRevenue}
              icon={<TrendingUp className="h-4 w-4 text-[#10B981]" />}
              color="#10B981"
            />
            <MetricCard
              label="Total Expenses"
              value={data.totalExpenses}
              icon={<TrendingDown className="h-4 w-4 text-[#EF4444]" />}
              color="#EF4444"
            />
            <MetricCard
              label="Net Profit"
              value={data.netProfit}
              icon={data.netProfit >= 0 ? <TrendingUp className="h-4 w-4 text-[#10B981]" /> : <TrendingDown className="h-4 w-4 text-[#EF4444]" />}
              color={data.netProfit >= 0 ? "#10B981" : "#EF4444"}
            />
          </div>

          {/* Profit Margin */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Profit Margin</h3>
                <p className="text-sm text-muted-foreground">Net profit as percentage of revenue</p>
              </div>
              <div className="text-right">
                <p className={`text-3xl font-bold ${data.profitMargin >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                  {data.profitMargin.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>

          {/* Detailed Breakdown */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-foreground mb-4">Detailed Breakdown</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-[#E2E8F0]">
                <span className="text-foreground font-medium">Revenue</span>
                <span className="font-mono text-[#10B981] font-semibold">{formatKES(data.totalRevenue)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-[#E2E8F0]">
                <span className="text-foreground font-medium">Expenses</span>
                <span className="font-mono text-[#EF4444] font-semibold">{formatKES(data.totalExpenses)}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-foreground font-semibold">Net Profit</span>
                <span className={`font-mono font-bold text-lg ${data.netProfit >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                  {formatKES(data.netProfit)}
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-8 text-center text-muted-foreground">
          No data available for this period
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value, icon, color }: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
      </div>
      <p className="text-2xl font-bold" style={{ color }}>{formatKES(value)}</p>
    </div>
  );
}
