/**
 * Response Viewer
 *
 * Read-only Voiden viewer for displaying responses
 * Does not interfere with the main VoidenEditor's global state
 */

import { useEditor, EditorContent } from '@tiptap/react';
import { useCallback, useMemo } from 'react';
import { voidenExtensions } from '@/core/editors/voiden/extensions';
import { useEditorEnhancementStore } from '@/plugins';
import { getSchema } from '@tiptap/core';
import { parseMarkdown } from '@/core/editors/voiden/markdownConverter';
import { proseClasses } from '@/core/editors/voiden/VoidenEditor';
import UniqueID from '@/core/editors/voiden/extensions/uniqueId';

interface ResponseViewerProps {
  content: string | any; // Can be markdown string or doc JSON
}

export function ResponseViewer({ content }: ResponseViewerProps) {
  // Get plugin extensions
  const pluginExtensions = useEditorEnhancementStore((state) => state.voidenExtensions);

  // Build extensions list
  const finalExtensions = useMemo(() => {
    const baseExtensions = [...voidenExtensions, ...pluginExtensions];
    return [
      ...baseExtensions,
      UniqueID.configure({
        types: ['heading', 'paragraph', 'codeBlock', 'blockquote'],
      }),
    ];
  }, [pluginExtensions]);

  // Parse content based on type
  const parsedContent = useMemo(() => {
    try {
      // If it's already a document object (has type: 'doc'), use it directly
      if (typeof content === 'object' && content?.type === 'doc') {
        return content;
      }

      // Otherwise, parse as markdown (legacy path)
      const schema = getSchema(finalExtensions);
      return parseMarkdown(content, schema);
    } catch (error) {
      // console.error('[ResponseViewer] Error parsing content:', error);
      return null;
    }
  }, [content, finalExtensions]);

  // Create read-only editor with text selection enabled
  const editor = useEditor({
    extensions: finalExtensions,
    content: parsedContent,
    editable: false, // Read-only
    editorProps: {
      attributes: {
        class: `${proseClasses} outline-none px-5`,
        style: 'user-select: text; -webkit-user-select: text;', // Enable text selection
      },
    },
  }, [parsedContent]);

  if (!editor) {
    return <div className="p-4 text-comment">Loading response...</div>;
  }

  return (
    <div
      className="h-full overflow-auto"
      style={{
        userSelect: 'text',
        WebkitUserSelect: 'text',
        MozUserSelect: 'text',
        msUserSelect: 'text',
      }}
    >
      <style>{`
        .response-viewer-content * {
          user-select: text !important;
          -webkit-user-select: text !important;
          -moz-user-select: text !important;
          -ms-user-select: text !important;
        }
        /* Override cursor for entire header bars in response nodes */
        .response-body-node .header-bar,
        .response-headers-node .header-bar,
        .request-headers-node .header-bar {
          cursor: pointer !important;
        }
        .response-body-node .header-bar *:not(button),
        .response-headers-node .header-bar *:not(button),
        .request-headers-node .header-bar *:not(button) {
          cursor: pointer !important;
        }
        .response-body-node .header-bar button,
        .response-headers-node .header-bar button,
        .request-headers-node .header-bar button {
          cursor: pointer !important;
        }
        /* Full width response blocks with top spacing */
        .response-body-node,
        .response-headers-node {
          margin-left: 0 !important;
          margin-right: 0 !important;
        }
        .response-body-node > div,
        .response-headers-node > div {
          margin: 0 !important;
          border-radius: 0 !important;
          border-left: none !important;
          border-right: none !important;
        }
        .response-body-node:first-of-type > div {
          margin-top: 0.5rem !important;
        }
        .response-viewer-content .ProseMirror {
          user-select: text !important;
          -webkit-user-select: text !important;
          padding-left: 0 !important;
          padding-right: 0 !important;
        }
        .response-body-node .cm-editor,
        .response-body-node .cm-scroller {
          height: 100% !important;
          max-height: 400px !important;
          overflow-y: auto !important;
        }
      `}</style>
      <div className="response-viewer-content">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
