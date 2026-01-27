import { Star, Folder, Lock, Hammer, Settings } from "lucide-react";
import logo from "@/assets/logo-dark.png";
import { useGetPanelTabs, useAddPanelTab, useActivateTab } from "@/core/layout/hooks";

const WelcomeScreen = () => {
  const { mutate: addPanelTab } = useAddPanelTab();
  const { mutate: activateTab } = useActivateTab();
  const { data: mainTabs } = useGetPanelTabs("main");

  const handleOpenSettings = () => {
    const existing = mainTabs?.tabs?.find((t) => t.type === "settings");
    if (existing) {
      // Focus the existing Settings tab
      activateTab({ panelId: "main", tabId: existing.id });
      return;
    }

    // Tab not open - open it now
    addPanelTab({
      panelId: "main",
      tab: { id: crypto.randomUUID(), type: "settings", title: "Settings", source: null },
    });
  };

  return (
    <div className="h-full flex flex-col">
      <div className="h-full bg-editor overflow-auto flex  justify-center p-6 mb-2 text-text">
        <div className="max-w-2xl w-full  p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-full flex justify-center">
              <img src={logo} className="w-[150px] h-auto" />
            </div>

            {/* <h1 className="text-3xl font-bold flex items-center justify-center gap-2">WelVme</h1> */}
            <p className="mt-2 text-comment">
              Voiden is your all-in-one workspace for building, testing, and documenting APIs — designed from the ground up for power, control, and
              creativity.
            </p>
          </div>

          {/* Features */}
          <div className="space-y-6 mb-10">
            {/* Feature 1 */}
            <div className="flex items-start gap-3">
              <Star className="w-6 h-6 text-yellow-500 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold ">Voiden Docs: Flexible by Nature</h3>
                <p className="text-comment">
                  At the heart of Voiden is the .void document — a flexible format that brings together API requests, documentation, and notes in one
                  place. Whether you’re designing, testing, or writing, everything lives in a single, adaptable workspace built for flow.
                </p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="flex items-start gap-3">
              <Hammer className="w-6 h-6 text-blue-500 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold ">Voiden Plugins: Built for Extensibility</h3>
                <p className="text-comment">
                  Built for Extensibility Voiden is designed to adapt. With a powerful plugin system, you can extend core functionality, integrate with
                  your favorite tools, and automate anything. Make Voiden do more — exactly the way you need it to.
                </p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="flex items-start gap-3">
              <Folder className="w-6 h-6 text-green-500 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold ">Built on Open Standards</h3>
                <p className="text-comment">
                  Everything is Markdown. Version control is Git. Your content stays portable, editable, and yours — no proprietary formats, no lock-in,
                  no compromises.
                </p>
              </div>
            </div>

            {/* Feature 4 */}
            <div className="flex items-start gap-3">
              <Lock className="w-6 h-6 text-red-500 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold ">Offline. Private. Secure.</h3>
                <p className="text-comment">
                  Voiden runs entirely on your machine. No background syncs, no data collection, no outside dependencies. Just a fast, focused
                  environment where your work stays yours.
                </p>
              </div>
            </div>
          </div>

          {/* Customization Section */}
          <div className="border border-border rounded-lg p-4 bg-bg/30">
            <div className="flex items-start gap-3">
              <Settings className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold mb-2">Customize Your Experience</h3>
                <p className="text-comment text-sm mb-3">
                  Adjust font size, choose your preferred theme, and personalize your workspace.
                  <button
                    onClick={handleOpenSettings}
                    className="text-accent hover:underline ml-1 font-medium"
                  >
                    Open Settings
                  </button>
                </p>
                <div className="space-y-1.5 text-xs text-comment">
                  <div className="flex items-start gap-2">
                    <span className="text-accent">•</span>
                    <span><span className="font-medium">Font Size:</span> Increase or decrease the base font size (recommended: 14-16px)</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-accent">•</span>
                    <span><span className="font-medium">Font Family:</span> Choose from Inconsolata, JetBrains Mono, Fira Code, or Geist Mono</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-accent">•</span>
                    <span><span className="font-medium">Theme:</span> Switch between different color schemes to match your preference</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Get Started Section */}

          {/* <div className="space-y-4">
            <button className="w-full flex items-center gap-3 p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <FilePlus className="w-5 h-5" />
              Create a new .void document
              <span className="text-sm text-blue-100">– Start building your API projects</span>
            </button>
            <button className="w-full flex items-center gap-3 p-3 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 transition-colors">
              <FolderOpen className="w-5 h-5" />
              Open an existing project
              <span className="text-sm text-gray-600">– Continue where you left off</span>
            </button>
            <button className="w-full flex items-center gap-3 p-3 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 transition-colors">
              <Puzzle className="w-5 h-5" />
              Explore plugins
              <span className="text-sm text-gray-600">– Discover ways to extend the app’s functionality</span>
            </button>
          </div> */}
        </div>
      </div>
    </div>

  );
};

export default WelcomeScreen;
