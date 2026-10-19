import { create } from "zustand";

export type CartItem = {
  id: string;
  name: string;
  price: number;
  stock: number;
  quantity: number;
};

export type AddableProduct = {
  id: string;
  name: string;
  price: number;
  stock: number;
};

type CartStore = {
  items: CartItem[];
  addToCart: (product: AddableProduct) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  getTotalPrice: () => number;
};

export const useCart = create<CartStore>((set, get) => ({
  items: [],

  addToCart: (product) =>
    set((state) => {
      if (product.stock <= 0) return state;

      const existing = state.items.find((item) => item.id === product.id);

      if (existing) {
        if (existing.quantity >= product.stock) return state;
        return {
          items: state.items.map((item) =>
            item.id === product.id
              ? { ...item, quantity: item.quantity + 1 }
              : item,
          ),
        };
      }

      return {
        items: [...state.items, { ...product, quantity: 1 }],
      };
    }),

  removeFromCart: (id) =>
    set((state) => ({
      items: state.items.filter((item) => item.id !== id),
    })),

  updateQuantity: (id, quantity) =>
    set((state) => ({
      items: state.items.map((item) => {
        if (item.id !== id) return item;
        const clamped = Math.min(Math.max(1, Math.floor(quantity)), item.stock);
        return { ...item, quantity: clamped };
      }),
    })),

  clearCart: () => set({ items: [] }),

  getTotalPrice: () =>
    get().items.reduce((total, item) => total + item.price * item.quantity, 0),
}));