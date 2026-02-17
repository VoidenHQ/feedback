import { jsonCLinter } from "@/utils/jsonc.ts";
import { javascript } from "@codemirror/lang-javascript";
import { yaml } from "@codemirror/lang-yaml";
import { linter } from "@codemirror/lint";
import { jsonc } from "@shopify/lang-jsonc";
import { langs } from "@uiw/codemirror-extensions-langs";
import { EditorView } from "codemirror";

export const renderLang = (lang: string) => {
  switch (lang) {
    case "javascript":
      return [javascript()];
    case "json":
    case "jsonc":
      // Using jsonc parser - template expressions will be handled by variable highlighting
      return [jsonc(), linter(jsonCLinter)];
    case "xml":
      return [langs.xml()];
    case "html":
      return [langs.html()];
    case "csharp":
      return [langs.csharp()];
    case "yaml":
      return [yaml()];
    case "python":
      return [langs.python()];
    case "text":
    case "plaintext":
      return []; // No syntax highlighting for plain text
    default:
      return [javascript()];
  }
};

export const toggleComment = (view: EditorView) => {
  const { state, dispatch } = view;
  const selection = state.selection.main;

  if (selection.empty) {
    const line = state.doc.lineAt(selection.from);
    const lineText = line.text;

    const commented = lineText.trim().startsWith("//");

    const updatedText = commented ? lineText.replace(/^(\s*)\/\/\s?/, "$1") : `// ${lineText.trim()}`;

    const changes = {
      from: line.from,
      to: line.to,
      insert: updatedText,
    };

    dispatch(state.update({ changes }));
    return true;
  }

  const selectedText = state.doc.sliceString(selection.from, selection.to);
  const lines = selectedText.split("\n");

  const commented = lines.every((line) => line.trim().startsWith("//"));

  const updatedText = commented
    ? selectedText.replace(/(^|\n)(\s*)\/\/\s?/g, "$1$2") // Uncomment
    : selectedText.replace(/(^|\n)(\s*)/g, "$1$2//"); // Comment

  const changes = {
    from: selection.from,
    to: selection.to,
    insert: updatedText,
  };

  dispatch(state.update({ changes }));
  return true;
};
