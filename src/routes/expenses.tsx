import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Plus, Search, Filter, MoreHorizontal, PieChart, X } from "lucide-react";
import { PieChart as RechartsPieChart, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { supabase } from "@/lib/supabase";
import { formatKES } from "@/lib/store";

const EXPENSE_CATEGORIES = [
  "Rent", "Salaries", "Transport", "Utilities", "Marketing", "Inventory", "Other"
];

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#64748B'];

export const Route = createFileRoute("/expenses")({
  component: Expenses,
  head: () => ({
    meta: [
      { title: "Expenses — Nest Pilot" },
      { name: "description", content: "Track and manage your business expenses." },
    ],
  }),
});

function Expenses() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryData, setCategoryData] = useState<any[]>([]);

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      setExpenses(data || []);

      // Calculate category breakdown
      const categoryTotals: Record<string, number> = {};
      (data || []).forEach((expense) => {
        const category = expense.category || 'Other';
        categoryTotals[category] = (categoryTotals[category] || 0) + Number(expense.amount);
      });

      const chartData = Object.entries(categoryTotals).map(([name, value]) => ({
        name,
        value,
      }));

      setCategoryData(chartData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching expenses:', error);
      setLoading(false);
    }
  };

  const filteredExpenses = expenses.filter((expense) => {
    const matchesFilter = filter === "all" || expense.status === filter;
    const matchesSearch = 
      expense.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      expense.category?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Expenses</h1>
          <p className="text-sm text-muted-foreground">Track and manage your business expenses</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-[#3B82F6] px-4 py-2 text-sm font-semibold text-white hover:bg-[#3B82F6]/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Expense
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Expense List */}
        <div className="lg:col-span-2 space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                placeholder="Search expenses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 w-full rounded-lg border border-[#E2E8F0] bg-white pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/20 transition-all"
              />
            </div>
            <div className="flex gap-2">
              {["all", "pending", "approved", "rejected"].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                    filter === status
                      ? "bg-[#EFF6FF] text-[#3B82F6]"
                      : "text-muted-foreground hover:bg-secondary/50"
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Expenses Table */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">Loading expenses...</div>
            ) : filteredExpenses.length === 0 ? (
              <div className="p-8 text-center">
                <PieChart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">No expenses found</p>
                <button
                  onClick={() => setShowAddForm(true)}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#3B82F6] px-4 py-2 text-sm font-semibold text-white hover:bg-[#3B82F6]/90 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Add your first expense
                </button>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#E2E8F0] text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="px-6 py-3 font-medium">Date</th>
                    <th className="px-6 py-3 font-medium">Category</th>
                    <th className="px-6 py-3 font-medium">Description</th>
                    <th className="px-6 py-3 font-medium">Method</th>
                    <th className="px-6 py-3 font-medium text-right">Amount</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                    <th className="px-6 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExpenses.map((expense) => (
                    <tr key={expense.id} className="border-b border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors">
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {new Date(expense.date).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-foreground">{expense.category}</td>
                      <td className="px-6 py-4 text-sm text-foreground">{expense.description}</td>
                      <td className="px-6 py-4 text-sm text-muted-foreground capitalize">{expense.payment_method}</td>
                      <td className="px-6 py-4 text-right font-mono text-sm font-medium text-destructive">
                        {formatKES(expense.amount)}
                      </td>
                      <td className="px-6 py-4">
                        <ExpenseStatusBadge status={expense.status} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="text-muted-foreground hover:text-foreground transition-colors">
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Expense Breakdown Chart */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-foreground mb-4">Expense Breakdown</h3>
          {categoryData.length > 0 ? (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => formatKES(value)}
                    contentStyle={{ 
                      backgroundColor: '#FFFFFF', 
                      border: '1px solid #E2E8F0',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
                    }}
                  />
                  <Legend />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No expense data
            </div>
          )}
        </div>
      </div>

      {showAddForm && <AddExpenseForm onClose={() => setShowAddForm(false)} onSuccess={fetchExpenses} />}
    </div>
  );
}

function ExpenseStatusBadge({ status }: { status: string }) {
  const styles = {
    approved: 'bg-[#D1FAE5] text-[#065F46]',
    pending: 'bg-[#FEF3C7] text-[#92400E]',
    rejected: 'bg-[#FEE2E2] text-[#991B1B]',
  };

  const labels = {
    approved: 'Approved',
    pending: 'Pending',
    rejected: 'Rejected',
  };

  const style = styles[status as keyof typeof styles] || styles.pending;
  const label = labels[status as keyof typeof labels] || status;

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${style}`}>
      {label}
    </span>
  );
}

function AddExpenseForm({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [category, setCategory] = useState("Other");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "mpesa" | "bank" | "card">("cash");
  const [receiptUrl, setReceiptUrl] = useState("");
  const [status, setStatus] = useState<"pending" | "approved" | "rejected">("approved");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!description || !amount) return;
    
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("expenses")
        .insert({
          user_id: user.id,
          category,
          description,
          amount: parseFloat(amount),
          date,
          payment_method: paymentMethod,
          receipt_url: receiptUrl || null,
          status,
        });

      if (error) throw error;

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error adding expense:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-foreground">Add Expense</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="h-10 w-full rounded-lg border border-[#E2E8F0] bg-white px-3 text-sm outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/20"
            >
              {EXPENSE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="h-10 w-full rounded-lg border border-[#E2E8F0] bg-white px-3 text-sm outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/20"
              placeholder="What was this expense for?"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Amount (KES)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="h-10 w-full rounded-lg border border-[#E2E8F0] bg-white px-3 text-sm font-mono outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/20"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-10 w-full rounded-lg border border-[#E2E8F0] bg-white px-3 text-sm outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/20"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Payment Method</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as any)}
              className="h-10 w-full rounded-lg border border-[#E2E8F0] bg-white px-3 text-sm outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/20"
            >
              <option value="cash">Cash</option>
              <option value="mpesa">M-Pesa</option>
              <option value="bank">Bank</option>
              <option value="card">Card</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Receipt URL (optional)</label>
            <input
              type="url"
              value={receiptUrl}
              onChange={(e) => setReceiptUrl(e.target.value)}
              className="h-10 w-full rounded-lg border border-[#E2E8F0] bg-white px-3 text-sm outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/20"
              placeholder="https://..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="h-10 w-full rounded-lg border border-[#E2E8F0] bg-white px-3 text-sm outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/20"
            >
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 rounded-lg border border-[#E2E8F0] px-4 py-2 text-sm font-medium text-foreground hover:bg-[#F8FAFC] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || !description || !amount}
              className="flex-1 rounded-lg bg-[#3B82F6] px-4 py-2 text-sm font-semibold text-white hover:bg-[#3B82F6]/90 transition-colors disabled:opacity-50"
            >
              {loading ? "Saving..." : "Save Expense"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
