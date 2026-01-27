import { BrowserWindow, Menu, dialog, MenuItemConstructorOptions, app, shell, ipcMain } from "electron";
import path from "node:path";
import EventBus from "./eventBus";
import { getRecentPaths } from "./fileSystem";
import { setActiveProject, addTabToPanel, activateTabInLayout, getAppState, createNewDocumentTab, activateTab, addPanelTab } from "./state";
import { Tab } from "../shared/types";
import { saveState } from "./persistState";
import { createFileTreeContextMenu } from "./menus";
import { setActiveDirectory } from "./ipc/directory";
import { handleDeeplink } from "./deeplink";
import { windowManager } from "./windowManager";

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string;
declare const MAIN_WINDOW_VITE_NAME: string;

let splash: BrowserWindow | null = null;

export function setSplash(window: BrowserWindow) {
  splash = window;
}

const isMac = process.platform === "darwin";

const menubarTemplate: Array<MenuItemConstructorOptions> = [
  // App menu (macOS only)
  ...(isMac
    ? [
      {
        label: app.name,
        submenu: [
          {
            label: `About ${app.name}`,
            click: () => {
              windowManager.browserWindow?.webContents.send("menu:show-about", {});
            },
          },
          { type: "separator" as const },
          {
            label: "Check for Updates...",
            click: async () => {
              windowManager.browserWindow?.webContents.send("menu:check-updates", {});
            },
          },
          { type: "separator" as const },
          {
            label: "Settings...",
            accelerator: "Cmd+,",
            click: () => {
              windowManager.browserWindow?.webContents.send("menu:open-settings", {});
            },
          },
          { type: "separator" as const },
          {
            label: "Services",
            role: "services" as const,
          },
          { type: "separator" as const },
          {
            label: `Hide ${app.name}`,
            accelerator: "Cmd+H",
            role: "hide" as const,
          },
          {
            label: "Hide Others",
            accelerator: "Option+Cmd+H",
            role: "hideOthers" as const,
          },
          {
            label: "Show All",
            role: "unhide" as const,
          },
          { type: "separator" as const },
          {
            label: `Quit ${app.name}`,
            accelerator: "Cmd+Q",
            role: "quit" as const,
          },
        ],
      },
    ]
    : []),
  // File menu
  {
    label: "File",
    submenu: [
      {
        label: "New Window",
        accelerator: "CmdOrCtrl+Shift+N",
        click: async () => {
          await windowManager.createWindow();
        },
      },
      {
        label: "New File",
        accelerator: "CmdOrCtrl+N",
        click: async () => {
          await createNewDocumentTab();
        },
      },
      { type: "separator" },
      {
        label: "Open File",
        click: async (_menuItem, browserWindow) => {
          if (!browserWindow) return;
          const result = await dialog.showOpenDialog(browserWindow, {
            properties: ["openFile"],
          });
          if (!result.canceled) {
            const file = result.filePaths[0];

            const newTab = {
              id: crypto.randomUUID(),
              type: "document" as const,
              title: path.basename(file),
              source: file,
              directory: null,
            };
            const tab = await addPanelTab(undefined, 'main', newTab);
            await activateTab(undefined, 'main', tab.tabId);
            if (windowManager.browserWindow) windowManager.browserWindow.webContents.send('file:newTab');
          }
        },
      },
      {
        label: "Open Folder...",
        accelerator: "CmdOrCtrl+O",
        click: async (_menuItem, browserWindow) => {
          if (!browserWindow) return;
          const result = await dialog.showOpenDialog(browserWindow, {
            properties: ["openDirectory", "createDirectory"],
          });
          if (!result.canceled) {
            await setActiveProject(result.filePaths[0]);
            windowManager.browserWindow?.webContents.send('folder:opened', { path: result.filePaths[0] })
          }
        },
      },
      {
        label: "Open Recent",
        submenu: [
          {
            label: "No recent projects",
            enabled: false,
          },
        ],
      },
      { type: "separator" },
      {
        label: "Save",
        accelerator: "CmdOrCtrl+S",
        click: () => {
          windowManager.browserWindow?.webContents.send("file-menu-command", { command: "save-file" });
        },
      },
      { type: "separator" },
      {
        label: "Close Project",
        click: () => {
          windowManager.browserWindow?.webContents.send("directory:close-project", {});
        },
      },
      {
        label: "Close Window",
        click: async () => {
          await windowManager.destroyWindow(windowManager.activeWindowId as string);
          if (windowManager.browserWindow) await windowManager.browserWindow?.close();
        },
      },
      // Windows-specific menu items
      ...(!isMac
        ? [
          { type: "separator" as const },
          {
            label: "Settings...",
            accelerator: "Ctrl+,",
            click: () => {
              windowManager.browserWindow?.webContents.send("menu:open-settings", {});
            },
          },
          { type: "separator" as const },
          {
            label: "Exit",
            accelerator: "Alt+F4",
            role: "quit" as const,
          },
        ]
        : []),
    ],
  },
  // Edit menu
  {
    label: "Edit",
    submenu: [
      {
        label: "Undo",
        accelerator: "CmdOrCtrl+Z",
        role: "undo",
      },
      {
        label: "Redo",
        accelerator: isMac ? "Shift+Cmd+Z" : "Ctrl+Y",
        role: "redo",
      },
      { type: "separator" },
      {
        label: "Cut",
        accelerator: "CmdOrCtrl+X",
        role: "cut",
      },
      {
        label: "Copy",
        accelerator: "CmdOrCtrl+C",
        role: "copy",
      },
      {
        label: "Paste",
        accelerator: "CmdOrCtrl+V",
        role: "paste",
      },
      ...(isMac
        ? [
          {
            label: "Paste and Match Style",
            accelerator: "Option+Shift+Cmd+V",
            role: "pasteAndMatchStyle" as const,
          },
        ]
        : []),
      { type: "separator" },
      {
        label: "Select All",
        accelerator: "CmdOrCtrl+A",
        role: "selectAll",
      },
      { type: "separator" },
      {
        label: "Find",
        accelerator: "CmdOrCtrl+F",
        click: () => {
          windowManager.browserWindow?.webContents.send("menu:find", {});
        },
      },
    ],
  },
  // View menu
  {
    label: "View",
    submenu: [
      {
        label: "Toggle File Explorer",
        accelerator: isMac ? "Cmd+Shift+E" : "Ctrl+Shift+E",
        click: () => {
          windowManager.browserWindow?.webContents.send("menu:toggle-explorer", {});
        },
      },
      {
        label: "Toggle Terminal",
        accelerator: isMac ? "Cmd+J" : "Ctrl+J",
        click: () => {
          windowManager.browserWindow?.webContents.send("menu:toggle-terminal", {});
        },
      },
      { type: "separator" },
      {
        label: "Reload",
        accelerator: "CmdOrCtrl+R",
        role: "reload",
      },
      {
        label: "Force Reload",
        accelerator: isMac ? "Option+Cmd+R" : "Ctrl+Shift+R",
        role: "forceReload",
      },
      { type: "separator" },
      {
        label: "Actual Size",
        accelerator: "CmdOrCtrl+0",
        role: "resetZoom",
      },
      {
        label: "Zoom In",
        accelerator: "CmdOrCtrl+Plus",
        click: (_, browserWindow) => {
          if (browserWindow) {
            const currentZoom = browserWindow.webContents.getZoomLevel();
            if (currentZoom < 3) {
              browserWindow.webContents.setZoomLevel(Math.min(currentZoom + 0.5,1));
            }
          }
        },
      },
      {
        label: "Zoom Out",
        accelerator: "CmdOrCtrl+-",
        click: (_, browserWindow) => {
          if (browserWindow) {
            const currentZoom = browserWindow.webContents.getZoomLevel();
            if (currentZoom > -1) {
              browserWindow.webContents.setZoomLevel(Math.max(currentZoom - 0.5, -1));
            }
          }
        },
      },
      { type: "separator" },
      {
        label: "Toggle Full Screen",
        accelerator: isMac ? "Control+Cmd+F" : "F11",
        role: "togglefullscreen",
      },
      { type: "separator" },
      {
        label: "Toggle Developer Tools",
        accelerator: isMac ? "Option+Cmd+I" : "F12",
        click: (_menuItem, browserWindow) => {
          if (browserWindow) {
            windowManager.browserWindow?.webContents.toggleDevTools();
          }
        },
      },
    ],
  },
  // Window menu (macOS)
  ...(isMac
    ? [
      {
        label: "Window",
        submenu: [
          {
            label: "Minimize",
            accelerator: "Cmd+M",
            role: "minimize" as const,
          },
          {
            label: "Zoom",
            role: "zoom" as const,
          },
          { type: "separator" as const },
          {
            label: "Bring All to Front",
            role: "front" as const,
          },
        ],
      },
    ]
    : []),
  // Help menu
  {
    label: "Help",
    submenu: [
      {
        label: "Welcome",
        click: () => {
          windowManager.browserWindow?.webContents.send("menu:open-welcome", {});
        },
      },
      {
        label: "Changelog",
        click: () => {
          windowManager.browserWindow?.webContents.send("menu:open-changelog", {});
        },
      },
      { type: "separator" },
      {
        label: "Documentation",
        click: () => {
          shell.openExternal("https://docs.voiden.md");
        },
      },
      {
        label: "Report an Issue",
        click: () => {
          shell.openExternal("https://github.com/voidenhq/voiden/issues");
        },
      },
      { type: "separator" },
      {
        label: "Install CLI Command...",
        click: async () => {
          const { showCliInstructions } = await import("./cliInstaller");
          await showCliInstructions();
        },
      },
      { type: "separator" },
      {
        label: "Visit Voiden Website",
        click: () => {
          shell.openExternal("https://voiden.md");
        },
      },
      ...(!isMac
        ? [
          { type: "separator" as const },
          {
            label: "Check for Updates...",
            click: async () => {
              windowManager.browserWindow?.webContents.send("menu:check-updates", {});
            },
          },
          { type: "separator" as const },
          {
            label: `About ${app.name}`,
            click: () => {
              windowManager.browserWindow?.webContents.send("menu:check-updates", {});
            },
          },
        ]
        : []),
    ],
  },
];

