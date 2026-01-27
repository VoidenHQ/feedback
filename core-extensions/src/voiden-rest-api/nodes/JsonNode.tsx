import { ReactNode } from "react";
import { mergeAttributes, Node, NodeViewProps } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import React from "react";
import { Sparkles } from "lucide-react";
import { stripJsonComments } from "../lib/utils";
import { HttpJsonBodyHelp } from "../help";

// Prettify JSON using native JSON methods
// Handles JSONC by stripping comments first
const prettifyJSON = (json: string) => {
  try {
    // Strip comments before parsing
    const jsonWithoutComments = stripJsonComments(json);
    return JSON.stringify(JSON.parse(jsonWithoutComments), null, 2);
  } catch {
    return json;
  }
};

// Factory function to create JsonNode with context components
export const createJsonNode = (NodeViewWrapper: any, CodeEditor: any, RequestBlockHeader: any, openFile?: (relativePath: string) => Promise<void>) => {
  const Actions = ({ setText }: { setText: () => void }) => {
    return (
      <button
        className="flex items-center gap-1 px-1.5 py-0.5 text-xs font-mono text-comment hover:text-text transition-colors opacity-60 hover:opacity-100"
        onClick={setText}
        style={{ cursor: 'pointer', userSelect: 'none' }}
      >
        <Sparkles size={11} />
        <span>PRETTIFY</span>
      </button>
    );
  };

  const JsonNodeView = (props: NodeViewProps) => {
    const [shouldAutofocus, setShouldAutofocus] = React.useState(false);
    const editorRef = React.useRef<any>(null);

    // Check if this is an imported/linked block
    const isImported = !!props.node.attrs.importedFrom;
    const importedFrom = props.node.attrs.importedFrom;

    // Ensure the node always has a valid JSON body with proper formatting
    React.useEffect(() => {
      let body = props.node.attrs.body;

      // Handle case where body was parsed as an object instead of a string
      // This can happen when YAML parses {"key": "value"} as a JS object
      if (typeof body === 'object' && body !== null) {
        try {
          body = JSON.stringify(body, null, 2);
          props.updateAttributes({ body });
          return;
        } catch {
          body = '{\n  \n}';
        }
      }

      if (!body || (typeof body === 'string' && (body.trim() === '' || body === '{}'))) {
        // Use formatted empty object with cursor position in mind
        const formattedEmpty = '{\n  \n}';
        props.updateAttributes({ body: formattedEmpty });
      }
    }, []);

    // Handle autofocus on creation (only for non-imported blocks)
    React.useEffect(() => {
      if (!isImported && props.editor.storage.json_body?.shouldFocusNext) {
        setShouldAutofocus(true);
        // Reset the flag after a short delay
        const timer = setTimeout(() => {
          if (props.editor.storage.json_body) {
            props.editor.storage.json_body.shouldFocusNext = false;
          }
        }, 100);
        return () => clearTimeout(timer);
      }
    }, [props.editor.storage.json_body?.shouldFocusNext, isImported]);

    const handlePrettify = () => {
      try {
        // Get current value from node attrs and prettify it
        const currentValue = props.node.attrs.body || '{}';
        const prettified = prettifyJSON(currentValue);
        props.updateAttributes({ body: prettified });
      } catch (error) {
        // console.error('[JsonNode] Prettify error:', error);
      }
    };

    return (
      <NodeViewWrapper>
        <div className="my-2">
          <RequestBlockHeader
            title="JSON-BODY"
            withBorder={false}
            editor={props.editor}
            importedDocumentId={importedFrom}
            openFile={openFile}
            actions={!isImported ? <Actions setText={handlePrettify} /> : undefined}
            helpContent={<HttpJsonBodyHelp />}
          />
          <div style={{ height: 'auto' }}>
            <CodeEditor
              tiptapProps={props}
              lang="jsonc"
              showReplace={false}
              autofocus={shouldAutofocus}
              readOnly={isImported}
            />
          </div>
        </div>
      </NodeViewWrapper>
    );
  };

  return Node.create({
  name: "json_body",
  group: "block",
  atom: true, // Treat as a single unit, not editable via normal text input
  selectable: true, // Can be selected
  draggable: false, // Not draggable

  addAttributes() {
    return {
      body: {
        default: '{\n  \n}',
        parseHTML: (element) => {
          const content = element.textContent || "";
          try {
            return content ? JSON.stringify(JSON.parse(content), null, 2) : '{\n  \n}';
          } catch {
            return content || '{\n  \n}';
          }
        },
      },
      importedFrom: {
        default: undefined,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "json-body",
        getAttrs: (element) => {
          const body = element.textContent;
          return { body };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["json-body", mergeAttributes(HTMLAttributes), 0];
  },

  addStorage() {
    return {
      shouldFocusNext: true, // default state
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(JsonNodeView);
  },

  addKeyboardShortcuts() {
    return {
      // Prevent backspace from deleting the node when focused
      Backspace: ({ editor }) => {
        const { selection } = editor.state;
        const node = selection.$from.node();

        // If we're at a json_body node, don't delete it with backspace
        if (node?.type.name === 'json_body') {
          return true; // handled, prevent default
        }

        return false; // not handled, allow default
      },
      // Prevent delete key from deleting the node
      Delete: ({ editor }) => {
        const { selection } = editor.state;
        const node = selection.$from.node();

        if (node?.type.name === 'json_body') {
          return true; // handled, prevent default
        }

        return false; // not handled, allow default
      },
    };
  },
  });
};

// Note: Backward compatibility export removed
// JsonNode now requires context components (NodeViewWrapper, CodeEditor, RequestBlockHeader)
// Use the factory function createJsonNode() instead
