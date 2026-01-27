/**
 * Environment Hooks
 *
 * Unified environment management system for Voiden
 * - Load .env files from the project
 * - Get active environment variables for substitution
 * - Set active environment file
 */

export { useEnvironments } from "./useEnvironments";
export { useActiveEnvironment } from "./useActiveEnvironment";
export { useSetActiveEnvironment } from "./useSetActiveEnvironment";
export { useEnvironmentKeys } from "./useEnvironmentKeys";

export type { EnvironmentData } from "./useEnvironments";

// Deprecated: use useEnvironments instead
export { useLoadEnv, useSetActiveEnv } from "./useEnvironment";
