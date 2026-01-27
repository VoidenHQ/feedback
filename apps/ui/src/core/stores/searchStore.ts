import { create } from "zustand";

interface SearchStore {
    isSearching: boolean;
    setIsSearching: (searching: boolean) => void;
}

export const useSearchStore = create<SearchStore>((set) => ({
    isSearching: false,
    setIsSearching: (searching) => set({ isSearching: searching }),
}));
