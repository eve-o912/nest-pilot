import { useLocation, Link } from "@tanstack/react-router";
import { Search, Bell, ChevronDown, User } from "lucide-react";
import { useStore } from "@/lib/store";

interface TopBarProps {
  title?: string;
}

export function TopBar({ title }: TopBarProps) {
  const { pathname } = useLocation();
  const session = useStore((s) => s.session);

  const getPageTitle = () => {
    if (title) return title;
    const path = pathname.split("/")[1];
    if (!path) return "Dashboard";
    return path.charAt(0).toUpperCase() + path.slice(1).replace("-", " ");
  };

  return (
    <header className="fixed left-[240px] right-0 top-0 z-30 h-16 bg-white border-b border-border flex items-center justify-between px-6">
      {/* Left: Breadcrumb */}
      <div className="flex items-center">
        <h1 className="text-lg font-semibold text-foreground">{getPageTitle()}</h1>
      </div>

      {/* Center: Search Bar */}
      <div className="flex-1 max-w-xl mx-8">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search customers, invoices..."
            className="h-9 w-full rounded-lg bg-[#F1F5F9] pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-[#3B82F6]/20 transition-all"
          />
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        {/* Notifications */}
        <button className="relative grid h-9 w-9 place-items-center rounded-lg text-muted-foreground hover:bg-secondary/50 transition-colors">
          <Bell className="h-4 w-4" />
          <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center font-semibold">
            3
          </span>
        </button>

        {/* Reports Quick Link */}
        <a
          href="/reports"
          className="inline-flex items-center gap-2 rounded-lg bg-[#EFF6FF] px-3 py-2 text-sm font-medium text-[#3B82F6] hover:bg-[#3B82F6]/10 transition-colors"
        >
          Reports
          <ChevronDown className="h-4 w-4" />
        </a>

        {/* Current User */}
        {session && (
          <div className="flex items-center gap-2 rounded-lg bg-secondary/50 px-3 py-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white text-sm font-medium">
              {(session.user.email || session.user.phone || "U").charAt(0).toUpperCase()}
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
      </div>
    </header>
  );
}
