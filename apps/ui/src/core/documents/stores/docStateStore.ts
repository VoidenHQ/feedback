import { create } from "zustand";
import { persist } from "zustand/middleware";

interface DocState {
  updatedDocs: string[];
  resetKey: number;
  setUpdatedDocs: (docs: string) => void;
  resetDocs: () => void;
  saveDoc: (docId: string) => void;
  setResetKey: (key: number) => void;
  resetAfterImportKey: number;
  setResetAfterImportKey: (key: number) => void;
}

export const useDocStateStore = create(
  persist<DocState>(
    (set, get) => ({
      resetKey: 0,
      updatedDocs: [],
      setUpdatedDocs: (docId: string) => {
        !get().updatedDocs.includes(docId) && set({ updatedDocs: [...get().updatedDocs, docId] });
      },
      resetDocs: () => set({ updatedDocs: [] }),
      saveDoc: (docId: string) => {
        set({ updatedDocs: [...get().updatedDocs.filter((id) => id !== docId)] });
      },
      setResetKey: (key: number) => set({ resetKey: key }),
      resetAfterImportKey: 0,
      setResetAfterImportKey: (key: number) => set({ resetAfterImportKey: key })
    }),
    {
      name: "doc-state-store", // unique name for storage
    },
  ),
);

export const useDocState = () => {
  const docState = useDocStateStore((state) => ({
    updatedDocs: state.updatedDocs,
    setUpdatedDocs: state.setUpdatedDocs,
    resetDocs: state.resetDocs,
    saveDoc: state.saveDoc,
    setResetKey: state.setResetKey,
    resetKey: state.resetKey,
    resetAfterImportKey: state.resetAfterImportKey,
    setResetAfterImportKey: state.setResetAfterImportKey,
  }));
  return docState;
};
