import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { Search, Settings, User, LogOut, Menu, X, Moon, Sun } from "lucide-react";
import { useStore, actions } from "@/lib/store";
import { useState, useEffect } from "react";
import logo from "@/assets/logo.png";

const NAV = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/reconcile", label: "Reconcile" },
  { to: "/expenses", label: "Expenses" },
  { to: "/receivables", label: "Receivables" },
  { to: "/receipts", label: "Receipts" },
];

const PUBLIC_ROUTES = ["/", "/login", "/signup", "/setup", "/reset-password"];

export function AppHeader() {
  const business = useStore((s) => s.business);
  const session = useStore((s) => s.session);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [showLogoutMenu, setShowLogoutMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  if (PUBLIC_ROUTES.includes(pathname)) return null;

  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    setDarkMode(isDark);
  }, []);

  const handleLogout = () => {
    actions.logout();
    navigate({ to: "/login" });
    setShowLogoutMenu(false);
  };

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card">
      <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-6 px-6">
        <Link to="/dashboard" className="flex items-center gap-2">
          <img src={logo} alt="Nest Pilot" className="h-7 w-auto" />
          <span className="hidden ml-2 text-xs text-muted-foreground sm:inline">/ {business.name}</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1">
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
          {/* Search - hidden on mobile */}
          <div className="relative hidden sm:block">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              placeholder="Search transactions, customers…"
              className="h-9 w-48 md:w-72 rounded-sm border border-input bg-background pl-8 pr-3 text-sm outline-none focus:border-ring"
            />
          </div>

          {/* Dark Mode Toggle */}
          <button
            onClick={toggleDarkMode}
            className="grid h-9 w-9 place-items-center rounded-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
            title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          <Link
            to="/settings"
            className="grid h-9 w-9 place-items-center rounded-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
            activeProps={{ className: "grid h-9 w-9 place-items-center rounded-sm bg-secondary text-foreground" }}
          >
            <Settings className="h-4 w-4" />
          </Link>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setShowLogoutMenu(!showLogoutMenu)}
              className="grid h-9 w-9 place-items-center rounded-sm bg-secondary text-foreground"
            >
              <User className="h-4 w-4" />
            </button>
            {showLogoutMenu && (
              <div className="absolute right-0 top-full mt-2 w-48 rounded-sm border border-border bg-card p-2 shadow-lg">
                <div className="px-3 py-2 text-xs text-muted-foreground">
                  {session?.user.email || session?.user.phone}
                </div>
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm text-foreground hover:bg-secondary"
                >
                  <LogOut className="h-4 w-4" />
                  Log out
                </button>
              </div>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="ml-2 grid h-9 w-9 place-items-center rounded-sm text-muted-foreground hover:bg-secondary hover:text-foreground md:hidden"
          >
            {showMobileMenu ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {showMobileMenu && (
        <div className="border-t border-border bg-card md:hidden">
          <nav className="flex flex-col p-4 gap-2">
            {NAV.map((n) => {
              const active = pathname === n.to || pathname.startsWith(n.to + "/");
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  onClick={() => setShowMobileMenu(false)}
                  className={
                    "rounded-sm px-3 py-2 text-sm font-medium transition-colors " +
                    (active
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground")
                  }
                >
                  {n.label}
                </Link>
              );
            })}
            <div className="mt-2 pt-2 border-t border-border">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="search"
                  placeholder="Search transactions, customers…"
                  className="h-9 w-full rounded-sm border border-input bg-background pl-8 pr-3 text-sm outline-none focus:border-ring"
                />
              </div>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
