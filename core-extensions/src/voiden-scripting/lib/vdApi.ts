/**
 * Builds the `voiden` API object from pipeline state and applies mutations back.
 */

import type { VdRequest, VdResponse } from './types';

type KeyValueItem = { key: string; value: string; enabled?: boolean };

function isSameJson(a: any, b: any): boolean {
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

function toEnabledRecord(input: any): Record<string, string> {
  const out: Record<string, string> = {};
  if (!input) return out;

  // Preferred pipeline shape: [{ key, value, enabled? }]
  if (Array.isArray(input)) {
    input
      .filter((item: any) => item?.enabled !== false)
      .forEach((item: any) => {
        const key = String(item?.key ?? '').trim();
        if (!key) return;
        out[key] = String(item?.value ?? '');
      });
    return out;
  }

  // Fallback shape: { key: value }
  if (typeof input === 'object') {
    Object.entries(input).forEach(([key, value]) => {
      const normalizedKey = String(key ?? '').trim();
      if (!normalizedKey) return;
      out[normalizedKey] = String(value ?? '');
    });
  }

  return out;
}

function normalizeToKeyValueArray(input: any): KeyValueItem[] {
  if (!input) return [];

  // Single item shape: { key, value, enabled? }
  if (
    typeof input === 'object' &&
    !Array.isArray(input) &&
    Object.prototype.hasOwnProperty.call(input, 'key') &&
    Object.prototype.hasOwnProperty.call(input, 'value')
  ) {
    const item = input as any;
    const key = String(item.key ?? '').trim();
    if (!key) return [];
    return [{
      key,
      value: String(item.value ?? ''),
      enabled: item.enabled !== false,
    }];
  }

  // Array shape: [{ key, value, enabled? }, ...] (supports push-based construction)
  if (Array.isArray(input)) {
    return input
      .filter((item: any) => item && typeof item === 'object')
      .map((item: any) => ({
        key: String(item.key ?? '').trim(),
        value: String(item.value ?? ''),
        enabled: item.enabled !== false,
      }))
      .filter((item) => item.key.length > 0);
  }

  // Record/map shape: { Header: "value", ... }
  if (typeof input === 'object') {
    return Object.entries(input)
      .map(([key, value]) => ({
        key: String(key ?? '').trim(),
        value: String(value ?? ''),
        enabled: true,
      }))
      .filter((item) => item.key.length > 0);
  }

  return [];
}

/**
 * Build VdRequest from pipeline's RestApiRequestState.
 * Exposes headers/query/path as arrays of { key, value } so scripts can use push/append flows.
 */
export function buildVdRequest(requestState: any): VdRequest {
  const headers = normalizeToKeyValueArray(requestState.headers);
  const queryParams = normalizeToKeyValueArray(requestState.queryParams);
  const pathParams = normalizeToKeyValueArray(requestState.pathParams);

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

  requestState.headers = normalizeToKeyValueArray((vdRequest as any).headers);
  requestState.queryParams = normalizeToKeyValueArray((vdRequest as any).queryParams);
  requestState.pathParams = normalizeToKeyValueArray((vdRequest as any).pathParams);

  // Request pipeline expects body to be string for normal REST payloads.
  if (vdRequest.body != null && typeof vdRequest.body === 'object') {
    try {
      requestState.body = JSON.stringify(vdRequest.body);
    } catch {
      requestState.body = String(vdRequest.body);
    }
  } else {
    requestState.body = vdRequest.body;
  }
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
  // Apply only changed fields to avoid restructuring response payload unnecessarily.
  const current = buildVdResponse(responseState);

  if (!isSameJson(current.status, vdResponse.status)) {
    responseState.status = vdResponse.status;
  }
  if (!isSameJson(current.statusText, vdResponse.statusText)) {
    responseState.statusText = vdResponse.statusText;
  }
  if (!isSameJson(current.body, vdResponse.body)) {
    responseState.body = vdResponse.body;
  }
  // Intentionally do not mutate response headers from scripting.
  // This avoids any structural serialization/reformatting of transport headers.
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
