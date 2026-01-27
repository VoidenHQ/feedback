/**
 * useSetActiveEnvironment Hook
 *
 * Mutation hook to set the active environment file path
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";

export const useSetActiveEnvironment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (envPath: string | null) => {
      return window.electron?.env.setActive(envPath);
    },
    onSuccess: (_, envPath) => {
      // Invalidate all environment query keys to refresh all consumers
      queryClient.invalidateQueries({ queryKey: ["environments"] });
      queryClient.invalidateQueries({ queryKey: ["env"] });
      queryClient.invalidateQueries({ queryKey: ["environment-keys"] });
    },
  });
};
