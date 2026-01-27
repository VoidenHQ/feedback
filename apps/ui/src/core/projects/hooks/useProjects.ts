import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export const getProjects = async () => {
  const projects = await window.electron?.state.getProjects();
  return projects;
};

export const useGetProjects = () => {
  return useQuery({
    queryKey: ["projects"],
    queryFn: getProjects,
  });
};

export const useOpenProject = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (projectPath: string) => window.electron?.state.openProject(projectPath),
    onSuccess:()=>{
      queryClient.invalidateQueries({queryKey:['environments']})
    }
  });
};


export const removeProjectFromList = async (projectPath: string) => {
  await window.electron?.state.removeProjectFromList(projectPath);
};

export const useSetActiveProject = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (projectPath: string) => window.electron?.state.setActiveProject(projectPath),
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["app:state"] });
      queryClient.invalidateQueries({ queryKey: ["panel:tabs"] });
      queryClient.invalidateQueries({ queryKey: ["files:tree"] });
      queryClient.invalidateQueries({ queryKey: ["git:branches"] });
    },
  });
};

export const useCloseActiveProject = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => window.electron?.state.emptyActiveProject(),
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["app:state"] });
      queryClient.invalidateQueries({ queryKey: ["panel:tabs"] });
      queryClient.invalidateQueries({ queryKey: ["files:tree"] });
      queryClient.invalidateQueries({ queryKey: ["git:branches"] });
    },
  });
};