export async function createMenuWithRecent(mainWindow: BrowserWindow) {
  const recent = await getRecentPaths();

  const fileMenu = menubarTemplate.find((item) => item.label === "File");
  if (fileMenu && Array.isArray(fileMenu.submenu)) {
    const openRecentMenu = fileMenu.submenu.find(
      (item) => typeof item === "object" && "label" in item && item.label === "Open Recent",
    );

    if (openRecentMenu && typeof openRecentMenu === "object" && "submenu" in openRecentMenu) {
      if (recent.length === 0) {
        openRecentMenu.submenu = [
          {
            label: "No recent projects",
            enabled: false,
          },
        ];
      } else {
        openRecentMenu.submenu = [
          ...recent.map((projectPath: string) => ({
            label: path.basename(projectPath),
            sublabel: projectPath,
            click: async () => {
              await setActiveDirectory(projectPath, mainWindow);
            },
          })),
          { type: "separator" as const },
          {
            label: "Clear Recently Opened",
            click: async () => {
              // Clear recent paths logic - you may need to implement this
              windowManager.browserWindow?.webContents.send("menu:clear-recent", {});
              await createMenuWithRecent(mainWindow);
            },
          },
        ];
      }
    }
  }

  // Build and set menu for all platforms
  // macOS: Shows in system menu bar
  // Windows/Linux: Hidden but still handles keyboard shortcuts
  const menu = Menu.buildFromTemplate(menubarTemplate);
  Menu.setApplicationMenu(menu);
}

