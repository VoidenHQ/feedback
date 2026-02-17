/**
 * Builds the `voiden` API object from pipeline state and applies mutations back.
 */

import type { VdRequest, VdResponse } from './types';

/**
 * Build VdRequest from pipeline's RestApiRequestState.
 * Converts array-based headers/params to Record-based for script convenience.
 */
export function buildVdRequest(requestState: any): VdRequest {
  const headers: Record<string, string> = {};
  (requestState.headers || [])
    .filter((h: any) => h.enabled !== false)
    .forEach((h: any) => { headers[h.key] = h.value; });

  const queryParams: Record<string, string> = {};
  (requestState.queryParams || [])
    .filter((p: any) => p.enabled !== false)
    .forEach((p: any) => { queryParams[p.key] = p.value; });

  const pathParams: Record<string, string> = {};
  (requestState.pathParams || [])
    .filter((p: any) => p.enabled !== false)
    .forEach((p: any) => { pathParams[p.key] = p.value; });

  return {
    url: requestState.url || '',
    method: requestState.method || 'GET',
    headers,
    body: requestState.body,
    queryParams,
    pathParams,
  };
}

/**
 * Apply VdRequest modifications back to the pipeline's RestApiRequestState.
 */
export function applyVdRequestToState(vdRequest: VdRequest, requestState: any): void {
  requestState.url = vdRequest.url;
  requestState.method = vdRequest.method;

  requestState.headers = Object.entries(vdRequest.headers).map(([key, value]) => ({
    key,
    value,
    enabled: true,
  }));

  requestState.queryParams = Object.entries(vdRequest.queryParams).map(([key, value]) => ({
    key,
    value,
    enabled: true,
  }));

  requestState.pathParams = Object.entries(vdRequest.pathParams).map(([key, value]) => ({
    key,
    value,
    enabled: true,
  }));

  requestState.body = vdRequest.body;
}

/**
 * Build VdResponse from pipeline's RestApiResponseState.
 */
export function buildVdResponse(responseState: any): VdResponse {
  const headers: Record<string, string> = {};
  (responseState.headers || []).forEach((h: any) => {
    headers[h.key] = h.value;
  });

  return {
    status: responseState.status,
    statusText: responseState.statusText,
    headers,
    body: responseState.body,
    time: responseState.timing?.duration ?? 0,
    size: responseState.bytesContent ?? 0,
  };
}

/**
 * Apply VdResponse modifications back to the pipeline's RestApiResponseState.
 */
export function applyVdResponseToState(vdResponse: VdResponse, responseState: any): void {
  responseState.status = vdResponse.status;
  responseState.statusText = vdResponse.statusText;

  responseState.headers = Object.entries(vdResponse.headers).map(([key, value]) => ({
    key,
    value,
  }));

  responseState.body = vdResponse.body;
}

/**
 * Build voiden.variables API using .voiden/.process.env.json.
 */
export function buildVariablesApi(): { get: (key: string) => Promise<any>; set: (key: string, value: any) => Promise<void> } {
  return {
    get: async (key: string): Promise<any> => {
      try {
        const ipcValue = await (window as any).electron?.variables?.get?.(key);
        if (ipcValue !== undefined) return ipcValue;

        const state = await (window as any).electron?.state?.get();
        const projectPath = state?.activeDirectory || '';
        const fileContent = await (window as any).electron?.files?.read(projectPath + '/.voiden/.process.env.json');
        const vars = fileContent ? JSON.parse(fileContent) : {};
        return vars[key];
      } catch {
        return undefined;
      }
    },
    set: async (key: string, value: any): Promise<void> => {
      try {
        const setResult = await (window as any).electron?.variables?.set?.(key, value);
        if (setResult) return;

        const state = await (window as any).electron?.state?.get();
        const projectPath = state?.activeDirectory || '';
        const fileContent = await (window as any).electron?.files?.read(projectPath + '/.voiden/.process.env.json');
        const existing = fileContent ? JSON.parse(fileContent) : {};
        existing[key] = value;
        await (window as any).electron?.variables?.writeVariables(JSON.stringify(existing, null, 2));
      } catch (error) {
        console.error('[voiden-scripting] Error setting variable:', error);
      }
    },
  };
}

/**
 * Build voiden.env API from the active environment file.
 */
export function buildEnvApi(): { get: (key: string) => Promise<any> } {
  return {
    get: async (key: string): Promise<any> => {
      try {
        const envLoad = await (window as any).electron?.env?.load?.();
        const activeEnvPath = envLoad?.activeEnv;
        const envData = envLoad?.data;
        if (!activeEnvPath || !envData || typeof envData !== 'object') {
          return undefined;
        }
        const activeEnv = envData[activeEnvPath];
        if (!activeEnv || typeof activeEnv !== 'object') {
          return undefined;
        }
        return activeEnv[key];
      } catch {
        return undefined;
      }
    },
  };
}
