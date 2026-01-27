import { BrowserWindow, app } from "electron";
import os from "node:os";
import { createWindow } from "./window";
import { handleCliArguments } from "./cliHandler";

function handleWindowsDeeplink(mainWindow: BrowserWindow) {
  const gotTheLock = app.requestSingleInstanceLock();

  if (!gotTheLock) {
    app.quit();
  } else {
    app.on("second-instance", async (event, commandLine) => {
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
      }
      event.preventDefault();

      // Check if this is a deep link URL (for login)
      const lastArg = commandLine[commandLine.length - 1];
      if (lastArg && lastArg.startsWith("voiden://")) {
        if (lastArg.includes("isRefresh=")) {
          mainWindow.reload();
        }
        mainWindow.webContents.send("handle-login", lastArg);
        return;
      }

      // Otherwise, handle as CLI arguments (files/folders to open)
      // Skip the executable path (first argument)
      const cliArgs = commandLine.slice(1);
      if (cliArgs.length > 0) {
        await handleCliArguments(mainWindow, cliArgs);
      }
    });
  }
}

function handleMacDeeplink(mainWindow: BrowserWindow) {
  app.on("open-url", (event, url) => {
    event.preventDefault();
    if (!mainWindow.isDestroyed()) {
      if (url && url.includes("isRefresh=")) {
        mainWindow.reload();
      }
      mainWindow.webContents.send("handle-login", url);
    } else {
      createWindow().then((newWindow) => {
        newWindow.webContents.on("did-finish-load", () => {
          if (url && url.includes("isRefresh=")) {
            newWindow.reload();
          }
          newWindow.webContents.send("handle-login", url);
        });
      });
    }
  });
}

export function handleDeeplink(mainWindow: BrowserWindow) {
  if (os.platform() === "win32") {
    handleWindowsDeeplink(mainWindow);
  }
  if (os.platform() === "darwin") {
    handleMacDeeplink(mainWindow);
  }
}
