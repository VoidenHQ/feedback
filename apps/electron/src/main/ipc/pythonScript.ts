/**
 * Python Script Executor
 *
 * IPC handler that executes Python scripts via subprocess.
 * Receives script body + vd API data as JSON via stdin,
 * returns modified request/response + logs as JSON via stdout.
 */

import { ipcMain } from "electron";
import { spawn, execFile } from "child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { getActiveProject } from "../state";

const PYTHON_TIMEOUT_MS = 10_000;

let cachedPythonPath: string | null = null;

/**
 * Detect available Python binary.
 * Tries python3 first, then python, caches the result.
 */
async function detectPythonPath(): Promise<string | null> {
  if (cachedPythonPath) return cachedPythonPath;

  const candidates = process.platform === "win32"
    ? ["python3", "python"]
    : ["python3", "python"];

  const whichCmd = process.platform === "win32" ? "where" : "which";

  for (const candidate of candidates) {
    try {
      const result = await new Promise<string | null>((resolve) => {
        execFile(whichCmd, [candidate], { timeout: 3000 }, (error, stdout) => {
          if (error || !stdout.trim()) {
            resolve(null);
          } else {
            resolve(candidate);
          }
        });
      });
      if (result) {
        cachedPythonPath = result;
        return result;
      }
    } catch {
      continue;
    }
  }

  return null;
}

/**
 * Python wrapper script executed via `python3 -c`.
 *
 * Creates a `vd` object mimicking the JavaScript API:
 * - vd.request.url, .method, .headers, .body, .queryParams, .pathParams
 * - vd.response.status, .statusText, .headers, .body, .time, .size (post-script only)
 * - vd.env.get(key) — synchronous, data pre-loaded
 * - vd.variables.get(key) / vd.variables.set(key, value)
 * - vd.log(...args)
 * - vd.cancel()
 */
const PYTHON_WRAPPER = `
import sys, json
import traceback

def main():
    input_data = json.loads(sys.stdin.read())

    script_body = input_data["scriptBody"]

    request_data = input_data.get("request", {})
    response_data = input_data.get("response", None)
    env_data = input_data.get("envVars", {})
    variables_data = input_data.get("variables", {})

    logs = []
    cancelled = False
    modified_variables = {}

    def _wrap(val):
        if isinstance(val, dict):
            return _Obj(val)
        if isinstance(val, list):
            return [_wrap(v) for v in val]
        if isinstance(val, tuple):
            return tuple(_wrap(v) for v in val)
        return val

    class _Obj:
        def __init__(self, data):
            for k, v in data.items():
                setattr(self, k, _wrap(v))

        def __getitem__(self, key):
            return getattr(self, key)

        def __setitem__(self, key, value):
            setattr(self, key, _wrap(value))

        def get(self, key, default=None):
            return getattr(self, key, default)

        def items(self):
            return self.__dict__.items()

    class _Env:
        def get(self, key):
            return env_data.get(key)

    class _Variables:
        def get(self, key):
            return variables_data.get(key)
        def set(self, key, value):
            serialized = _serialize(value)
            variables_data[key] = serialized
            modified_variables[key] = serialized

    class _Vd:
        def __init__(self):
            self.request = _Obj(request_data)
            self.response = _Obj(response_data) if response_data else None
            self.env = _Env()
            self.variables = _Variables()

        def log(self, *args):
            logs.append({"level": "log", "args": [_serialize(a) for a in args]})

        def cancel(self):
            nonlocal cancelled
            cancelled = True

    def _serialize(val):
        if isinstance(val, _Obj):
            return {k: _serialize(v) for k, v in val.__dict__.items()}
        if isinstance(val, dict):
            return {k: _serialize(v) for k, v in val.items()}
        if isinstance(val, (list, tuple)):
            return [_serialize(v) for v in val]
        try:
            json.dumps(val)
            return val
        except (TypeError, ValueError):
            return str(val)

    def _extract(obj, keys):
        result = {}
        for k in keys:
            if hasattr(obj, k):
                v = getattr(obj, k)
                result[k] = _serialize(v) if isinstance(v, _Obj) else v
        return result

    vd = _Vd()

    try:
        exec(script_body, {"vd": vd, "__builtins__": __builtins__})

        mod_request = _extract(vd.request, ["url", "method", "headers", "body", "queryParams", "pathParams"])
        mod_response = None
        if vd.response is not None:
            mod_response = _extract(vd.response, ["status", "statusText", "headers", "body", "time", "size"])

        result = {
            "success": True,
            "logs": logs,
            "cancelled": cancelled,
            "modifiedRequest": mod_request,
            "modifiedResponse": mod_response,
            "modifiedVariables": modified_variables,
        }
    except Exception as e:
        result = {
            "success": False,
            "logs": logs,
            "cancelled": cancelled,
            "error": traceback.format_exc(),
            "modifiedVariables": _serialize(modified_variables),
        }

    print(json.dumps(result))

main()
`;

