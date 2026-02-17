/**
 * Exposed helpers for other plugins to use the scripting engine.
 *
 * Usage by other plugins:
 *   const scripting = context.helpers.from<ScriptingHelpers>('voiden-scripting');
 *   const result = await scripting.executeScript('voiden.log("hello")', requestState);
 */

import { executeScript } from './scriptEngine';
import { buildVdRequest, buildVdResponse } from './vdApi';
import type { VdApi, ScriptExecutionResult, ScriptLanguage } from './types';

export interface ScriptingHelpers {
  executeScript: (scriptBody: string, requestState?: any, responseState?: any, language?: ScriptLanguage) => Promise<ScriptExecutionResult>;
  createPreScriptBlock: (scriptBody: string, language?: ScriptLanguage) => { type: string; attrs: { body: string; language: string } };
  createPostScriptBlock: (scriptBody: string, language?: ScriptLanguage) => { type: string; attrs: { body: string; language: string } };
}

export const scriptingHelpers: ScriptingHelpers = {
  /**
   * Execute a script programmatically with optional request/response context.
   */
  executeScript: async (
    scriptBody: string,
    requestState?: any,
    responseState?: any,
    language: ScriptLanguage = 'javascript',
  ): Promise<ScriptExecutionResult> => {
    const vdRequest = requestState
      ? buildVdRequest(requestState)
      : { url: '', method: 'GET', headers: {}, body: null, queryParams: {}, pathParams: {} };

    const vdResponse = responseState ? buildVdResponse(responseState) : undefined;

    const vdApi: VdApi = {
      request: vdRequest,
      response: vdResponse,
      env: { get: async () => undefined },
      variables: { get: async () => undefined, set: async () => {} },
      log: () => {},
      cancel: () => {},
    };

    return executeScript(scriptBody, vdApi, language);
  },

  /**
   * Create a pre_script block JSON for programmatic insertion into the editor.
   */
  createPreScriptBlock: (scriptBody: string, language: ScriptLanguage = 'javascript') => ({
    type: 'pre_script',
    attrs: { body: scriptBody, language },
  }),

  /**
   * Create a post_script block JSON for programmatic insertion into the editor.
   */
  createPostScriptBlock: (scriptBody: string, language: ScriptLanguage = 'javascript') => ({
    type: 'post_script',
    attrs: { body: scriptBody, language },
  }),
};
