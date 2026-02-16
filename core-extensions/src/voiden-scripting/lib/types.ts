/**
 * Type definitions for the Voiden Scripting extension
 */

export type ScriptLanguage = "javascript" | "python";

export interface VdRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: any;
  queryParams: Record<string, string>;
  pathParams: Record<string, string>;
}

export interface VdResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: any;
  time: number;
  size: number;
}

export interface VdEnv {
  get: (key: string) => Promise<string | undefined>;
}

export interface VdVariables {
  get: (key: string) => Promise<any>;
  set: (key: string, value: any) => Promise<void>;
}

export interface VdApi {
  request: VdRequest;
  response?: VdResponse;
  env: VdEnv;
  variables: VdVariables;
  log: (...args: any[]) => void;
  cancel: () => void;
}

export interface ScriptLog {
  level: string;
  args: any[];
}

export interface ScriptExecutionResult {
  success: boolean;
  logs: ScriptLog[];
  error?: string;
  cancelled: boolean;
  modifiedRequest?: VdRequest;
  modifiedResponse?: VdResponse;
}
