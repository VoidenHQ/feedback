/**
 * GraphQL Subscription Events Node
 * 
 * TipTap node for displaying subscription events
 */

import * as React from 'react';
import { Node } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { PluginContext } from '@voiden/sdk';
import { Info, Check, ArrowUp, XCircle, Link, Unlink, ChevronDown, ChevronRight, Copy, CheckCheck, Trash2, Mouse, X } from 'lucide-react';

interface SubscriptionItem {
    kind: 'data' | 'error' | 'complete' | 'system-open' | 'system-close' | 'system-error';
    ts: number;
    subscriptionId: string;
    data?: any;
    error?: any;
    message?: string;
    url?: string;
    code?: string | number;
    reason?: string;
}

export const createGraphQLSubscriptionEventsNode = (NodeViewWrapper: any, context: PluginContext, CodeEditor?: any) => {
    const GraphQLSubscriptionEventsComponent = ({ node }: any) => {
        const attrs = (node.attrs || {}) as {
            subscriptionId?: string | null;
            url?: string | null;
            connected?: boolean;
            events?: any[];
        };

        const [subscriptionId, setSubscriptionId] = React.useState<string | null>(attrs.subscriptionId || null);
        const [connected, setConnected] = React.useState<boolean>(false);
        const [isPaused, setIsPaused] = React.useState<boolean>(false);
        const [hasError, setHasError] = React.useState<boolean>(false);
        const [url, setUrl] = React.useState<string | null>(attrs.url || null);
        const [items, setItems] = React.useState<SubscriptionItem[]>([]);
        const isConnected = React.useRef<boolean>(false);
        const [autoScroll, setAutoScroll] = React.useState(true);
        const scrollContainerRef = React.useRef<HTMLDivElement>(null);
        const [expandedItems, setExpandedItems] = React.useState<Set<number>>(new Set());
        const [copiedIndex, setCopiedIndex] = React.useState<number | null>(null);

        const toggleExpand = (index: number) => {
            setExpandedItems((prev) => {
                const newSet = new Set(prev);
                if (newSet.has(index)) {
                    newSet.delete(index);
                } else {
                    newSet.add(index);
                }
                return newSet;
            });
        };

        const copyToClipboard = async (text: string, index: number) => {
            try {
                await navigator.clipboard.writeText(text);
                setCopiedIndex(index);
                setTimeout(() => setCopiedIndex(null), 2000);
            } catch (err) {
                // Failed to copy
            }
        };

        // Auto-scroll to bottom when new items arrive
        React.useEffect(() => {
            if (autoScroll && scrollContainerRef.current) {
                scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
            }
        }, [items.length]);

        // Wire up IPC listeners
        React.useEffect(() => {
            const listen = (window as any)?.electron?.request?.listenSecure;
            if (!listen) {
                setItems((prev) => [
                    ...prev,
                    { kind: 'system-error', ts: Date.now(), subscriptionId: subscriptionId || '', message: 'IPC not available (window.electron.request.listenSecure missing)' },
                ]);
                return;
            }

            const offOpen = listen('graphql-subscription-open', (_e: any, d: any) => {
                if (!subscriptionId || d.subscriptionId === subscriptionId) {
                    setSubscriptionId(d.subscriptionId);
                    setConnected(true);
                    setIsPaused(false);
                    setHasError(false);
                    if (d?.url && !url) setUrl(d.url);
                    setItems((prev) => [...prev, { kind: 'system-open', ts: Date.now(), subscriptionId: d.subscriptionId, url: d?.url }]);
                }
            });

            const offData = listen('graphql-subscription-data', (_e: any, d: any) => {
                if (!subscriptionId || d.subscriptionId === subscriptionId) {
                    setSubscriptionId(d.subscriptionId);
                    setConnected(true);
                    setHasError(false);
                    setItems((prev) => [...prev, { kind: 'data', ts: Date.now(), subscriptionId: d.subscriptionId, data: d.data }]);
                }
            });

            const offError = listen('graphql-subscription-error', (_e: any, d: any) => {
                if (!subscriptionId || d.subscriptionId === subscriptionId) {
                    setHasError(true);
                    setItems((prev) => [
                        ...prev,
                        {
                            kind: 'system-error',
                            ts: Date.now(),
                            subscriptionId: d?.subscriptionId,
                            message: d?.message || 'Subscription error',
                            error: d?.error,
                        },
                    ]);
                }
            });

            const offComplete = listen('graphql-subscription-complete', (_e: any, d: any) => {
                if (!subscriptionId || d.subscriptionId === subscriptionId) {
                    setConnected(false);
                    setItems((prev) => [
                        ...prev,
                        {
                            kind: 'complete',
                            ts: Date.now(),
                            subscriptionId: d.subscriptionId,
                            message: 'Subscription completed',
                        },
                    ]);
                    isConnected.current = false;
                }
            });

            const offClose = listen('graphql-subscription-close', (_e: any, d: any) => {
                if (!subscriptionId || d.subscriptionId === subscriptionId) {
                    setConnected(false);
                    setIsPaused(false);
                    setItems((prev) => [
                        ...prev,
                        {
                            kind: 'system-close',
                            ts: Date.now(),
                            subscriptionId: d.subscriptionId,
                            code: d.code,
                            reason: d.reason,
                        },
                    ]);
                    isConnected.current = false;
                }
            });

            return () => {
                try { offOpen && offOpen(); } catch { }
                try { offData && offData(); } catch { }
                try { offError && offError(); } catch { }
                try { offComplete && offComplete(); } catch { }
                try { offClose && offClose(); } catch { }
            };
        }, [subscriptionId]);

        const connectSubscription = React.useCallback(async () => {
            if (isConnected.current || !subscriptionId) return;
            isConnected.current = true;

            try {
                const result = await (window as any)?.electron?.request?.connectGraphQLSubscription(subscriptionId);

                if (result?.error) {
                    isConnected.current = false;
                    setConnected(false);
                    setItems((prev) => [
                        ...prev,
                        {
                            kind: 'system-error',
                            ts: Date.now(),
                            subscriptionId,
                            message: result.error,
                        },
                    ]);
                }
            } catch (error) {
                isConnected.current = false;
                setItems((prev) => [
                    ...prev,
                    {
                        kind: 'system-error',
                        ts: Date.now(),
                        subscriptionId,
                        message: `Failed to connect: ${error}`,
                    },
                ]);
            }
        }, [subscriptionId]);

        React.useEffect(() => {
            connectSubscription();
        }, [subscriptionId, connectSubscription]);

        const disconnectSubscription = async () => {
            if (!subscriptionId) return;

            try {
                await (window as any)?.electron?.request?.closeGraphQLSubscription(subscriptionId, 'User disconnected');
                setConnected(false);
                isConnected.current = false;
            } catch (error) {
                // Failed to disconnect subscription
            }
        };

        const clearEvents = () => {
            setItems([]);
        };

        const formatTimestamp = (timestamp: number) => {
            const date = new Date(timestamp);
            const timeStr = date.toLocaleTimeString('en-US', {
                hour12: false,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
            });
            const ms = date.getMilliseconds().toString().padStart(3, '0');
            return `${timeStr}.${ms}`;
        };

        const getEventIcon = (kind: string) => {
            switch (kind) {
                case 'data':
                    return <ArrowUp className="w-4 h-4 text-blue-500" />;
                case 'system-error':
                case 'error':
                    return <XCircle className="w-4 h-4 text-red-500" />;
                case 'complete':
                    return <Check className="w-4 h-4 text-green-500" />;
                case 'system-open':
                    return <Link className="w-4 h-4 text-text" />;
                case 'system-close':
                    return <Unlink className="w-4 h-4 text-text" />;
                default:
                    return <Info className="w-4 h-4 text-text" />;
            }
        };

        const getEventLabel = (kind: string) => {
            switch (kind) {
                case 'data':
                    return 'Data';
                case 'system-error':
                case 'error':
                    return 'Error';
                case 'complete':
                    return 'Complete';
                case 'system-open':
                    return 'Connected';
                case 'system-close':
                    return 'Closed';
                default:
                    return 'Event';
            }
        };

        return (
            <NodeViewWrapper className="graphql-subscription-events-wrapper h-full flex flex-col" >
                <div className="border border-border overflow-hidden bg-bg flex flex-col h-full" style={{ height: '83vh' }}>
                    {/* Header */}
                    <div className="px-4 py-2 bg-panel border-b border-border flex-shrink-0">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <div
                                    className={`size-2 rounded-full ${connected ? 'bg-green-500' : 'bg-gray-400'
                                        }`}
                                />
                                <span className="text-sm font-medium text-text">
                                    {connected ? 'Connected' : 'Disconnected'}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setAutoScroll(!autoScroll)}
                                    className={`p-1.5 rounded border transition-colors ${autoScroll
                                        ? 'bg-accent text-white border-accent'
                                        : 'bg-transparent text-text border-border hover:border-accent'
                                        }`}
                                    title={autoScroll ? 'Disable auto-scroll' : 'Enable auto-scroll'}
                                >
                                    <Mouse className="w-4 h-4" />
                                </button>
                                {connected && (
                                    <button
                                        onClick={disconnectSubscription}
                                        className="p-1.5 rounded border border-red-500 text-red-500 hover:bg-red-500 hover:text-white transition-colors"
                                        title="Disconnect subscription"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                                <button
                                    onClick={clearEvents}
                                    className="p-1.5 rounded border border-border text-text hover:border-accent transition-colors"
                                    title="Clear all events"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                        {url && (
                            <div className="text-xs text-comment font-mono truncate">
                                {url}
                            </div>
                        )}
                    </div>

                    {/* Events Container */}
                    <div
                        ref={scrollContainerRef}
                        className="flex-1 overflow-y-auto"
                    >
                        {items.length === 0 ? (
                            <div className="flex items-center justify-center h-full text-comment text-sm">
                                No events received yet
                            </div>
                        ) : (
                            <div className="divide-y divide-border">
                                {items.map((item, index) => {
                                    const isExpanded = expandedItems.has(index);
                                    const hasCollapsibleContent = !!(item.data || item.error || item.message);

                                    return (
                                        <div
                                            key={`${item.subscriptionId}-${item.ts}-${index}`}
                                            className="p-3 hover:bg-active/50 transition-colors border-b border-border last:border-b-0"
                                        >
                                            {/* Event Header */}
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center justify-between gap-2">
                                                    {getEventIcon(item.kind)}
                                                    <span className="text-xs font-medium text-text">
                                                        {getEventLabel(item.kind)}
                                                    </span>
                                                    <span className="text-xs text-comment font-mono">
                                                        {formatTimestamp(item.ts)}
                                                    </span>

                                                </div>
                                                {hasCollapsibleContent && (
                                                    <button
                                                        onClick={() => toggleExpand(index)}
                                                        className="text-comment hover:text-text transition-colors"
                                                    >
                                                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                                    </button>
                                                )}
                                            </div>

                                            {/* Event Content - Collapsible */}
                                            {isExpanded && (
                                                <>
                                                    {item.data && (
                                                        <div className="mt-2">
                                                            <div className="flex items-center justify-between mb-1">
                                                                <div className="text-xs font-medium text-comment">
                                                                    Response
                                                                </div>
                                                                <button
                                                                    onClick={() => copyToClipboard(JSON.stringify(item.data, null, 2), index)}
                                                                    className="text-comment hover:text-text transition-colors p-1 rounded border border-border hover:border-accent"
                                                                    title={copiedIndex === index ? 'Copied!' : 'Copy'}
                                                                >
                                                                    {copiedIndex === index ? <CheckCheck className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                                                </button>
                                                            </div>
                                                            <pre className="p-3 bg-bg border border-border text-text rounded text-xs overflow-x-auto font-mono">
                                                                {JSON.stringify(item.data, null, 2)}
                                                            </pre>
                                                        </div>
                                                    )}

                                                    {item.error && (
                                                        <div className="mt-2">
                                                            <div className="flex items-center justify-between mb-1">
                                                                <div className="text-xs font-medium text-red-600 dark:text-red-400">
                                                                    Error Details
                                                                </div>
                                                                <button
                                                                    onClick={() => copyToClipboard(
                                                                        Array.isArray(item.error)
                                                                            ? JSON.stringify(item.error, null, 2)
                                                                            : typeof item.error === 'string'
                                                                                ? item.error
                                                                                : JSON.stringify(item.error, null, 2),
                                                                        index
                                                                    )}
                                                                    className="text-comment hover:text-text transition-colors p-1 rounded border border-border hover:border-accent"
                                                                    title={copiedIndex === index ? 'Copied!' : 'Copy'}
                                                                >
                                                                    {copiedIndex === index ? <CheckCheck className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                                                </button>
                                                            </div>
                                                            {Array.isArray(item.error) && CodeEditor ? (
                                                                <div className="border border-red-600 dark:border-red-400 rounded overflow-hidden">
                                                                    <CodeEditor
                                                                        value={JSON.stringify(item.error, null, 2)}
                                                                        lang="json"
                                                                        readOnly={true}
                                                                        autofocus={false}
                                                                    />
                                                                </div>
                                                            ) : (
                                                                <div className="p-3 bg-bg border border-red-600 dark:border-red-400 rounded text-xs overflow-x-auto">
                                                                    <pre className="whitespace-pre-wrap font-mono text-red-800 dark:text-red-200">
                                                                        {typeof item.error === 'string' ? item.error : JSON.stringify(item.error, null, 2)}
                                                                    </pre>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    {item.message && (
                                                        <div className="mt-2">
                                                            <div className="flex items-center justify-between mb-1">
                                                                <div className="text-xs font-medium text-comment">
                                                                    Message
                                                                </div>
                                                                <button
                                                                    onClick={() => copyToClipboard(item.message || '', index)}
                                                                    className="text-comment hover:text-text transition-colors p-1 rounded border border-border hover:border-accent"
                                                                    title={copiedIndex === index ? 'Copied!' : 'Copy'}
                                                                >
                                                                    {copiedIndex === index ? <CheckCheck className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                                                </button>
                                                            </div>
                                                            <div className="p-2 bg-bg border border-border rounded text-xs text-comment">
                                                                {item.message}
                                                            </div>
                                                        </div>
                                                    )}
                                                </>
                                            )}

                                            {item.reason && (
                                                <div className="mt-2 text-xs text-comment">
                                                    <span className="font-medium">Reason:</span> {item.reason}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Footer Stats */}
                    <div className="px-4 py-2 bg-panel border-t border-border text-xs text-comment flex-shrink-0">
                        <div className="flex items-center justify-between gap-6">
                            <span className="flex items-center gap-1">
                                <span className="font-medium">Events:</span>
                                <span className="font-mono">{items.length}</span>
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="font-medium">Data:</span>
                                <span className="font-mono text-green-600 dark:text-green-400">{items.filter(e => e.kind === 'data').length}</span>
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="font-medium">Errors:</span>
                                <span className="font-mono text-red-600 dark:text-red-400">{items.filter(e => e.kind === 'system-error' || e.kind === 'error').length}</span>
                            </span>
                        </div>
                    </div>
                </div>
            </NodeViewWrapper>
        );
    };

    return Node.create({
        name: 'gqlsubscriptionevents',
        group: 'block',
        atom: true,
        selectable: true,
        draggable: false,
        addAttributes() {
            return {
                subscriptionId: {
                    default: null,
                },
                url: {
                    default: null,
                },
                connected: {
                    default: false,
                },
                events: {
                    default: [],
                },
            };
        },

        parseHTML() {
            return [
                {
                    tag: 'div[data-type="gqlsubscriptionevents"]',
                },
            ];
        },

        renderHTML({ HTMLAttributes }) {
            return ['div', { 'data-type': 'gqlsubscriptionevents', ...HTMLAttributes }];
        },

        addNodeView() {
            return ReactNodeViewRenderer(GraphQLSubscriptionEventsComponent);
        },
    });
};
