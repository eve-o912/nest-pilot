import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { Search, Settings, User, LogOut, Menu, X, Moon, Sun, ChevronDown, RefreshCw } from "lucide-react";
import { useStore, actions, type UserSegment } from "@/lib/store";
import { useState, useEffect } from "react";
import logo from "@/assets/logo.png";
import { supabase } from "@/lib/supabase";

const INFORMAL_BUSINESS_NAV = [
  {
    label: "Overview",
    items: [
      { to: "/dashboard", label: "Dashboard" },
    ]
  },
  {
    label: "Transactions",
    items: [
      { to: "/expenses", label: "Expenses" },
      { to: "/receipts", label: "Receipts" },
    ]
  },
  {
    label: "Business",
    items: [
      { to: "/customers", label: "Customers" },
      { to: "/stock", label: "Stock" },
      { to: "/credits", label: "Mkopo" },
    ]
  },
  {
    label: "Payments",
    items: [
      { to: "/mpesa", label: "M-Pesa" },
    ]
  },
];

const STARTUP_NAV = [
  {
    label: "Overview",
    items: [
      { to: "/dashboard", label: "Dashboard" },
    ]
  },
  {
    label: "Financials",
    items: [
      { to: "/dashboard", label: "Runway & Burn" },
      { to: "/dashboard", label: "Revenue / MRR" },
      { to: "/dashboard", label: "Cash Flow" },
      { to: "/expenses", label: "Expenses" },
    ]
  },
  {
    label: "Investors",
    items: [
      { to: "/dashboard", label: "Investor Dashboard" },
      { to: "/dashboard", label: "Fundraising Score" },
      { to: "/dashboard", label: "Manikka AI CFO" },
    ]
  },
  {
    label: "Team",
    items: [
      { to: "/dashboard", label: "Payroll" },
      { to: "/dashboard", label: "Hiring Planner" },
    ]
  },
];

const GIG_WORKER_NAV = [
  {
    label: "Overview",
    items: [
      { to: "/dashboard", label: "Dashboard" },
    ]
  },
  {
    label: "Income",
    items: [
      { to: "/dashboard", label: "Income Sources" },
      { to: "/dashboard", label: "Payslips" },
      { to: "/mpesa", label: "M-Pesa History" },
    ]
  },
  {
    label: "Credit",
    items: [
      { to: "/dashboard", label: "Identity Score" },
      { to: "/credits", label: "Loan Eligibility" },
    ]
  },
];

const SME_NAV = [
  {
    label: "Overview",
    items: [
      { to: "/dashboard", label: "Dashboard" },
    ]
  },
  {
    label: "Operations",
    items: [
      { to: "/dashboard", label: "Branches" },
      { to: "/dashboard", label: "Revenue" },
      { to: "/expenses", label: "Expenses" },
      { to: "/stock", label: "Inventory" },
    ]
  },
  {
    label: "Management",
    items: [
      { to: "/dashboard", label: "Payroll" },
      { to: "/purchase-orders", label: "Purchase Orders" },
      { to: "/dashboard", label: "VAT / iTax" },
    ]
  },
];

const getNavGroups = (segment: UserSegment) => {
  switch (segment) {
    case "startup_founder":
      return STARTUP_NAV;
    case "individual_gig":
      return GIG_WORKER_NAV;
    case "sme_owner":
      return SME_NAV;
    case "informal_business":
    default:
      return INFORMAL_BUSINESS_NAV;
  }
};

const SEGMENT_LABELS: Record<UserSegment, string> = {
  informal_business: "Informal Business",
  startup_founder: "Startup",
  individual_gig: "Gig / Individual",
  sme_owner: "Growing SME",
};

const SEGMENT_COLORS: Record<UserSegment, string> = {
  informal_business: "bg-blue-500",
  startup_founder: "bg-purple-500",
  individual_gig: "bg-green-500",
  sme_owner: "bg-orange-500",
};

const PUBLIC_ROUTES = ["/", "/login", "/signup", "/setup", "/reset-password"];

