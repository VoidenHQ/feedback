import ReactMarkdown from "react-markdown";
import remarkGfm from 'remark-gfm';
import { useState, useEffect } from 'react';

const Pre = ({ children, ...props }: React.HTMLAttributes<HTMLPreElement>) => (
  <pre
    {...props}
    style={{
      maxWidth: '100%',
      whiteSpace: 'pre-wrap',
      wordWrap: 'break-word',
      overflowX: 'hidden',
      ...(props.style || {}),
    }}
  >
    {children}
  </pre>
);

const Code = ({
  inline,
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLElement> & { inline?: boolean }) => (
  <code
    {...props}
    className={className}
    style={{
      display: inline ? undefined : 'block',
      maxWidth: '100%',
      whiteSpace: inline ? undefined : 'pre-wrap',
      wordBreak: 'break-word',
      ...(props.style || {}),
    }}
  >
    {children}
  </code>
);

const Paragraph = ({ children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p
    {...props}
    style={{
      maxWidth: '100%',
      wordBreak: 'break-word',
      overflowWrap: 'break-word',
      margin: '0.5rem 0',
      padding: '0.25rem 0',
      ...(props.style || {}),
    }}
  >
    {children}
  </p>
);

const Blockquote = ({ children, ...props }: React.BlockquoteHTMLAttributes<HTMLQuoteElement>) => (
  <blockquote
    {...props}
    style={{
      borderLeft: '4px solid var(--blockquote-border, #555)',
      backgroundColor: 'var(--blockquote-bg, transparent)',
      color: 'var(--blockquote-fg, inherit)',
      padding: '10px 10px',
      marginLeft: '10px',
      marginRight: '10px',
      marginTop: '0.5rem',
      marginBottom: '0.5rem',
      borderRadius: '4px',
      ...(props.style || {}),
    }}
  >
    {children}
  </blockquote>
);

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
              pre: ({ children, ...props }) => <Pre {...props}>{children}</Pre>,
              code: ({ className, children, ...props }: any) => (
                <Code inline={!className} className={className} {...props}>{children}</Code>
              ),
              p: ({ children, ...props }) => <Paragraph {...props}>{children}</Paragraph>,
              blockquote: ({ children, ...props }) => <Blockquote {...props}>{children}</Blockquote>,
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
