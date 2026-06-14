import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { ArrowRight } from "lucide-react";
import { actions, useStore, type UserSegment } from "@/lib/store";

const BUSINESS_TYPES = ["Retail", "Wholesale", "Services", "Food", "Salon", "Transport"];
const PAYMENT_METHODS = ["M-Pesa Till", "M-Pesa Paybill", "Cash"];
const STARTUP_STAGES = ["Pre-seed", "Seed", "Series A", "Series B", "Series C+"];
const INCOME_TYPES = ["Freelance", "Contract", "Salaried", "Side Business", "Investments"];

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
  const currentSegment = useStore((s) => s.currentSegment);
  const [step, setStep] = useState(1);

  // Informal Business fields
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState<string | null>(null);
  const [city, setCity] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null);
  const [tillNumber, setTillNumber] = useState("");

  // Startup fields
  const [companyName, setCompanyName] = useState("");
  const [startupStage, setStartupStage] = useState<string | null>(null);
  const [teamSize, setTeamSize] = useState("");

  // Gig Worker fields
  const [workerName, setWorkerName] = useState("");
  const [primaryIncomeType, setPrimaryIncomeType] = useState<string | null>(null);

  // SME fields
  const [smeName, setSmeName] = useState("");
  const [staffCount, setStaffCount] = useState("");
  const [branchCount, setBranchCount] = useState("");

  // Common fields
  const [supportPhone, setSupportPhone] = useState("");
  const [tagline, setTagline] = useState("");

  const getStepCount = () => {
    switch (currentSegment) {
      case "informal_business":
        return 3;
      case "startup_founder":
        return 2;
      case "individual_gig":
        return 2;
      case "sme_owner":
        return 2;
      default:
        return 3;
    }
  };

  const stepCount = getStepCount();

  const goNext = () => setStep((s) => Math.min(s + 1, stepCount));
  const finish = () => {
    actions.updateBusiness({ supportPhone, tagline });
    navigate({ to: "/dashboard" });
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (currentSegment === "informal_business") {
      if (step === 1) {
        if (!businessName.trim() || !businessType || !city.trim()) return;
        actions.updateBusiness({
          name: businessName.trim(),
          type: businessType,
          city: city.trim(),
        });
        goNext();
      } else if (step === 2) {
        actions.updateBusiness({
          paymentMethod: paymentMethod ?? undefined,
          till: tillNumber,
        });
        goNext();
      } else {
        finish();
      }
    } else if (currentSegment === "startup_founder") {
      if (step === 1) {
        if (!companyName.trim() || !startupStage || !teamSize.trim()) return;
        actions.updateBusiness({
          name: companyName.trim(),
          type: startupStage,
          city: teamSize, // Using city field for team size temporarily
        });
        goNext();
      } else {
        finish();
      }
    } else if (currentSegment === "individual_gig") {
      if (step === 1) {
        if (!workerName.trim() || !primaryIncomeType) return;
        actions.updateBusiness({
          name: workerName.trim(),
          type: primaryIncomeType,
        });
        goNext();
      } else {
        finish();
      }
    } else if (currentSegment === "sme_owner") {
      if (step === 1) {
        if (!smeName.trim() || !staffCount.trim() || !branchCount.trim()) return;
        actions.updateBusiness({
          name: smeName.trim(),
          city: staffCount, // Using city field for staff count temporarily
          type: branchCount, // Using type field for branch count temporarily
        });
        goNext();
      } else {
        finish();
      }
    }
  };

  const getTitles = () => {
    switch (currentSegment) {
      case "informal_business":
        return {
          1: { title: "Your Business", subtitle: "Tell us about your shop or business." },
          2: { title: "How do you get paid?", subtitle: "We'll add these details to your digital receipts." },
          3: { title: "Customize your receipts", subtitle: "Add a personal touch for your customers." },
        };
      case "startup_founder":
        return {
          1: { title: "Your Startup", subtitle: "Company details and funding stage." },
          2: { title: "Complete Setup", subtitle: "You're all set to start tracking." },
        };
      case "individual_gig":
        return {
          1: { title: "Your Profile", subtitle: "Tell us about your work." },
          2: { title: "Complete Setup", subtitle: "You're all set to start tracking." },
        };
      case "sme_owner":
        return {
          1: { title: "Your Business", subtitle: "Company structure and operations." },
          2: { title: "Complete Setup", subtitle: "You're all set to start tracking." },
        };
      default:
        return {};
    }
  };

  const titles = getTitles();

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
              Step {step} of {stepCount}
            </div>
            <div className="flex gap-1">
              {Array.from({ length: stepCount }).map((_, i) => (
                <span
                  key={i}
                  className="h-1 w-8"
                  style={{ background: i + 1 <= step ? "var(--color-sky)" : "var(--color-secondary)" }}
                />
              ))}
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{titles[step]?.title}</h1>
          {titles[step]?.subtitle && (
            <p className="mt-2 text-sm text-muted-foreground">{titles[step].subtitle}</p>
          )}

          <form onSubmit={onSubmit} className="mt-8 space-y-7">
            {currentSegment === "informal_business" && (
              <>
                {step === 1 && (
                  <>
                    <Field label="Business Name">
                      <input
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
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
                            onClick={() => setBusinessType(t)}
                            className="pill"
                            data-active={businessType === t}
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
                            onClick={() => setPaymentMethod(m)}
                            className="pill"
                            data-active={paymentMethod === m}
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
              </>
            )}

            {currentSegment === "startup_founder" && (
              <>
                {step === 1 && (
                  <>
                    <Field label="Company Name">
                      <input
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="e.g. TechVenture Inc."
                        className="h-11 w-full rounded-sm border border-transparent bg-secondary px-3 text-sm outline-none transition-colors focus:border-ring focus:bg-card"
                      />
                    </Field>

                    <Field label="Funding Stage">
                      <div className="flex flex-wrap gap-2">
                        {STARTUP_STAGES.map((stage) => (
                          <button
                            type="button"
                            key={stage}
                            onClick={() => setStartupStage(stage)}
                            className="pill"
                            data-active={startupStage === stage}
                          >
                            {stage}
                          </button>
                        ))}
                      </div>
                    </Field>

                    <Field label="Team Size">
                      <input
                        value={teamSize}
                        onChange={(e) => setTeamSize(e.target.value)}
                        placeholder="e.g. 5"
                        type="number"
                        className="h-11 w-full rounded-sm border border-transparent bg-secondary px-3 text-sm outline-none transition-colors focus:border-ring focus:bg-card"
                      />
                    </Field>
                  </>
                )}

                {step === 2 && (
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
                        placeholder="e.g. Thank you for your business!"
                        className="h-11 w-full rounded-sm border border-transparent bg-secondary px-3 text-sm outline-none transition-colors focus:border-ring focus:bg-card"
                      />
                    </Field>
                  </>
                )}
              </>
            )}

            {currentSegment === "individual_gig" && (
              <>
                {step === 1 && (
                  <>
                    <Field label="Your Name">
                      <input
                        value={workerName}
                        onChange={(e) => setWorkerName(e.target.value)}
                        placeholder="e.g. John Doe"
                        className="h-11 w-full rounded-sm border border-transparent bg-secondary px-3 text-sm outline-none transition-colors focus:border-ring focus:bg-card"
                      />
                    </Field>

                    <Field label="Primary Income Type">
                      <div className="flex flex-wrap gap-2">
                        {INCOME_TYPES.map((type) => (
                          <button
                            type="button"
                            key={type}
                            onClick={() => setPrimaryIncomeType(type)}
                            className="pill"
                            data-active={primaryIncomeType === type}
                          >
                            {type}
                          </button>
                        ))}
                      </div>
                    </Field>
                  </>
                )}

                {step === 2 && (
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
                        placeholder="e.g. Thank you for your business!"
                        className="h-11 w-full rounded-sm border border-transparent bg-secondary px-3 text-sm outline-none transition-colors focus:border-ring focus:bg-card"
                      />
                    </Field>
                  </>
                )}
              </>
            )}

            {currentSegment === "sme_owner" && (
              <>
                {step === 1 && (
                  <>
                    <Field label="Business Name">
                      <input
                        value={smeName}
                        onChange={(e) => setSmeName(e.target.value)}
                        placeholder="e.g. Nairobi Retail Group"
                        className="h-11 w-full rounded-sm border border-transparent bg-secondary px-3 text-sm outline-none transition-colors focus:border-ring focus:bg-card"
                      />
                    </Field>

                    <Field label="Number of Staff">
                      <input
                        value={staffCount}
                        onChange={(e) => setStaffCount(e.target.value)}
                        placeholder="e.g. 25"
                        type="number"
                        className="h-11 w-full rounded-sm border border-transparent bg-secondary px-3 text-sm outline-none transition-colors focus:border-ring focus:bg-card"
                      />
                    </Field>

                    <Field label="Number of Branches">
                      <input
                        value={branchCount}
                        onChange={(e) => setBranchCount(e.target.value)}
                        placeholder="e.g. 3"
                        type="number"
                        className="h-11 w-full rounded-sm border border-transparent bg-secondary px-3 text-sm outline-none transition-colors focus:border-ring focus:bg-card"
                      />
                    </Field>
                  </>
                )}

                {step === 2 && (
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
                        placeholder="e.g. Thank you for your business!"
                        className="h-11 w-full rounded-sm border border-transparent bg-secondary px-3 text-sm outline-none transition-colors focus:border-ring focus:bg-card"
                      />
                    </Field>
                  </>
                )}
              </>
            )}

            <div className="flex items-center justify-between border-t border-border pt-6">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={() => setStep((s) => Math.max(s - 1, 1))}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Back
                </button>
              ) : (
                <span />
              )}

              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-sm bg-sky px-6 py-3 text-sm font-semibold text-sky-foreground hover:opacity-90 disabled:opacity-40 min-h-[48px]"
              >
                {step === stepCount ? <>Complete Setup <ArrowRight className="h-4 w-4" /></> : <>Next <ArrowRight className="h-4 w-4" /></>}
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
