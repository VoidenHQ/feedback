import { app, BrowserWindow, IpcMainInvokeEvent } from "electron";
import path from "node:path";
import fs from "node:fs";
import { windowManager } from "./windowManager";

interface TabState {
  filePath: string;
  isActive: boolean;
  isDirty: boolean;
  displayName: string;
  lastAccessed: string;
}

interface ActiveStates {
  directories: {
    [path: string]: {
      tabs: TabState[];
    };
  };
  activeDirectory?: string;
}

async function getActiveStates(mainWindow?:BrowserWindow): Promise<ActiveStates> {
  const windowId = mainWindow?.windowInfo.id || '';
  const activePath = await windowManager.getActiveStateFilePath(windowId as string);
  try {
    const data = await fs.promises.readFile(activePath, "utf8");
    return JSON.parse(data);
  } catch {
    return { directories: {} };
  }
}

async function saveActiveStates(states: ActiveStates,mainWindow?:BrowserWindow) {
  const activePath = await windowManager.getActiveStateFilePath();
  await fs.promises.writeFile(activePath, JSON.stringify(states, null, 2));
}

export async function getTabs(event:IpcMainInvokeEvent): Promise<TabState[]> {
  const mainWindow = BrowserWindow.fromWebContents(event.sender);
  const states = await getActiveStates(mainWindow as BrowserWindow);
  const activeDirectory = states.activeDirectory;
  if (!activeDirectory) return [];

  return states.directories[activeDirectory]?.tabs || [];
}

export async function addTab(filePath: string, mainWindow: BrowserWindow) {
  const states = await getActiveStates(mainWindow);
  const { activeDirectory } = states;

  // Early return if no active directory
  if (!activeDirectory) return;

  // Initialize directory state if it doesn't exist
  if (!states.directories[activeDirectory]) {
    states.directories[activeDirectory] = {
      tabs: [],
    };
  }

  // Ensure tabs array exists
  if (!states.directories[activeDirectory].tabs) {
    states.directories[activeDirectory].tabs = [];
  }

  const tabs = states.directories[activeDirectory].tabs;
  const existingTabIndex = tabs.findIndex((tab) => tab.filePath === filePath);
  const currentTime = new Date().toISOString();

  if (existingTabIndex !== -1) {
    // Update existing tab
    tabs[existingTabIndex] = {
      ...tabs[existingTabIndex],
      isActive: true,
      lastAccessed: currentTime,
    };
  } else {
    // Add new tab
    tabs.push({
      filePath,
      isActive: true,
      isDirty: false,
      displayName: path.basename(filePath),
      lastAccessed: currentTime,
    });
  }

  // Deactivate all other tabs
  tabs.forEach((tab, index) => {
    if (tab.filePath !== filePath) {
      tabs[index] = { ...tab, isActive: false };
    }
  });

  // Save changes
  await saveActiveStates(states,mainWindow);
  mainWindow.webContents.send("tabs:changed", states.directories[activeDirectory].tabs);
}

export async function closeTab(filePath: string,mainWindow?:BrowserWindow) {
  const states = await getActiveStates(mainWindow);
  const activeDirectory = states.activeDirectory;
  if (!activeDirectory) return;

  const tabs = states.directories[activeDirectory]?.tabs || [];
  const tabIndex = tabs.findIndex((tab) => tab.filePath === filePath);

  if (tabIndex !== -1) {
    // If closing active tab, activate the next tab (or previous if it's the last tab)
    if (tabs[tabIndex].isActive && tabs.length > 1) {
      const nextTab = tabs[tabIndex + 1] || tabs[tabIndex - 1];
      if (nextTab) {
        nextTab.isActive = true;
      }
    }

    // Remove the tab
    tabs.splice(tabIndex, 1);

    await saveActiveStates(states,mainWindow);
  }
}

export async function closeAllTabs(event:IpcMainInvokeEvent) {
  const mainWindow = BrowserWindow.fromWebContents(event.sender) as BrowserWindow;
  const states = await getActiveStates(mainWindow);
  const activeDirectory = states.activeDirectory;
  if (!activeDirectory) return;
  if (states.directories[activeDirectory]) {
    states.directories[activeDirectory].tabs = [];
    await saveActiveStates(states,mainWindow);
  }
}

export async function closeTabsToRight(event:IpcMainInvokeEvent,filePath: string) {
    const mainWindow = BrowserWindow.fromWebContents(event.sender) as BrowserWindow;
  const states = await getActiveStates(mainWindow);
  const activeDirectory = states.activeDirectory;
  if (!activeDirectory) return;

  const tabs = states.directories[activeDirectory]?.tabs || [];
  const tabIndex = tabs.findIndex((tab) => tab.filePath === filePath);

  if (tabIndex !== -1) {
    // Remove all tabs after the specified tab
    states.directories[activeDirectory].tabs = tabs.slice(0, tabIndex + 1);
    await saveActiveStates(states,mainWindow);
  }
}

export async function closeOtherTabs(event:IpcMainInvokeEvent,filePath: string,mainWindow?:BrowserWindow) {
  const states = await getActiveStates(mainWindow);
  const activeDirectory = states.activeDirectory;
  if (!activeDirectory) return;

  const tabs = states.directories[activeDirectory]?.tabs || [];
  const tab = tabs.find((tab) => tab.filePath === filePath);

  if (tab) {
    states.directories[activeDirectory].tabs = [tab];
    await saveActiveStates(states,mainWindow);
  }
}

export async function setTabDirty(filePath: string, isDirty: boolean,mainWindow?:BrowserWindow) {
  const states = await getActiveStates(mainWindow);
  const activeDirectory = states.activeDirectory;
  if (!activeDirectory) return;

  const tab = states.directories[activeDirectory]?.tabs.find((tab) => tab.filePath === filePath);
  if (tab) {
    tab.isDirty = isDirty;
    await saveActiveStates(states,mainWindow);
  }
}

export async function activateTab(filePath: string, mainWindow: BrowserWindow) {
  const states = await getActiveStates(mainWindow);
  const activeDirectory = states.activeDirectory;
  if (!activeDirectory) return;

  const tabs = states.directories[activeDirectory]?.tabs || [];

  // Update active states for all tabs
  tabs.forEach((tab) => {
    tab.isActive = tab.filePath === filePath;
    if (tab.isActive) {
      tab.lastAccessed = new Date().toISOString();
    }
  });

  await saveActiveStates(states,mainWindow);
  mainWindow.webContents.send("tabs:changed", states.directories[activeDirectory].tabs);
}

export { getActiveStates, saveActiveStates };
