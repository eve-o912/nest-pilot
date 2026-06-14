import { Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { actions } from "@/lib/store";
import logo from "@/assets/logo.png";

export function AuthCard({ mode }: { mode: "login" | "signup" }) {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isSignup = mode === "signup";

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isSignup) {
        if (!identifier || !password) {
          throw new Error("All fields are required");
        }
        if (password.length < 6) {
          throw new Error("Password must be at least 6 characters");
        }
        // Detect if identifier is email or phone
        const isEmail = identifier.includes('@');
        const email = isEmail ? identifier : '';
        const phone = isEmail ? '' : identifier;
        const result = actions.signup(email, phone, password);
        if (result.success) {
          navigate({ to: "/setup" });
        }
      } else {
        if (!identifier || !password) {
          throw new Error("All fields are required");
        }
        const result = actions.login(identifier, password);
        if (result.success) {
          navigate({ to: "/dashboard" });
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-14 max-w-[1280px] items-center justify-between px-6">
          <Link to="/" className="flex items-center">
            <img src={logo} alt="Nest Pilot" className="h-7 w-auto" />
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

          {error && (
            <div className="mb-4 rounded-sm border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <form onSubmit={onSubmit} className="mt-7 space-y-4">
            <Field label="Phone Number or Email">
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="0712 345 678 or you@example.com"
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

            {!isSignup && (
              <div className="text-right">
                <Link to="/reset-password" className="text-sm text-muted-foreground hover:text-foreground hover:underline">
                  Forgot password?
                </Link>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 h-11 w-full rounded-sm bg-sky text-sm font-semibold text-sky-foreground hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Processing..." : (isSignup ? "Create Account" : "Log In")}
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
