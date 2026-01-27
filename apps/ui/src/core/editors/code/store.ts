// codeMirrorStore.ts
import { create } from "zustand";
import { EditorView } from "@codemirror/view";
import { Extension } from "@codemirror/state";

interface CodeMirrorStore {
  editor: EditorView | null;
  editorContainer: HTMLElement | null;
  setEditor: (editor: EditorView | null) => void;
  setEditorContainer: (container: HTMLElement) => void;
  extensions: Extension[];
  setExtensions: (extensions: Extension[]) => void;
  registerExtension: (extension: Extension) => void;
}

export const useCodeMirrorStore = create<CodeMirrorStore>((set) => ({
  editor: null,
  editorContainer: null,
  setEditor: (editor: EditorView | null) => set({ editor }),
  setEditorContainer: (container: HTMLElement) => set({ editorContainer: container }),
  extensions: [],
  setExtensions: (extensions: Extension[]) => set({ extensions }),
  registerExtension: (extension: Extension) => set((state) => ({ extensions: [...state.extensions, extension] })),
}));
