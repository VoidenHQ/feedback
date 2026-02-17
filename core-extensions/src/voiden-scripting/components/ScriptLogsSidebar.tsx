/**
 * Sidebar panel that displays voiden.log() output from script executions.
 */

import React from 'react';
import { Check, Copy, Trash2 } from 'lucide-react';
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

type LevelFilter = 'all' | 'log' | 'info' | 'debug' | 'warn' | 'error';

export const ScriptLogsSidebar = () => {
  const entries = useLogEntries();
  const bottomRef = React.useRef<HTMLDivElement>(null);
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null);
  const [levelFilter, setLevelFilter] = React.useState<LevelFilter>('all');

  const matchesLevelFilter = React.useCallback((level: string) => {
    const normalized = String(level || 'log').toLowerCase();
    if (levelFilter === 'all') return true;
    return normalized === levelFilter;
  }, [levelFilter]);

  const filteredEntries = React.useMemo(() => {
    return entries.filter((entry) => {
      const hasMatchingLogs = entry.logs.some((log) => matchesLevelFilter(log.level || 'log'));
      const hasMatchingError = Boolean(entry.error) && matchesLevelFilter('error');
      return hasMatchingLogs || hasMatchingError;
    });
  }, [entries, matchesLevelFilter]);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries.length]);

  const copyText = React.useCallback(async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => {
        setCopiedKey((prev) => (prev === key ? null : prev));
      }, 1200);
    } catch {
      // Ignore clipboard failures in restricted contexts.
    }
  }, []);

  return (
    <div className="flex flex-col h-full text-xs font-mono">
      {/* Header */}
      <div className="flex-none flex items-center justify-between px-2 py-1.5 border-b border-border bg-bg">
        <span className="text-comment text-[11px] font-semibold uppercase tracking-wide">Script Logs</span>
        {entries.length > 0 && (
          <button
            onClick={() => scriptLogStore.clear()}
            className="text-comment hover:text-text transition-colors p-1 rounded"
            title="Clear all logs"
            style={{ cursor: 'pointer' }}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <div className="flex-none flex items-center gap-1 px-2 py-1 border-b border-border bg-bg">
        {(['all', 'log', 'info', 'debug', 'warn', 'error'] as LevelFilter[]).map((option) => (
          <button
            key={option}
            onClick={() => setLevelFilter(option)}
            className={`text-[10px] px-1.5 py-0.5 rounded uppercase ${
              levelFilter === option ? 'text-text bg-border' : 'text-comment hover:text-text'
            }`}
            style={{ cursor: 'pointer' }}
          >
            {option}
          </button>
        ))}
      </div>

      {/* Entries */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {filteredEntries.length === 0 && (
          <div className="p-3 text-comment text-center text-[11px]">
            {entries.length === 0 ? (
              <>No script logs yet. Use <code className="text-text">voiden.log(...)</code> or leveled logs like <code className="text-text">voiden.log("error", ...)</code>.</>
            ) : (
              <>No logs for the selected level filter.</>
            )}
          </div>
        )}
        {filteredEntries.map((entry) => (
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
              {entry.exitCode !== undefined && (
                <span className="text-[10px] font-semibold px-1 rounded text-comment">
                  Exit: {entry.exitCode}
                </span>
              )}
              <button
                onClick={() => scriptLogStore.clearById(entry.id)}
                className="ml-auto text-comment hover:text-text transition-colors p-1 rounded"
                title="Clear this log entry"
                style={{ cursor: 'pointer' }}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            {/* Log lines */}
            {entry.logs.map((log, i) => {
              if (!matchesLevelFilter(log.level || 'log')) return null;
              const lineText = log.args.map((a) => formatArg(a)).join(' ');
              const key = `${entry.id}-log-${i}`;
              const copied = copiedKey === key;
              const level = log.level || 'log';
              const levelClass =
                level === 'error'
                  ? 'text-red-400 bg-red-400/10'
                  : level === 'debug'
                    ? 'text-purple-400 bg-purple-400/10'
                  : level === 'warn'
                    ? 'text-yellow-400 bg-yellow-400/10'
                    : level === 'info'
                      ? 'text-blue-400 bg-blue-400/10'
                      : 'text-comment bg-border';
              return (
                <div key={i} className="group flex items-start gap-2 px-2 py-2 border-border border-b">
                  <span className={`mt-0.5 text-[10px] font-semibold uppercase px-1 rounded ${levelClass}`}>
                    {level}
                  </span>
                  <div className="flex-1 text-text whitespace-pre-wrap break-all leading-relaxed select-text">
                    {lineText}
                  </div>
                  <button
                    onClick={() => copyText(lineText, key)}
                    className="text-comment hover:text-text transition-colors p-0.5 rounded"
                    title={copied ? 'Copied' : 'Copy line'}
                    style={{ cursor: 'pointer' }}
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              );
            })}
            {/* Error */}
            {entry.error && matchesLevelFilter('error') && (() => {
              const key = `${entry.id}-error`;
              const copied = copiedKey === key;
              return (
                <div className="group flex items-start gap-2 px-2 py-0.5">
                  <div className="flex-1 text-red-400 whitespace-pre-wrap break-all leading-relaxed select-text">
                    {entry.error}
                  </div>
                  <button
                    onClick={() => copyText(entry.error as string, key)}
                    className="text-comment hover:text-text transition-colors p-0.5 rounded"
                    title={copied ? 'Copied' : 'Copy line'}
                    style={{ cursor: 'pointer' }}
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              );
            })()}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};
