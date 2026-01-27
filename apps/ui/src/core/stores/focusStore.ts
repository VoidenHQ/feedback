import { create } from "zustand";

interface FocusStore {
  isRenaming: boolean;
  setIsRenaming: (renaming: boolean) => void;
}

export const useFocusStore = create<FocusStore>((set) => ({
  isRenaming: false,
  setIsRenaming: (renaming) => set({ isRenaming: renaming }),
}));
