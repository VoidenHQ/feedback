import { DocumentState } from "@/types";
import { create } from "zustand";

const LOCAL_STORAGE_KEY = "experimental_filesystem";

interface FilesystemStore {
  enabled: boolean;
  toggle: () => void;
}

export const useFileSystemStore = create<FilesystemStore>((set) => ({
  enabled: localStorage.getItem(LOCAL_STORAGE_KEY) === "true",
  toggle: () => {
    const enabled = localStorage.getItem(LOCAL_STORAGE_KEY) === "true";
    localStorage.setItem(LOCAL_STORAGE_KEY, !enabled ? "true" : "false");
    set({ enabled: !enabled });
  },
}));

export interface DocumentStore {
  documents: Map<string, DocumentState>;
  setDocument: (path: string, content: string) => void;
  getDocument: (path: string) => DocumentState | undefined;
  saveDocument: (path: string) => void;
  removeDocument: (path: string) => void;
  setError: (path: string, error: Error) => void;
}

export const useDocumentStore = create<DocumentStore>((set, get) => ({
  documents: new Map(),

  setDocument: (path: string, content: string) => {
    const documents = new Map(get().documents);
    const existing = documents.get(path);

    documents.set(path, {
      content,
      savedContent: existing?.savedContent ?? content,
      lastModified: Date.now(),
      error: null,
    });

    set({ documents });
  },

  getDocument: (path: string) => {
    return get().documents.get(path);
  },

  saveDocument: (path: string) => {
    const documents = new Map(get().documents);
    const doc = documents.get(path);
    if (doc) {
      documents.set(path, {
        ...doc,
        savedContent: doc.content,
        lastModified: Date.now(),
      });
      set({ documents });
    }
  },

  removeDocument: (path: string) => {
    const documents = new Map(get().documents);
    documents.delete(path);
    set({ documents });
  },

  setError: (path: string, error: Error) => {
    const documents = new Map(get().documents);
    const existing = documents.get(path);
    if (existing) {
      documents.set(path, {
        ...existing,
        error,
      });
      set({ documents });
    }
  },
}));