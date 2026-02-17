/**
 * Inline ghost-text suggestions for the `voiden` scripting API.
 *
 * Self-limiting: only triggers when user types `voiden.` (or `voiden.`) so it won't
 * interfere with JSON body editors or other CodeMirror instances.
 */

import { keymap, EditorView, Decoration, DecorationSet, WidgetType } from '@codemirror/view';
import { Extension, RangeSetBuilder, StateField, EditorState, Prec } from '@codemirror/state';

interface VdCompletion {
  /** Dot-separated path (e.g. "request.url") */
  path: string;
  /** CodeMirror completion type (property, function, method, keyword) */
  type: string;
  /** Short type/return info shown to the right */
  detail: string;
  /** Longer description shown in the info popup */
  info: string;
  /** Text to apply when selected (overrides label if set) */
  apply?: string;
  /** Boost priority (higher = shown first) */
  boost?: number;
  /** Only available in post-script (has voiden.response) */
  postOnly?: boolean;
}

const VD_COMPLETIONS: VdCompletion[] = [
  // ── Top-level ──────────────────────────────────────────────
  { path: 'request',   type: 'keyword',  detail: 'object',   info: 'Request data (url, method, headers, body, queryParams, pathParams)', boost: 100 },
  { path: 'response',  type: 'keyword',  detail: 'object',   info: 'Response data (status, statusText, headers, body, time, size)', boost: 99, postOnly: true },
  { path: 'env',       type: 'keyword',  detail: 'object',   info: 'Environment access (get)', boost: 98 },
  { path: 'variables', type: 'keyword',  detail: 'object',   info: 'Runtime variable access (get, set)', boost: 97 },
  { path: 'log',       type: 'function', detail: '(message | level, ...args)', info: 'Log output. Examples: voiden.log("hello"), voiden.log("warn", "rate limited")', apply: 'log(levelOrMessage, ...args)', boost: 96 },
  { path: 'assert',    type: 'function', detail: '(actual, operator, expectedValue, message?)', info: 'Assertion API. Example: voiden.assert(response.status, "==", 200, "Status OK")', apply: 'assert(actual, operator, expectedValue, message)', boost: 91 },
  { path: 'cancel',    type: 'function', detail: '()',        info: 'Cancel the request (pre-script only)', apply: 'cancel()', boost: 90 },

  // ── voiden.request.* ──────────────────────────────────────
  { path: 'request.url',         type: 'property', detail: 'string',              info: 'Request URL — read/write' },
  { path: 'request.method',      type: 'property', detail: 'string',              info: 'HTTP method (GET, POST, etc.) — read/write' },
  { path: 'request.headers',     type: 'property', detail: 'map | {key,value} | {key,value}[]', info: 'Request headers — supports map, single {key,value}, or array of {key,value} (push supported)' },
  { path: 'request.headers.push', type: 'method', detail: '(item: {key, value, enabled?})', info: 'Append a header entry. Example: voiden.request.headers.push({ key: "X-Trace", value: "abc" })', apply: 'request.headers.push({ key: "", value: "" })' },
  { path: 'request.body',        type: 'property', detail: 'any',                 info: 'Request body (string or parsed object) — read/write' },
  { path: 'request.queryParams', type: 'property', detail: 'map | {key,value} | {key,value}[]', info: 'Query params — supports map, single {key,value}, or array of {key,value}' },
  { path: 'request.queryParams.push', type: 'method', detail: '(item: {key, value, enabled?})', info: 'Append a query param. Example: voiden.request.queryParams.push({ key: "page", value: "1" })', apply: 'request.queryParams.push({ key: "", value: "" })' },
  { path: 'request.pathParams',  type: 'property', detail: 'map | {key,value} | {key,value}[]', info: 'Path params — supports map, single {key,value}, or array of {key,value}' },
  { path: 'request.pathParams.push', type: 'method', detail: '(item: {key, value, enabled?})', info: 'Append a path param. Example: voiden.request.pathParams.push({ key: "id", value: "123" })', apply: 'request.pathParams.push({ key: "", value: "" })' },

  // ── voiden.response.* ─────────────────────────────────────
  { path: 'response.status',     type: 'property', detail: 'number', info: 'HTTP status code (e.g. 200, 404)', postOnly: true },
  { path: 'response.statusText', type: 'property', detail: 'string', info: 'HTTP status text (e.g. "OK", "Not Found")', postOnly: true },
  { path: 'response.headers',    type: 'property', detail: 'Record<string,string>', info: 'Response headers object', postOnly: true },
  { path: 'response.body',       type: 'property', detail: 'any',    info: 'Parsed response body (JSON object, string, etc.)', postOnly: true },
  { path: 'response.time',       type: 'property', detail: 'number', info: 'Response time in milliseconds', postOnly: true },
  { path: 'response.size',       type: 'property', detail: 'number', info: 'Response size in bytes', postOnly: true },

  // ── voiden.env.* ─────────────────────────────────────────
  { path: 'env.get', type: 'method', detail: '(key: string) → Promise<any>', info: 'Read value from active environment. Usage: await voiden.env.get("API_KEY")', apply: 'env.get(key)', boost: 89 },

  // ── voiden.variables.* ────────────────────────────────────
  { path: 'variables.get', type: 'method', detail: '(key: string) → Promise<any>', info: 'Get a runtime variable from .voiden/.process.env.json. Usage: await voiden.variables.get("token")', apply: 'variables.get(key)', boost: 88 },
  { path: 'variables.set', type: 'method', detail: '(key: string, value: any) → Promise<void>', info: 'Set a runtime variable. Usage: await voiden.variables.set("token", response.body.token)', apply: 'variables.set(key, value)', boost: 87 },
];

