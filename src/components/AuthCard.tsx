import { Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";

export function AuthCard({ mode }: { mode: "login" | "signup" }) {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  const isSignup = mode === "signup";

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) return;
    navigate({ to: isSignup ? "/setup" : "/dashboard" });
  };

  return (
    <main className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-14 max-w-[1280px] items-center justify-between px-6">
          <Link to="/" className="text-base font-semibold tracking-tight">
            Nest Pilot
          </Link>
          <Link to="/" className="text-sm font-medium text-muted-foreground hover:text-foreground">
            ← Back home
          </Link>
        </div>
      </header>

      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md border border-border bg-card p-8">
          <h1 className="text-2xl font-bold tracking-tight">
            {isSignup ? "Create your account" : "Welcome back"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isSignup
              ? "Set up Nest Pilot for your business in under a minute."
              : "Log in to keep your books in order."}
          </p>

          <form onSubmit={onSubmit} className="mt-7 space-y-4">
            <Field label="Phone Number or Email">
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="0712 345 678"
                autoComplete="username"
                className="h-11 w-full rounded-sm border border-transparent bg-secondary px-3 text-sm outline-none transition-colors focus:border-ring focus:bg-card"
              />
            </Field>
            <Field label="Password">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete={isSignup ? "new-password" : "current-password"}
                className="h-11 w-full rounded-sm border border-transparent bg-secondary px-3 text-sm outline-none transition-colors focus:border-ring focus:bg-card"
              />
            </Field>

            <button
              type="submit"
              className="mt-2 h-11 w-full rounded-sm bg-sky text-sm font-semibold text-sky-foreground hover:opacity-90"
            >
              {isSignup ? "Create Account" : "Log In"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {isSignup ? "Already have an account?" : "New to Nest Pilot?"}{" "}
            <Link
              to={isSignup ? "/login" : "/signup"}
              className="font-semibold text-foreground hover:underline"
            >
              {isSignup ? "Log in" : "Create an account"}
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}
