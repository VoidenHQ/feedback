import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export const loadEnv = async () => {
  return window.electron?.env.load();
};

export const useLoadEnv = () => {
  return useQuery({
    queryKey: ["env"],
    queryFn: async () => loadEnv(),
  });
};

export const useSetActiveEnv = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (envPath: string | null) => window.electron?.env.setActive(envPath),
    onSuccess: () => {
      // Invalidate all environment query keys to refresh all consumers
      queryClient.invalidateQueries({ queryKey: ["env"] });
      queryClient.invalidateQueries({ queryKey: ["environments"] });
      queryClient.invalidateQueries({ queryKey: ["environment-keys"] });
    },
  });
};
