import { BrowserWindow, app } from "electron";
import os from "node:os";
import { createWindow } from "./window";

function handleWindowsDeeplink(mainWindow: BrowserWindow) {
  // Only handle voiden:// deep link URLs on Windows.
  // CLI argument handling (files/folders) is done in main.ts's second-instance handler.
  // Do NOT call requestSingleInstanceLock here — it's already called in main.ts.
  app.on("second-instance", async (_event, commandLine) => {
    const lastArg = commandLine[commandLine.length - 1];
    if (lastArg && lastArg.startsWith("voiden://")) {
      if (mainWindow && !mainWindow.isDestroyed()) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
        if (lastArg.includes("isRefresh=")) {
          mainWindow.reload();
        }
        mainWindow.webContents.send("handle-login", lastArg);
      }
    }
  });
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
