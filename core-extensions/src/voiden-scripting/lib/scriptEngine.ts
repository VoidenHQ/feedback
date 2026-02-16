/**
 * Script execution engine.
 * Executes user-authored scripts in an isolated sandbox.
 * JavaScript: Web Worker with RPC bridge for async host APIs.
 * Python: Electron subprocess via IPC.
 */

import type { VdApi, ScriptLog, ScriptExecutionResult, ScriptLanguage } from './types';

const SCRIPT_TIMEOUT_MS = 5_000;

type RpcRequestMessage = {
  type: 'rpc:request';
  id: number;
  method: 'env:get' | 'variables:get' | 'variables:set';
  args: any[];
};

type RpcResponseMessage = {
  type: 'rpc:response';
  id: number;
  result?: any;
  error?: string;
};

type WorkerToHostMessage =
  | RpcRequestMessage
  | { type: 'log'; args: any[] }
  | { type: 'done'; success: boolean; cancelled: boolean; logs: ScriptLog[]; modifiedRequest: any; modifiedResponse?: any; error?: string };

const workerSource = `
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

  let requestState = null;
  let responseState = null;
  const logs = [];
  let cancelled = false;
  let rpcId = 0;
  const pending = new Map();

  function rpc(method, args) {
    return new Promise((resolve, reject) => {
      const id = ++rpcId;
      pending.set(id, { resolve, reject });
      self.postMessage({ type: 'rpc:request', id, method, args });
    });
  }

  self.onmessage = async (event) => {
    const data = event.data;

    if (data?.type === 'start') {
      requestState = data.request;
      responseState = data.response;
      const scriptBody = data.script;

      const vd = {
        request: requestState,
        response: responseState,
        env: {
          get: (key) => rpc('env:get', [key]),
        },
        variables: {
          get: (key) => rpc('variables:get', [key]),
          set: (key, value) => rpc('variables:set', [key, value]),
        },
        log: (...args) => {
          logs.push({ level: 'log', args });
          self.postMessage({ type: 'log', args });
        },
        cancel: () => {
          cancelled = true;
        },
      };

      try {
        const fn = new AsyncFunction('vd', scriptBody);
        await fn(vd);
        self.postMessage({
          type: 'done',
          success: true,
          cancelled,
          logs,
          modifiedRequest: vd.request,
          modifiedResponse: vd.response,
        });
      } catch (error) {
        self.postMessage({
          type: 'done',
          success: false,
          cancelled,
          logs,
          modifiedRequest: vd.request,
          modifiedResponse: vd.response,
          error: (error && (error.stack || error.message)) ? String(error.stack || error.message) : String(error),
        });
      }
      return;
    }

    if (data?.type === 'rpc:response') {
      const entry = pending.get(data.id);
      if (!entry) return;
      pending.delete(data.id);
      if (data.error) {
        entry.reject(new Error(data.error));
      } else {
        entry.resolve(data.result);
      }
    }
  };
`;

async function executeScriptInProcess(scriptBody: string, vdApi: VdApi): Promise<ScriptExecutionResult> {
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  const logs: ScriptLog[] = [];
  let cancelled = false;

  const vd: VdApi = {
    request: vdApi.request,
    response: vdApi.response,
    env: vdApi.env,
    variables: vdApi.variables,
    log: (...args: any[]) => {
      logs.push({ level: 'log', args });
    },
    cancel: () => {
      cancelled = true;
    },
  };

  try {
    const scriptFn = new AsyncFunction('vd', scriptBody);
    await scriptFn(vd);
    return { success: true, logs, cancelled, modifiedRequest: vd.request, modifiedResponse: vd.response };
  } catch (error: any) {
    return {
      success: false,
      logs,
      error: String(error?.stack || error?.message || error),
      cancelled,
      modifiedResponse: vd.response,
    };
  }
}

/**
 * Execute a Python script via Electron subprocess IPC.
 * Pre-resolves all env vars and variables since Python runs synchronously.
 */
