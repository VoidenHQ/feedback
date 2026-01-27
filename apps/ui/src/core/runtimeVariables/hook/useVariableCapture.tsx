
/**
 * useVariableCapture Hook
 *
 * Returns only the variable names (keys) from the active environment.
 * This is secure - no actual values are exposed to the UI.
 *
 * Use this for:
 * - Autocomplete suggestions in editor
 * - Variable validation
 * - Showing available variables to user
 *
 * @security Only returns variable names, not values
 */

import { useQuery} from "@tanstack/react-query";
const loadVoidVariablesKeys = async (): Promise<string[]> => {
  try {
    const keys = await window.electron?.variables.getKeys();
    return keys || [];
  } catch (error) {
    console.error("[useEnvironmentKeys] Error loading keys:", error);
    return [];
  }
}

export const useVoidVariables = () => {
  return useQuery({
    queryKey: ["void-variable-keys"],
    queryFn: loadVoidVariablesKeys,
    staleTime: 3000, // Keys don't change often, cache for 30s
  });
}