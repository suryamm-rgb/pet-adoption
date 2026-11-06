"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from "react";

export type CartLine = { productId: string; name: string; price: number; qty: number };
type CartValue = { lines: CartLine[]; add: (l: Omit<CartLine, "qty">) => void; setQty: (id: string, qty: number) => void; clear: () => void; count: number; total: number };
const CartContext = createContext<CartValue | null>(null);

const KEY = "pawstay-cart";
const EMPTY: CartLine[] = [];
let cachedRaw: string | null = null;
let cached: CartLine[] = EMPTY;
const listeners = new Set<() => void>();

function read(): CartLine[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {}
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      cached = raw ? (JSON.parse(raw) as CartLine[]) : EMPTY;
    } catch {
      cached = EMPTY;
    }
  }
  return cached;
}
function write(lines: CartLine[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(lines));
  } catch {}
  listeners.forEach((l) => l());
}
function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const lines = useSyncExternalStore(subscribe, read, () => EMPTY);
  const add = useCallback((l: Omit<CartLine, "qty">) => {
    const cur = read();
    write(cur.some((c) => c.productId === l.productId) ? cur.map((c) => (c.productId === l.productId ? { ...c, qty: Math.min(c.qty + 1, 20) } : c)) : [...cur, { ...l, qty: 1 }]);
  }, []);
  const setQty = useCallback((id: string, qty: number) => {
    const cur = read();
    write(qty <= 0 ? cur.filter((c) => c.productId !== id) : cur.map((c) => (c.productId === id ? { ...c, qty: Math.min(qty, 20) } : c)));
  }, []);
  const clear = useCallback(() => write(EMPTY), []);

  const value = useMemo<CartValue>(
    () => ({ lines, add, setQty, clear, count: lines.reduce((s, l) => s + l.qty, 0), total: lines.reduce((s, l) => s + l.qty * l.price, 0) }),
    [lines, add, setQty, clear],
  );
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
