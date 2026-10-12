import { create } from "zustand";
import { persist } from "zustand/middleware";

type DisplayState = {
  categoryNameOnly: boolean;
  productNameOnly: boolean;
  set: (p: Partial<Pick<DisplayState, "categoryNameOnly" | "productNameOnly">>) => void;
};

export const useDisplay = create<DisplayState>()(
  persist(
    (set) => ({ categoryNameOnly: false, productNameOnly: false, set: (p) => set(p) }),
    { name: "ssc-display" },
  ),
);