/**
 * Computes inline suggestion data from the current cursor position.
 */
function getVdInlineSuggestion(state: EditorState): { from: number; text: string } | null {
  const selection = state.selection.main;
  if (!selection.empty) {
    return null;
  }

  const pos = selection.head;
  const nextChar = state.sliceDoc(pos, pos + 1);
  // Don't show inline hint when cursor is in the middle of an identifier/path.
  if (/[a-zA-Z.]/.test(nextChar)) {
    return null;
  }

  const beforeCursor = state.sliceDoc(Math.max(0, pos - 120), pos);
  const match = beforeCursor.match(/\bvoiden\.([a-zA-Z.]*)$/);

  if (!match) {
    return null;
  }

  const partialPath = match[1];
  const partialLower = partialPath.toLowerCase();

  const candidates = VD_COMPLETIONS
    .filter((c) => c.path.toLowerCase().startsWith(partialLower))
    .sort((a, b) => {
      const boostDiff = (b.boost ?? 0) - (a.boost ?? 0);
      if (boostDiff !== 0) return boostDiff;
      return a.path.length - b.path.length;
    });

  if (candidates.length === 0) {
    return null;
  }

  const best = candidates[0];
  const applyText = best.apply ?? best.path;
  const applyLower = applyText.toLowerCase();

  if (!applyLower.startsWith(partialLower)) {
    return null;
  }

  const remaining = applyText.slice(partialPath.length);
  if (!remaining) {
    return null;
  }

  return {
    from: pos,
    text: remaining,
  };
}

class InlineSuggestionWidget extends WidgetType {
  constructor(private readonly text: string) {
    super();
  }

  toDOM() {
    const span = document.createElement('span');
    span.className = 'cm-vd-inline-suggestion';
    span.textContent = this.text;
    return span;
  }
}

/**
 * Creates inline suggestion extension for vd API.
 * Press Tab to accept the ghost suggestion.
 */
export function vdAutocomplete(): Extension {
  const inlineSuggestionField = StateField.define<DecorationSet>({
    create(state) {
      const suggestion = getVdInlineSuggestion(state);
      if (!suggestion) return Decoration.none;

      const builder = new RangeSetBuilder<Decoration>();
      builder.add(
        suggestion.from,
        suggestion.from,
        Decoration.widget({
          widget: new InlineSuggestionWidget(suggestion.text),
          side: 1,
        }),
      );
      return builder.finish();
    },
    update(_, tr) {
      const suggestion = getVdInlineSuggestion(tr.state);
      if (!suggestion) return Decoration.none;

      const builder = new RangeSetBuilder<Decoration>();
      builder.add(
        suggestion.from,
        suggestion.from,
        Decoration.widget({
          widget: new InlineSuggestionWidget(suggestion.text),
          side: 1,
        }),
      );
      return builder.finish();
    },
    provide: (f) => EditorView.decorations.from(f),
  });

  const acceptSuggestionKeymap = Prec.highest(keymap.of([
    {
      key: 'Tab',
      run: (view) => {
        const suggestion = getVdInlineSuggestion(view.state);
        if (!suggestion) {
          return false;
        }

        const pos = view.state.selection.main.head;
        const inserted = suggestion.text;
        const end = pos + inserted.length;
        view.dispatch({
          changes: { from: pos, to: pos, insert: inserted },
          selection: { anchor: end, head: end },
          scrollIntoView: true,
        });
        return true;
      },
    },
  ]));

  const inlineSuggestionTheme = EditorView.baseTheme({
    '.cm-vd-inline-suggestion': {
      color: 'var(--fg-secondary)',
      opacity: '0.65',
      pointerEvents: 'none',
      fontStyle: 'italic',
    },
  });

  return [inlineSuggestionField, acceptSuggestionKeymap, inlineSuggestionTheme];
}
