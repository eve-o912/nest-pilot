import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { DollarSign, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatKES } from "@/lib/store";

export const Route = createFileRoute("/reports/cash-flow")({
  component: CashFlow,
  head: () => ({
    meta: [
      { title: "Cash Flow — Nest Pilot" },
      { name: "description", content: "Cash inflows and outflows report." },
    ],
  }),
});

function CashFlow() {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("this_month");
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetchCashFlow();
  }, [period]);

  const fetchCashFlow = async () => {
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

      // Fetch cash inflows (invoice payments)
      const { data: payments } = await supabase
        .from('payments')
        .select('amount, payment_date')
        .eq('user_id', user.id)
        .gte('payment_date', startDateStr);

      const totalInflows = (payments || []).reduce((sum: number, p: any) => sum + Number(p.amount), 0);

      // Fetch cash outflows (expenses)
      const { data: expenses } = await supabase
        .from('expenses')
        .select('amount, date')
        .eq('user_id', user.id)
        .eq('status', 'approved')
        .gte('date', startDateStr);

      const totalOutflows = (expenses || []).reduce((sum: number, e: any) => sum + Number(e.amount), 0);

      const netCashFlow = totalInflows - totalOutflows;

      setData({
        totalInflows,
        totalOutflows,
        netCashFlow,
      });

      setLoading(false);
    } catch (error) {
      console.error('Error fetching cash flow:', error);
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Cash Flow</h2>
          <p className="text-sm text-muted-foreground">Cash inflows and outflows</p>
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
              label="Total Inflows"
              value={data.totalInflows}
              icon={<ArrowUpRight className="h-4 w-4 text-[#10B981]" />}
              color="#10B981"
            />
            <MetricCard
              label="Total Outflows"
              value={data.totalOutflows}
              icon={<ArrowDownLeft className="h-4 w-4 text-[#EF4444]" />}
              color="#EF4444"
            />
            <MetricCard
              label="Net Cash Flow"
              value={data.netCashFlow}
              icon={data.netCashFlow >= 0 ? <ArrowUpRight className="h-4 w-4 text-[#10B981]" /> : <ArrowDownLeft className="h-4 w-4 text-[#EF4444]" />}
              color={data.netCashFlow >= 0 ? "#10B981" : "#EF4444"}
            />
          </div>

          {/* Cash Flow Statement */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F59E0B]/15 text-[#F59E0B]">
                <DollarSign className="h-4 w-4" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">Cash Flow Statement</h3>
            </div>
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground mb-2">Operating Activities</h4>
                <div className="space-y-2 pl-4">
                  <div className="flex justify-between py-1">
                    <span className="text-foreground">Cash received from customers</span>
                    <span className="font-mono text-[#10B981]">{formatKES(data.totalInflows)}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-foreground">Cash paid for expenses</span>
                    <span className="font-mono text-[#EF4444]">{formatKES(data.totalOutflows)}</span>
                  </div>
                </div>
              </div>
              <div className="border-t border-[#E2E8F0] pt-4">
                <div className="flex justify-between py-2">
                  <span className="font-semibold text-foreground">Net Cash Flow</span>
                  <span className={`font-mono font-bold text-lg ${data.netCashFlow >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                    {formatKES(data.netCashFlow)}
                  </span>
                </div>
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
