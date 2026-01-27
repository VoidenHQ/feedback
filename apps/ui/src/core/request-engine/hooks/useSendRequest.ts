/**
 * useSendRestRequest Hook
 *
 * Handles sending HTTP/REST requests from the editor content
 */

import { useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Editor } from "@tiptap/core";
import { useGetActiveDocument } from "@/core/documents/hooks";
import { useActiveEnvironment } from "@/core/environment/hooks";
import { usePanelStore } from "@/core/stores/panelStore";
import { useResponseStore } from "../stores/responseStore";
import { mapErrorToMessage } from "../utils/errorMessages";
import { requestOrchestrator } from "../requestOrchestrator";

export const  useSendRestRequest = (editor: Editor) => {
  const { data: activeDocument } = useGetActiveDocument();
  const { openRightPanel } = usePanelStore();
  const activeEnv = useActiveEnvironment();
  const abortControllerRef = useRef<AbortController | null>(null);
  const queryClient = useQueryClient();
  const context = useQuery({
    queryKey: ["request", activeDocument?.id],
    queryFn: async () => {
      openRightPanel();
      useResponseStore.getState().setLoading(true, activeDocument?.id);
      abortControllerRef.current = new AbortController();
      try {
        // Use the orchestrator which will invoke plugin handlers for building and processing
        const response = await requestOrchestrator.executeRequest(
          editor,
          activeEnv,
          abortControllerRef.current.signal
        );
        queryClient.invalidateQueries({ queryKey: ["void-variable-keys"] });
        return response;
      } catch (error) {
        const friendlyMessage = mapErrorToMessage(error);
        useResponseStore.getState().setError(activeDocument?.id || null, friendlyMessage);

        if (error instanceof Error && error.name === "AbortError") {
          throw new Error("Request was cancelled");
        }

        throw error;
      }
    },
    enabled: false, // Manual trigger only
  });

  return {
    ...context,
    cancelRequest: () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    },
  };
};
