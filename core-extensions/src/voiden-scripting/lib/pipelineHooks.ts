/**
 * Pipeline hooks for the scripting extension.
 *
 * Three hooks:
 * 1. pre-processing (priority 5) — captures editor document
 * 2. pre-send (priority 15) — executes pre-request script
 * 3. post-processing (priority 25) — executes post-response script
 */

import { executeScript } from './scriptEngine';
import { buildVdRequest, buildVdResponse, applyVdRequestToState, applyVdResponseToState, buildVariablesApi } from './vdApi';
import { validatePythonScript, validateScript } from './validateScript';
import { scriptLogStore } from './logStore';
import type { VdApi, ScriptLanguage } from './types';

/** Module-level cache of the editor document captured during pre-processing. */
let cachedEditorDocument: any = null;

/**
 * Extract script body and language from editor document for a given node type.
 * Traverses the document tree and returns the body + language of the last matching node.
 */
function extractScriptFromDoc(doc: any, nodeType: string): { body: string; language: ScriptLanguage } | null {
  if (!doc || !doc.content) return null;

  let result: { body: string; language: ScriptLanguage } | null = null;

  function traverse(node: any) {
    if (node.type === nodeType && node.attrs?.body) {
      result = {
        body: node.attrs.body,
        language: node.attrs.language || 'javascript',
      };
    }
    if (node.content && Array.isArray(node.content)) {
      node.content.forEach((child: any) => traverse(child));
    }
  }

  traverse(doc);
  return result;
}

/**
 * Strip comments from script body based on language.
 */
function stripComments(body: string, language: ScriptLanguage): string {
  if (language === 'python') {
    return body.replace(/#.*$/gm, '').trim();
  }
  return body.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '').trim();
}

/**
 * Format runtime script errors with line/column when available.
 * Keeps message concise for toast + response panel surfaces.
 */
function formatScriptRuntimeError(rawError: unknown, scriptBody: string, language: ScriptLanguage): string {
  const text = String(rawError || '').trim();
  if (!text) return 'Script execution failed';

  const firstLine = text.split('\n').find(Boolean)?.trim() || 'Script execution failed';
  const scriptLineCount = scriptBody.split('\n').length;

  let line: number | undefined;
  let column: number | undefined;

  const jsAnonymousMatch = text.match(/<anonymous>:(\d+):(\d+)/);
  if (jsAnonymousMatch) {
    line = Number(jsAnonymousMatch[1]);
    column = Number(jsAnonymousMatch[2]);
  }

  const pythonLineMatch = text.match(/line\s+(\d+)/i);
  if (!line && pythonLineMatch) {
    line = Number(pythonLineMatch[1]);
  }

  // AsyncFunction stacks can include wrapper offset; normalize if obviously outside script body.
  if (language === 'javascript' && line && line > scriptLineCount) {
    if (line - 2 > 0 && line - 2 <= scriptLineCount) {
      line -= 2;
    } else if (line - 1 > 0 && line - 1 <= scriptLineCount) {
      line -= 1;
    }
  }

  if (line && line > 0) {
    return `Line ${line}${column ? `:${column}` : ''}: ${firstLine}`;
  }

  return firstLine;
}

/**
 * Pre-processing hook: Capture editor document with expanded linked blocks.
 * Checks if already set by another extension (e.g. simple-assertions) to avoid overwriting.
 */
export async function preProcessingScriptHook(context: any): Promise<void> {
  if (!context.editor) return;

  if (!context.requestState) {
    return;
  }
  if (!context.requestState.metadata) {
    context.requestState.metadata = {};
  }

  // Don't overwrite if another extension already captured the document
  if (context.requestState.metadata.editorDocument) {
    cachedEditorDocument = context.requestState.metadata.editorDocument;
    return;
  }

  let editorJson = context.editor.getJSON();

  try {
    // @ts-ignore - Path resolved at runtime in app context
    const { expandLinkedBlocksInDoc } = await import(/* @vite-ignore */ '@/core/editors/voiden/utils/expandLinkedBlocks');
    editorJson = await expandLinkedBlocksInDoc(editorJson);
  } catch {
    // Continue with unexpanded document
  }

  context.requestState.metadata.editorDocument = editorJson;
  cachedEditorDocument = editorJson;
}

/**
 * Pre-send hook: Execute pre-request script.
 * Runs after faker (priority 10) so scripts see faker-replaced values.
 */