export function AppHeader() {
  const business = useStore((s) => s.business);
  const session = useStore((s) => s.session);
  const currentSegment = useStore((s) => s.currentSegment);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [showLogoutMenu, setShowLogoutMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [creditsCount, setCreditsCount] = useState(0);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [showSegmentSwitcher, setShowSegmentSwitcher] = useState(false);

  const navGroups = getNavGroups(currentSegment);

  useEffect(() => {
    fetchCreditsCount();
  }, []);

  const fetchCreditsCount = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("credits")
        .select("id")
        .eq("user_id", user.id)
        .in("status", ["unpaid", "partial"]);

      setCreditsCount(data?.length || 0);
    } catch (error) {
      console.error("Error fetching credits count:", error);
    }
  };

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

        {/* Segment Badge */}
        <div className="hidden md:flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-white ${SEGMENT_COLORS[currentSegment]}`}>
            {SEGMENT_LABELS[currentSegment]}
          </span>
          <button
            onClick={() => setShowSegmentSwitcher(true)}
            className="text-muted-foreground hover:text-foreground transition-colors"
            title="Switch mode"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {navGroups.map((group) => (
            <div key={group.label} className="relative">
              <button
                onClick={() => setOpenDropdown(openDropdown === group.label ? null : group.label)}
                className={
                  "rounded-sm px-3 py-1.5 text-sm font-medium transition-colors flex items-center gap-1 " +
                  (openDropdown === group.label
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground")
                }
              >
                {group.label}
                <ChevronDown className="h-3 w-3" />
              </button>
              
              {openDropdown === group.label && (
                <div className="absolute top-full left-0 mt-1 w-48 rounded-sm border border-border bg-card p-2 shadow-lg z-50">
                  {group.items.map((item) => {
                    const active = pathname === item.to || pathname.startsWith(item.to + "/");
                    const showBadge = item.to === "/credits" && creditsCount > 0;
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={() => setOpenDropdown(null)}
                        className={
                          "block px-3 py-2 text-sm rounded-sm transition-colors relative " +
                          (active
                            ? "bg-secondary text-foreground"
                            : "text-muted-foreground hover:bg-secondary hover:text-foreground")
                        }
                      >
                        {item.label}
                        {showBadge && (
                          <span className="ml-2 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-destructive text-destructive-foreground text-xs font-semibold">
                            {creditsCount}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
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
            {navGroups.map((group) => (
              <div key={group.label}>
                <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {group.label}
                </p>
                {group.items.map((item) => {
                  const active = pathname === item.to || pathname.startsWith(item.to + "/");
                  const showBadge = item.to === "/credits" && creditsCount > 0;
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setShowMobileMenu(false)}
                      className={
                        "block px-3 py-2 text-sm font-medium rounded-sm transition-colors relative ml-2 " +
                        (active
                          ? "bg-secondary text-foreground"
                          : "text-muted-foreground hover:bg-secondary hover:text-foreground")
                      }
                    >
                      {item.label}
                      {showBadge && (
                          <span className="ml-2 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-destructive text-destructive-foreground text-xs font-semibold">
                            {creditsCount}
                          </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            ))}
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

      {/* Segment Switcher Modal */}
      {showSegmentSwitcher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card border border-border rounded-sm p-6 max-w-2xl w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Switch Your Nest Mode</h2>
              <button
                onClick={() => setShowSegmentSwitcher(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {(Object.keys(SEGMENT_LABELS) as UserSegment[]).map((segment) => (
                <button
                  key={segment}
                  onClick={() => {
                    actions.setSegment(segment);
                    setShowSegmentSwitcher(false);
                  }}
                  className={`p-4 border-2 rounded-sm text-left transition-all ${
                    currentSegment === segment
                      ? "border-sky-500 bg-sky-50 dark:bg-sky-950/20"
                      : "border-border bg-card hover:border-sky-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-white ${SEGMENT_COLORS[segment]}`}>
                      {segment === "informal_business" && "🏪"}
                      {segment === "startup_founder" && "🚀"}
                      {segment === "individual_gig" && "⚡"}
                      {segment === "sme_owner" && "🏢"}
                    </span>
                    <div>
                      <p className="font-medium text-foreground">{SEGMENT_LABELS[segment]}</p>
                      <p className="text-xs text-muted-foreground">
                        {segment === "informal_business" && "Daily income & expenses"}
                        {segment === "startup_founder" && "Runway, burn, MRR"}
                        {segment === "individual_gig" && "Income streams & credit"}
                        {segment === "sme_owner" && "Multi-branch, staff, POS"}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
