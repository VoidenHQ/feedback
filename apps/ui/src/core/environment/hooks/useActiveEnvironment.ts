/**
 * useActiveEnvironment Hook
 *
 * Returns the currently active environment variables as a flat Record<string, string>
 * This is the primary hook for getting environment variables for request substitution
 */

import { useMemo } from "react";
import { useEnvironments } from "./useEnvironments";

export const useActiveEnvironment = (): Record<string, string> | undefined => {
  const { data } = useEnvironments();

  return useMemo(() => {
    if (!data || !data.activeEnv || !data.data[data.activeEnv]) {
      return undefined;
    }

    // Return the variables from the active environment file
    return data.data[data.activeEnv];
  }, [data]);
};
