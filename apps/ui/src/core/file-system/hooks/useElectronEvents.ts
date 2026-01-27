import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useSetActiveDocument } from "./useFileSystem";
import { FileTreeItem } from "@/types";

type FileCommandHandler = (command: string, data: FileTreeItem) => void | Promise<void>;

interface UseElectronEventsOptions {
  onFileCommand?: FileCommandHandler;
  onDirectoryChange?: () => void;
}

export function useElectronEvents(options?: UseElectronEventsOptions) {
  const queryClient = useQueryClient();
  const { mutate: setActiveDocument } = useSetActiveDocument();

  useEffect(() => {
    const projectUnsubscribe = window.electron?.directories.onChange(() => {
      queryClient.invalidateQueries({ queryKey: ["directory:active"] });
      queryClient.invalidateQueries({ queryKey: ["files:tree"] });
      queryClient.invalidateQueries({ queryKey: ["active:tabs"] });
      // Clear active document when directory changes
      setActiveDocument("");
    });

    const menuUnsubscribe = window.electron?.files.onFileMenuCommand(async (command, data) => {
      switch (command) {
        case "files:create":
          setActiveDocument(data.path);
          queryClient.invalidateQueries({ queryKey: ["files:tree"] });
          queryClient.invalidateQueries({ queryKey: ["active:tabs"] });
          queryClient.invalidateQueries({ queryKey: ["active:document"] });
          break;
        case "files:delete": {
          queryClient.invalidateQueries({ queryKey: ["files:tree"] });
          queryClient.resetQueries({ queryKey: ["files:read", data.path] });
          // Clear active document if the deleted file was active
          const activeDoc = await window.electron?.active.getDocument();
          if (activeDoc && data.path === activeDoc) {
            setActiveDocument("");
          }
          break;
        }
        case "directory:create":
          queryClient.invalidateQueries({ queryKey: ["files:tree"] });
          break;
        case "directory:close-project":
          queryClient.invalidateQueries({ queryKey: ["files:tree"] });
          break;
        case "directory:delete":
          queryClient.invalidateQueries({ queryKey: ["files:tree"] });
          break;
        default:
          queryClient.invalidateQueries({ queryKey: ["files:tree"] });
      }

      // Call custom handler if provided
      await options?.onFileCommand?.(command, data);
    });

    const tabsUnsubscribe = window.electron?.active.onTabsChanged(() => {
      queryClient.invalidateQueries({ queryKey: ["active:tabs"] });
      queryClient.invalidateQueries({ queryKey: ["active:document"] });
    });

    return () => {
      projectUnsubscribe?.();
      menuUnsubscribe?.();
      tabsUnsubscribe?.();
    };
  }, [queryClient, setActiveDocument]);
}