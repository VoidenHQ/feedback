import { app, BrowserWindow, ipcMain } from "electron";
import path from "node:path";
import started from "electron-squirrel-startup";

import { ipcStateHandlers } from "./main/state";
import { registerSettingsIpc, getSettings } from "./main/settings";
import { registerFontsIpc } from "./main/fonts";
import { closeAllWatchers } from "./main/fileWatcher";
import { createWindow, initializeWelcomeTabs, setSplash } from "./main/window";
import { initializeUpdates, registerUpdateIpcHandlers } from "./main/updates";
import { handleCliArguments, getCliArguments, setupMacOSFileHandler } from "./main/cliHandler";
import { windowManager } from "./main/windowManager";
// IPC Handler Imports
import { registerFileIpcHandlers } from "./main/ipc/files";
import { registerGitIpcHandlers } from "./main/ipc/git";
import { registerDirectoryIpcHandlers } from "./main/ipc/directory";
import { registerTabIpcHandlers } from "./main/ipc/tabHandlers";
import { registerPluginIpcHandlers } from "./main/ipc/plugins";
import { registerAppIpcHandlers } from "./main/ipc/app";
import { registerRequestIpcHandler } from "./main/ipc/request";
import { registerSearchIpcHandler } from "./main/ipc/search";
import { registerContextMenuIpcHandlers } from "./main/ipc/contextMenus";
import { registerThemeIpcHandlers } from "./main/ipc/themes";
import { registerCliIpcHandlers } from "./main/ipc/cli";

// Import side-effect modules
import "./main/terminal";
import "./main/git";
import "./main/voiden";
import "./main/env";
import "./main/utils";
import "./main/variables";

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
// During Squirrel events (install/update/uninstall), skip all app initialization
// to avoid "location could not be found" errors from accessing paths that
// don't exist yet during the install process.
if (started) {
  app.quit();
} else {

const gotTheLock = app.requestSingleInstanceLock({ args: getCliArguments() });

if (!gotTheLock) {
  app.quit();
}


app.on('second-instance', async (event, commandLine, workingDirectory, additionalData) => {
  try {
    // On Linux, commandLine has fewer Chromium flags so slice(3) loses user args.
    // Use additionalData to get pre-parsed CLI arguments reliably on Linux.
    const args: string[] = process.platform === 'linux'
      ? (additionalData as { args?: string[] })?.args || []
      : (commandLine).slice(3);

    if (args.length > 0) {
      await handleCliArguments(args);
    } else {
      const windows = windowManager.browserWindows;
      if (windows.size === 0) {
        await windowManager.loadAllWindows()
        return;
      }
      // No args: create a new window
      await windowManager.createWindow(undefined, true);
    }
  } catch (error) {
  }
});

// Setup protocol client for deeplinks
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient("voiden", process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient("voiden");
}


// Disable spell checker
app.on("web-contents-created", (_, contents) => {
  contents.session.setSpellCheckerEnabled(false);
});

// App ready event
app.on("ready", async () => {
  // Create splash screen - will be destroyed by createWindow
  const splashWindow = new BrowserWindow({
    width: 400,
    height: 300,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
  });

  const isDev = !app.isPackaged;
  const splashPath = isDev
    ? path.resolve(__dirname, "../../splash.html")
    : path.join(process.resourcesPath, "splash.html");
  // console.debug("splash path " + splashPath);
  splashWindow.loadFile(splashPath);
  setSplash(splashWindow);

  // Create main window
  const cliArgs = getCliArguments();
  if (cliArgs.length > 0) {
    await handleCliArguments(cliArgs);
    setupMacOSFileHandler(windowManager.browserWindow as BrowserWindow);
    if (windowManager.getAllWindows().length === 0) {
      splashWindow?.destroy();
    }
  } else {
    await windowManager.loadAllWindows();
  }
  ipcMain.handle('mainwindow:minimize', () => {
    if (!windowManager.browserWindow) return;
    windowManager.browserWindow.minimize();
  })

  ipcMain.handle('mainwindow:maximize', () => {
    if (!windowManager.browserWindow) return;
    if (windowManager.browserWindow.isMaximized()) {
      windowManager.browserWindow.unmaximize();
    } else {
      windowManager.browserWindow.maximize();
    }
  })

  ipcMain.handle('mainwindow:isMaximized', () => {
    if (!windowManager.browserWindow) return;
    return windowManager.browserWindow.isMaximized()
  })

  ipcMain.handle('mainwindow:close', () => {
    if (!windowManager.browserWindow) return;
    windowManager.browserWindow.close();
  })
  // Register all IPC handlers
  registerSettingsIpc();
  registerFontsIpc();
  registerUpdateIpcHandlers();
  registerFileIpcHandlers();
  registerGitIpcHandlers();
  registerDirectoryIpcHandlers();
  registerTabIpcHandlers();
  registerPluginIpcHandlers();
  registerAppIpcHandlers();
  registerRequestIpcHandler();
  registerSearchIpcHandler();
  registerContextMenuIpcHandlers();
  registerThemeIpcHandlers();
  registerCliIpcHandlers();
  ipcStateHandlers();
});

// Handle Second Command line

// Window lifecycle events
app.on("window-all-closed", async () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", async () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    await windowManager.loadAllWindows()
  }
});

// Cleanup on quit
app.on("before-quit", async () => {
  closeAllWatchers();
});

// Initialize auto-updates with the configured channel
const settings = getSettings();
const updateChannel = settings.updates?.channel || "stable";
initializeUpdates(updateChannel);

} // end of !started block


