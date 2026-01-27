import { create } from "zustand";

interface AltStore {
  activeFile: string | undefined;
  setActiveFile: (file: string | undefined) => void;
}

export const useAltStore = create<AltStore>((set) => ({
  activeFile: undefined,
  setActiveFile: (file) => set({ activeFile: file }),
}));
