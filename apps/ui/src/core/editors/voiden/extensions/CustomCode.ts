import Code from "@tiptap/extension-code";
import { markInputRule, markPasteRule } from "@tiptap/core";

/**
 * Custom Code extension with backtick input rules
 * Allows toggling inline code with backticks (`)
 * - Single backtick enters code mode
 * - Typing another backtick (when in code mode) exits code mode
 */
export const CustomCode = Code.extend({
  addKeyboardShortcuts() {
    return {
      // Handle backtick key press
      "`": () => {
        const { state } = this.editor;
        const { $from } = state.selection;

        // Check if we're currently in a code mark
        const isInCode = state.storedMarks?.some(mark => mark.type.name === 'code') ||
                        $from.marks().some(mark => mark.type.name === 'code');

        if (isInCode) {
          // If in code mode, exit it and insert the backtick
          this.editor.commands.unsetMark('code');
          this.editor.commands.insertContent('`');
          return true;
        }

        // If not in code mode, enter it
        this.editor.commands.setMark('code');
        return false; // Let the backtick character be inserted
      },
    };
  },

  addInputRules() {
    return [
      markInputRule({
        find: /(?:^|\s)(`([^`]+)`)$/,
        type: this.type,
      }),
    ];
  },

  addPasteRules() {
    return [
      markPasteRule({
        find: /`([^`]+)`/g,
        type: this.type,
      }),
    ];
  },
});
