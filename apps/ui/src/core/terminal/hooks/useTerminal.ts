import { useMutation, useQueryClient } from "@tanstack/react-query";

export const useNewTerminalTab = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (panelId: string) => window.electron?.terminal.new(panelId),
    onSuccess: (variables) => {
      queryClient.invalidateQueries({ queryKey: ["panel:tabs", variables?.panelId] });
      queryClient.invalidateQueries({ queryKey: ["tab:content", variables?.panelId, variables?.tabId] });
    },
  });
};
