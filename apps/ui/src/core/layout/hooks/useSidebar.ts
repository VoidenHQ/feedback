import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export const useGetSidebarTabs = (sidebarId: "left" | "right") => {
  return useQuery({
    queryKey: ["sidebar:tabs", sidebarId],
    queryFn: async () => window.electron?.sidebar.getTabs(sidebarId),
  });
};

export const useActivateSidebarTab = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ sidebarId, tabId }: { sidebarId: "left" | "right"; tabId: string }) =>
      window.electron?.sidebar.activateTab(sidebarId, tabId),
    onSuccess: ({ sidebarId }) => {
      queryClient.invalidateQueries({ queryKey: ["sidebar:tabs", sidebarId] });
    },
  });
};
