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

  const activeTabId = sidebarTabs?.activeTabId;
  const activeTab = sidebarTabs?.tabs?.find((t: any) => t.id === activeTabId);
  const activeType = activeTab?.type;

  // Response panel is always mounted so its shortcuts remain active.
  const isResponseActive = activeType === 'responsePanel';

  return (
    <>
      {/* Response panel: always mounted, visibility toggled */}
      <div className="h-full bg-bg" style={{ display: isResponseActive ? undefined : 'none' }}>
        <ResponsePanelContainer />
      </div>

      {/* Other built-in tabs: only the active one renders */}
      {activeTab && activeType !== 'responsePanel' && activeType !== 'custom' && sidebarComponentMap[activeType] && (
        <div className="h-full bg-bg">
          {sidebarComponentMap[activeType]}
        </div>
      )}

      {/* Custom (plugin) tabs */}
      {(pluginTabs || []).map((extensionTab: any) => {
        const matchingTab = sidebarTabs?.tabs?.find(
          (t: any) => t.type === 'custom' && t.meta?.customTabKey === extensionTab.id
        );
        if (!matchingTab) return null;
        const isActive = matchingTab.id === activeTabId;
        const Component = extensionTab.content || extensionTab.component;
        if (!Component) return null;
        return (
          <div key={extensionTab.id} className="h-full" style={{ display: isActive ? undefined : 'none' }}>
            <Component />
          </div>
        );
      })}
    </>
  );
};
