import { useSyncExternalStore } from "react";

export type TxnType = "in" | "out";
export type ReceivableStatus = "draft" | "unpaid" | "paid";

export interface Transaction {
  id: string;
  date: string; // ISO
  description: string;
  type: TxnType;
  amount: number; // KES
  tags: string[];
  method: "Cash" | "M-Pesa" | "Card" | "Bank";
  reference?: string;
  receivableStatus?: ReceivableStatus;
  customer?: string;
}

export interface MpesaMessage {
  id: string;
  raw: string;
  amount: number;
  sender: string;
  code: string;
  matchedTxnId?: string;
}

export interface Business {
  name: string;
  till: string;
  owner: string;
  type?: string;
  city?: string;
  paymentMethod?: string;
  supportPhone?: string;
  tagline?: string;
}

interface State {
  business: Business;
  transactions: Transaction[];
  mpesa: MpesaMessage[];
}

const BUSINESS_STORAGE_KEY = "nestpilot.business";

const defaultBusiness: Business = {
  name: "Mama Njeri Grocers",
  till: "5471829",
  owner: "Njeri W.",
  type: "Retail",
  city: "Nairobi",
  paymentMethod: "M-Pesa Till",
  supportPhone: "0712 345 678",
  tagline: "Asante! Karibu tena.",
};

function loadBusiness(): Business {
  if (typeof window === "undefined") return defaultBusiness;
  try {
    const raw = window.localStorage.getItem(BUSINESS_STORAGE_KEY);
    if (!raw) return defaultBusiness;
    return { ...defaultBusiness, ...(JSON.parse(raw) as Partial<Business>) };
  } catch {
    return defaultBusiness;
  }
}

function persistBusiness(b: Business) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(BUSINESS_STORAGE_KEY, JSON.stringify(b));
  } catch {
    /* ignore */
  }
}

const listeners = new Set<() => void>();
let state: State = {
  business: loadBusiness(),
  transactions: seed(),
  mpesa: seedMpesa(),
};

function emit() { listeners.forEach((l) => l()); }
function subscribe(fn: () => void) { listeners.add(fn); return () => listeners.delete(fn); }
function getSnapshot() { return state; }

export function useStore<T>(selector: (s: State) => T): T {
  return useSyncExternalStore(subscribe, () => selector(state), () => selector(state));
}

export const actions = {
  updateBusiness(patch: Partial<Business>) {
    const business = { ...state.business, ...patch };
    state = { ...state, business };
    persistBusiness(business);
    emit();
  },
  addTransaction(t: Omit<Transaction, "id">) {
    state = { ...state, transactions: [{ ...t, id: rid() }, ...state.transactions] };
    emit();
  },
  setReceivableStatus(id: string, status: ReceivableStatus) {
    state = {
      ...state,
      transactions: state.transactions.map((t) => (t.id === id ? { ...t, receivableStatus: status } : t)),
    };
    emit();
  },
  matchMpesa(mpesaId: string, txnId: string | undefined) {
    state = {
      ...state,
      mpesa: state.mpesa.map((m) => (m.id === mpesaId ? { ...m, matchedTxnId: txnId } : m)),
    };
    emit();
  },
};

function rid() { return Math.random().toString(36).slice(2, 10); }

function seed(): Transaction[] {
  const now = Date.now();
  const d = (h: number) => new Date(now - h * 3600_000).toISOString();
  return [
    { id: rid(), date: d(1), description: "Sukuma & tomatoes — walk-in", type: "in", amount: 850, tags: ["#sale"], method: "Cash" },
    { id: rid(), date: d(2), description: "Bread loaves x 12", type: "in", amount: 1440, tags: ["#sale"], method: "M-Pesa", reference: "SJK7T2QH9X" },
    { id: rid(), date: d(3), description: "Restock — rice 50kg", type: "out", amount: 6500, tags: ["#restock"], method: "M-Pesa" },
    { id: rid(), date: d(5), description: "Boda delivery to Kawangware", type: "out", amount: 300, tags: ["#transport"], method: "Cash" },
    { id: rid(), date: d(8), description: "Soda crate — credit (Otieno)", type: "in", amount: 2400, tags: ["#sale"], method: "M-Pesa", receivableStatus: "unpaid", customer: "Otieno K." },
    { id: rid(), date: d(10), description: "Sugar 25kg restock", type: "out", amount: 3750, tags: ["#restock"], method: "Bank" },
    { id: rid(), date: d(20), description: "Shop rent — November", type: "out", amount: 18000, tags: ["#rent"], method: "Bank" },
    { id: rid(), date: d(26), description: "Wedding catering — Wanjiku", type: "in", amount: 14500, tags: ["#sale"], method: "M-Pesa", receivableStatus: "unpaid", customer: "Wanjiku M." },
    { id: rid(), date: d(30), description: "Office supplies — receipt book", type: "out", amount: 450, tags: ["#supplies"], method: "Cash" },
    { id: rid(), date: d(34), description: "Mandazi tray — bulk order", type: "in", amount: 1800, tags: ["#sale"], method: "M-Pesa", reference: "SJK6P1RR42", receivableStatus: "paid", customer: "Kibe J." },
    { id: rid(), date: d(40), description: "Estimate — birthday cake (Achieng)", type: "in", amount: 3500, tags: ["#sale"], method: "Cash", receivableStatus: "draft", customer: "Achieng O." },
  ];
}

function seedMpesa(): MpesaMessage[] {
  return [
    { id: "m1", raw: "SJK7T2QH9X Confirmed. Ksh1,440.00 received from JOHN KAMAU 07XX XXX 123 on 14/11/25 at 9:14 AM. New M-PESA balance Ksh12,304.00.", amount: 1440, sender: "JOHN KAMAU", code: "SJK7T2QH9X" },
    { id: "m2", raw: "SJL8U3RI0Y Confirmed. Ksh850.00 received from MARY WAMBUI 07XX XXX 456 on 14/11/25 at 10:02 AM.", amount: 850, sender: "MARY WAMBUI", code: "SJL8U3RI0Y" },
    { id: "m3", raw: "SJK6P1RR42 Confirmed. Ksh1,800.00 received from PETER KIBE 07XX XXX 789 on 13/11/25 at 4:48 PM.", amount: 1800, sender: "PETER KIBE", code: "SJK6P1RR42", matchedTxnId: "auto-1" },
    { id: "m4", raw: "SJM9V4SJ1Z Confirmed. Ksh2,400.00 received from JANE OTIENO 07XX XXX 012 on 13/11/25 at 11:20 AM.", amount: 2400, sender: "JANE OTIENO", code: "SJM9V4SJ1Z" },
    { id: "m5", raw: "SJN0W5TK2A Confirmed. Ksh500.00 received from SAMUEL NJOROGE on 12/11/25 at 8:10 AM.", amount: 500, sender: "SAMUEL NJOROGE", code: "SJN0W5TK2A" },
  ];
}

export const TAG_PRESETS = ["#rent", "#restock", "#transport", "#supplies", "#utilities", "#wages", "#licenses", "#mpesa-fee"];
export function formatKES(n: number) {
  return "KES " + n.toLocaleString("en-KE", { minimumFractionDigits: 0 });
}
