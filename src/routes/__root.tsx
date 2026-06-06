import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  useNavigate,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { ManikkaPanel } from "@/components/ManikkaPanel";
import { useStore } from "@/lib/store";
import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Nest Pilot — Vendor Operations Dashboard" },
      { name: "description", content: "Fast, flat-design business operations and financial tracking for vendors." },
      { name: "author", content: "Nest Pilot" },
      { property: "og:title", content: "Nest Pilot" },
      { property: "og:description", content: "Vendor operations dashboard built for speed." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const session = useStore((s) => s.session);
  const navigate = useNavigate();
  const router = useRouter();
  const pathname = router.state.location.pathname;
  const [showManikka, setShowManikka] = useState(false);

  const PUBLIC_ROUTES = ["/", "/login", "/signup", "/setup", "/reset-password"];

  useEffect(() => {
    if (!PUBLIC_ROUTES.includes(pathname) && !session) {
      navigate({ to: "/login" });
    }
  }, [pathname, session, navigate]);

  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-[#F8FAFC]">
        {isPublicRoute ? (
          <Outlet />
        ) : (
          <>
            <Sidebar />
            <TopBar />
            <main className="ml-[240px] mt-16 p-6 max-w-[1400px]">
              <Outlet />
            </main>
            
            {/* Floating AI Button */}
            <button
              onClick={() => setShowManikka(true)}
              className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3 rounded-full shadow-lg transition-all hover:scale-105"
              style={{ backgroundColor: "#0B1F3A", color: "#F59E0B" }}
            >
              <Sparkles className="h-5 w-5" />
              <span className="font-semibold text-sm">Ask Manikka</span>
            </button>

            {/* Manikka Panel */}
            <ManikkaPanel isOpen={showManikka} onClose={() => setShowManikka(false)} />
          </>
        )}
      </div>
    </QueryClientProvider>
  );
}
