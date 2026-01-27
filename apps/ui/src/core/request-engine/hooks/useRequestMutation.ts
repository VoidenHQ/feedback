/**
 * useRequestMutation Hook
 *
 * Handles request-related mutations (DB operations)
 */

import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { Editor } from "@tiptap/core";
import { Doc, getRequest } from "@/core/request-engine/getRequestFromJson";
import { getBackendUrl } from "@/config.ts";

/**
 * Build request data from editor content
 * Note: Environment variables are NOT replaced here - they will be replaced
 * securely in Electron at Stage 3 of the pipeline
 */
export const useSetRequest = (editor: Editor | null) => {
  const params = useParams({ strict: false }) as { docId: string };

  return useQuery({
    queryKey: ["request-data", params.docId],
    queryFn: () => {
      if (!editor) return;
      // Don't pass environment - it should only be replaced in Electron (Stage 3)
      return getRequest(editor.getJSON() as Doc, params.docId, undefined);
    },
  });
};



export const useAddRequestToDb = () => {
  return useMutation({
    mutationFn: addRequestToDb,
  });
};
