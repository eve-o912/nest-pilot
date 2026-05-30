import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ArrowDownLeft, ArrowUpRight, Receipt } from "lucide-react";
import heroShop from "@/assets/hero-shop.jpg";
import logo from "@/assets/logo.png";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "Nest Pilot — Clear Records. Faster Growth." },
      { name: "description", content: "A fast, flat business operations dashboard built for vendors. Track income, log expenses, and share simple digital receipts." },
      { property: "og:title", content: "Nest Pilot — Clear Records. Faster Growth." },
      { property: "og:description", content: "Vendor operations dashboard built for speed." },
    ],
  }),
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Top nav */}
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-14 max-w-[1280px] items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="Nest Pilot" className="h-7 w-auto" />
            <span className="text-base font-semibold tracking-tight">Nest Pilot</span>
          </Link>
          <Link
            to="/login"
            className="text-sm font-medium text-foreground hover:underline"
          >
            Log In
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="border-b border-border bg-card">
        <div className="mx-auto grid max-w-[1280px] grid-cols-1 gap-10 px-6 py-16 md:grid-cols-2 md:items-center md:py-24">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground md:text-5xl">
              Clear Records. <br />Faster Growth.
            </h1>
            <p className="mt-5 max-w-md text-base text-muted-foreground md:text-lg">
              Nest Pilot is the no-nonsense ledger for vendors. Track every shilling
              in and out, reconcile M-Pesa in seconds, and send receipts customers
              can actually read.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                to="/signup"
                className="inline-flex items-center gap-2 rounded-sm bg-sky px-6 py-3 text-sm font-semibold text-sky-foreground hover:opacity-90"
              >
                Get Started <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/login"
                className="text-sm font-medium text-foreground hover:underline"
              >
                I already have an account
              </Link>
            </div>
          </div>
          <div className="border border-border bg-background">
            <img
              src={heroShop}
              alt="A bright, modern retail shop counter with a tablet and receipt printer"
              width={1280}
              height={1280}
              className="block h-full w-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-[1280px] px-6 py-16">
        <h2 className="mb-10 text-center text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Built for the counter, not the boardroom
        </h2>
        <div className="grid grid-cols-1 gap-px overflow-hidden border border-border bg-border md:grid-cols-3">
          <Feature
            icon={<ArrowDownLeft className="h-5 w-5" />}
            title="Track Income"
            desc="Log every sale in two taps. See your total in for the day at a glance."
          />
          <Feature
            icon={<ArrowUpRight className="h-5 w-5" />}
            title="Log Expenses"
            desc="Tag costs like #rent or #restock instantly — no dropdowns, no fuss."
          />
          <Feature
            icon={<Receipt className="h-5 w-5" />}
            title="Simple Receipts"
            desc="Send a clean, monospace receipt with your Till Number on WhatsApp."
          />
        </div>
      </section>

      <footer className="border-t border-border bg-card">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between px-6 py-6 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} Nest Pilot</span>
          <span>Made for vendors.</span>
        </div>
      </footer>
    </div>
  );
}

function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="bg-card p-8">
      <div className="grid h-10 w-10 place-items-center rounded-sm bg-sky text-sky-foreground">
        {icon}
      </div>
      <h3 className="mt-5 text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}
