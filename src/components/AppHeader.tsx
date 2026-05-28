import { Link, useLocation } from "@tanstack/react-router";
import { Search, Settings, User } from "lucide-react";
import { useStore } from "@/lib/store";

const NAV = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/reconcile", label: "Reconcile" },
  { to: "/expenses", label: "Expenses" },
  { to: "/receivables", label: "Receivables" },
  { to: "/receipts", label: "Receipts" },
];

const PUBLIC_ROUTES = ["/", "/login", "/signup", "/setup"];

export function AppHeader() {
  const business = useStore((s) => s.business);
  const { pathname } = useLocation();

  if (PUBLIC_ROUTES.includes(pathname)) return null;

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card">
      <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-6 px-6">
        <Link to="/dashboard" className="flex items-center gap-2">
          <div className="grid h-7 w-7 place-items-center rounded-sm bg-primary text-primary-foreground">
            <span className="text-sm font-bold">N</span>
          </div>
          <span className="text-sm font-semibold tracking-tight">Nest Pilot</span>
          <span className="ml-2 text-xs text-muted-foreground">/ {business.name}</span>
        </Link>

        <nav className="flex items-center gap-1">
          {NAV.map((n) => {
            const active = pathname === n.to || pathname.startsWith(n.to + "/");
            return (
              <Link
                key={n.to}
                to={n.to}
                className={
                  "rounded-sm px-3 py-1.5 text-sm font-medium transition-colors " +
                  (active
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground")
                }
              >
                {n.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              placeholder="Search transactions, customers…"
              className="h-9 w-72 rounded-sm border border-input bg-background pl-8 pr-3 text-sm outline-none focus:border-ring"
            />
          </div>
          <Link
            to="/settings"
            className="grid h-9 w-9 place-items-center rounded-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
            activeProps={{ className: "grid h-9 w-9 place-items-center rounded-sm bg-secondary text-foreground" }}
          >
            <Settings className="h-4 w-4" />
          </Link>
          <button className="grid h-9 w-9 place-items-center rounded-sm bg-secondary text-foreground">
            <User className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
