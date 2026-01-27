import { useState, useEffect, useRef } from "react";
import { EditorView } from "@codemirror/view";
import { EditorState, Extension } from "@codemirror/state";
// Cloud auth disabled in desktop mode
// import { useSessionMode } from "@/features/document/stores/useSessionModeStore";
import { useDocState } from "@/core/documents/stores";
import { useParams } from "@tanstack/react-router";

export interface CodeEditor {
  editorRef: React.RefObject<HTMLDivElement>;
  viewRef: React.RefObject<EditorView>;
  content: string | undefined;
}

export const useCodeEditor = (
  {
    content,
    extensions,
  }: {
    content?: string;
    extensions: Extension[];
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dependencies: any[],
) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [contentState, setContentState] = useState(content);
  // Desktop mode always tracks document state
  const isSessionMode = true;
  const docState = useDocState();
  const { docId } = useParams({ strict: false }) as { docId: string };

  useEffect(() => {
    if (editorRef.current && !viewRef.current) {
      const state = EditorState.create({
        doc: content ?? "",
        extensions: [
          ...extensions,
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              isSessionMode && docState.setUpdatedDocs(docId);
              setContentState(update.state.doc.toString());
            }
          }),
        ],
      });

      viewRef.current = new EditorView({
        state,
        parent: editorRef.current,
      });
    }

    return () => {
      viewRef.current?.destroy();
      viewRef.current = null;
    };
  }, dependencies);

  return {
    content: contentState,
    editorRef,
    viewRef,
  };
};
