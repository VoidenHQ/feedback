import { mergeAttributes, Node, NodeViewProps } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import React from "react";
import { Sparkles } from "lucide-react";
import { HttpYmlBodyHelp } from "../help";

// Factory function to create YmlNode with context components
export const createYmlNode = (NodeViewWrapper: any, CodeEditor: any, RequestBlockHeader: any, openFile?: (relativePath: string) => Promise<void>) => {
  const Actions = ({ setText }: { setText: () => void }) => {
    return (
      <button
        className="flex items-center gap-1 px-1.5 py-0.5 text-xs font-mono text-comment hover:text-text transition-colors opacity-60 hover:opacity-100"
        onClick={setText}
        style={{ cursor: 'pointer', userSelect: 'none' }}
      >
        <Sparkles size={11} />
        <span>FORMAT</span>
      </button>
    );
  };

  const YmlNodeView = (props: NodeViewProps) => {
    const [shouldAutofocus, setShouldAutofocus] = React.useState(false);

    // Check if this is an imported/linked block
    const isImported = !!props.node.attrs.importedFrom;
    const importedFrom = props.node.attrs.importedFrom;

    // Ensure the node always has a valid YAML body
    React.useEffect(() => {
      const body = props.node.attrs.body;
      if (!body || (typeof body === 'string' && body.trim() === '')) {
        props.updateAttributes({ body: '' });
      }
    }, []);

    // Handle autofocus on creation (only for non-imported blocks)
    React.useEffect(() => {
      if (!isImported && props.editor.storage.yml_body?.shouldFocusNext) {
        setShouldAutofocus(true);
        // Reset the flag after a short delay
        const timer = setTimeout(() => {
          if (props.editor.storage.yml_body) {
            props.editor.storage.yml_body.shouldFocusNext = false;
          }
        }, 100);
        return () => clearTimeout(timer);
      }
    }, [props.editor.storage.yml_body?.shouldFocusNext, isImported]);

    const handleFormat = () => {
      try {
        // Basic YAML formatting: normalize indentation
        const currentValue = props.node.attrs.body || '';
        // Just trim trailing whitespace from lines and ensure consistent line endings
        const formatted = currentValue
          .split('\n')
          .map((line: string) => line.trimEnd())
          .join('\n')
          .trim();
        props.updateAttributes({ body: formatted });
      } catch (error) {
        // silently fail
      }
    };

    return (
      <NodeViewWrapper>
        <div className="my-2">
          <RequestBlockHeader
            title="YAML-BODY"
            withBorder={false}
            editor={props.editor}
            importedDocumentId={importedFrom}
            openFile={openFile}
            actions={!isImported ? <Actions setText={handleFormat} /> : undefined}
            helpContent={<HttpYmlBodyHelp />}
          />
          <div style={{ height: 'auto' }}>
            <CodeEditor
              tiptapProps={props}
              lang="yaml"
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
  name: "yml_body",
  group: "block",
  atom: true,
  selectable: true,
  draggable: false,

  addAttributes() {
    return {
      body: {
        default: '',
        parseHTML: (element) => {
          const content = element.textContent || "";
          return content || '';
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
        tag: "yml-body",
        getAttrs: (element) => {
          const body = element.textContent;
          return { body };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["yml-body", mergeAttributes(HTMLAttributes), 0];
  },

  addStorage() {
    return {
      shouldFocusNext: true,
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(YmlNodeView);
  },

  addKeyboardShortcuts() {
    return {
      Backspace: ({ editor }) => {
        const { selection } = editor.state;
        const node = selection.$from.node();

        if (node?.type.name === 'yml_body') {
          return true;
        }

        return false;
      },
      Delete: ({ editor }) => {
        const { selection } = editor.state;
        const node = selection.$from.node();

        if (node?.type.name === 'yml_body') {
          return true;
        }

        return false;
      },
    };
  },
  });
};
