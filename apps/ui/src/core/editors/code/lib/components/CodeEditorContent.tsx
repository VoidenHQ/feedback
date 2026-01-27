import type { CodeEditor } from "../hooks/useCodeEditor.ts";

interface CodeEditorContentProps {
  editor: CodeEditor;
}

export function CodeEditorContent({ editor }: CodeEditorContentProps) {
  // TODO: optimizing rendering with react
  return <div ref={editor.editorRef} />;
}
