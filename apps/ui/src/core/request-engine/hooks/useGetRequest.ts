/**
 * useGetRequest Hook
 *
 * Retrieves request data from cache
 */

import { UseQueryResult, useQuery, useQueryClient } from "@tanstack/react-query";
import { useGetActiveDocument } from "@/core/documents/hooks";
import { BaseResponse } from "@/core/types";

export const useGetRequest = () => {
  const { data: activeDocument } = useGetActiveDocument();

  return useQuery({
    queryKey: ["request", activeDocument?.id],
    queryFn: async () => {
      // This query only reads from cache, actual data is set by the orchestrator
      // If no data in cache, return null
      return null;
    },
    enabled: Boolean(activeDocument?.id),
    // This makes the query read from cache and update when cache changes
    staleTime: 0,
    gcTime: Infinity,
  });
};

export const useGetResponse = (): UseQueryResult<BaseResponse | undefined, Error> => {
  const { data: activeDocument } = useGetActiveDocument();

  return useQuery({
    queryKey: ["request", activeDocument?.id],
    enabled: false,
  });
};
