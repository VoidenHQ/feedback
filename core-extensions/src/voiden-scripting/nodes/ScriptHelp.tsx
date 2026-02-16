import React from "react";

export const PreScriptHelp = () => (
  <div className="text-xs space-y-2">
    <p className="font-semibold">Pre-Request Script</p>
    <p>Runs before the request is sent. Modify headers, URL, body, or cancel the request.</p>
    <div className="space-y-1 font-mono text-[11px]">
      <p className="font-semibold text-comment">Language</p>
      <p>JavaScript (Web Worker) or Python (subprocess)</p>
      <p className="font-semibold text-comment mt-2">vd.request</p>
      <p>vd.request.url — Read/write URL</p>
      <p>vd.request.method — Read/write method</p>
      <p>vd.request.headers — Read/write headers object</p>
      <p>vd.request.body — Read/write body</p>
      <p>vd.request.queryParams — Read/write query params</p>
      <p>vd.request.pathParams — Read/write path params</p>
      <p className="font-semibold text-comment mt-2">vd.env / vd.variables</p>
      <p>JS: await vd.env.get(key) — Get env variable</p>
      <p>JS: await vd.variables.get(key) / .set(key, val)</p>
      <p>Python: vd.env.get(key) — synchronous</p>
      <p>Python: vd.variables.get(key) / .set(key, val)</p>
      <p className="font-semibold text-comment mt-2">Utilities</p>
      <p>vd.log(...args) — Log output</p>
      <p>vd.cancel() — Cancel the request</p>
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
      <p className="font-semibold text-comment mt-2">vd.response</p>
      <p>vd.response.status — Status code</p>
      <p>vd.response.statusText — Status text</p>
      <p>vd.response.headers — Response headers object</p>
      <p>vd.response.body — Parsed response body</p>
      <p>vd.response.time — Duration in ms</p>
      <p>vd.response.size — Size in bytes</p>
      <p className="font-semibold text-comment mt-2">vd.request (read-only)</p>
      <p>vd.request.url, .method, .headers, .body</p>
      <p className="font-semibold text-comment mt-2">vd.env / vd.variables</p>
      <p>JS: await vd.env.get(key) — Get env variable</p>
      <p>JS: await vd.variables.get(key) / .set(key, val)</p>
      <p>Python: vd.env.get(key) — synchronous</p>
      <p>Python: vd.variables.get(key) / .set(key, val)</p>
      <p className="font-semibold text-comment mt-2">Utilities</p>
      <p>vd.log(...args) — Log output</p>
    </div>
  </div>
);
