/**
 * Example usage of the Voiden logging system
 *
 * This file demonstrates how to use the logger with runtime control
 */

import { requestLogger, editorLogger, extensionLogger } from './logger';

// Example 1: Request logging
export function sendHttpRequest(url: string) {
  requestLogger.info('Sending request to:', url);
  requestLogger.debug('Request headers:', { 'Content-Type': 'application/json' });

  try {
    // ... do request ...
    requestLogger.info('Request completed successfully');
  } catch (error) {
    requestLogger.error('Request failed:', error);
  }
}

// Example 2: Editor logging
export function handleEditorChange() {
  editorLogger.debug('Editor content changed');
  editorLogger.info('Saving draft...');
}

// Example 3: Extension logging
export function loadExtension(name: string) {
  extensionLogger.info('Loading extension:', name);
  extensionLogger.warn('Extension using deprecated API');
}

/**
 * Try in browser console:
 *
 * // Default: All logs shown (in development)
 * sendHttpRequest('/api/data')
 *
 * // Only show request logs
 * voidenLog.enable('Request')
 * sendHttpRequest('/api/data')  // ✅ Shows
 * handleEditorChange()          // ❌ Hidden
 *
 * // Only show editor logs
 * voidenLog.enable('Editor')
 * sendHttpRequest('/api/data')  // ❌ Hidden
 * handleEditorChange()          // ✅ Shows
 *
 * // Show multiple
 * voidenLog.enable('Request,Editor')
 * sendHttpRequest('/api/data')  // ✅ Shows
 * handleEditorChange()          // ✅ Shows
 * loadExtension('test')         // ❌ Hidden
 *
 * // Show everything
 * voidenLog.enableAll()
 *
 * // Hide everything (except errors)
 * voidenLog.disable()
 */
