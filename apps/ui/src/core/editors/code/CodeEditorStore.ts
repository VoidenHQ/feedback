import { create } from "zustand";
import { EditorView } from "@codemirror/view";

interface CodeEditorState {
  activeEditor: {
    tabId: string | null;
    content: string;
    source: string | null;
    panelId: string | null;
    editor: EditorView | null;
  };
  setActiveEditor: (tabId: string, content: string, source: string, panelId: string) => void;
  clearActiveEditor: () => void;
  updateContent: (content: string) => void;
  setEditor: (editor: EditorView) => void;
}

export const useCodeEditorStore = create<CodeEditorState>((set) => ({
  activeEditor: {
    tabId: null,
    content: "",
    source: null,
    panelId: null,
    editor: null,
  },
  setActiveEditor: (tabId, content, source, panelId) =>
    set((state) => ({
      activeEditor: {
        ...state.activeEditor,
        tabId,
        content,
        source,
        panelId,
      },
    })),
  clearActiveEditor: () => set({ activeEditor: { tabId: null, content: "", source: null, panelId: null, editor: null } }),
  updateContent: (content) =>
    set((state) => ({
      activeEditor: { ...state.activeEditor, content },
    })),
  setEditor: (editor) =>
    set((state) => ({
      activeEditor: { ...state.activeEditor, editor },
    })),
}));

// Export globally for extensions to access
if (typeof window !== 'undefined') {
  (window as any).__codeEditorStore = useCodeEditorStore;
}
