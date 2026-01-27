import { Editor } from "@tiptap/react";

import { Cuboid } from "lucide-react";
import { cn } from "@/core/lib/utils";

export const RequestBlockHeader = ({
  title,
  withBorder,
  editor,
  actions,
  importedDocumentId,
}: {
  title: string;
  withBorder?: boolean;
  editor: Editor;
  importedDocumentId?: string;
  actions?: React.ReactNode;
}) => {
  return (
    <div
      className={cn("h-7 px-1 flex items-center space-x-1 w-full border-light", withBorder ? "border-t border-x " : "border-b")}
      style={{ backgroundColor: 'var(--block-header-bg)' }}
      contentEditable={false}
    >
      <div className="flex items-center space-x-1 flex-1 text-[var(--syntax-tag)]">
        <Cuboid size={14} className="" />
        <span className="font-medium font-mono text-sm">{title}</span>
      </div>

      <div>{actions}</div>
    </div>
  );
};
