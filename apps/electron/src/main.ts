import { app, BrowserWindow, dialog, ipcMain } from "electron";
import path from "node:path";
import fs from "node:fs";
import * as https from "https";
import { spawn } from "child_process";
import * as semver from "semver";
import started from "electron-squirrel-startup";

import { ipcStateHandlers } from "./main/state";
import { registerSettingsIpc, getSettings } from "./main/settings";
import { registerFontsIpc } from "./main/fonts";
import { closeAllWatchers } from "./main/fileWatcher";
import { createWindow, initializeWelcomeTabs, setSplash } from "./main/window";
// import { initializeUpdates, registerUpdateIpcHandlers } from "./main/updates";
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

// Handle creating/removing shortcuts on Windows when installing/uninstalling
if (started) {
  app.quit();
}

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
}


app.on('second-instance', async (event, commandLine, workingDirectory) => {
  try {
    const args = (commandLine).slice(3);
    if (args.length > 0) {
      await handleCliArguments(args);
    } else {
      const windows = windowManager.browserWindows;
      if (windows.size === 0) {
        await windowManager.loadAllWindows()
        return;
      }
      try {
        const mainWindow = windows.values().next().value as BrowserWindow;
        if (mainWindow.isMinimized()) mainWindow.restore();
        if (!mainWindow.isVisible()) mainWindow.show();
        mainWindow.focus();
        // macOS: activate app
        if (process.platform === 'darwin') {
          app.focus({ steal: true });
        }
      } catch (error) {
      }
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
  // registerUpdateIpcHandlers();
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

  // Manual update check IPC handler (same flow as startup NSIS check)
  ipcMain.handle("app:checkForUpdates", async (_event, channel: "stable" | "early-access") => {
    if (process.platform !== "win32") {
      return { available: false };
    }

    const currentVersion = app.getVersion();
    const channelPath = (channel || "stable") === "early-access" ? "beta" : "stable";
    const downloadUrl = `https://voiden.md/api/download/${channelPath}/win32/x64/setup-latest.exe`;

    const targetVersion = "1.1.20";
    if (semver.valid(currentVersion) && semver.lt(currentVersion, targetVersion)) {
      const result = await dialog.showMessageBox({
        type: "info",
        buttons: ["Upgrade", "Later"],
        defaultId: 0,
        cancelId: 1,
        title: "Update Available",
        message: `New update with NSIS package is available (${targetVersion}), please upgrade.`,
      });

      if (result.response === 0) {
        const tmpPath = path.join(app.getPath("temp"), "voiden-setup-latest.exe");
        const file = fs.createWriteStream(tmpPath);

        for (const win of BrowserWindow.getAllWindows()) {
          win.webContents.send("update:progress", { status: "downloading", percent: 0 });
        }

        https.get(downloadUrl, {
          headers: {
            "User-Agent": `Voiden/${currentVersion} (${process.platform}: ${process.arch})`,
          },
        }, (response) => {
          if ((response.statusCode === 301 || response.statusCode === 302) && response.headers.location) {
            file.close();
            fs.unlinkSync(tmpPath);
            downloadNsisInstaller(response.headers.location, tmpPath);
            return;
          }

          if (response.statusCode !== 200) {
            file.close();
            dialog.showErrorBox("Download Failed", `Failed to download update: HTTP ${response.statusCode}`);
            return;
          }

          const totalBytes = parseInt(response.headers["content-length"] || "0", 10);
          let downloadedBytes = 0;

          response.on("data", (chunk) => {
            downloadedBytes += chunk.length;
            if (totalBytes > 0) {
              const percent = Math.round((downloadedBytes / totalBytes) * 100);
              for (const win of BrowserWindow.getAllWindows()) {
                win.webContents.send("update:progress", {
                  status: "downloading",
                  percent,
                  transferred: downloadedBytes,
                  total: totalBytes,
                });
              }
            }
          });

          response.pipe(file);
          file.on("finish", () => {
            file.close(() => {
              for (const win of BrowserWindow.getAllWindows()) {
                win.webContents.send("update:progress", { status: "installing", percent: 100 });
              }
              runNsisUpdateScript(tmpPath);
            });
          });
        }).on("error", (err) => {
          file.close();
          dialog.showErrorBox("Download Error", `Failed to download update: ${err.message}`);
        });

        return { available: true, version: targetVersion };
      }
    }

    return { available: false };
  });

  // Windows-only: NSIS update check on startup (migrating from Squirrel to NSIS)
  setTimeout(async () => {
      if (process.platform === "win32") {
    const currentVersion = app.getVersion();
    const targetVersion = "1.1.20";

    if (semver.valid(currentVersion) && semver.lt(currentVersion, targetVersion)) {
      const settings = getSettings();
      const channel = settings.updates?.channel || "stable";
      const channelPath = channel === "early-access" ? "beta" : "stable";
      const downloadUrl = `https://voiden.md/api/download/${channelPath}/win32/x64/setup-latest.exe`;

      dialog.showMessageBox({
        type: "info",
        buttons: ["Upgrade", "Later"],
        defaultId: 0,
        cancelId: 1,
        title: "Update Available",
        message: `New update with NSIS package is available (${targetVersion}), please upgrade.`,
      }).then((result) => {
        if (result.response === 0) {
          const tmpPath = path.join(app.getPath("temp"), "voiden-setup-latest.exe");
          const file = fs.createWriteStream(tmpPath);

          // Send initial progress to frontend
          for (const win of BrowserWindow.getAllWindows()) {
            win.webContents.send("update:progress", { status: "downloading", percent: 0 });
          }

          https.get(downloadUrl, {
            headers: {
              "User-Agent": `Voiden/${currentVersion} (${process.platform}: ${process.arch})`,
            },
          }, (response) => {
            // Handle redirects
            if ((response.statusCode === 301 || response.statusCode === 302) && response.headers.location) {
              file.close();
              fs.unlinkSync(tmpPath);
              downloadNsisInstaller(response.headers.location, tmpPath);
              return;
            }

            if (response.statusCode !== 200) {
              file.close();
              dialog.showErrorBox("Download Failed", `Failed to download update: HTTP ${response.statusCode}`);
              return;
            }

            const totalBytes = parseInt(response.headers["content-length"] || "0", 10);
            let downloadedBytes = 0;

            response.on("data", (chunk) => {
              downloadedBytes += chunk.length;
              if (totalBytes > 0) {
                const percent = Math.round((downloadedBytes / totalBytes) * 100);
                for (const win of BrowserWindow.getAllWindows()) {
                  win.webContents.send("update:progress", {
                    status: "downloading",
                    percent,
                    transferred: downloadedBytes,
                    total: totalBytes,
                  });
                }
              }
            });

            response.pipe(file);
            file.on("finish", () => {
              file.close(() => {
                for (const win of BrowserWindow.getAllWindows()) {
                  win.webContents.send("update:progress", { status: "installing", percent: 100 });
                }
                runNsisUpdateScript(tmpPath);
              });
            });
          }).on("error", (err) => {
            file.close();
            dialog.showErrorBox("Download Error", `Failed to download update: ${err.message}`);
          });
        }
      });
    }
  }
   },10_000);
});

/**
 * Downloads the NSIS installer (used for redirect handling).
 */
function downloadNsisInstaller(url: string, tmpPath: string) {
  const file = fs.createWriteStream(tmpPath);

  https.get(url, (response) => {
    if (response.statusCode !== 200) {
      file.close();
      dialog.showErrorBox("Download Failed", `Failed to download update: HTTP ${response.statusCode}`);
      return;
    }

    const totalBytes = parseInt(response.headers["content-length"] || "0", 10);
    let downloadedBytes = 0;

    response.on("data", (chunk) => {
      downloadedBytes += chunk.length;
      if (totalBytes > 0) {
        const percent = Math.round((downloadedBytes / totalBytes) * 100);
        for (const win of BrowserWindow.getAllWindows()) {
          win.webContents.send("update:progress", {
            status: "downloading",
            percent,
            transferred: downloadedBytes,
            total: totalBytes,
          });
        }
      }
    });

    response.pipe(file);
    file.on("finish", () => {
      file.close(() => {
        for (const win of BrowserWindow.getAllWindows()) {
          win.webContents.send("update:progress", { status: "installing", percent: 100 });
        }
        runNsisUpdateScript(tmpPath);
      });
    });
  }).on("error", (err) => {
    file.close();
    dialog.showErrorBox("Download Error", `Failed to download update: ${err.message}`);
  });
}

/**
 * Creates and runs a batch script that:
 * 1. Waits for the current app to exit
 * 2. Uninstalls the current Squirrel-based installation
 * 3. Runs the new NSIS installer
 */
function runNsisUpdateScript(nsisInstallerPath: string) {
  // Squirrel's Update.exe is two levels up from the app executable
  const squirrelUpdateExe = path.resolve(process.execPath, "..", "..", "Update.exe");

  const batchScript = `@echo off
:: Wait for the current app to fully exit
timeout /t 5 /nobreak > nul

:: Uninstall the current Squirrel-based installation
if exist "${squirrelUpdateExe}" (
  "${squirrelUpdateExe}" --uninstall -s
  timeout /t 5 /nobreak > nul
)

:: Run the new NSIS installer
start "" "${nsisInstallerPath}"

:: Clean up this script
del "%~f0"
`;

  const batchPath = path.join(app.getPath("temp"), "voiden-update.bat");
  fs.writeFileSync(batchPath, batchScript);

  // Run the batch script detached so it survives app quit
  const child = spawn("cmd.exe", ["/c", batchPath], {
    detached: true,
    stdio: "ignore",
  });
  child.unref();

  // Quit the current app so the batch script can proceed
  app.quit();
}

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

// Auto-updates disabled - using NSIS update flow in app.on("ready") instead
// const settings = getSettings();
// const updateChannel = settings.updates?.channel || "stable";
// initializeUpdates(updateChannel);


