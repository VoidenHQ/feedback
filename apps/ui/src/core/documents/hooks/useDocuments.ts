import { useQuery } from "@tanstack/react-query";
import { useGetAppState } from "@/core/state/hooks";
import { useGetPanelTabs } from "@/core/layout/hooks";
import { useVoidenEditorStore } from "@/core/editors/voiden/VoidenEditor";
import { parseMarkdown } from "@/core/editors/voiden/markdownConverter";

export const useGetActiveDocument = () => {
  const { data: panelData, isLoading, error } = useGetPanelTabs("main"); // assuming active docs are in the "main" panel

  const activeDocument = panelData?.tabs?.find((tab: any) => tab.id === panelData.activeTabId && tab.type === "document") ?? null;

  return { data: activeDocument, isLoading, error };
};

export const useGetApyFiles = () => {
  const { data: appState } = useGetAppState();
  const activeDirectory = appState?.activeDirectory;
  return useQuery({
    queryKey: ["voiden-wrapper:apyFiles", activeDirectory],
    queryFn: async () => {
      const editor = useVoidenEditorStore.getState().editor;
      if (!editor) return [];
      const docs = await window.electron?.voiden.getApyFiles(activeDirectory);
      // Map the raw documents to include the parsed ProseMirror JSON.
      const parsedDocuments = docs.map((doc) => ({
        ...doc,
        pmJSON: parseMarkdown(doc.content, editor.schema),
      }));

      return parsedDocuments;
    },
  });
};
