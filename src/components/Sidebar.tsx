import { Link, useLocation } from "@tanstack/react-router";
import { 
  ChevronRight, ChevronDown, LayoutDashboard, 
  FileText, Users, Receipt, TrendingUp, 
  Package, RefreshCw, Smartphone, CreditCard,
  Settings, LogOut, User, Bell, Search,
  BookOpen, Zap, Briefcase, Clock
} from "lucide-react";
import { useState } from "react";
import { useStore } from "@/lib/store";

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
}

interface NavGroup {
  label: string;
  items: NavItem[];
  expandable?: boolean;
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Sales",
    expandable: true,
    items: [
      { to: "/quotations", label: "Quotations", icon: <FileText className="h-4 w-4" /> },
      { to: "/invoices", label: "Invoices", icon: <Receipt className="h-4 w-4" /> },
      { to: "/credit-notes", label: "Credit Notes", icon: <FileText className="h-4 w-4" /> },
      { to: "/customer-statements", label: "Customer Statements", icon: <FileText className="h-4 w-4" /> },
    ],
  },
  {
    label: "Main",
    expandable: false,
    items: [
      { to: "/dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
      { to: "/today", label: "Today", icon: <LayoutDashboard className="h-4 w-4" /> },
      { to: "/customers", label: "Customers", icon: <Users className="h-4 w-4" /> },
      { to: "/expenses", label: "Expenses", icon: <Receipt className="h-4 w-4" /> },
    ],
  },
  {
    label: "Procurement",
    expandable: true,
    items: [
      { to: "/purchase-orders", label: "Purchase Orders", icon: <Briefcase className="h-4 w-4" /> },
    ],
  },
  {
    label: "Accounting",
    expandable: true,
    items: [
      { to: "/journal-entries", label: "Journal Entries", icon: <BookOpen className="h-4 w-4" /> },
    ],
  },
  {
    label: "HR & Payroll",
    expandable: true,
    items: [
      { to: "/payroll", label: "Payroll & Employees", icon: <Users className="h-4 w-4" /> },
    ],
  },
  {
    label: "Projects",
    expandable: true,
    items: [
      { to: "/projects", label: "Projects", icon: <Briefcase className="h-4 w-4" /> },
    ],
  },
  {
    label: "Reports",
    expandable: true,
    items: [
      { to: "/reports/profit-loss", label: "Profit & Loss", icon: <TrendingUp className="h-4 w-4" /> },
      { to: "/reports/balance-sheet", label: "Balance Sheet", icon: <TrendingUp className="h-4 w-4" /> },
      { to: "/reports/cash-flow", label: "Cash Flow", icon: <TrendingUp className="h-4 w-4" /> },
      { to: "/reports/trial-balance", label: "Trial Balance", icon: <TrendingUp className="h-4 w-4" /> },
    ],
  },
];

const BOTTOM_NAV: NavItem[] = [
  { to: "/stock", label: "Stock", icon: <Package className="h-4 w-4" /> },
  { to: "/reconcile", label: "Reconcile", icon: <RefreshCw className="h-4 w-4" /> },
  { to: "/mpesa", label: "M-Pesa", icon: <Smartphone className="h-4 w-4" /> },
  { to: "/credits", label: "Credit", icon: <CreditCard className="h-4 w-4" /> },
];

export function Sidebar() {
  const { pathname } = useLocation();
  const session = useStore((s) => s.session);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const toggleGroup = (label: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  };

  const isActive = (to: string) => {
    return pathname === to || pathname.startsWith(to + "/");
  };

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-[240px] bg-white border-r border-border flex flex-col">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b border-border px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <span className="text-lg font-bold text-white">N</span>
        </div>
        <span className="text-lg font-semibold text-foreground">Nest</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-2">
            {group.expandable ? (
              <>
                <button
                  onClick={() => toggleGroup(group.label)}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary/50 transition-colors"
                >
                  <span>{group.label}</span>
                  {expandedGroups.has(group.label) ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
                {expandedGroups.has(group.label) && (
                  <div className="ml-2 mt-1 space-y-1">
                    {group.items.map((item) => (
                      <NavLink key={item.to} to={item.to} label={item.label} icon={item.icon} isActive={isActive(item.to)} />
                    ))}
                  </div>
                )}
              </>
            ) : (
              group.items.map((item) => (
                <NavLink key={item.to} to={item.to} label={item.label} icon={item.icon} isActive={isActive(item.to)} />
              ))
            )}
          </div>
        ))}

        {/* Divider */}
        <div className="my-4 border-t border-border" />

        {/* Bottom Navigation */}
        {BOTTOM_NAV.map((item) => (
          <NavLink key={item.to} to={item.to} label={item.label} icon={item.icon} isActive={isActive(item.to)} />
        ))}
      </nav>

      {/* Bottom Section */}
      <div className="border-t border-border p-3">
        <Link
          to="/settings"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary/50 transition-colors"
        >
          <Settings className="h-4 w-4" />
          <span>Settings</span>
        </Link>
        {session && (
          <div className="mt-2 flex items-center gap-3 rounded-lg px-3 py-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary">
              <User className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{session.user.email || session.user.phone}</p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

function NavLink({ to, label, icon, isActive }: { to: string; label: string; icon: React.ReactNode; isActive: boolean }) {
  return (
    <Link
      to={to}
      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
        isActive
          ? "bg-[#EFF6FF] text-[#3B82F6] border-l-3 border-[#3B82F6]"
          : "text-muted-foreground hover:bg-[#F8FAFC] hover:text-foreground"
      }`}
      style={isActive ? { borderLeft: "3px solid #3B82F6" } : undefined}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}
