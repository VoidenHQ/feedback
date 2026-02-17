/**
 * Simple reactive log store for script execution output.
 * Pipeline hooks push entries here; the sidebar component subscribes.
 */

import type { ScriptLog } from './types';

export interface LogEntry {
  id: number;
  phase: 'pre' | 'post';
  timestamp: number;
  logs: ScriptLog[];
  error?: string;
  exitCode?: number;
}

type Listener = () => void;

let entries: LogEntry[] = [];
let nextId = 1;
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((fn) => fn());
}

export const scriptLogStore = {
  /** Push a new log batch from a script execution. */
  push(phase: 'pre' | 'post', logs: ScriptLog[], error?: string, exitCode?: number) {
    if (logs.length === 0 && !error) return;
    entries = [
      ...entries,
      { id: nextId++, phase, timestamp: Date.now(), logs, error, exitCode },
    ];
    notify();
  },

  /** Clear all log entries. */
  clear() {
    entries = [];
    notify();
  },

  /** Clear a single log entry by id. */
  clearById(id: number) {
    entries = entries.filter((entry) => entry.id !== id);
    notify();
  },

  /** Get current entries (snapshot). */
  getEntries(): LogEntry[] {
    return entries;
  },

  /** Subscribe to changes. Returns unsubscribe function. */
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
