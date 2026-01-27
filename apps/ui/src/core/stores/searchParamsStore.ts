import create from 'zustand';

interface SearchStore {
    term: string
    matchCase: boolean
    matchWholeWord: boolean
    useRegex: boolean
    setTerm: (t: string) => void
    setMatchCase: (c: boolean) => void
    setMatchWholeWord: (w: boolean) => void
    setUseRegex: (r: boolean) => void
}
export const useSearchStore = create<SearchStore>(set => ({
    term: '',
    matchCase: false,
    matchWholeWord: false,
    useRegex: false,
    setTerm: term => set({ term }),
    setMatchCase: matchCase => set({ matchCase }),
    setMatchWholeWord: matchWholeWord => set({ matchWholeWord }),
    setUseRegex: useRegex => set({ useRegex }),
}))