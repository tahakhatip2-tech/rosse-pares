import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItem {
  id: string; // product id or variant id
  productId: string;
  nameAr: string;
  nameEn: string;
  price: number;
  qty: number;
  image?: string;
  unit?: string;
}

interface CartStore {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "qty"> & { qty?: number }) => void;
  removeItem: (id: string) => void;
  updateQty: (id: string, qty: number) => void;
  clearCart: () => void;
  getItemCount: () => number;
  getSubtotal: () => number;
  getTax: () => number;
  getTotal: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) => {
        const currentItems = get().items;
        const existingIndex = currentItems.findIndex((i) => i.id === item.id);
        const addQty = item.qty ?? 1;

        if (existingIndex > -1) {
          const updated = [...currentItems];
          updated[existingIndex] = {
            ...updated[existingIndex],
            qty: updated[existingIndex].qty + addQty,
          };
          set({ items: updated });
        } else {
          set({ items: [...currentItems, { ...item, qty: addQty }] });
        }
      },

      removeItem: (id) => {
        set({ items: get().items.filter((i) => i.id !== id) });
      },

      updateQty: (id, qty) => {
        if (qty <= 0) {
          get().removeItem(id);
          return;
        }
        set({
          items: get().items.map((i) => (i.id === id ? { ...i, qty } : i)),
        });
      },

      clearCart: () => set({ items: [] }),

      getItemCount: () => {
        return get().items.reduce((acc, item) => acc + item.qty, 0);
      },

      getSubtotal: () => {
        return get().items.reduce((acc, item) => acc + item.price * item.qty, 0);
      },

      getTax: () => {
        return Number((get().getSubtotal() * 0.16).toFixed(3)); // 16% sales tax
      },

      getTotal: () => {
        return Number((get().getSubtotal() + get().getTax()).toFixed(3));
      },
    }),
    {
      name: "rozeparees-cart-storage",
    }
  )
);
