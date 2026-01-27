import { useQuery } from "@tanstack/react-query";

export const useGetAppState = () => {
  return useQuery({
    queryKey: ["app:state"],
    queryFn: async () => {
      return window.electron?.state.get();
    },
  });
};
