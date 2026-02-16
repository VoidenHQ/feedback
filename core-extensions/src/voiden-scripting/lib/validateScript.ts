/**
 * Static validation for script bodies.
 * Detects async vd methods called without 'await' before execution.
 */

export interface ScriptValidationError {
  line: number;
  column: number;
  method?: string;
  message: string;
  severity?: 'error' | 'warning' | 'info';
}

/** vd methods that return Promises and require 'await'. */
const ASYNC_VD_METHODS = [
  'vd.variables.set',
  'vd.variables.get',
  'vd.env.get',
];

/** Supported function calls exposed by the scripting runtime. */
const SUPPORTED_VD_CALLS = new Set([
  'vd.variables.set',
  'vd.variables.get',
  'vd.env.get',
  'vd.log',
  'vd.cancel',
]);

function isLikelyPlainTextLine(trimmedLine: string, language: 'javascript' | 'python'): boolean {
  if (!trimmedLine) return false;

  const jsKeywords = /^(const|let|var|if|else|for|while|do|return|await|async|function|try|catch|finally|throw|switch|case|break|continue|class|new|import|export|vd)\b/;
  const pyKeywords = /^(if|elif|else|for|while|return|await|async|def|class|try|except|finally|raise|import|from|pass|break|continue|lambda|with|vd)\b/;
  const keywordPattern = language === 'javascript' ? jsKeywords : pyKeywords;

  if (keywordPattern.test(trimmedLine)) return false;

  // If it clearly contains strong code symbols, treat as code.
  if (/[=()[\]{};+*/%<>$&|]/.test(trimmedLine)) return false;
  // Obvious call/access patterns should not be treated as plain text.
  if (/^[A-Za-z_$][\w$]*(\.[A-Za-z_$][\w$]*)+\s*(\(|$)/.test(trimmedLine)) return false;
  if (/^[A-Za-z_$][\w$]*\s*\(/.test(trimmedLine)) return false;

  // Allow sentence punctuation and detect prose-like content.
  const normalized = trimmedLine.replace(/[.,!?;:]+$/g, '').trim();
  if (!normalized) return false;

  // Two or more words with letters and spaces are likely accidental prose.
  if (/^[A-Za-z][A-Za-z0-9_'"\-]*(\s+[A-Za-z0-9_'"\-]+)+$/.test(normalized)) {
    return true;
  }

  // Single-word bare identifiers can still be accidental text in scripts.
  // Keep this conservative to avoid false positives.
  return /^[A-Za-z]{3,}$/.test(normalized);
}

function findVdCalls(line: string): Array<{ method: string; column: number }> {
  const calls: Array<{ method: string; column: number }> = [];
  const regex = /(^|[^.\w])(vd(?:\.[A-Za-z_$][\w$]*)+)\s*\(/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(line)) !== null) {
    const prefixLen = match[1]?.length ?? 0;
    const method = match[2];
    const column = match.index + prefixLen + 1;
    calls.push({ method, column });
  }

  return calls;
}

/**
 * Remove single-line comments (//) and block comments from a line,
 * respecting string literals so commented-out code inside strings isn't stripped.
 */
function stripLineComments(line: string): string {
  let result = '';
  let inString: string | null = null;
  let escaped = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (escaped) {
      result += ch;
      escaped = false;
      continue;
    }
    if (ch === '\\' && inString) {
      result += ch;
      escaped = true;
      continue;
    }
    if (inString) {
      result += ch;
      if (ch === inString) inString = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      inString = ch;
      result += ch;
      continue;
    }
    // Single-line comment — skip rest of line
    if (ch === '/' && i + 1 < line.length && line[i + 1] === '/') {
      break;
    }
    result += ch;
  }

  return result;
}

/**
 * Validate a JavaScript script body for unawaited async vd calls.
 * Returns an array of errors (empty = valid).
 */
export function validateScript(scriptBody: string): ScriptValidationError[] {
  if (!scriptBody || !scriptBody.trim()) return [];

  const errors: ScriptValidationError[] = [];
  const lines = scriptBody.split('\n');
  let inBlockComment = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Handle block comments
    if (inBlockComment) {
      const endIdx = line.indexOf('*/');
      if (endIdx === -1) continue; // entire line is inside block comment
      line = line.substring(endIdx + 2);
      inBlockComment = false;
    }

    // Strip block comment starts within this line
    let cleaned = '';
    let j = 0;
    while (j < line.length) {
      if (line[j] === '/' && j + 1 < line.length && line[j + 1] === '*') {
        const endIdx = line.indexOf('*/', j + 2);
        if (endIdx === -1) {
          inBlockComment = true;
          break;
        }
        j = endIdx + 2;
        continue;
      }
      cleaned += line[j];
      j++;
    }
    if (inBlockComment) continue;

    // Strip single-line comments (respecting strings)
    cleaned = stripLineComments(cleaned);
    const trimmed = cleaned.trim();
    if (!trimmed) continue;

    if (isLikelyPlainTextLine(trimmed, 'javascript')) {
      errors.push({
        line: i + 1,
        column: 1,
        severity: 'warning',
        message: "This line looks like plain text. Comment it with '//' or wrap it in quotes.",
      });
    }

    // Check for each async method
    for (const method of ASYNC_VD_METHODS) {
      let searchFrom = 0;
      while (true) {
        const methodIdx = cleaned.indexOf(method + '(', searchFrom);
        if (methodIdx === -1) break;

        // Check if 'await' appears before this call in the same line portion
        const before = cleaned.substring(0, methodIdx);
        // Look for 'await' as the last keyword token before the method call
        // This matches: `await vd.`, `= await vd.`, `(await vd.`, etc.
        const hasAwait = /\bawait\s+$/.test(before);

        if (!hasAwait) {
          errors.push({
            line: i + 1,
            column: methodIdx + 1,
            method,
            message: `'${method}()' must be called with 'await'. Example: await ${method}(...)`,
          });
        }

        searchFrom = methodIdx + method.length;
      }
    }

    // Detect unknown vd function calls.
    for (const call of findVdCalls(cleaned)) {
      if (!SUPPORTED_VD_CALLS.has(call.method)) {
        errors.push({
          line: i + 1,
          column: call.column,
          method: call.method,
          message: `Unknown function '${call.method}()'. Supported: vd.env.get, vd.variables.get/set, vd.log, vd.cancel.`,
        });
      }
    }
  }

  return errors;
}

