import { Extension, InputRule } from "@tiptap/core";
import { TextSelection } from "prosemirror-state";

// Mapping of opening to closing brackets
const bracketPairs = {
  "{": "}",
  "(": ")",
  "[": "]",
};

export const autoCloseBrackets = Extension.create({
  name: "autoCloseBrackets",

  addInputRules() {
    return [
      new InputRule({
        find: /(\{|\(|\[)$/,
        handler: ({ state, match, range }) => {
          const { tr } = state;
          const openBracket = match[0];
          const closeBracket = bracketPairs[openBracket];

          // If for any reason the closing bracket is not found, do nothing.
          if (!closeBracket) {
            return tr;
          }

          // Remove the typed opening bracket.
          tr.delete(range.from, range.to);

          // Insert the auto-closed pair.
          const text = openBracket + closeBracket;
          tr.insertText(text, range.from);

          // Place the cursor between the brackets.
          tr.setSelection(TextSelection.create(tr.doc, range.from + 1));

          return tr;
        },
      }),
    ];
  },
});
