// CodeMirrorProvider.tsx
import { useEffect } from "react";
import { useGetActiveDocument, useReadFile, useSetTabDirty } from "@/core/file-system/hooks";
import { useDocumentStore } from "@/core/file-system/stores";
import { usePluginStore } from "@/plugins";
import { EditorView } from "codemirror";
import { useCodeMirrorStore } from "./store";
import { voidenTheme, getLinter } from "./extensions";
import { getLanguageExtension } from "./extensions";
import { getBaseExtensions } from "./extensions";
import { Extension } from "@uiw/react-codemirror";

interface CodeMirrorProviderProps {
  children: React.ReactNode;
}

export const CodeMirrorProvider = ({ children }: CodeMirrorProviderProps) => {
  const { data: activeFilePath } = useGetActiveDocument();
  const { data: activeDocument } = useReadFile();
  const isInitialized = usePluginStore((state) => state.isInitialized);
  const { mutate: setTabDirty } = useSetTabDirty();

  // Just handle syncing document state
  useEffect(() => {
    if (activeFilePath?.endsWith(".void") || !activeFilePath) return;

    if (isInitialized) {
      const docState = useDocumentStore.getState().getDocument(activeFilePath);

      const baseExtensions = getBaseExtensions();
      const languageExtension = getLanguageExtension(activeFilePath);
      const linterExtension = getLinter(activeFilePath);
      const allExtensions: Extension[] = [...baseExtensions, languageExtension, linterExtension, voidenTheme];

      const editor = new EditorView({
        doc: docState?.content ?? "",
        extensions: [
          ...allExtensions,
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              const content = update.state.doc.toString();
              useDocumentStore.getState().setDocument(activeFilePath, content);
              const docState = useDocumentStore.getState().getDocument(activeFilePath);
              if (docState) {
                setTabDirty({
                  filePath: activeFilePath,
                  isDirty: content !== docState.savedContent,
                });
              }
            }
          }),
        ],
        // parent: editorRef.current,
      });

      useCodeMirrorStore.setState({ editor });

      return () => {
        useCodeMirrorStore.getState().editor?.destroy();
      };
    }
  }, [isInitialized, activeDocument]);

  return children;
};
