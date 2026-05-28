import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Check } from "lucide-react";
import { actions, useStore, type Business } from "@/lib/store";

const BUSINESS_TYPES = ["Retail", "Wholesale", "Services", "Food", "Salon", "Transport"];
const PAYMENT_METHODS = ["M-Pesa Till", "M-Pesa Paybill", "Cash"];

type SectionKey = "identity" | "payment" | "receipt";

const SECTIONS: { key: SectionKey; label: string; description: string }[] = [
  { key: "identity", label: "Business Identity", description: "Name, type, and location." },
  { key: "payment", label: "Payment Details", description: "How you collect payments." },
  { key: "receipt", label: "Receipt Branding", description: "Support contact and footer message." },
];

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
  head: () => ({
    meta: [
      { title: "Settings — Nest Pilot" },
      { name: "description", content: "Update your business identity, payment details, and receipt branding." },
    ],
  }),
});

function SettingsPage() {
  const business = useStore((s) => s.business);
  const [active, setActive] = useState<SectionKey>("identity");

  return (
    <main className="mx-auto max-w-[1280px] px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your business profile. Changes apply instantly across your dashboard and receipts.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-[240px_1fr]">
        <nav className="flex flex-col gap-1">
          {SECTIONS.map((s) => (
            <button
              key={s.key}
              onClick={() => setActive(s.key)}
              className={
                "flex flex-col items-start gap-0.5 border-l-2 px-3 py-2 text-left text-sm transition-colors " +
                (active === s.key
                  ? "border-sky bg-secondary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground")
              }
            >
              <span className="font-medium">{s.label}</span>
              <span className="text-xs text-muted-foreground">{s.description}</span>
            </button>
          ))}
        </nav>

        <section className="border border-border bg-card p-8">
          {active === "identity" && <IdentityForm business={business} />}
          {active === "payment" && <PaymentForm business={business} />}
          {active === "receipt" && <ReceiptForm business={business} />}
        </section>
      </div>
    </main>
  );
}

function useSaved() {
  const [saved, setSaved] = useState(false);
  const flash = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };
  return [saved, flash] as const;
}

function IdentityForm({ business }: { business: Business }) {
  const [name, setName] = useState(business.name);
  const [type, setType] = useState<string | undefined>(business.type);
  const [city, setCity] = useState(business.city ?? "");
  const [saved, flash] = useSaved();

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    actions.updateBusiness({ name, type, city });
    flash();
  };

  return (
    <FormShell title="Business Identity" onSubmit={onSubmit} saved={saved}>
      <Field label="Business Name">
        <TextInput value={name} onChange={setName} placeholder="e.g. Mama Njeri Grocers" />
      </Field>
      <Field label="Business Type">
        <div className="flex flex-wrap gap-2">
          {BUSINESS_TYPES.map((t) => (
            <button type="button" key={t} className="pill" data-active={type === t} onClick={() => setType(t)}>
              {t}
            </button>
          ))}
        </div>
      </Field>
      <Field label="Location / City">
        <TextInput value={city} onChange={setCity} placeholder="e.g. Nairobi" />
      </Field>
    </FormShell>
  );
}

function PaymentForm({ business }: { business: Business }) {
  const [method, setMethod] = useState<string | undefined>(business.paymentMethod);
  const [till, setTill] = useState(business.till);
  const [saved, flash] = useSaved();

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    actions.updateBusiness({ paymentMethod: method, till });
    flash();
  };

  return (
    <FormShell title="Payment Details" onSubmit={onSubmit} saved={saved}>
      <Field label="Primary Method">
        <div className="flex flex-wrap gap-2">
          {PAYMENT_METHODS.map((m) => (
            <button type="button" key={m} className="pill" data-active={method === m} onClick={() => setMethod(m)}>
              {m}
            </button>
          ))}
        </div>
      </Field>
      <Field label="Till / Paybill Number">
        <TextInput value={till} onChange={setTill} placeholder="e.g. 5471829" />
      </Field>
    </FormShell>
  );
}

function ReceiptForm({ business }: { business: Business }) {
  const [supportPhone, setSupportPhone] = useState(business.supportPhone ?? "");
  const [tagline, setTagline] = useState(business.tagline ?? "");
  const [saved, flash] = useSaved();

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    actions.updateBusiness({ supportPhone, tagline });
    flash();
  };

  return (
    <FormShell title="Receipt Branding" onSubmit={onSubmit} saved={saved}>
      <Field label="Support Phone Number">
        <TextInput value={supportPhone} onChange={setSupportPhone} placeholder="e.g. 0712 345 678" />
      </Field>
      <Field label="Receipt Tagline / Footer Message">
        <TextInput value={tagline} onChange={setTagline} placeholder="e.g. Thank you for shopping with us!" />
      </Field>

      <div className="mt-2 border border-border bg-secondary p-4">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Preview</div>
        <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-foreground">
{`-------------------------------
        ${business.name.toUpperCase()}
-------------------------------
 Item ............... KES 850
-------------------------------
 Pay to Till: ${business.till}
 Help: ${supportPhone || "—"}

 ${tagline || "—"}
-------------------------------`}
        </pre>
      </div>
    </FormShell>
  );
}

function FormShell({
  title,
  saved,
  children,
  onSubmit,
}: {
  title: string;
  saved: boolean;
  children: React.ReactNode;
  onSubmit: (e: FormEvent) => void;
}) {
  return (
    <form onSubmit={onSubmit}>
      <div className="mb-6 flex items-center justify-between border-b border-border pb-4">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {saved && (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
            <Check className="h-3.5 w-3.5" /> Saved
          </span>
        )}
      </div>
      <div className="space-y-6">{children}</div>
      <div className="mt-8 flex justify-end border-t border-border pt-6">
        <button
          type="submit"
          className="rounded-sm bg-sky px-6 py-2.5 text-sm font-semibold text-sky-foreground hover:opacity-90"
        >
          Save changes
        </button>
      </div>
    </form>
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

function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="h-11 w-full rounded-sm border border-transparent bg-secondary px-3 text-sm outline-none transition-colors focus:border-ring focus:bg-card"
    />
  );
}