interface PythonScriptPayload {
  scriptBody: string;
  request: any;
  response?: any;
  envVars: Record<string, string>;
  variables: Record<string, any>;
}

interface PythonScriptResult {
  success: boolean;
  logs: Array<{ level: string; args: any[] }>;
  error?: string;
  cancelled: boolean;
  modifiedRequest?: any;
  modifiedResponse?: any;
  modifiedVariables?: Record<string, any>;
}

async function loadProjectVariables(): Promise<Record<string, any>> {
  try {
    const project = await getActiveProject();
    if (!project) return {};
    const filePath = path.join(project, ".voiden", ".process.env.json");
    const content = await fs.readFile(filePath, "utf-8");
    const parsed = JSON.parse(content);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

async function persistProjectVariables(next: Record<string, any>): Promise<void> {
  try {
    const project = await getActiveProject();
    if (!project) return;
    const dirPath = path.join(project, ".voiden");
    await fs.mkdir(dirPath, { recursive: true });
    const filePath = path.join(dirPath, ".process.env.json");
    await fs.writeFile(filePath, JSON.stringify(next, null, 2), "utf-8");
  } catch {
    // Best-effort persistence; renderer will still receive result for fallback handling.
  }
}

export function registerPythonScriptIpcHandler() {
  ipcMain.handle(
    "script:executePython",
    async (_event, payload: PythonScriptPayload): Promise<PythonScriptResult> => {
      const pythonPath = await detectPythonPath();
      if (!pythonPath) {
        return {
          success: false,
          logs: [],
          error:
            "Python not found. Install Python 3 or ensure python3/python is in your PATH.",
          cancelled: false,
        };
      }

      const baseVariables = await loadProjectVariables();
      const mergedPayload: PythonScriptPayload = {
        ...payload,
        variables: {
          ...baseVariables,
          ...(payload.variables || {}),
        },
      };

      return new Promise<PythonScriptResult>((resolve) => {
        const child = spawn(pythonPath, ["-c", PYTHON_WRAPPER], {
          timeout: PYTHON_TIMEOUT_MS,
          stdio: ["pipe", "pipe", "pipe"],
        });

        let stdout = "";
        let stderr = "";

        child.stdout.on("data", (data: Buffer) => {
          stdout += data.toString();
        });
        child.stderr.on("data", (data: Buffer) => {
          stderr += data.toString();
        });

        child.on("close", async (code) => {
          if (code !== 0 && !stdout) {
            resolve({
              success: false,
              logs: [],
              error: stderr || `Python exited with code ${code}`,
              cancelled: false,
            });
            return;
          }
          try {
            // In case python prints multiple lines, parse the last non-empty line as JSON.
            const lines = stdout.split(/\r?\n/).filter((l) => l.trim().length > 0);
            const jsonLine = lines.length > 0 ? lines[lines.length - 1] : stdout;
            const result = JSON.parse(jsonLine) as PythonScriptResult;

            if (result.modifiedVariables && Object.keys(result.modifiedVariables).length > 0) {
              const current = await loadProjectVariables();
              const merged = { ...current, ...result.modifiedVariables };
              await persistProjectVariables(merged);
            }
            resolve(result);
          } catch {
            resolve({
              success: false,
              logs: [],
              error: `Failed to parse Python output: ${stdout.slice(0, 500)}`,
              cancelled: false,
            });
          }
        });

        child.on("error", (err) => {
          resolve({
            success: false,
            logs: [],
            error: `Failed to spawn Python: ${err.message}`,
            cancelled: false,
          });
        });

        child.stdin.write(JSON.stringify(mergedPayload));
        child.stdin.end();
      });
    }
  );
}
