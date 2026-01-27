import { PanelLeft, Terminal, Github, MessageCircle, PanelRight, GitCompareArrows, Download } from "lucide-react";
import { cn } from "@/core/lib/utils";
import * as Tooltip from "@radix-ui/react-tooltip";
import { GitBranchesList } from "@/core/git/components/GitBranchesList";
import { BranchComparisonDialog } from "@/core/git/components/BranchComparisonDialog";
import { useSettings } from "@/core/settings/hooks/useSettings";
import { useState, useEffect } from "react";
import { Kbd } from "@/core/components/ui/kbd";

const handleExternalLink = (url: string) => (e: React.MouseEvent) => {
  e.preventDefault();
  window.electron?.openExternal?.(url);
};

interface StatusBarProps {
  version: string;
  isLeftCollapsed: boolean;
  isBottomCollapsed: boolean;
  isRightCollapsed: boolean;
  toggleLeft: () => void;
  toggleBottom: () => void;
  toggleRight: () => void;
}

export const StatusBar = ({
  version,
  isLeftCollapsed,
  isBottomCollapsed,
  isRightCollapsed,
  toggleLeft,
  toggleBottom,
  toggleRight,
}: StatusBarProps) => {
  const { settings } = useSettings();
  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);
  const [isCompareDialogOpen, setIsCompareDialogOpen] = useState(false);
  const [updateProgress, setUpdateProgress] = useState<{ percent?: number; bytesPerSecond?: number; transferred?: number; total?: number; status: string } | null>(null);
  const isMac = navigator?.userAgent?.toLowerCase().includes("mac") ?? false;

  const handleCheckForUpdates = async () => {
    if (isCheckingUpdates) return;

    setIsCheckingUpdates(true);
    try {
      const channel = settings.updates?.channel || "stable";
      await window.electron?.checkForUpdates(channel);
    } catch (error) {
      console.error("Failed to check for updates:", error);
    } finally {
      setIsCheckingUpdates(false);
    }
  };

  // Listen for update progress
  useEffect(() => {
    const unsubscribe = window.electron?.onUpdateProgress?.((progress) => {
      setUpdateProgress(progress);
      
      // Clear progress after completion or error
      if (progress.status === "installed" || progress.status === "error" || progress.status === "idle") {
        setTimeout(() => setUpdateProgress(null), 3000);
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);


  // Keyboard shortcut for compare branches: ⌥⌘D (Mac) or Alt+Ctrl+D (Windows/Linux)
  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      // Don't trigger if focus is in a CodeMirror editor
      const target = event.target as HTMLElement;
      if (target?.closest('.cm-editor, .txt-editor')) {
        return;
      }

      const modKey = isMac ? event.metaKey : event.ctrlKey;

      if (event.code === "KeyD" && modKey && event.altKey) {
        event.preventDefault();
        setIsCompareDialogOpen((open)=>!open);
        return;
      }
      if (target?.closest('.cm-editor, .txt-editor')) {
        return;
      }

      const modifierPressed = isMac ? event.metaKey : event.ctrlKey;

      const hasOtherModifiers =
        (isMac && event.ctrlKey) || // Ctrl on Mac
        (!isMac && event.metaKey) || // Cmd on Windows/Linux
        event.altKey ||
        event.shiftKey;

      if (modifierPressed && !hasOtherModifiers && event.key.toLowerCase() === 'b') {
        event.preventDefault();
        event.stopPropagation();
        toggleLeft();
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [isMac]);

  return (
    <div className="h-8 flex-none border-t border-border flex items-center justify-between bg-panel">
      {/* Left Status Items */}
      <div className="flex items-center h-full">
        <Tooltip.Root>
          <Tooltip.Trigger className={cn("h-full px-2 hover:bg-active text-comment", !isLeftCollapsed && "bg-active")} onClick={toggleLeft}>
            <PanelLeft size={14} />
          </Tooltip.Trigger>

          <Tooltip.Content align="start" sideOffset={4} alignOffset={4} side="top" className="flex items-center gap-2 border bg-panel border-border p-1 text-sm z-10 text-comment">
            <span>Toggle left panel</span>
            <Kbd keys={'⌘B'} size="sm"></Kbd>
          </Tooltip.Content>
        </Tooltip.Root>

        <GitBranchesList />

        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <button
              className={cn("text-sm h-full px-2 flex items-center gap-2 hover:bg-active no-drag text-comment")}
              onClick={() => setIsCompareDialogOpen(true)}
            >
              <GitCompareArrows size={14} />
              <span>Compare</span>
            </button>
          </Tooltip.Trigger>
          <Tooltip.Content align="start" sideOffset={4} alignOffset={4} side="top" className="flex items-center gap-2 border bg-panel border-border p-1 text-sm z-10 text-comment">
            <span>Compare branches</span>
            <Kbd keys={'⌥⌘D'} size="sm"></Kbd>
          </Tooltip.Content>
        </Tooltip.Root>
      </div>

      {/* Right Status Items */}
      <div className="flex items-center space-x-2 h-full">
        <div className="flex h-full justify-between">
          {/* App Version / Update Progress */}
          {updateProgress && (updateProgress.status === "downloading" || updateProgress.status === "installing" || updateProgress.status === "checking" || updateProgress.status === "ready") ? (
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <div className="h-full px-3 flex items-center gap-2 text-comment select-none">
                  <Download className="w-3 h-3 animate-pulse" style={{ color: 'var(--icon-primary)' }} />
                  {updateProgress.status === "checking" && (
                    <span className="text-xs animate-pulse">Checking...</span>
                  )}
                  {updateProgress.status === "downloading" && (
                    <span className="text-xs animate-pulse">Downloading...</span>
                  )}
                  {updateProgress.status === "ready" && (
                    <span className="text-xs">Downloaded</span>
                  )}
                  {updateProgress.status === "installing" && (
                    <span className="text-xs animate-pulse">Installing...</span>
                  )}
                </div>
              </Tooltip.Trigger>
              <Tooltip.Content align="start" sideOffset={4} alignOffset={4} side="top" className="border bg-panel border-border p-2 text-sm z-10 text-comment">
                {updateProgress.status === "checking" && <span>Checking for updates...</span>}
                {updateProgress.status === "downloading" && updateProgress.percent !== undefined && (
                  <div className="space-y-1">
                    <div>Downloading in progress...</div>
                  </div>
                )}
                {updateProgress.status === "ready" && <span>Update downloaded and ready to install</span>}
                {updateProgress.status === "installing" && <span>Installing update...</span>}
              </Tooltip.Content>
            </Tooltip.Root>
          ) : (
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <button
                  onClick={handleCheckForUpdates}
                  disabled={isCheckingUpdates}
                  className={cn(
                    "h-full pt-1 px-2 hover:bg-active text-comment select-none transition-opacity",
                    isCheckingUpdates ? "opacity-50 cursor-wait" : "cursor-pointer"
                  )}
                >
                  <span className="font-mono text-sm">
                    {isCheckingUpdates ? "Checking..." : `v${version}`}
                  </span>
                </button>
              </Tooltip.Trigger>
              <Tooltip.Content align="start" sideOffset={4} alignOffset={4} side="top" className="border bg-panel border-border p-1 text-sm z-10 text-comment">
                <span>Click to check for updates</span>
              </Tooltip.Content>
            </Tooltip.Root>
          )}

          {/* GitHub Link */}
          <Tooltip.Root>
            <Tooltip.Trigger className="h-full pt-2 px-2 hover:bg-active text-comment" asChild>
              <a href="https://github.com/VoidenHQ/voiden" onClick={handleExternalLink("https://github.com/VoidenHQ/voiden")}>
                <Github size={14} />
              </a>
            </Tooltip.Trigger>
            <Tooltip.Content align="end" sideOffset={4} alignOffset={4} side="top" className="border bg-panel border-border p-1 text-sm text-comment">
              <span>Visit GitHub</span>
            </Tooltip.Content>
          </Tooltip.Root>

          {/* Discord Link */}
          <Tooltip.Root>
            <Tooltip.Trigger className="h-full pt-2 px-2 hover:bg-active text-comment" asChild>
              <a href="https://discord.gg/XSYCf7JF4F" onClick={handleExternalLink("https://discord.gg/XSYCf7JF4F")}>
                <MessageCircle size={14} />
              </a>
            </Tooltip.Trigger>
            <Tooltip.Content align="end" sideOffset={4} alignOffset={4} side="top" className="border bg-panel border-border p-1 text-sm text-comment">
              <span>Join Discord</span>
            </Tooltip.Content>
          </Tooltip.Root>

          {/* Bottom Panel Toggle */}
          <Tooltip.Root>
            <Tooltip.Trigger className={cn("h-full px-2 hover:bg-active text-comment", !isBottomCollapsed && "bg-active")} onClick={toggleBottom}>
              <Terminal size={14} />
            </Tooltip.Trigger>
            <Tooltip.Content align="end" sideOffset={4} alignOffset={4} side="top" className="flex items-center gap-2 border bg-panel border-border p-1 text-sm text-comment">
              <span>Toggle bottom panel</span>
              <Kbd keys={'⌘J'} size="sm"></Kbd>
            </Tooltip.Content>
          </Tooltip.Root>

          {/* Right Panel Toggle */}
          <Tooltip.Root>
            <Tooltip.Trigger className={cn("h-full px-2 hover:bg-active text-comment", !isRightCollapsed && "bg-active")} onClick={toggleRight}>
              <PanelRight size={14} />
            </Tooltip.Trigger>
            <Tooltip.Content align="end" sideOffset={4} alignOffset={4} side="top" className="flex items-center gap-2 border bg-panel border-border p-1 text-sm text-comment">
              <span>Toggle right panel</span>
              <Kbd keys={'⌘Y'} size="sm"></Kbd>
            </Tooltip.Content>
          </Tooltip.Root>
        </div>
      </div>

      {/* Branch Comparison Dialog */}
      <BranchComparisonDialog
        open={isCompareDialogOpen}
        onOpenChange={setIsCompareDialogOpen}
      />
    </div>
  );
};