/**
 * Validate a Python script body with lightweight static checks.
 * Returns an array of errors (empty = valid).
 */
export function validatePythonScript(scriptBody: string): ScriptValidationError[] {
  if (!scriptBody || !scriptBody.trim()) return [];

  const errors: ScriptValidationError[] = [];
  const lines = scriptBody.split('\n');
  const stack: Array<{ ch: string; line: number; column: number }> = [];
  const openToClose: Record<string, string> = { '(': ')', '[': ']', '{': '}' };
  const closeToOpen: Record<string, string> = { ')': '(', ']': '[', '}': '{' };

  const stripPyComments = (line: string): string => {
    let result = '';
    let inString: string | null = null;
    let escaped = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (escaped) {
        result += ch;
        escaped = false;
        continue;
      }
      if (ch === '\\' && inString) {
        result += ch;
        escaped = true;
        continue;
      }
      if (inString) {
        result += ch;
        if (ch === inString) inString = null;
        continue;
      }
      if (ch === '"' || ch === "'") {
        inString = ch;
        result += ch;
        continue;
      }
      if (ch === '#') break;
      result += ch;
    }
    return result;
  };

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const cleaned = stripPyComments(raw);
    const trimmed = cleaned.trim();
    if (!trimmed) continue;

    if (isLikelyPlainTextLine(trimmed, 'python')) {
      errors.push({
        line: i + 1,
        column: 1,
        severity: 'warning',
        message: "This line looks like plain text. Comment it with '#' or wrap it in quotes.",
      });
    }

    // Python scripts are executed synchronously in this runtime.
    const awaitIdx = cleaned.indexOf('await ');
    if (awaitIdx >= 0) {
      errors.push({
        line: i + 1,
        column: awaitIdx + 1,
        message: "Python scripts run synchronously here; remove 'await'.",
      });
    }

    // Detect mixed tab/space indentation (common source of Python errors).
    const indentMatch = raw.match(/^[\t ]+/);
    if (indentMatch && indentMatch[0].includes('\t') && indentMatch[0].includes(' ')) {
      errors.push({
        line: i + 1,
        column: 1,
        message: 'Mixed tabs and spaces in indentation.',
      });
    }

    // Bracket pairing checks.
    let inString: string | null = null;
    let escaped = false;
    for (let j = 0; j < cleaned.length; j++) {
      const ch = cleaned[j];
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === '\\' && inString) {
        escaped = true;
        continue;
      }
      if (inString) {
        if (ch === inString) inString = null;
        continue;
      }
      if (ch === '"' || ch === "'") {
        inString = ch;
        continue;
      }

      if (openToClose[ch]) {
        stack.push({ ch, line: i + 1, column: j + 1 });
      } else if (closeToOpen[ch]) {
        const last = stack[stack.length - 1];
        if (!last || last.ch !== closeToOpen[ch]) {
          errors.push({
            line: i + 1,
            column: j + 1,
            message: `Unexpected '${ch}'.`,
          });
        } else {
          stack.pop();
        }
      }
    }

    // Detect unknown vd function calls.
    for (const call of findVdCalls(cleaned)) {
      if (!SUPPORTED_VD_CALLS.has(call.method)) {
        errors.push({
          line: i + 1,
          column: call.column,
          method: call.method,
          message: `Unknown function '${call.method}()'. Supported: vd.env.get, vd.variables.get/set, vd.log, vd.cancel.`,
        });
      }
    }
  }

  for (const unclosed of stack) {
    errors.push({
      line: unclosed.line,
      column: unclosed.column,
      message: `Unclosed '${unclosed.ch}'.`,
    });
  }

  return errors;
}
