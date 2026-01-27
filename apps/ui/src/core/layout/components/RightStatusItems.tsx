import { useGetActiveDocument } from "@/features/filesystem/api";
import { useVoidenEditorStore } from "@/core/editors/voiden/VoidenEditor";
import { useCodeMirrorStore } from "@/core/editors/code/store";
import { useState, useEffect } from "react";
import { EditorView } from "@codemirror/view";
import { StateEffect } from "@codemirror/state";

interface Stats {
  words: number;
  chars: number;
  line: number;
  col: number;
}

export const RightStatusItems = () => {
  const { data: activeDocument } = useGetActiveDocument();
  const voidenEditor = useVoidenEditorStore((state) => state.editor);
  const codeEditor = useCodeMirrorStore((state) => state.editor);
  const [stats, setStats] = useState<Stats>({ words: 0, chars: 0, line: 1, col: 1 });

  useEffect(() => {
    if (!activeDocument) return undefined;
    const isVoidenDoc = activeDocument.endsWith(".void");
    const editor = isVoidenDoc ? voidenEditor : codeEditor;

    if (!editor) return undefined;

    if (isVoidenDoc && voidenEditor) {
      // Handle Voiden editor updates
      const updateHandler = () => {
        setStats({
          words: voidenEditor
            .getText()
            .split(/\s+/)
            .filter((word) => word.length > 0).length,
          chars: voidenEditor.state.doc.nodeSize,
          line: 1,
          col: 1,
        });
      };

      updateHandler(); // Initial calculation
      voidenEditor.on("update", updateHandler);

      // Return cleanup function
      return () => {
        voidenEditor.off("update", updateHandler);
      };
    } else if (codeEditor) {
      // For CodeMirror, calculate initial stats
      const updateStats = () => {
        const pos = codeEditor.state.selection.main.head;
        const line = codeEditor.state.doc.lineAt(pos);

        setStats({
          words: codeEditor.state.doc
            .toString()
            .split(/\s+/)
            .filter((word) => word.length > 0).length,
          chars: codeEditor.state.doc.length,
          line: line.number,
          col: pos - line.from + 1,
        });
      };

      // Set up CodeMirror update listener
      const updateListener = EditorView.updateListener.of(() => {
        updateStats();
      });

      // Add the extension
      codeEditor.dispatch({
        effects: StateEffect.appendConfig.of(updateListener),
      });

      updateStats(); // Initial calculation

      // Return cleanup function
      return () => {
        // Remove the extension
        codeEditor.dispatch({
          effects: StateEffect.reconfigure.of([]),
        });
      };
    }

    return undefined; // Explicit return for when no editor is active
  }, [voidenEditor, codeEditor, activeDocument]);

  if (!activeDocument || (!voidenEditor && !codeEditor)) return null;

  const isVoidenDoc = activeDocument.endsWith(".void");

  if (isVoidenDoc) {
    return (
      <div className="flex items-center space-x-2 h-full">
        <div className="text-sm flex items-center space-x-2 h-full">
          <span>{stats.words} words</span>
          <span>{stats.chars} characters</span>
          <span>Voiden</span>
        </div>
      </div>
    );
  }

  const fileType = activeDocument.split(".").pop()?.toUpperCase() || "TEXT";

  return (
    <div className="flex items-center space-x-2 h-full">
      <div className="text-sm flex items-center space-x-2 h-full">
        <span>
          {stats.line}:{stats.col}
        </span>
        <span>{fileType}</span>
      </div>
    </div>
  );
};
