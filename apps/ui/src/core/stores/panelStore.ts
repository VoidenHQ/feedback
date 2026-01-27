import { create } from "zustand";
import { ImperativePanelHandle } from "react-resizable-panels";

type PanelStore = {
  rightPanelOpen: boolean;
  openRightPanel: () => void;
  closeRightPanel: () => void;
  bottomPanelOpen: boolean;
  openBottomPanel: () => void;
  closeBottomPanel: () => void;
  bottomPanelRef: React.RefObject<ImperativePanelHandle> | null;
  setBottomPanelRef: (ref: React.RefObject<ImperativePanelHandle>) => void;
};

export const usePanelStore = create<PanelStore>((set) => ({
  rightPanelOpen: false,
  openRightPanel: () => set({ rightPanelOpen: true }),
  closeRightPanel: () => set({ rightPanelOpen: false }),
  bottomPanelOpen: false,
  openBottomPanel: () => set({ bottomPanelOpen: true }),
  closeBottomPanel: () => set({ bottomPanelOpen: false }),
  bottomPanelRef: null,
  setBottomPanelRef: (ref) => set({ bottomPanelRef: ref }),
}));
