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
  | { type: 'done'; success: boolean; cancelled: boolean; logs: ScriptLog[]; assertions?: Array<{ passed: boolean; message: string; condition?: string; actualValue?: any; operator?: string; expectedValue?: any; reason?: string }>; modifiedRequest: any; modifiedResponse?: any; error?: string };

const workerSource = `
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

  let requestState = null;
  let responseState = null;
  const logs = [];
  const assertions = [];
  let cancelled = false;
  let rpcId = 0;
  const pending = new Map();

  function _normalizeLevel(value) {
    if (typeof value !== 'string') return null;
    const lowered = value.toLowerCase();
    if (lowered === 'warning') return 'warn';
    if (lowered === 'log' || lowered === 'info' || lowered === 'debug' || lowered === 'warn' || lowered === 'error') {
      return lowered;
    }
    return null;
  }

  function _pushLog(level, args) {
    logs.push({ level, args });
    self.postMessage({ type: 'log', args });
  }

  function _toCollectionArray(input) {
    if (Array.isArray(input)) {
      return input
        .filter((item) => item && typeof item === 'object')
        .map((item) => ({
          key: String(item.key ?? '').trim(),
          value: String(item.value ?? ''),
          enabled: item.enabled !== false,
        }))
        .filter((item) => item.key);
    }

    if (input && typeof input === 'object') {
      if (Object.prototype.hasOwnProperty.call(input, 'key') && Object.prototype.hasOwnProperty.call(input, 'value')) {
        const key = String(input.key ?? '').trim();
        if (!key) return [];
        return [{ key, value: String(input.value ?? ''), enabled: input.enabled !== false }];
      }
      return Object.entries(input)
        .map(([key, value]) => ({ key: String(key ?? '').trim(), value: String(value ?? ''), enabled: true }))
        .filter((item) => item.key);
    }

    return [];
  }

  function _normalizeRequestCollections(req) {
    if (!req || typeof req !== 'object') return req;
    req.headers = _toCollectionArray(req.headers);
    req.queryParams = _toCollectionArray(req.queryParams);
    req.pathParams = _toCollectionArray(req.pathParams);
    return req;
  }

  function _serializeAssertionValue(val) {
    try {
      return JSON.parse(JSON.stringify(val));
    } catch {
      return String(val);
    }
  }

  function _toConditionText(val) {
    if (typeof val === 'string') return JSON.stringify(val);
    try {
      return JSON.stringify(val);
    } catch {
      return String(val);
    }
  }

  function _normalizeOperator(op) {
    if (typeof op !== 'string') return null;
    const key = op.trim().toLowerCase().replace(/\\s+/g, '');
    const map = {
      '==': '==',
      '===': '===',
      'eq': '==',
      'equal': '==',
      '!=': '!=',
      '!==': '!==',
      'neq': '!=',
      'notequal': '!=',
      'greater': '>',
      'greaterthan': '>',
      'gte': '>=',
      'less': '<',
      'lessthan': '<',
      'lte': '<=',
      '>': '>',
      '>=': '>=',
      '<': '<',
      '<=': '<=',
      'contains': 'contains',
      'includes': 'includes',
      'matches': 'matches',
      'regex': 'matches',
      'truthy': 'truthy',
      'falsy': 'falsy',
    };
    return map[key] || null;
  }

  function _evaluateAssertion(actual, operator, expected) {
    switch (operator) {
      case '==': return actual == expected;
      case '===': return actual === expected;
      case '!=': return actual != expected;
      case '!==': return actual !== expected;
      case '>': return actual > expected;
      case '>=': return actual >= expected;
      case '<': return actual < expected;
      case '<=': return actual <= expected;
      case 'contains':
        if (typeof actual === 'string') return actual.includes(String(expected));
        if (Array.isArray(actual)) return actual.includes(expected);
        return false;
      case 'matches':
        try {
          const re = new RegExp(String(expected));
          return re.test(String(actual));
        } catch {
          return false;
        }
      case 'truthy': return Boolean(actual);
      case 'falsy': return !actual;
      default: return Boolean(actual);
    }
  }

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
      _normalizeRequestCollections(requestState);
      const scriptBody = data.script;

      const voiden = {
        request: requestState,
        response: responseState,
        env: {
          get: (key) => rpc('env:get', [key]),
        },
        variables: {
          get: (key) => rpc('variables:get', [key]),
          set: (key, value) => rpc('variables:set', [key, value]),
        },
        log: (levelOrMessage, ...args) => {
          const normalized = _normalizeLevel(levelOrMessage);
          if (normalized) {
            _pushLog(normalized, args);
            return;
          }
          _pushLog('log', [levelOrMessage, ...args]);
        },
        assert: (actual, operator, expected, message) => {
          const rawOperator = String(operator);
          const normalizedOperator = _normalizeOperator(operator);
          if (!normalizedOperator) {
            assertions.push({
              passed: false,
              message: message ? String(message) : '',
              reason: 'Unsupported operator: ' + rawOperator,
              condition: _toConditionText(actual) + ' ' + rawOperator + ' ' + _toConditionText(expected),
              actualValue: _serializeAssertionValue(actual),
              operator: rawOperator,
              expectedValue: _serializeAssertionValue(expected),
            });
            return;
          }
          const passed = _evaluateAssertion(actual, normalizedOperator, expected);
          assertions.push({
            passed,
            message: message ? String(message) : '',
            condition: _toConditionText(actual) + ' ' + normalizedOperator + ' ' + _toConditionText(expected),
            actualValue: _serializeAssertionValue(actual),
            operator: normalizedOperator,
            expectedValue: _serializeAssertionValue(expected),
          });
        },
        cancel: () => {
          cancelled = true;
        },
      };

      try {
        const _require = typeof require !== 'undefined' ? require : undefined;
        const fn = new AsyncFunction('voiden', 'vd', 'require', scriptBody);
        await fn(voiden, voiden, _require);
        self.postMessage({
          type: 'done',
          success: true,
          cancelled,
          logs,
          assertions,
          modifiedRequest: voiden.request,
          modifiedResponse: voiden.response,
        });
      } catch (error) {
        self.postMessage({
          type: 'done',
          success: false,
          cancelled,
          logs,
          assertions,
          modifiedRequest: voiden.request,
          modifiedResponse: voiden.response,
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

const nodeHostWrapperSource = `
'use strict';
const { Worker } = require('worker_threads');
const _chunks = [];
process.stdin.on('data', (c) => _chunks.push(c));
process.stdin.on('end', () => {
  const _input = JSON.parse(Buffer.concat(_chunks).toString('utf-8'));
  const _workerSource = _input.workerSource;
  const _envData = _input.envVars || {};
  const _variablesData = _input.variables || {};
  const _modifiedVariables = {};

  // Shim: map browser Worker globals to Node worker_threads parentPort
  const _shim = [
    "const { parentPort } = require('worker_threads');",
    "const self = { postMessage: (data) => parentPort.postMessage(data) };",
    "parentPort.on('message', (data) => { if (self.onmessage) self.onmessage({ data }); });",
    "",
  ].join('\\n');

  const _fullSource = _shim + _workerSource;

  const _worker = new Worker(_fullSource, { eval: true });

  const _timeout = setTimeout(() => {
    _worker.terminate();
    const _result = {
      success: false,
      logs: [],
      error: 'Script execution timed out after 10000ms',
      cancelled: false,
      modifiedVariables: _modifiedVariables,
    };
    process.stdout.write(JSON.stringify(_result) + '\\n');
    process.exit(1);
  }, 10000);

  _worker.on('message', (msg) => {
    if (msg.type === 'rpc:request') {
      const { id, method, args } = msg;
      let result;
      try {
        switch (method) {
          case 'env:get':
            result = _envData[args[0]];
            break;
          case 'variables:get':
            result = _variablesData[args[0]];
            break;
          case 'variables:set':
            _variablesData[args[0]] = args[1];
            _modifiedVariables[args[0]] = args[1];
            result = undefined;
            break;
          default:
            throw new Error('Unknown RPC method: ' + method);
        }
        _worker.postMessage({ type: 'rpc:response', id, result });
      } catch (err) {
        _worker.postMessage({ type: 'rpc:response', id, error: err.message || String(err) });
      }
      return;
    }

    if (msg.type === 'done') {
      clearTimeout(_timeout);
      const _result = {
        success: msg.success,
        logs: msg.logs || [],
        assertions: msg.assertions || [],
        cancelled: msg.cancelled || false,
        error: msg.error,
        modifiedRequest: msg.modifiedRequest,
        modifiedResponse: msg.modifiedResponse,
        modifiedVariables: _modifiedVariables,
      };
      process.stdout.write(JSON.stringify(_result) + '\\n');
      _worker.terminate();
      process.exit(msg.success ? 0 : 1);
    }
  });

  _worker.on('error', (err) => {
    clearTimeout(_timeout);
    const _result = {
      success: false,
      logs: [],
      error: err.stack || err.message || String(err),
      cancelled: false,
      modifiedVariables: _modifiedVariables,
    };
    process.stdout.write(JSON.stringify(_result) + '\\n');
    process.exit(1);
  });

  _worker.postMessage({
    type: 'start',
    script: _input.scriptBody,
    request: _input.request || {},
    response: _input.response || null,
  });
});
`;

const pythonWrapperSource = `
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
    assertions = []
    cancelled = False
    modified_variables = {}

    class _List:
        def __init__(self, values=None):
            self._items = []
            if values:
                for v in values:
                    self._items.append(_wrap(v))

        # JS-friendly alias
        def push(self, *values):
            if len(values) == 2 and isinstance(values[0], str) and not isinstance(values[1], (dict, list, tuple)):
                key = values[0].strip()
                if key:
                    self._items.append(_wrap({"key": key, "value": str(values[1]), "enabled": True}))
                return len(self._items)

            for v in values:
                if isinstance(v, dict) and "key" in v and "value" in v:
                    key = str(v.get("key", "")).strip()
                    if not key:
                        continue
                    self._items.append(_wrap({
                        "key": key,
                        "value": str(v.get("value", "")),
                        "enabled": v.get("enabled", True) is not False
                    }))
                    continue
                if isinstance(v, dict):
                    for mk, mv in v.items():
                        mkey = str(mk).strip()
                        if not mkey:
                            continue
                        self._items.append(_wrap({"key": mkey, "value": str(mv), "enabled": True}))
                    continue
                self._items.append(_wrap(v))
            return len(self._items)

        def append(self, value):
            self._items.append(_wrap(value))

        def extend(self, values):
            for v in values:
                self._items.append(_wrap(v))

        def __iter__(self):
            return iter(self._items)

        def __len__(self):
            return len(self._items)

        def __getitem__(self, index):
            return self._items[index]

        def __setitem__(self, index, value):
            self._items[index] = _wrap(value)

        def __repr__(self):
            return repr(self._items)

    def _wrap(val):
        if isinstance(val, dict):
            return _Obj(val)
        if isinstance(val, list):
            return _List(val)
        if isinstance(val, tuple):
            return tuple(_wrap(v) for v in val)
        return val

    _REQUEST_COLLECTION_FIELDS = {"headers", "queryParams", "pathParams"}

    class _Obj:
        def __init__(self, data):
            for k, v in data.items():
                setattr(self, k, v)

        def __setattr__(self, key, value):
            # Keep request collections list-like in Python so .push()/.append() work.
            if key in _REQUEST_COLLECTION_FIELDS:
                normalized = _normalize_kv_collection(value)
                object.__setattr__(self, key, _List(normalized))
                return
            object.__setattr__(self, key, _wrap(value))

        def __getitem__(self, key):
            return getattr(self, key)

        def __setitem__(self, key, value):
            setattr(self, key, value)

        def get(self, key, default=None):
            return getattr(self, key, default)

        def items(self):
            return self.__dict__.items()

    def _normalize_kv_collection(value):
        items = []
        if isinstance(value, list):
            for item in value:
                if isinstance(item, dict) and "key" in item and "value" in item:
                    key = str(item.get("key", "")).strip()
                    if not key:
                        continue
                    items.append({
                        "key": key,
                        "value": str(item.get("value", "")),
                        "enabled": item.get("enabled", True) is not False
                    })
                elif isinstance(item, dict):
                    for mk, mv in item.items():
                        mkey = str(mk).strip()
                        if not mkey:
                            continue
                        items.append({"key": mkey, "value": str(mv), "enabled": True})
            return items

        if isinstance(value, dict):
            if "key" in value and "value" in value:
                key = str(value.get("key", "")).strip()
                if not key:
                    return []
                return [{
                    "key": key,
                    "value": str(value.get("value", "")),
                    "enabled": value.get("enabled", True) is not False
                }]
            for mk, mv in value.items():
                mkey = str(mk).strip()
                if not mkey:
                    continue
                items.append({"key": mkey, "value": str(mv), "enabled": True})
            return items

        return []

    if isinstance(request_data, dict):
        request_data["headers"] = _normalize_kv_collection(request_data.get("headers"))
        request_data["queryParams"] = _normalize_kv_collection(request_data.get("queryParams"))
        request_data["pathParams"] = _normalize_kv_collection(request_data.get("pathParams"))

    class _Variables:
        def get(self, key):
            return variables_data.get(key)
        def set(self, key, value):
            serialized = _serialize(value)
            variables_data[key] = serialized
            modified_variables[key] = serialized

    class _Env:
        def get(self, key):
            return env_data.get(key)

    class _Vd:
        def __init__(self):
            self.request = _Obj(request_data)
            self.response = _Obj(response_data) if response_data else None
            self.env = _Env()
            self.variables = _Variables()

        def log(self, *args):
            level = "log"
            payload = args
            if len(args) >= 1 and isinstance(args[0], str):
                lowered = args[0].lower()
                if lowered == "warning":
                    lowered = "warn"
                if lowered in ("log", "info", "debug", "warn", "error"):
                    level = lowered
                    payload = args[1:]
            logs.append({"level": level, "args": [_serialize(a) for a in payload]})

        def assert_(self, actual, operator, expected, message=""):
            normalized_operator = _normalize_operator(operator)
            if normalized_operator is None:
                raw_operator = str(operator)
                assertions.append({
                    "passed": False,
                    "message": str(message),
                    "reason": "Unsupported operator: " + raw_operator,
                    "condition": _to_condition_text(actual) + " " + raw_operator + " " + _to_condition_text(expected),
                    "actualValue": _serialize(actual),
                    "operator": raw_operator,
                    "expectedValue": _serialize(expected),
                })
                return
            passed = _evaluate_assertion(actual, normalized_operator, expected)
            assertions.append({
                "passed": bool(passed),
                "message": str(message),
                "condition": _to_condition_text(actual) + " " + str(normalized_operator) + " " + _to_condition_text(expected),
                "actualValue": _serialize(actual),
                "operator": str(normalized_operator),
                "expectedValue": _serialize(expected),
            })

        def cancel(self):
            nonlocal cancelled
            cancelled = True

    def _serialize(val):
        if isinstance(val, _List):
            return [_serialize(v) for v in val]
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
                result[k] = _serialize(v)
        return result

    def _normalize_operator(op):
        if not isinstance(op, str):
            return None
        key = "".join(op.strip().lower().split())
        mapping = {
            "==": "==",
            "===": "===",
            "eq": "==",
            "equal": "==",
            "!=": "!=",
            "!==": "!==",
            "neq": "!=",
            "notequal": "!=",
            "greater": ">",
            "greaterthan": ">",
            "gte": ">=",
            "less": "<",
            "lessthan": "<",
            "lte": "<=",
            ">": ">",
            ">=": ">=",
            "<": "<",
            "<=": "<=",
            "contains": "contains",
            "includes": "contains",
            "matches": "matches",
            "regex": "matches",
            "truthy": "truthy",
            "falsy": "falsy",
        }
        return mapping.get(key)

    def _to_condition_text(value):
        if isinstance(value, str):
            return json.dumps(value)
        try:
            return json.dumps(value)
        except Exception:
            return str(value)

    def _evaluate_assertion(actual, operator, expected):
        try:
            if operator == "==":
                return actual == expected
            if operator == "===":
                return type(actual) == type(expected) and actual == expected
            if operator == "!=":
                return actual != expected
            if operator == "!==":
                return not (type(actual) == type(expected) and actual == expected)
            if operator == ">":
                return actual > expected
            if operator == ">=":
                return actual >= expected
            if operator == "<":
                return actual < expected
            if operator == "<=":
                return actual <= expected
            if operator == "contains":
                if isinstance(actual, str):
                    return str(expected) in actual
                if isinstance(actual, (list, tuple)):
                    return expected in actual
                return False
            if operator == "matches":
                import re
                return re.search(str(expected), str(actual)) is not None
            if operator == "truthy":
                return bool(actual)
            if operator == "falsy":
                return not bool(actual)
        except Exception:
            return False
        return bool(actual)

    voiden = _Vd()

    try:
        # Rewrite voiden.assert( to voiden.assert_( since assert is a Python keyword
        script_body = script_body.replace('voiden.assert(', 'voiden.assert_(')
        script_body = script_body.replace('vd.assert(', 'vd.assert_(')
        exec(script_body, {"voiden": voiden, "vd": voiden, "__builtins__": __builtins__})

        mod_request = _extract(voiden.request, ["url", "method", "headers", "body", "queryParams", "pathParams"])
        mod_response = None
        if voiden.response is not None:
            mod_response = _extract(voiden.response, ["status", "statusText", "headers", "body", "time", "size"])

        result = {
            "success": True,
            "logs": logs,
            "assertions": assertions,
            "cancelled": cancelled,
            "modifiedRequest": mod_request,
            "modifiedResponse": mod_response,
            "modifiedVariables": modified_variables,
        }
    except Exception as e:
        result = {
            "success": False,
            "logs": logs,
            "assertions": assertions,
            "cancelled": cancelled,
            "error": traceback.format_exc(),
            "modifiedVariables": _serialize(modified_variables),
        }

    print(json.dumps(result))
    sys.exit(0 if result.get("success") else 1)

