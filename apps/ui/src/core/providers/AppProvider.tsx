import { useGetAppState } from "@/core/state/hooks";

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const { data } = useGetAppState();

  if (!data) {
    return <div>Loading interfaces goes here</div>;
  }

  return children;
};
