import { useHotkeys } from "react-hotkeys-hook";
import { useSendRequest } from "@/core/request-engine"
import { useVoidenEditorStore } from "@/core/editors/voiden/VoidenEditor.tsx";
import { Loader, Play } from "lucide-react";
import { cn } from "@/core/lib/utils";

export function SendRequestButton() {
  const editor = useVoidenEditorStore((state) => state.editor);
  // @ts-ignore
  const { refetch, isFetching, cancelRequest } = useSendRequest(editor);

  useHotkeys(
    "mod+enter",
    () => {
      if (editor) {
        handleSend();
      }
    },
    {
      enableOnFormTags:true,
      enableOnContentEditable: true,
      preventDefault:true,
    },
  );

  const handleSend = () => {
    if (!editor) return;

    if (isFetching) {
      cancelRequest();
      return;
    }
    refetch();
  };
  return (
    <button
      className={cn("bg-bg px-2 py-1  h-full flex items-center gap-2 border-l border-border hover:bg-active")}
      onClick={handleSend}
      disabled={!editor}
      style={
        !editor
          ? { opacity: 0.5, cursor: 'not-allowed' }
          : !isFetching
          ? { color: 'var(--icon-success)' }
          : undefined
      }
    >
      {isFetching ? <Loader className="animate-spin" size={14} /> : <Play size={14} />}
    </button>
  );
}
