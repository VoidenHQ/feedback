import ReactMarkdown from "react-markdown";
import remarkGfm from 'remark-gfm';
import { useState, useEffect } from 'react';

// Simple link handler for external links
const CustomLink = ({ href, children }: { href?: string; children: React.ReactNode }) => {
  const handleClick = () => {
    if (href) {
      // Access electron API if available
      (window as any).electron?.shell?.openExternal(href);
    }
  };

  return (
    <a
      onClick={handleClick}
      className="cursor-pointer text-accent hover:text-orange-400"
    >
      {children}
    </a>
  );
};

// Component for the right panel - shows live markdown preview
export const MarkdownPreviewPanel = () => {
  const [content, setContent] = useState("");
  const [isMarkdown, setIsMarkdown] = useState(false);

  useEffect(() => {
    // Subscribe to editor changes via global store
    const interval = setInterval(() => {
      try {
        // Access the code editor store from the window object
        const editorStore = (window as any).__codeEditorStore;
        if (editorStore) {
          const state = editorStore.getState();
          const activeEditor = state?.activeEditor;
          if (activeEditor) {
            setContent(activeEditor.content || "");
            setIsMarkdown(activeEditor.source?.endsWith?.('.md') || false);
          }
        }
      } catch (e) {
        // Ignore errors
      }
    }, 100);

    return () => clearInterval(interval);
  }, []);

  if (!isMarkdown) {
    return (
      <div className="h-full w-full flex items-center justify-center p-4 text-comment text-center">
        Open a markdown file to see the preview here
      </div>
    );
  }

  return (
    <div
      className="h-full w-full flex flex-col"
      style={{
        backgroundColor: 'var(--editor-bg)',
        overflow: 'hidden'
      }}
    >
      <div
        className="flex-1 overflow-y-auto overflow-x-hidden"
        style={{
          overscrollBehavior: 'contain',
          backgroundColor: 'var(--editor-bg)'
        }}
      >
        <div className="p-4 w-full" style={{ backgroundColor: 'var(--editor-bg)' }}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              // Override the default anchor tag rendering
              a: ({ href, children }) => <CustomLink href={href}>{children}</CustomLink>,
            }}
            className={MarkdownPreviewPanel.proseClasses || ""}
          >
            {content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
};

// Static property that will be set by the extension onload
MarkdownPreviewPanel.proseClasses = "";
