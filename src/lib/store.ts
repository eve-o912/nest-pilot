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

export interface User {
  id: string;
  email: string;
  phone: string;
  password: string;
}

export interface AuthSession {
  user: User;
  token: string;
  expiresAt: number;
}

interface State {
  business: Business;
  transactions: Transaction[];
  mpesa: MpesaMessage[];
  users: User[];
  session: AuthSession | null;
}

const BUSINESS_STORAGE_KEY = "nestpilot.business";
const AUTH_STORAGE_KEY = "nestpilot.auth";
const USERS_STORAGE_KEY = "nestpilot.users";

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

function loadSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as AuthSession;
    // Check if session is expired
    if (session.expiresAt < Date.now()) {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

function persistSession(session: AuthSession | null) {
  if (typeof window === "undefined") return;
  try {
    if (session) {
      window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
    } else {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  } catch {
    /* ignore */
  }
}

function loadUsers(): User[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(USERS_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as User[];
  } catch {
    return [];
  }
}

function persistUsers(users: User[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  } catch {
    /* ignore */
  }
}

const TRANSACTIONS_STORAGE_KEY = "nestpilot.transactions";
const MPESA_STORAGE_KEY = "nestpilot.mpesa";

function loadTransactions(): Transaction[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(TRANSACTIONS_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Transaction[];
  } catch {
    return [];
  }
}

function persistTransactions(transactions: Transaction[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(transactions));
  } catch {
    /* ignore */
  }
}

function loadMpesa(): MpesaMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(MPESA_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as MpesaMessage[];
  } catch {
    return [];
  }
}

function persistMpesa(mpesa: MpesaMessage[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(MPESA_STORAGE_KEY, JSON.stringify(mpesa));
  } catch {
    /* ignore */
  }
}

const listeners = new Set<() => void>();
let state: State = {
  business: loadBusiness(),
  transactions: loadTransactions(),
  mpesa: loadMpesa(),
  users: loadUsers(),
  session: loadSession(),
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
    persistTransactions(state.transactions);
    emit();
  },
  setReceivableStatus(id: string, status: ReceivableStatus) {
    state = {
      ...state,
      transactions: state.transactions.map((t) => (t.id === id ? { ...t, receivableStatus: status } : t)),
    };
    persistTransactions(state.transactions);
    emit();
  },
  matchMpesa(mpesaId: string, txnId: string | undefined) {
    state = {
      ...state,
      mpesa: state.mpesa.map((m) => (m.id === mpesaId ? { ...m, matchedTxnId: txnId } : m)),
    };
    persistMpesa(state.mpesa);
    emit();
  },
  signup(email: string, phone: string, password: string) {
    const existingUser = state.users.find(u => u.email === email || u.phone === phone);
    if (existingUser) {
      throw new Error("User already exists with this email or phone");
    }
    const user: User = {
      id: rid(),
      email,
      phone,
      password,
    };
    state = { ...state, users: [...state.users, user] };
    persistUsers(state.users);
    emit();
    return { success: true, user };
  },
  login(identifier: string, password: string) {
    const user = state.users.find(u => u.email === identifier || u.phone === identifier);
    if (!user) {
      throw new Error("Invalid credentials");
    }
    if (user.password !== password) {
      throw new Error("Invalid credentials");
    }
    const session: AuthSession = {
      user,
      token: rid(),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    };
    state = { ...state, session };
    persistSession(session);
    emit();
    return { success: true, session };
  },
  logout() {
    state = { ...state, session: null };
    persistSession(null);
    emit();
    return { success: true };
  },
  resetPassword(identifier: string, newPassword: string) {
    const userIndex = state.users.findIndex(u => u.email === identifier || u.phone === identifier);
    if (userIndex === -1) {
      throw new Error("User not found");
    }
    const updatedUsers = [...state.users];
    updatedUsers[userIndex] = { ...updatedUsers[userIndex], password: newPassword };
    state = { ...state, users: updatedUsers };
    persistUsers(updatedUsers);
    emit();
    return { success: true };
  },
};

function rid() { return Math.random().toString(36).slice(2, 10); }

// Seed functions removed - data now persists in localStorage
// For demo purposes, you can manually add transactions through the UI

export const TAG_PRESETS = ["#rent", "#restock", "#transport", "#supplies", "#utilities", "#wages", "#licenses", "#mpesa-fee"];
export function formatKES(n: number) {
  return "KES " + n.toLocaleString("en-KE", { minimumFractionDigits: 0 });
}
