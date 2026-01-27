import { create } from "zustand";

interface ContentStore {
  content: string;
  updateContent: (content: string) => void;
}

export const useContentStore = create<ContentStore>((set) => ({
  content: "",
  updateContent: (content: string) => set({ content }),
}));