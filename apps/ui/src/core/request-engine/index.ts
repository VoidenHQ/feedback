/**
 * Request Engine
 *
 * Core HTTP request execution system for Voiden
 */

// Hooks
export * from "./hooks";

// Components
export { SendRequest } from "./components/SendRequest";

// Core functions
export { sendRequest, replaceBaseUrl, updateLocalStorageValue, replacePathParams } from "./requestState";
export type { Electron, Environment, EnvironmentVariable } from "./requestState";

export { getRequest, replaceEnvVariables, replaceEnvVariablesInRequest, getRequestWithPathParams } from "./getRequestFromJson";
export type { Doc } from "./getRequestFromJson";

// Utils
export { processFileNodes, attachFileDataToNodes } from "./utils/nodeProcessing";
