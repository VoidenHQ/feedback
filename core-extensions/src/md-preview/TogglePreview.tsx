import { BookOpen, Pencil } from "lucide-react";
import { create } from "zustand";

export type MdViewMode = "edit" | "preview";

export const useMdViewStore = create<{
  viewMode: MdViewMode;
  setViewMode: (mode: MdViewMode) => void;
}>((set) => ({
  viewMode: "edit",
  setViewMode: (viewMode) => set({ viewMode }),
}));

export const TogglePreview = ({ tab }: { tab: any }) => {
  const viewMode = useMdViewStore((state) => state.viewMode);
  const setViewMode = useMdViewStore((state) => state.setViewMode);

  const toggleMode = () => {
    const nextMode = viewMode === "edit" ? "preview" : "edit";
    setViewMode(nextMode);
  };

  const getIcon = () => {
    return viewMode === "edit" ? <BookOpen size={14} /> : <Pencil size={14} />;
  };

  return (
    <button
      className="p-1 hover:bg-active rounded-sm"
      onClick={toggleMode}
      title={viewMode === "edit" ? "Preview" : "Edit"}
    >
      {getIcon()}
    </button>
  );
};
