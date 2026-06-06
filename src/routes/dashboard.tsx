import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Plus, TrendingUp, TrendingDown, DollarSign, FileText, MoreHorizontal, ChevronDown } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { supabase } from "@/lib/supabase";
import { formatKES } from "@/lib/store";
import { AIInsightCard } from "@/components/AIInsightCard";
import { WeeklyReview } from "@/components/WeeklyReview";

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
  head: () => ({
    meta: [
      { title: "Dashboard — Nest Pilot" },
      { name: "description", content: "Business operating system dashboard with hero metrics and recent invoices." },
    ],
  }),
});

function Dashboard() {
  const [metrics, setMetrics] = useState({
    revenueToday: 0,
    cashThisMonth: 0,
    expensesThisMonth: 0,
    outstanding: 0,
  });
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRange, setSelectedRange] = useState<'month' | '3months' | 'year'>('month');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch today's revenue (income transactions from today)
      const today = new Date().toISOString().split('T')[0];
      const { data: todayIncome } = await supabase
        .from('transactions')
        .select('amount')
        .eq('user_id', user.id)
        .eq('type', 'income')
        .gte('created_at', today);

      const revenueToday = todayIncome?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0;

      // Fetch this month's cash (income)
      const thisMonth = new Date();
      thisMonth.setDate(1);
      const monthStart = thisMonth.toISOString().split('T')[0];
      const { data: monthIncome } = await supabase
        .from('transactions')
        .select('amount')
        .eq('user_id', user.id)
        .eq('type', 'income')
        .gte('created_at', monthStart);

      const cashThisMonth = monthIncome?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0;

      // Fetch this month's expenses
      const { data: monthExpenses } = await supabase
        .from('transactions')
        .select('amount')
        .eq('user_id', user.id)
        .eq('type', 'expense')
        .gte('created_at', monthStart);

      const expensesThisMonth = monthExpenses?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0;

      // Fetch outstanding invoices
      const { data: outstandingInvoices } = await supabase
        .from('invoices')
        .select('amount_due')
        .eq('user_id', user.id)
        .in('status', ['unpaid', 'partial', 'overdue']);

      const outstanding = outstandingInvoices?.reduce((sum, i) => sum + (i.amount_due || 0), 0) || 0;

      // Fetch recent invoices
      const { data: recentInvoices } = await supabase
        .from('invoices')
        .select(`
          *,
          customers (
            business_name,
            contact_name
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      setMetrics({
        revenueToday,
        cashThisMonth,
        expensesThisMonth,
        outstanding,
      });
      setInvoices(recentInvoices || []);
      
      // Generate mock revenue trend data for the chart
      const trendData = Array.from({ length: 30 }, (_, i) => ({
        date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        revenue: Math.floor(Math.random() * 50000) + 20000,
        expenses: Math.floor(Math.random() * 30000) + 10000,
      }));
      setRevenueData(trendData);
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero Metrics Section */}
      <section>
        <h2 className="text-lg font-semibold text-foreground mb-4">Hero metrics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Small Metric Cards */}
          <MetricCard
            title="Revenue"
            value={metrics.revenueToday}
            subtitle="Cash Today"
            trendData={revenueData.slice(-7)}
            color="#3B82F6"
          />
          <MetricCard
            title="Cash This Month"
            value={metrics.cashThisMonth}
            subtitle="Cash This Month"
            trendData={revenueData.slice(-30)}
            color="#3B82F6"
          />
          <MetricCard
            title="Expenses"
            value={metrics.expensesThisMonth}
            subtitle="This Month"
            trendData={revenueData.slice(-30).map(d => ({ ...d, revenue: d.expenses }))}
            color="#EF4444"
          />
          <MetricCard
            title="Outstanding"
            value={metrics.outstanding}
            subtitle="Unpaid Invoices"
            trendData={revenueData.slice(-30)}
            color="#F59E0B"
          />
        </div>
      </section>

      {/* AI Insights Section */}
      <section>
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          Manikka Insights
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AIInsightCard
            type="revenue"
            title="Revenue Trend"
            content="Revenue increased by 14% this week compared to last week."
            trend="up"
            trendValue="14%"
          />
          <AIInsightCard
            type="profit"
            title="Profit Margin"
            content="Profit margin improved from 28% to 31% this month."
            trend="up"
            trendValue="3%"
          />
          <AIInsightCard
            type="recommendation"
            title="Top Category"
            content="Your strongest category is beverages. Consider expanding inventory."
          />
          <AIInsightCard
            type="risk"
            title="Cash Flow Alert"
            content="Cash flow decreased by 18% this week due to increased inventory purchases."
            trend="down"
            trendValue="18%"
          />
        </div>
      </section>

      {/* Weekly Business Review */}
      <section>
        <WeeklyReview />
      </section>

      {/* Revenue Trend Chart */}
      <section className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Revenue Trend</h3>
            <p className="text-sm text-muted-foreground">KES {formatKES(metrics.cashThisMonth)} • February 2026</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedRange('month')}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg ${selectedRange === 'month' ? 'bg-[#EFF6FF] text-[#3B82F6]' : 'text-muted-foreground hover:bg-secondary/50'}`}>
              This Month
            </button>
            <button
              onClick={() => setSelectedRange('3months')}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg ${selectedRange === '3months' ? 'bg-[#EFF6FF] text-[#3B82F6]' : 'text-muted-foreground hover:bg-secondary/50'}`}>
              Last 3 Months
            </button>
            <button
              onClick={() => setSelectedRange('year')}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg ${selectedRange === 'year' ? 'bg-[#EFF6FF] text-[#3B82F6]' : 'text-muted-foreground hover:bg-secondary/50'}`}>
              This Year
            </button>
          </div>
        </div>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#EF4444" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis 
                dataKey="date" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#94A3B8', fontSize: 12 }}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#94A3B8', fontSize: 12 }}
                tickFormatter={(value) => `KES ${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#FFFFFF', 
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
                }}
              />
              <Area 
                type="monotone" 
                dataKey="revenue" 
                stroke="#3B82F6" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorRevenue)" 
              />
              <Area 
                type="monotone" 
                dataKey="expenses" 
                stroke="#EF4444" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorExpenses)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Recent Invoices Table */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Recent Invoices</h2>
          <div className="flex items-center gap-3">
            <Link
              to="/invoices"
              className="px-3 py-1.5 text-sm font-medium rounded-lg text-muted-foreground hover:bg-secondary/50"
            >
              All Invoices
            </Link>
            <Link
              to="/invoices?filter=outstanding"
              className="px-3 py-1.5 text-sm font-medium rounded-lg text-muted-foreground hover:bg-secondary/50"
            >
              Outstanding Invoices
            </Link>
            <Link
              to="/invoices"
              className="inline-flex items-center gap-2 rounded-lg bg-[#3B82F6] px-4 py-2 text-sm font-semibold text-white hover:bg-[#3B82F6]/90 transition-colors"
            >
              <Plus className="h-4 w-4" />
              New
              <ChevronDown className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Loading...</div>
          ) : invoices.length === 0 ? (
            <div className="p-8 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">No invoices yet</p>
              <Link
                to="/invoices"
                className="inline-flex items-center gap-2 rounded-lg bg-[#3B82F6] px-4 py-2 text-sm font-semibold text-white hover:bg-[#3B82F6]/90 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Create your first invoice
              </Link>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#E2E8F0] text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-6 py-3 font-medium">Customer</th>
                  <th className="px-6 py-3 font-medium">Invoice #</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium text-right">Amount</th>
                  <th className="px-6 py-3 font-medium">Due Date</th>
                  <th className="px-6 py-3 font-medium">Assigned</th>
                  <th className="px-6 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EFF6FF] text-[#3B82F6] text-sm font-medium">
                          {(invoice.customers?.business_name || 'C').charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{invoice.customers?.business_name || 'Unknown'}</p>
                          <p className="text-xs text-muted-foreground">{invoice.customers?.contact_name || ''}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-mono text-muted-foreground">{invoice.invoice_number}</td>
                    <td className="px-6 py-4">
                      <StatusBadge status={invoice.status} />
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-sm font-medium text-foreground">
                      {formatKES(invoice.total_amount)}
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-xs font-medium text-muted-foreground">
                        U
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        to={`/invoices/${invoice.id}`}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        aria-label={`Open invoice ${invoice.invoice_number}`}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}

function MetricCard({ title, value, subtitle, trendData, color }: {
  title: string;
  value: number;
  subtitle: string;
  trendData: any[];
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        {value > 0 ? (
          <TrendingUp className="h-4 w-4 text-[#10B981]" />
        ) : (
          <TrendingDown className="h-4 w-4 text-[#EF4444]" />
        )}
      </div>
      <p className="text-2xl font-semibold text-foreground mb-1">{formatKES(value)}</p>
      <p className="text-xs text-muted-foreground mb-3">{subtitle}</p>
      <div className="h-[60px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={trendData}>
            <defs>
              <linearGradient id={`color${title}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.1}/>
                <stop offset="95%" stopColor={color} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <Area 
              type="monotone" 
              dataKey="revenue" 
              stroke={color} 
              strokeWidth={1.5}
              fillOpacity={1} 
              fill={`url(#color${title})`} 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles = {
    paid: 'bg-[#D1FAE5] text-[#065F46]',
    partial: 'bg-[#FEF3C7] text-[#92400E]',
    overdue: 'bg-[#FEE2E2] text-[#991B1B]',
    draft: 'bg-[#F1F5F9] text-[#64748B]',
    sent: 'bg-[#DBEAFE] text-[#1E40AF]',
  };

  const labels = {
    paid: 'Paid',
    partial: 'Partial',
    overdue: 'Overdue',
    draft: 'Draft',
    sent: 'Sent',
  };

  const style = styles[status as keyof typeof styles] || styles.draft;
  const label = labels[status as keyof typeof labels] || status;

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${style}`}>
      {label}
    </span>
  );
}