async function executePythonScript(
  scriptBody: string,
  vdApi: VdApi
): Promise<ScriptExecutionResult> {
  const envVars: Record<string, string> = {};
  let variables: Record<string, any> = {};

  try {
    const keys: string[] = await (window as any).electron?.env?.getKeys() || [];
    for (const key of keys) {
      const value = await vdApi.env.get(key);
      if (value !== undefined) {
        envVars[key] = value;
      }
    }
  } catch { /* env unavailable */ }

  try {
    const readResult = await (window as any).electron?.variables?.read?.();
    if (readResult && typeof readResult === 'object') {
      variables = readResult;
    } else {
      const state = await (window as any).electron?.state?.get();
      const projectPath = state?.activeDirectory || '';
      const fileContent = await (window as any).electron?.files?.read(
        projectPath + '/.voiden/.process.env.json'
      );
      if (fileContent) {
        Object.assign(variables, JSON.parse(fileContent));
      }
    }
  } catch { /* variables unavailable */ }

  try {
    const result = await (window as any).electron?.script?.executePython({
      scriptBody,
      request: vdApi.request,
      response: vdApi.response,
      envVars,
      variables,
    });


    if (!result) {
      return {
        success: false,
        logs: [],
        error: 'Python execution bridge unavailable',
        cancelled: false,
      };
    }
    if (result.error) {
      return {
        success: false,
        logs: result.logs || [],
        error: `Python execution failed: ${result.error}`,
        cancelled: result.cancelled || false,
      };
    }

    // Apply variable mutations back
    if (result.modifiedVariables && Object.keys(result.modifiedVariables).length > 0) {
      for (const [key, value] of Object.entries(result.modifiedVariables)) {
        try {
          await vdApi.variables.set(key, value);
        } catch {
          // Main-process python bridge already persists modifiedVariables as a fallback.
        }
      }
    }

    return {
      success: Boolean(result.success),
      logs: result.logs || [],
      error: result.success === false ? 'Python execution failed' : result.error,
      cancelled: result.cancelled || false,
      modifiedRequest: result.modifiedRequest,
      modifiedResponse: result.modifiedResponse,
    };
  } catch (error: any) {
    return {
      success: false,
      logs: [],
      error: `Python execution failed: ${error.message || String(error)}`,
      cancelled: false,
    };
  }
}

/**
 * Execute a script string with the vd API available as the `vd` parameter.
 * JavaScript: Worker isolation (or in-process fallback).
 * Python: Electron subprocess via IPC.
 */
export async function executeScript(
  scriptBody: string,
  vdApi: VdApi,
  language: ScriptLanguage = 'javascript'
): Promise<ScriptExecutionResult> {
  if (language === 'python') {
    return executePythonScript(scriptBody, vdApi);
  }

  if (typeof Worker === 'undefined') {
    return executeScriptInProcess(scriptBody, vdApi);
  }

  const logs: ScriptLog[] = [];
  const blob = new Blob([workerSource], { type: 'application/javascript' });
  const workerUrl = URL.createObjectURL(blob);
  const worker = new Worker(workerUrl);
  URL.revokeObjectURL(workerUrl);

  return new Promise<ScriptExecutionResult>((resolve) => {
    let settled = false;

    const finish = (result: ScriptExecutionResult) => {
      if (settled) return;
      settled = true;
      worker.terminate();
      resolve(result);
    };

    const timeout = setTimeout(() => {
      finish({
        success: false,
        logs,
        error: `Script execution timed out after ${SCRIPT_TIMEOUT_MS}ms`,
        cancelled: false,
      });
    }, SCRIPT_TIMEOUT_MS);

    worker.onmessage = async (event: MessageEvent<WorkerToHostMessage>) => {
      const message = event.data;

      if (message.type === 'log') {
        logs.push({ level: 'log', args: message.args });
        return;
      }

      if (message.type === 'rpc:request') {
        const { id, method, args } = message;
        try {
          let result: any;
          switch (method) {
            case 'env:get':
              result = await vdApi.env.get(args[0]);
              break;
            case 'variables:get':
              result = await vdApi.variables.get(args[0]);
              break;
            case 'variables:set':
              result = await vdApi.variables.set(args[0], args[1]);
              break;
            default:
              throw new Error(`Unknown RPC method: ${method}`);
          }
          const response: RpcResponseMessage = { type: 'rpc:response', id, result };
          worker.postMessage(response);
        } catch (error: any) {
          const response: RpcResponseMessage = {
            type: 'rpc:response',
            id,
            error: error?.message || String(error),
          };
          worker.postMessage(response);
        }
        return;
      }

      if (message.type === 'done') {
        clearTimeout(timeout);
        finish({
          success: message.success,
          logs: message.logs ?? logs,
          cancelled: message.cancelled,
          error: message.error,
          modifiedRequest: message.modifiedRequest,
          modifiedResponse: message.modifiedResponse,
        });
      }
    };

    worker.onerror = (error) => {
      clearTimeout(timeout);
      finish({
        success: false,
        logs,
        error: error.message || 'Worker execution failed',
        cancelled: false,
      });
    };

    worker.postMessage({
      type: 'start',
      script: scriptBody,
      request: vdApi.request,
      response: vdApi.response,
    });
  });
}
