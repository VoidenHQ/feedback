import { FileSystemList } from "@/core/file-system/components";
import { useGetSidebarTabs } from "@/core/layout/hooks";
import { ExtensionBrowser } from "@/core/extensions/components/ExtensionBrowser";
import { usePluginStore } from "@/plugins";
import { ResponsePanelContainer } from "@/core/request-engine/components/ResponsePanelContainer";
import { GitSourceControl } from "@/core/git/components/GitSourceControl";

const sidebarComponentMap: Record<string, React.ReactNode> = {
  fileExplorer: <FileSystemList />,
  extensionBrowser: <ExtensionBrowser />,
  responsePanel: <ResponsePanelContainer />,
  gitSourceControl: <GitSourceControl />,
};

export const SidePanelContent = ({ side }: { side: "left" | "right" }) => {
  const { data: sidebarTabs } = useGetSidebarTabs(side);
  const pluginTabs = usePluginStore((state) => state.sidebar[side]);

  if (!sidebarTabs?.activeTabId) return null;

  const activeTab = sidebarTabs.tabs.find((tab) => tab.id === sidebarTabs.activeTabId);
  if (!activeTab) return null;

  if (activeTab.type === "custom") {
    const extensionTab = pluginTabs.find((t) => t.id === activeTab.meta.customTabKey);
    const Component = extensionTab?.content || extensionTab?.component;
    return Component ? <div className="h-full"><Component /></div> : null;
  }

  return <div className="h-[calc(100%-2rem)]  bg-bg">{sidebarComponentMap[activeTab.type] || null}</div>;
};
