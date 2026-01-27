import { ReactNode } from "react";
import { mergeAttributes, Node, NodeViewProps } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import React from "react";
import { Sparkles } from "lucide-react";
import { HttpXmlBodyHelp } from "../help";

// Prettify XML using DOMParser and XMLSerializer (browser-native)
const prettifyXML = (xml: string): string => {
  try {
    if (!xml || !xml.trim()) return xml;

    // Parse XML using native DOMParser
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xml, 'text/xml');

    // Check for parsing errors
    const parseError = xmlDoc.querySelector('parsererror');
    if (parseError) {
      return xml; // Return original if parsing failed
    }

    // Format with indentation
    const formatted = formatXMLNode(xmlDoc.documentElement, 0);
    return formatted.trim();
  } catch {
    return xml;
  }
};

// Helper function to recursively format XML nodes
const formatXMLNode = (node: globalThis.Node, level: number): string => {
  const indent = '  '.repeat(level);

  // Handle different node types
  if (node.nodeType === globalThis.Node.TEXT_NODE) {
    const text = node.textContent?.trim();
    return text ? text : '';
  }

  if (node.nodeType === globalThis.Node.COMMENT_NODE) {
    return `${indent}<!--${node.textContent}-->\n`;
  }

  if (node.nodeType === globalThis.Node.ELEMENT_NODE) {
    const element = node as Element;
    const tagName = element.tagName;

    // Build opening tag with attributes
    let result = `${indent}<${tagName}`;
    for (let i = 0; i < element.attributes.length; i++) {
      const attr = element.attributes[i];
      result += ` ${attr.name}="${attr.value}"`;
    }

    // Check if element has children
    if (!element.hasChildNodes()) {
      result += ' />\n';
      return result;
    }

    result += '>';

    // Process children
    const children = Array.from(element.childNodes);
    const hasElementChildren = children.some(child => child.nodeType === globalThis.Node.ELEMENT_NODE);
    const textContent = children
      .filter(child => child.nodeType === globalThis.Node.TEXT_NODE)
      .map(child => child.textContent?.trim())
      .filter(Boolean)
      .join('');

    // If only text content and no element children, keep inline
    if (!hasElementChildren && textContent) {
      result += textContent;
      result += `</${tagName}>\n`;
      return result;
    }

    // Otherwise, format children with newlines and indentation
    result += '\n';
    for (const child of children) {
      const formatted = formatXMLNode(child, level + 1);
      if (formatted) {
        result += formatted;
      }
    }
    result += `${indent}</${tagName}>\n`;
    return result;
  }

  return '';
};

// Factory function to create XMLNode with context components
export const createXMLNode = (NodeViewWrapper: any, CodeEditor: any, RequestBlockHeader: any, openFile?: (relativePath: string) => Promise<void>) => {
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

  const XMLNodeView = (props: NodeViewProps) => {
    const [shouldAutofocus, setShouldAutofocus] = React.useState(false);
    const editorRef = React.useRef<any>(null);

    // Check if this is an imported/linked block
    const isImported = !!props.node.attrs.importedFrom;
    const importedFrom = props.node.attrs.importedFrom;

    // Ensure the node always has a valid XML body with proper formatting
    React.useEffect(() => {
      const body = props.node.attrs.body;
      if (!body || body.trim() === '') {
        // Use empty XML
        const formattedEmpty = '';
        props.updateAttributes({ body: formattedEmpty });
      }
    }, []);

    // Handle autofocus on creation (only for non-imported blocks)
    React.useEffect(() => {
      if (!isImported && props.editor.storage.xml_body?.shouldFocusNext) {
        setShouldAutofocus(true);
        // Reset the flag after a short delay
        const timer = setTimeout(() => {
          if (props.editor.storage.xml_body) {
            props.editor.storage.xml_body.shouldFocusNext = false;
          }
        }, 100);
        return () => clearTimeout(timer);
      }
    }, [props.editor.storage.xml_body?.shouldFocusNext, isImported]);

    const handlePrettify = () => {
      try {
        // Get current value from node attrs and prettify it
        const currentValue = props.node.attrs.body || '';
        const prettified = prettifyXML(currentValue);
        props.updateAttributes({ body: prettified });
      } catch (error) {
        // console.error('[XMLNode] Prettify error:', error);
      }
    };

    return (
      <NodeViewWrapper>
        <div className="my-2">
          <RequestBlockHeader
            title="XML-BODY"
            withBorder={false}
            editor={props.editor}
            importedDocumentId={importedFrom}
            openFile={openFile}
            actions={!isImported ? <Actions setText={handlePrettify} /> : undefined}
            helpContent={<HttpXmlBodyHelp />}
          />
          <div style={{ height: 'auto' }}>
            <CodeEditor
              tiptapProps={props}
              lang="xml"
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
  name: "xml_body",
  group: "block",
  atom: true, // Treat as a single unit, not editable via normal text input
  selectable: true, // Can be selected
  draggable: false, // Not draggable

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
        tag: "xml-body",
        getAttrs: (element) => {
          const body = element.textContent;
          return { body };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["xml-body", mergeAttributes(HTMLAttributes), 0];
  },

  addStorage() {
    return {
      shouldFocusNext: true, // default state
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(XMLNodeView);
  },

  addKeyboardShortcuts() {
    return {
      // Prevent backspace from deleting the node when focused
      Backspace: ({ editor }) => {
        const { selection } = editor.state;
        const node = selection.$from.node();

        // If we're at a xml_body node, don't delete it with backspace
        if (node?.type.name === 'xml_body') {
          return true; // handled, prevent default
        }

        return false; // not handled, allow default
      },
      // Prevent delete key from deleting the node
      Delete: ({ editor }) => {
        const { selection } = editor.state;
        const node = selection.$from.node();

        if (node?.type.name === 'xml_body') {
          return true; // handled, prevent default
        }

        return false; // not handled, allow default
      },
    };
  },
  });
};

// Note: Backward compatibility export removed
// XMLNode now requires context components (NodeViewWrapper, CodeEditor, RequestBlockHeader)
// Use the factory function createXMLNode() instead
