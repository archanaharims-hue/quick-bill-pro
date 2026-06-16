import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartItem = {
  productId: string | null;
  name: string;
  price: number;
  quantity: number;
};

type CartState = {
  items: CartItem[];
  add: (item: Omit<CartItem, "quantity">) => void;
  setQty: (productId: string | null, qty: number) => void;
  setPrice: (productId: string | null, price: number) => void;
  setName: (productId: string | null, name: string) => void;
  remove: (productId: string | null) => void;
  clear: () => void;
};

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      add: (item) =>
        set((s) => {
          const existing = s.items.find((i) => i.productId === item.productId);
          if (existing) {
            return {
              items: s.items.map((i) =>
                i.productId === item.productId ? { ...i, quantity: i.quantity + 1 } : i
              ),
            };
          }
          return { items: [...s.items, { ...item, quantity: 1 }] };
        }),
      setQty: (productId, qty) =>
        set((s) => ({
          items: qty <= 0
            ? s.items.filter((i) => i.productId !== productId)
            : s.items.map((i) => (i.productId === productId ? { ...i, quantity: qty } : i)),
        })),
      setPrice: (productId, price) =>
        set((s) => ({
          items: s.items.map((i) => (i.productId === productId ? { ...i, price } : i)),
        })),
      setName: (productId, name) =>
        set((s) => ({
          items: s.items.map((i) => (i.productId === productId ? { ...i, name } : i)),
        })),
      remove: (productId) =>
        set((s) => ({ items: s.items.filter((i) => i.productId !== productId) })),
      clear: () => set({ items: [] }),
    }),
    { name: "pos-cart" }
  )
);

export const selectCartCount = (s: CartState) =>
  s.items.reduce((sum, i) => sum + i.quantity, 0);
export const selectCartSubtotal = (s: CartState) =>
  s.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
