import { saveFileUtil } from "@/core/file-system/hooks";
import { Extension } from "@tiptap/core";
import { useVoidenEditorStore } from "./VoidenEditor";

export const saveShortcutFn = () => {
  const editor = useVoidenEditorStore.getState().editor;
  if (!editor) return;
  const content = JSON.stringify(editor.getJSON());
  const path = useVoidenEditorStore.getState().filePath;
  const panelId = editor.storage.panelId;
  const tabId = editor.storage.tabId;

  // Use queryClient directly
  saveFileUtil(path, content, panelId, tabId, editor.schema).catch(console.error);
};

export const SaveShortcut = Extension.create({
  name: "saveShortcut",

  addKeyboardShortcuts() {
    return {
      "Mod-s": () => {
        saveShortcutFn();
        return true;
      },
    };
  },
});
