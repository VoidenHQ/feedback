/**
 * Feature Flags Store
 *
 * Manages feature flags for gradual rollout of new features.
 * Flags can be toggled via localStorage for testing.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface FeatureFlagsState {
  // Secure Environment: Use new secure API for environment variable replacement
  // When true: Variables replaced in Electron (secure)
  // When false: Variables replaced in UI (old, insecure)
  useSecureEnvironment: boolean;

  // Hybrid Pipeline: Use hybrid pipeline architecture
  // When true: Pipeline split between UI (1,2,5,8) and Electron (3,4,6,7)
  // When false: Use sendRequestSecure (Phase 2 implementation)
  useHybridPipeline: boolean;

  // Toggle methods
  setUseSecureEnvironment: (enabled: boolean) => void;
  setUseHybridPipeline: (enabled: boolean) => void;

  // Reset all flags to defaults
  resetFlags: () => void;
}

const DEFAULT_FLAGS = {
  // Start with secure environment enabled by default
  // Users can disable for testing/debugging
  useSecureEnvironment: true,

  // Hybrid pipeline enabled by default (Phase 3)
  // Falls back to sendRequestSecure if disabled
  useHybridPipeline: true,
};

export const useFeatureFlags = create<FeatureFlagsState>()(
  persist(
    (set) => ({
      ...DEFAULT_FLAGS,

      setUseSecureEnvironment: (enabled) => set({ useSecureEnvironment: enabled }),
      setUseHybridPipeline: (enabled) => set({ useHybridPipeline: enabled }),

      resetFlags: () => set(DEFAULT_FLAGS),
    }),
    {
      name: "voiden-feature-flags",
    },
  ),
);

/**
 * Helper function to check if secure environment is enabled
 */
export const isSecureEnvironmentEnabled = (): boolean => {
  return useFeatureFlags.getState().useSecureEnvironment;
};

/**
 * Console helper for toggling feature flags during development
 *
 * Usage in browser console:
 * - window.toggleSecureEnv(false) // Disable secure environment
 * - window.toggleSecureEnv(true)  // Enable secure environment
 * - window.toggleHybridPipeline(false) // Disable hybrid pipeline
 * - window.toggleHybridPipeline(true)  // Enable hybrid pipeline
 */
if (typeof window !== "undefined") {
  (window as any).toggleSecureEnv = (enabled: boolean) => {
    useFeatureFlags.getState().setUseSecureEnvironment(enabled);
  };

  (window as any).toggleHybridPipeline = (enabled: boolean) => {
    useFeatureFlags.getState().setUseHybridPipeline(enabled);
  };

  (window as any).resetFeatureFlags = () => {
    useFeatureFlags.getState().resetFlags();
  };

  // Log current state on load
}
