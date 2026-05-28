import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { ArrowRight } from "lucide-react";
import { actions } from "@/lib/store";

const BUSINESS_TYPES = ["Retail", "Wholesale", "Services", "Food", "Salon", "Transport"];
const PAYMENT_METHODS = ["M-Pesa Till", "M-Pesa Paybill", "Cash"];

export const Route = createFileRoute("/setup")({
  component: Setup,
  head: () => ({
    meta: [
      { title: "Business Setup — Nest Pilot" },
      { name: "description", content: "Tell us about your business so we can tailor your Nest Pilot dashboard." },
    ],
  }),
});

function Setup() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  // Step 1
  const [name, setName] = useState("");
  const [type, setType] = useState<string | null>(null);
  const [city, setCity] = useState("");

  // Step 2
  const [method, setMethod] = useState<string | null>(null);
  const [tillNumber, setTillNumber] = useState("");

  // Step 3
  const [supportPhone, setSupportPhone] = useState("");
  const [tagline, setTagline] = useState("");

  const step1Ready = name.trim() && type && city.trim();

  const goNext = () => setStep((s) => Math.min(s + 1, 3));
  const finish = () => {
    actions.updateBusiness({ supportPhone, tagline });
    navigate({ to: "/dashboard" });
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (step === 1) {
      if (!step1Ready) return;
      actions.updateBusiness({ name: name.trim(), type: type ?? undefined, city: city.trim() });
      goNext();
    } else if (step === 2) {
      actions.updateBusiness({ paymentMethod: method ?? undefined, till: tillNumber });
      goNext();
    } else {
      finish();
    }
  };

  const titles: Record<number, { title: string; subtitle?: string }> = {
    1: { title: "Your Business" },
    2: { title: "How do you get paid?", subtitle: "We'll add these details to your digital receipts." },
    3: { title: "Customize your receipts", subtitle: "Add a personal touch for your customers." },
  };

  return (
    <main className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-14 max-w-[1280px] items-center justify-between px-6">
          <Link to="/" className="text-base font-semibold tracking-tight">
            Nest Pilot
          </Link>
          <span className="text-xs text-muted-foreground">Account setup</span>
        </div>
      </header>

      <div className="flex flex-1 items-start justify-center px-4 py-12 md:py-16">
        <div className="w-full max-w-2xl border border-border bg-card p-8 md:p-10">
          <div className="mb-1 flex items-center justify-between">
            <div className="text-xs font-semibold uppercase tracking-wider text-sky">
              Step {step} of 3
            </div>
            <div className="flex gap-1">
              {[1, 2, 3].map((i) => (
                <span
                  key={i}
                  className="h-1 w-8"
                  style={{ background: i <= step ? "var(--color-sky)" : "var(--color-secondary)" }}
                />
              ))}
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{titles[step].title}</h1>
          {titles[step].subtitle && (
            <p className="mt-2 text-sm text-muted-foreground">{titles[step].subtitle}</p>
          )}

          <form onSubmit={onSubmit} className="mt-8 space-y-7">
            {step === 1 && (
              <>
                <Field label="Business Name">
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Mama Njeri Grocers"
                    className="h-11 w-full rounded-sm border border-transparent bg-secondary px-3 text-sm outline-none transition-colors focus:border-ring focus:bg-card"
                  />
                </Field>

                <Field label="Business Type">
                  <div className="flex flex-wrap gap-2">
                    {BUSINESS_TYPES.map((t) => (
                      <button
                        type="button"
                        key={t}
                        onClick={() => setType(t)}
                        className="pill"
                        data-active={type === t}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </Field>

                <Field label="Location / City">
                  <input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Nairobi"
                    className="h-11 w-full rounded-sm border border-transparent bg-secondary px-3 text-sm outline-none transition-colors focus:border-ring focus:bg-card"
                  />
                </Field>
              </>
            )}

            {step === 2 && (
              <>
                <Field label="Primary Method">
                  <div className="flex flex-wrap gap-2">
                    {PAYMENT_METHODS.map((m) => (
                      <button
                        type="button"
                        key={m}
                        onClick={() => setMethod(m)}
                        className="pill"
                        data-active={method === m}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </Field>

                <Field label="Till / Paybill Number">
                  <input
                    value={tillNumber}
                    onChange={(e) => setTillNumber(e.target.value)}
                    placeholder="e.g. 5471829"
                    className="h-11 w-full rounded-sm border border-transparent bg-secondary px-3 text-sm outline-none transition-colors focus:border-ring focus:bg-card"
                  />
                </Field>
              </>
            )}

            {step === 3 && (
              <>
                <Field label="Support Phone Number">
                  <input
                    value={supportPhone}
                    onChange={(e) => setSupportPhone(e.target.value)}
                    placeholder="e.g. 0712 345 678"
                    className="h-11 w-full rounded-sm border border-transparent bg-secondary px-3 text-sm outline-none transition-colors focus:border-ring focus:bg-card"
                  />
                </Field>

                <Field label="Receipt Tagline / Footer Message">
                  <input
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    placeholder="e.g. Thank you for shopping with us!"
                    className="h-11 w-full rounded-sm border border-transparent bg-secondary px-3 text-sm outline-none transition-colors focus:border-ring focus:bg-card"
                  />
                </Field>
              </>
            )}

            <div className="flex items-center justify-between border-t border-border pt-6">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={step === 3 ? finish : goNext}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Skip for now
                </button>
              ) : (
                <span />
              )}

              <button
                type="submit"
                disabled={step === 1 && !step1Ready}
                className="inline-flex items-center gap-2 rounded-sm bg-sky px-6 py-3 text-sm font-semibold text-sky-foreground hover:opacity-90 disabled:opacity-40"
              >
                {step === 1 && <>Next: Payments <ArrowRight className="h-4 w-4" /></>}
                {step === 2 && <>Next: Receipts <ArrowRight className="h-4 w-4" /></>}
                {step === 3 && <>Complete Setup <ArrowRight className="h-4 w-4" /></>}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}
