import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { actions } from "@/lib/store";
import logo from "@/assets/logo.png";

export const Route = createFileRoute("/reset-password")({
  component: ResetPassword,
  head: () => ({
    meta: [
      { title: "Reset Password — Nest Pilot" },
      { name: "description", content: "Reset your Nest Pilot account password." },
    ],
  }),
});

function ResetPassword() {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!identifier || !newPassword || !confirmPassword) {
        throw new Error("All fields are required");
      }
      if (newPassword.length < 6) {
        throw new Error("Password must be at least 6 characters");
      }
      if (newPassword !== confirmPassword) {
        throw new Error("Passwords do not match");
      }
      const result = actions.resetPassword(identifier, newPassword);
      if (result.success) {
        setSuccess(true);
        setTimeout(() => {
          navigate({ to: "/login" });
        }, 2000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Password reset failed");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
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
          <div className="w-full max-w-md border border-border bg-card p-8 text-center">
            <h1 className="text-2xl font-bold tracking-tight text-success">Password Reset Successful</h1>
            <p className="mt-4 text-sm text-muted-foreground">
              Your password has been reset. Redirecting to login...
            </p>
          </div>
        </div>
      </main>
    );
  }

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
          <h1 className="text-2xl font-bold tracking-tight">Reset Password</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter your email or phone number and a new password to reset your account.
          </p>

          {error && (
            <div className="mb-4 mt-4 rounded-sm border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <form onSubmit={onSubmit} className="mt-7 space-y-4">
            <Field label="Email or Phone Number">
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="0712 345 678 or you@example.com"
                className="h-11 w-full rounded-sm border border-transparent bg-secondary px-3 text-sm outline-none transition-colors focus:border-ring focus:bg-card"
              />
            </Field>
            <Field label="New Password">
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                className="h-11 w-full rounded-sm border border-transparent bg-secondary px-3 text-sm outline-none transition-colors focus:border-ring focus:bg-card"
              />
            </Field>
            <Field label="Confirm New Password">
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                className="h-11 w-full rounded-sm border border-transparent bg-secondary px-3 text-sm outline-none transition-colors focus:border-ring focus:bg-card"
              />
            </Field>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 h-11 w-full rounded-sm bg-sky text-sm font-semibold text-sky-foreground hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Processing..." : "Reset Password"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Remember your password?{" "}
            <Link to="/login" className="font-semibold text-foreground hover:underline">
              Log in
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