main()
`;

async function executeScriptInProcess(scriptBody: string, vdApi: VdApi): Promise<ScriptExecutionResult> {
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  const logs: ScriptLog[] = [];
  const assertions: Array<{ passed: boolean; message: string; condition?: string; actualValue?: any; operator?: string; expectedValue?: any; reason?: string }> = [];
  let cancelled = false;
  const toCollectionArray = (input: any): Array<{ key: string; value: string; enabled?: boolean }> => {
    if (Array.isArray(input)) {
      return input
        .filter((item) => item && typeof item === 'object')
        .map((item: any) => ({
          key: String(item.key ?? '').trim(),
          value: String(item.value ?? ''),
          enabled: item.enabled !== false,
        }))
        .filter((item) => item.key);
    }
    if (input && typeof input === 'object') {
      if (Object.prototype.hasOwnProperty.call(input, 'key') && Object.prototype.hasOwnProperty.call(input, 'value')) {
        const key = String((input as any).key ?? '').trim();
        if (!key) return [];
        return [{ key, value: String((input as any).value ?? ''), enabled: (input as any).enabled !== false }];
      }
      return Object.entries(input)
        .map(([key, value]) => ({ key: String(key ?? '').trim(), value: String(value ?? ''), enabled: true }))
        .filter((item) => item.key);
    }
    return [];
  };
  const normalizeRequestCollections = (req: any) => {
    if (!req || typeof req !== 'object') return req;
    req.headers = toCollectionArray(req.headers);
    req.queryParams = toCollectionArray(req.queryParams);
    req.pathParams = toCollectionArray(req.pathParams);
    return req;
  };
  const normalizeLevel = (value: any): ScriptLog['level'] | null => {
    if (typeof value !== 'string') return null;
    const lowered = value.toLowerCase();
    if (lowered === 'warning') return 'warn';
    if (lowered === 'log' || lowered === 'info' || lowered === 'debug' || lowered === 'warn' || lowered === 'error') {
      return lowered;
    }
    return null;
  };
  const pushLog = (level: ScriptLog['level'], args: any[]) => {
    logs.push({ level, args });
  };
  const toConditionText = (value: any): string => {
    if (typeof value === 'string') return JSON.stringify(value);
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  };
  const normalizeOperator = (op: any): string | null => {
    if (typeof op !== 'string') return null;
    const key = op.trim().toLowerCase().replace(/\s+/g, '');
    const map: Record<string, string> = {
      '==': '==',
      '===': '===',
      eq: '==',
      equal: '==',
      '!=': '!=',
      '!==': '!==',
      neq: '!=',
      notequal: '!=',
      greater: '>',
      greaterthan: '>',
      gte: '>=',
      less: '<',
      lessthan: '<',
      lte: '<=',
      '>': '>',
      '>=': '>=',
      '<': '<',
      '<=': '<=',
      contains: 'contains',
      includes: 'contains',
      matches: 'matches',
      regex: 'matches',
      truthy: 'truthy',
      falsy: 'falsy',
    };
    return map[key] || null;
  };
  const evaluateAssertion = (actual: any, operator: string, expected: any): boolean => {
    try {
      switch (operator) {
        case '==': return actual == expected;
        case '===': return actual === expected;
        case '!=': return actual != expected;
        case '!==': return actual !== expected;
        case '>': return actual > expected;
        case '>=': return actual >= expected;
        case '<': return actual < expected;
        case '<=': return actual <= expected;
        case 'contains':
          if (typeof actual === 'string') return actual.includes(String(expected));
          if (Array.isArray(actual)) return actual.includes(expected);
          return false;
        case 'matches':
          return new RegExp(String(expected)).test(String(actual));
        case 'truthy': return Boolean(actual);
        case 'falsy': return !actual;
        default: return Boolean(actual);
      }
    } catch {
      return false;
    }
  };

  const voiden: VdApi = {
    request: normalizeRequestCollections(vdApi.request),
    response: vdApi.response,
    env: vdApi.env,
    variables: vdApi.variables,
    log: (levelOrMessage: any, ...args: any[]) => {
      const normalized = normalizeLevel(levelOrMessage);
      if (normalized) {
        pushLog(normalized, args);
        return;
      }
      pushLog('log', [levelOrMessage, ...args]);
    },
    assert: (actual: any, operator: string, expected: any, message?: string) => {
      const rawOperator = String(operator);
      const normalizedOperator = normalizeOperator(operator);
      if (!normalizedOperator) {
        assertions.push({
          passed: false,
          message: message ? String(message) : '',
          reason: `Unsupported operator: ${rawOperator}`,
          condition: `${toConditionText(actual)} ${rawOperator} ${toConditionText(expected)}`,
          actualValue: actual,
          operator: rawOperator,
          expectedValue: expected,
        });
        return;
      }
      const passed = evaluateAssertion(actual, normalizedOperator, expected);
      assertions.push({
        passed,
        message: message ? String(message) : '',
        condition: `${toConditionText(actual)} ${normalizedOperator} ${toConditionText(expected)}`,
        actualValue: actual,
        operator: normalizedOperator,
        expectedValue: expected,
      });
    },
    cancel: () => {
      cancelled = true;
    },
  };

  try {
    const scriptFn = new AsyncFunction('voiden', 'vd', scriptBody);
    await scriptFn(voiden, voiden);
    return { success: true, logs, assertions, cancelled, exitCode: 0, modifiedRequest: voiden.request, modifiedResponse: voiden.response };
  } catch (error: any) {
    return {
      success: false,
      logs,
      assertions,
      error: String(error?.stack || error?.message || error),
      cancelled,
      exitCode: 1,
      modifiedResponse: voiden.response,
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
  let envVars: Record<string, string> = {};
  let variables: Record<string, any> = {};

  try {
    const envLoad = await (window as any).electron?.env?.load?.();
    const activeEnvPath = envLoad?.activeEnv;
    const allEnvData = envLoad?.data;
    if (activeEnvPath && allEnvData && typeof allEnvData === 'object') {
      const activeEnv = allEnvData[activeEnvPath];
      if (activeEnv && typeof activeEnv === 'object') {
        envVars = activeEnv;
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
      pythonWrapper: pythonWrapperSource,
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
        exitCode: -1,
      };
    }
    if (result.error) {
      return {
        success: false,
        logs: result.logs || [],
        assertions: result.assertions || [],
        error: `Python execution failed: ${result.error}`,
        cancelled: result.cancelled || false,
        exitCode: result.exitCode ?? 1,
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
      assertions: result.assertions || [],
      error: result.success === false ? 'Python execution failed' : result.error,
      cancelled: result.cancelled || false,
      exitCode: result.exitCode ?? (result.success ? 0 : 1),
      modifiedRequest: result.modifiedRequest,
      modifiedResponse: result.modifiedResponse,
    };
  } catch (error: any) {
    return {
      success: false,
      logs: [],
      error: `Python execution failed: ${error.message || String(error)}`,
      cancelled: false,
      exitCode: -1,
    };
  }
}

/**
 * Execute a JavaScript script via Node.js subprocess IPC.
 * Pre-resolves all env vars and variables since the subprocess runs independently.
 * Enables `require()` for external npm packages.
 */
async function executeNodeScript(
  scriptBody: string,
  vdApi: VdApi
): Promise<ScriptExecutionResult> {
  let envVars: Record<string, string> = {};
  let variables: Record<string, any> = {};

  try {
    const envLoad = await (window as any).electron?.env?.load?.();
    const activeEnvPath = envLoad?.activeEnv;
    const allEnvData = envLoad?.data;
    if (activeEnvPath && allEnvData && typeof allEnvData === 'object') {
      const activeEnv = allEnvData[activeEnvPath];
      if (activeEnv && typeof activeEnv === 'object') {
        envVars = activeEnv;
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
    const result = await (window as any).electron?.script?.executeNode({
      scriptBody,
      nodeHostWrapper: nodeHostWrapperSource,
      workerSource,
      request: vdApi.request,
      response: vdApi.response,
      envVars,
      variables,
    });

    if (!result) {
      return {
        success: false,
        logs: [],
        error: 'Node.js execution bridge unavailable',
        cancelled: false,
        exitCode: -1,
      };
    }
    if (result.error) {
      return {
        success: false,
        logs: result.logs || [],
        assertions: result.assertions || [],
        error: `Script execution failed: ${result.error}`,
        cancelled: result.cancelled || false,
        exitCode: result.exitCode ?? 1,
      };
    }

    // Apply variable mutations back
    if (result.modifiedVariables && Object.keys(result.modifiedVariables).length > 0) {
      for (const [key, value] of Object.entries(result.modifiedVariables)) {
        try {
          await vdApi.variables.set(key, value);
        } catch {
          // Main-process bridge already persists modifiedVariables as a fallback.
        }
      }
    }

    return {
      success: Boolean(result.success),
      logs: result.logs || [],
      assertions: result.assertions || [],
      error: result.success === false ? 'Script execution failed' : result.error,
      cancelled: result.cancelled || false,
      exitCode: result.exitCode ?? (result.success ? 0 : 1),
      modifiedRequest: result.modifiedRequest,
      modifiedResponse: result.modifiedResponse,
    };
  } catch (error: any) {
    return {
      success: false,
      logs: [],
      error: `Script execution failed: ${error.message || String(error)}`,
      cancelled: false,
      exitCode: -1,
    };
  }
}

/**
 * Execute a script string with the voiden API available as the `voiden` parameter.
 * JavaScript: Node.js subprocess (with require support), Worker fallback, or in-process fallback.
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

  // Try Node.js subprocess first (enables require/import for external packages)
  if ((window as any).electron?.script?.executeNode) {
    return executeNodeScript(scriptBody, vdApi);
  }

  // Fallback: Web Worker (no require support)
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
        exitCode: -1,
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
          assertions: message.assertions || [],
          cancelled: message.cancelled,
          error: message.error,
          exitCode: message.success ? 0 : 1,
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
        exitCode: -1,
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
