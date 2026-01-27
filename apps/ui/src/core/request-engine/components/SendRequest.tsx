/**
 * SendRequest Component
 *
 * Button to send HTTP requests with keyboard shortcut support
 */

import { Editor } from "@tiptap/core";
import { Loader2, Send } from "lucide-react";
import { useHotkeys } from "react-hotkeys-hook";
import { useSendRequest } from "../hooks";

interface SendRequestProps {
  editor: Editor;
}

export const SendRequest = ({ editor }: SendRequestProps) => {
  const { refetch, isFetching, cancelRequest } = useSendRequest(editor);
  const isMac = navigator?.userAgent?.toLowerCase().includes("mac") ?? false;

  const handleSend = () => {
    if (!isFetching) {
      refetch();
    }
  };

  const handleClick = () => {
    if (isFetching) {
      cancelRequest();
    } else {
      handleSend();
    }
  };

  // Keyboard shortcut: Cmd/Ctrl + Enter
  useHotkeys(
    "mod+enter",
    () => {
      handleSend();
    },
    {
      enableOnContentEditable: true,
    }
  );

  return (
    <button
      className="p-1 hover:bg-active rounded flex items-center gap-2"
      onClick={handleClick}
      aria-label={isFetching ? "Cancel request" : "Send request"}
      title={isFetching ? "Cancel request" : `Send request (${isMac ? "⌘↵" : "Ctrl+Enter"})`}
      style={!isFetching ? { color: 'var(--icon-success)' } : undefined}
    >
      {isFetching ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Send className="w-4 h-4" />
      )}
    </button>
  );
};
