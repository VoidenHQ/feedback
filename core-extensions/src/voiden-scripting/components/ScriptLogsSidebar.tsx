/**
 * Sidebar panel that displays vd.log() output from script executions.
 */

import React from 'react';
import { scriptLogStore, LogEntry } from '../lib/logStore';

function useLogEntries() {
  const [entries, setEntries] = React.useState<LogEntry[]>(scriptLogStore.getEntries());
  React.useEffect(() => {
    return scriptLogStore.subscribe(() => setEntries(scriptLogStore.getEntries()));
  }, []);
  return entries;
}

function formatArg(arg: any): string {
  if (arg === null) return 'null';
  if (arg === undefined) return 'undefined';
  if (typeof arg === 'string') return arg;
  try {
    return JSON.stringify(arg, null, 2);
  } catch {
    return String(arg);
  }
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export const ScriptLogsSidebar = () => {
  const entries = useLogEntries();
  const bottomRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries.length]);

  return (
    <div className="flex flex-col h-full text-xs font-mono">
      {/* Header */}
      <div className="flex-none flex items-center justify-between px-2 py-1.5 border-b border-border bg-bg">
        <span className="text-comment text-[11px] font-semibold uppercase tracking-wide">Script Logs</span>
        {entries.length > 0 && (
          <button
            onClick={() => scriptLogStore.clear()}
            className="text-[11px] text-comment hover:text-text transition-colors px-1"
            style={{ cursor: 'pointer' }}
          >
            Clear
          </button>
        )}
      </div>

      {/* Entries */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {entries.length === 0 && (
          <div className="p-3 text-comment text-center text-[11px]">
            No script logs yet. Use <code className="text-text">vd.log()</code> in your scripts.
          </div>
        )}
        {entries.map((entry) => (
          <div key={entry.id} className="border-b border-border">
            {/* Phase + time label */}
            <div className="flex items-center gap-1.5 px-2 py-1 bg-bg">
              <span
                className={`text-[10px] font-semibold uppercase px-1 rounded ${
                  entry.phase === 'pre'
                    ? 'text-blue-400 bg-blue-400/10'
                    : 'text-green-400 bg-green-400/10'
                }`}
              >
                {entry.phase === 'pre' ? 'PRE' : 'POST'}
              </span>
              <span className="text-[10px] text-comment">{formatTime(entry.timestamp)}</span>
            </div>
            {/* Log lines */}
            {entry.logs.map((log, i) => (
              <div key={i} className="px-2 py-0.5 text-text whitespace-pre-wrap break-all leading-relaxed">
                {log.args.map((a) => formatArg(a)).join(' ')}
              </div>
            ))}
            {/* Error */}
            {entry.error && (
              <div className="px-2 py-0.5 text-red-400 whitespace-pre-wrap break-all leading-relaxed">
                {entry.error}
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};
