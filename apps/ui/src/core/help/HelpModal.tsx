import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  content: React.ReactNode;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose, title, content }) => {
  // Handle Escape key to close the dialog
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isOpen && e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown, true);
      return () => {
        document.removeEventListener('keydown', handleKeyDown, true);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50"
      onClick={onClose}
      style={{ pointerEvents: 'auto' }}
    >
      <div
        className="bg-bg border border-border rounded-lg shadow-xl max-w-2xl max-h-[80vh] m-4 flex flex-col"
        onClick={(e) => e.stopPropagation()}
        style={{ pointerEvents: 'auto' }}
      >
        {/* Fixed Header */}
        <div className="bg-bg border-b border-border px-4 py-3 flex items-center justify-between flex-shrink-0 rounded-t-lg">
          <h2 className="font-mono text-sm font-semibold text-text">Help: {title}</h2>
          <button
            onClick={onClose}
            className="text-comment hover:text-text transition-colors text-xl leading-none"
            title="Close (Esc)"
          >
            ×
          </button>
        </div>
        {/* Scrollable Content */}
        <div className="px-4 py-4 text-text text-sm prose prose-sm max-w-none overflow-y-auto flex-1">
          {typeof content === 'string' ? (
            <div dangerouslySetInnerHTML={{ __html: content }} />
          ) : (
            content
          )}
        </div>
      </div>
    </div>
  );

  // Render modal at document body level to avoid z-index stacking issues
  return createPortal(modalContent, document.body);
};