// Get icon path for Linux
const getLinuxIcon = () => {
  if (process.platform !== "linux") return undefined;
  // In production, icon is in resources; in dev, it's in src/images
  const iconPath = app.isPackaged
    ? path.join(process.resourcesPath, "icon.png")
    : path.join(__dirname, "../../src/images/icon.png");
  return iconPath;
};

export async function createWindow(): Promise<BrowserWindow> {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minHeight: 384,
    minWidth: 384,
    webPreferences: {
      contextIsolation: true,
      webSecurity: true,
      preload: path.join(__dirname, "preload.js"),
    },
    show: false,
    icon: getLinuxIcon(),
    ...(isMac ? {
      titleBarOverlay: {
        color: "#1f2430",
        symbolColor: "#ffffff",
      },
      titleBarStyle: "hidden",
    } : { frame: false })
  });
  mainWindow.on("ready-to-show", () => {
    splash?.destroy();
    mainWindow.show();
  });
  EventBus.registerWindow(mainWindow);
  // Clear Electron's cache in development to ensure fresh UI loads
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    await mainWindow.webContents.session.clearCache();
  }
  mainWindow.webContents.session.webRequest.onBeforeSendHeaders((details, callback) => {
    const newHeaders = {
      ...details.requestHeaders,
      Origin: MAIN_WINDOW_VITE_DEV_SERVER_URL || "voiden://",
    };

    callback({ cancel: false, requestHeaders: newHeaders });
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }

  // On Windows/Linux, auto-hide the menu bar (keyboard shortcuts still work)
  // User can press Alt to show it temporarily, or use the hamburger menu
  if (!isMac) {
    mainWindow.setAutoHideMenuBar(true);
  }

  handleDeeplink(mainWindow);

  if (process.env.NODE_ENV === "development") {
    mainWindow.webContents.openDevTools();
  }

  createMenuWithRecent(mainWindow);
  createFileTreeContextMenu(mainWindow);

  return mainWindow;
}

// Removed auto-opening of welcome/changelog tabs
// Users can now access these from Help menu
export async function initializeWelcomeTabs() {
  // No longer auto-opens welcome/changelog tabs
  return;
}