export async function preSendScriptHook(context: any): Promise<void> {
  const { requestState } = context;
  const doc = cachedEditorDocument;
  if (!doc) return;

  const scriptInfo = extractScriptFromDoc(doc, 'pre_script');
  if (!scriptInfo || !scriptInfo.body.trim()) return;

  const { body: scriptBody, language } = scriptInfo;

  // Skip comment-only scripts
  const stripped = stripComments(scriptBody, language);
  if (!stripped) return;

  // Block execution if static validation fails
  if (language === 'javascript' || language === 'python') {
    const errors = language === 'python'
      ? validatePythonScript(scriptBody)
      : validateScript(scriptBody);
    const blockingErrors = errors.filter((e) => (e.severity || 'error') === 'error');
    if (blockingErrors.length > 0) {
      if (!requestState.metadata) requestState.metadata = {};
      const msg = blockingErrors.map(e => `Line ${e.line}: ${e.message}`).join('\n');
      requestState.metadata.preScriptError = `Script validation failed:\n${msg}`;
      throw new Error(`Pre-request script blocked: ${blockingErrors[0].message}`);
    }
  }

  const vdRequest = buildVdRequest(requestState);
  const variablesApi = buildVariablesApi();

  const vdApi: VdApi = {
    request: vdRequest,
    response: undefined,
    variables: variablesApi,
    log: () => {},
    cancel: () => {},
  };

  const result = await executeScript(scriptBody, vdApi, language);

  // Apply request modifications back to pipeline state
  if (result.success && result.modifiedRequest) {
    applyVdRequestToState(result.modifiedRequest, requestState);
  }

  // Store logs and errors in metadata
  if (!requestState.metadata) requestState.metadata = {};
  requestState.metadata.preScriptLogs = result.logs;
  const preError = (result.error || result.success === false)
    ? formatScriptRuntimeError(result.error, scriptBody, language)
    : undefined;
  if (preError) requestState.metadata.preScriptError = preError;

  // Store assertion results
  if (result.assertions && result.assertions.length > 0) {
    const total = result.assertions.length;
    const passed = result.assertions.filter(a => a.passed).length;
    requestState.metadata.preScriptAssertions = {
      results: result.assertions,
      totalAssertions: total,
      passedAssertions: passed,
      failedAssertions: total - passed,
    };
  }

  // Push to sidebar log store
  scriptLogStore.push('pre', result.logs, preError, result.exitCode);

  // Handle cancellation
  if (result.cancelled) {
    requestState.metadata.scriptCancelled = true;
    throw new Error('Request cancelled by pre-request script');
  }
}

/**
 * Post-processing hook: Execute post-response script.
 * Runs after assertions (priority 15) so scripts can read assertion results.
 */
export async function postProcessScriptHook(context: any): Promise<void> {
  const { requestState, responseState } = context;
  const doc = cachedEditorDocument;

  // Always carry pre-script assertions into response metadata, even when no post script runs.
  if (!responseState.metadata) responseState.metadata = {};
  if (!responseState.metadata.scriptAssertionResults && requestState?.metadata?.preScriptAssertions) {
    responseState.metadata.scriptAssertionResults = requestState.metadata.preScriptAssertions;
  }

  if (!doc) return;

  const scriptInfo = extractScriptFromDoc(doc, 'post_script');
  if (!scriptInfo || !scriptInfo.body.trim()) return;

  const { body: scriptBody, language } = scriptInfo;

  // Skip comment-only scripts
  const stripped = stripComments(scriptBody, language);
  if (!stripped) return;

  // Block execution if static validation fails
  if (language === 'javascript' || language === 'python') {
    const errors = language === 'python'
      ? validatePythonScript(scriptBody)
      : validateScript(scriptBody);
    const blockingErrors = errors.filter((e) => (e.severity || 'error') === 'error');
    if (blockingErrors.length > 0) {
      const msg = blockingErrors.map(e => `Line ${e.line}: ${e.message}`).join('\n');
      responseState.metadata.postScriptError = `Script validation failed:\n${msg}`;
      return;
    }
  }

  const vdRequest = buildVdRequest(requestState);
  const vdResponse = buildVdResponse(responseState);
  const variablesApi = buildVariablesApi();

  const vdApi: VdApi = {
    request: vdRequest,
    response: vdResponse,
    variables: variablesApi,
    log: () => {},
    cancel: () => {},
  };

  const result = await executeScript(scriptBody, vdApi, language);

  // Apply response modifications back to pipeline state
  if (result.success && result.modifiedResponse) {
    applyVdResponseToState(result.modifiedResponse, responseState);
  }

  // Store logs and errors in response metadata
  responseState.metadata.postScriptLogs = result.logs;
  const postError = (result.error || result.success === false)
    ? String(result.error || 'Script execution failed')
    : undefined;
  if (postError) responseState.metadata.postScriptError = postError;

  // Store assertion results (merge pre + post)
  if (result.assertions && result.assertions.length > 0) {
    const preAssertions = requestState?.metadata?.preScriptAssertions;
    const allResults = [
      ...(preAssertions?.results || []),
      ...result.assertions,
    ];
    const total = allResults.length;
    const passed = allResults.filter((a: any) => a.passed).length;
    responseState.metadata.scriptAssertionResults = {
      results: allResults,
      totalAssertions: total,
      passedAssertions: passed,
      failedAssertions: total - passed,
    };
  }

  // Push to sidebar log store
  scriptLogStore.push('post', result.logs, postError, result.exitCode);

  // Clear cached document after post-processing
  cachedEditorDocument = null;
}
