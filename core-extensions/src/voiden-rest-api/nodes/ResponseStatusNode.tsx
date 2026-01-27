/**
 * Response Status Node
 *
 * Displays HTTP response status code, message, and timing information
 * Uses generic components from plugin context for true extensibility
 */

import { Node } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";

export interface ResponseStatusAttrs {
  statusCode: number;
  statusMessage: string;
  elapsedTime: number;
  url?: string;
}

// Format time helper (inline to avoid app dependencies)
const formatTime = (ms: number): string => {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  const minutes = Math.floor(ms / 60000);
  const seconds = ((ms % 60000) / 1000).toFixed(0);
  return `${minutes}m ${seconds}s`;
};

// Factory function to create the node with context components
export const createResponseStatusNode = (NodeViewWrapper: any) => {
  const ResponseStatusComponent = ({ node }: any) => {
    const { statusCode, statusMessage, elapsedTime, url } = node.attrs as ResponseStatusAttrs;

    const isSuccess = statusCode >= 200 && statusCode < 300;
    const isError = statusCode >= 400;

    return (
      <NodeViewWrapper className="response-status-node" style={{ userSelect: 'text' }}>
        <div className="flex items-center gap-3 p-3 border border-border rounded bg-bg my-2">
          <div
            className={`size-3 rounded-full flex-none ${
              isSuccess ? "bg-green-500" : isError ? "bg-red-500" : "bg-yellow-500"
            }`}
          />
          <div className="flex-1 flex items-center gap-4 font-mono text-sm" style={{ userSelect: 'text' }}>
            <span className="font-bold">
              {statusCode} {statusMessage}
            </span>
            <span className="text-comment">{formatTime(elapsedTime)}</span>
            {url && <span className="text-comment truncate">{url}</span>}
          </div>
        </div>
      </NodeViewWrapper>
    );
  };

  return Node.create({
    name: "response-status",

    group: "block",

    atom: true,

    addAttributes() {
      return {
        statusCode: {
          default: 200,
        },
        statusMessage: {
          default: "OK",
        },
        elapsedTime: {
          default: 0,
        },
        url: {
          default: null,
        },
      };
    },

    parseHTML() {
      return [
        {
          tag: 'div[data-type="response-status"]',
        },
      ];
    },

    renderHTML({ HTMLAttributes }) {
      return ["div", { "data-type": "response-status", ...HTMLAttributes }];
    },

    addNodeView() {
      return ReactNodeViewRenderer(ResponseStatusComponent);
    },
  });
};
