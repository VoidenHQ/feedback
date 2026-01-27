import ReactMarkdown from "react-markdown";
import remarkGfm from 'remark-gfm';

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

// Component with static property for prose classes (injected by extension)
export const Preview = ({ tab, className = "" }: { tab: any; className?: string }) => {
  // Use alert to make absolutely sure this runs
  if (typeof window !== 'undefined') {
    (window as any).__mdPreviewRendered = true;
  }

  // Log to a global array that we can inspect
  if (!(window as any).__mdPreviewLogs) {
    (window as any).__mdPreviewLogs = [];
  }
  (window as any).__mdPreviewLogs.push({
    time: new Date().toISOString(),
    proseClasses: Preview.proseClasses,
    length: Preview.proseClasses?.length
  });

  return (
    <div
      className={`h-full w-full flex flex-col ${className}`}
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
            key={tab.tabId}
            components={{
              // Override the default anchor tag rendering
              a: ({ href, children }) => <CustomLink href={href}>{children}</CustomLink>,
            }}
            className={Preview.proseClasses || ""}
          >
            {tab.content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
};

// Static property that will be set by the extension onload
Preview.proseClasses = "";
