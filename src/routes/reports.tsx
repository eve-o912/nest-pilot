import { createFileRoute, Outlet, Link } from "@tanstack/react-router";
import { TrendingUp, FileText, DollarSign, Scale } from "lucide-react";

export const Route = createFileRoute("/reports")({
  component: Reports,
  head: () => ({
    meta: [
      { title: "Reports — Nest Pilot" },
      { name: "description", content: "Financial reports and analytics." },
    ],
  }),
});

function Reports() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Reports</h1>
        <p className="text-sm text-muted-foreground">Financial reports and analytics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <ReportCard
          title="Profit & Loss"
          description="Revenue, expenses, and net profit"
          icon={<TrendingUp className="h-6 w-6" />}
          to="/reports/profit-loss"
          color="#3B82F6"
        />
        <ReportCard
          title="Balance Sheet"
          description="Assets, liabilities, and equity"
          icon={<Scale className="h-6 w-6" />}
          to="/reports/balance-sheet"
          color="#10B981"
        />
        <ReportCard
          title="Cash Flow"
          description="Cash inflows and outflows"
          icon={<DollarSign className="h-6 w-6" />}
          to="/reports/cash-flow"
          color="#F59E0B"
        />
        <ReportCard
          title="Trial Balance"
          description="Debit and credit balances"
          icon={<FileText className="h-6 w-6" />}
          to="/reports/trial-balance"
          color="#8B5CF6"
        />
      </div>

      <Outlet />
    </div>
  );
}

function ReportCard({ title, description, icon, to, color }: {
  title: string;
  description: string;
  icon: React.ReactNode;
  to: string;
  color: string;
}) {
  return (
    <Link to={to} className="block">
      <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg" style={{ backgroundColor: `${color}15`, color }}>
            {icon}
          </div>
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </Link>
  );
}
