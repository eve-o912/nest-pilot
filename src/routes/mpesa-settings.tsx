import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Check, X, Save, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface MpesaSettings {
  id: string;
  user_id: string;
  shortcode: string | null;
  account_reference: string | null;
  c2b_registered: boolean;
  created_at: string;
}

export const Route = createFileRoute("/mpesa-settings")({
  component: MpesaSettings,
  head: () => ({
    meta: [
      { title: "M-Pesa Settings — Nest Pilot" },
      { name: "description", content: "Configure your M-Pesa integration." },
    ],
  }),
});

function MpesaSettings() {
  const [settings, setSettings] = useState<MpesaSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [shortcode, setShortcode] = useState("");
  const [accountReference, setAccountReference] = useState("");
  const [saving, setSaving] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("mpesa_settings")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      if (data) {
        setSettings(data);
        setShortcode(data.shortcode || "");
        setAccountReference(data.account_reference || "");
      }
    } catch (error) {
      console.error("Error fetching M-Pesa settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!shortcode.trim()) {
      setError("Shortcode is required");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("mpesa_settings")
        .upsert({
          user_id: user.id,
          shortcode: shortcode.trim(),
          account_reference: accountReference.trim() || null,
        }, {
          onConflict: "user_id",
        });

      if (error) throw error;

      setSuccess("Settings saved successfully");
      fetchSettings();
    } catch (error) {
      console.error("Error saving settings:", error);
      setError("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleActivateMpesa = async () => {
    if (!shortcode.trim()) {
      setError("Please save your shortcode first");
      return;
    }

    setRegistering(true);
    setError("");
    setSuccess("");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mpesa-c2b-register`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ shortcode: shortcode.trim() }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to register C2B");
      }

      setSuccess("✅ M-Pesa Imeunganishwa (M-Pesa Connected)");
      fetchSettings();
    } catch (error) {
      console.error("Error activating M-Pesa:", error);
      setError("Failed to activate M-Pesa. Please try again.");
    } finally {
      setRegistering(false);
    }
  };

  if (loading) {
    return (
      <main className="mx-auto max-w-[1600px] px-6 pb-16">
        <div className="flex items-center justify-center py-20">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </main>
    );
  }

  const projectRef = import.meta.env.VITE_SUPABASE_URL?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
  const confirmationUrl = projectRef 
    ? `https://${projectRef}.supabase.co/functions/v1/mpesa-c2b-callback`
    : "";
  const validationUrl = projectRef
    ? `https://${projectRef}.supabase.co/functions/v1/mpesa-c2b-validate`
    : "";

  return (
    <main className="mx-auto max-w-[1600px] px-6 pb-16">
      <section className="max-w-2xl">
        <h1 className="text-2xl font-semibold mb-2">M-Pesa Settings</h1>
        <p className="text-sm text-muted-foreground mb-8">
          Configure your M-Pesa integration to receive payments automatically.
        </p>

        {settings?.c2b_registered && (
          <div className="mb-6 rounded-sm bg-success/10 border border-success/20 p-4">
            <div className="flex items-center gap-2 text-success">
              <Check className="h-5 w-5" />
              <span className="font-semibold">✅ M-Pesa Imeunganishwa</span>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-sm bg-destructive/10 border border-destructive/20 p-4">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 rounded-sm bg-success/10 border border-success/20 p-4">
            <div className="flex items-center gap-2 text-success">
              <Check className="h-5 w-5" />
              <span>{success}</span>
            </div>
          </div>
        )}

        <div className="space-y-6">
          <div>
            <label className="block mb-2 text-sm font-semibold">
              Till Number au Paybill yako *
            </label>
            <input
              type="text"
              value={shortcode}
              onChange={(e) => {
                setShortcode(e.target.value);
                setError("");
              }}
              className="h-10 w-full rounded-sm border border-input bg-background px-3 text-sm outline-none focus:border-ring"
              placeholder="e.g., 174379"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Enter your M-Pesa Till Number or Paybill number
            </p>
          </div>

          <div>
            <label className="block mb-2 text-sm font-semibold">
              Account Reference (optional)
            </label>
            <input
              type="text"
              value={accountReference}
              onChange={(e) => setAccountReference(e.target.value)}
              className="h-10 w-full rounded-sm border border-input bg-background px-3 text-sm outline-none focus:border-ring"
              placeholder="e.g., Nest Pilot"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              This will appear in the BillRefNumber field of transactions
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleSaveSettings}
              disabled={saving}
              className="flex-1 rounded-sm bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Settings"}
            </button>
            {!settings?.c2b_registered && shortcode && (
              <button
                onClick={handleActivateMpesa}
                disabled={registering}
                className="flex-1 rounded-sm bg-success px-4 py-2.5 text-sm font-semibold text-success-foreground hover:opacity-90 disabled:opacity-50"
              >
                {registering ? "Activating..." : "Activate M-Pesa"}
              </button>
            )}
          </div>

          {settings?.c2b_registered && confirmationUrl && (
            <div className="mt-8 pt-6 border-t border-border">
              <h3 className="text-sm font-semibold mb-4">Callback URLs (for reference)</h3>
              <div className="space-y-3">
                <div>
                  <label className="block mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Confirmation URL
                  </label>
                  <code className="block p-3 rounded-sm bg-secondary text-xs break-all">
                    {confirmationUrl}
                  </code>
                </div>
                <div>
                  <label className="block mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Validation URL
                  </label>
                  <code className="block p-3 rounded-sm bg-secondary text-xs break-all">
                    {validationUrl}
                  </code>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
