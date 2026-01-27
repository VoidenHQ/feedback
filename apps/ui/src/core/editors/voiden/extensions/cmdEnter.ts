import { Extension } from "@tiptap/core";

export const cmdEnter = Extension.create({
  addKeyboardShortcuts(this) {
    return {
      "Mod-Enter": () => {
        // Prevent default behavior (inserting newline)
        // The actual request execution is handled by window-level keydown handler in VoidenEditor
        return true; // Return true to prevent default and stop propagation
      },
    };
  },
});
