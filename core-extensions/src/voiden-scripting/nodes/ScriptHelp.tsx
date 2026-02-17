import React from "react";

export const PreScriptHelp = () => (
  <div className="text-xs space-y-2">
    <p className="font-semibold">Pre-Request Script</p>
    <p>Runs before the request is sent. Modify headers, URL, body, or cancel the request.</p>
    <div className="space-y-1 font-mono text-[11px]">
      <p className="font-semibold text-comment">Language</p>
      <p>JavaScript (Web Worker) or Python (subprocess)</p>
      <p className="font-semibold text-comment mt-2">voiden.request</p>
      <p>voiden.request.url — Read/write URL</p>
      <p>voiden.request.method — Read/write method</p>
      <p>voiden.request.headers — Accepts object map, single {'{key,value}'}, or array of {'{key,value}'} (push supported)</p>
      <p>voiden.request.body — Read/write body (string payload; stringify objects/JSON)</p>
      <p>voiden.request.queryParams — Accepts object map, single {'{key,value}'}, or array of {'{key,value}'}</p>
      <p>voiden.request.pathParams — Accepts object map, single {'{key,value}'}, or array of {'{key,value}'}</p>
      <p className="font-semibold text-comment mt-2">voiden.env</p>
      <p>JS: await voiden.env.get(key)</p>
      <p>Python: voiden.env.get(key)</p>
      <p className="font-semibold text-comment mt-2">voiden.variables</p>
      <p>JS: await voiden.variables.get(key) / .set(key, val)</p>
      <p>Python: voiden.variables.get(key) / .set(key, val)</p>
      <p className="font-semibold text-comment mt-2">Utilities</p>
      <p>voiden.log(message) or voiden.log(level, ...args) — level: log/info/debug/warn/error</p>
      <p>voiden.cancel() — Cancel the request</p>
    </div>
  </div>
);

export const PostScriptHelp = () => (
  <div className="text-xs space-y-2">
    <p className="font-semibold">Post-Response Script</p>
    <p>Runs after the response is received. Read response data and store variables.</p>
    <div className="space-y-1 font-mono text-[11px]">
      <p className="font-semibold text-comment">Language</p>
      <p>JavaScript (Web Worker) or Python (subprocess)</p>
      <p className="font-semibold text-comment mt-2">voiden.response</p>
      <p>voiden.response.status — Status code</p>
      <p>voiden.response.statusText — Status text</p>
      <p>voiden.response.headers — Response headers object</p>
      <p>voiden.response.body — Parsed response body</p>
      <p>voiden.response.time — Duration in ms</p>
      <p>voiden.response.size — Size in bytes</p>
      <p className="font-semibold text-comment mt-2">voiden.request (read-only)</p>
      <p>voiden.request.url, .method, .headers, .body (string payload; stringify objects/JSON)</p>
      <p className="font-semibold text-comment mt-2">voiden.env</p>
      <p>JS: await voiden.env.get(key)</p>
      <p>Python: voiden.env.get(key)</p>
      <p className="font-semibold text-comment mt-2">voiden.variables</p>
      <p>JS: await voiden.variables.get(key) / .set(key, val)</p>
      <p>Python: voiden.variables.get(key) / .set(key, val)</p>
      <p className="font-semibold text-comment mt-2">Utilities</p>
      <p>voiden.log(message) or voiden.log(level, ...args) — level: log/info/debug/warn/error</p>
    </div>
  </div>
);
