import { ipcMain, BrowserWindow } from "electron";
import {
  getTabs,
  addTab,
  closeTab,
  closeAllTabs,
  closeTabsToRight,
  closeOtherTabs,
  setTabDirty,
  activateTab,
} from "../tabs";

export function registerTabIpcHandlers() {
  ipcMain.handle("active:getTabs", getTabs);

  ipcMain.handle("active:addTab", (_event, filePath) => {
    const mainWindow = BrowserWindow.fromWebContents(_event.sender);
    return addTab(filePath, mainWindow);
  });

  ipcMain.handle("active:closeTab", (_event, filePath) => closeTab(filePath));

  ipcMain.handle("active:closeAllTabs", closeAllTabs);

  ipcMain.handle("active:closeTabsToRight", (_event, filePath) => closeTabsToRight(filePath));

  ipcMain.handle("active:closeOtherTabs", (_event, filePath) => closeOtherTabs(filePath));

  ipcMain.handle("active:setTabDirty", (_event, filePath, isDirty) => setTabDirty(filePath, isDirty));

  ipcMain.handle("active:activateTab", (_event, filePath) => {
    const mainWindow = BrowserWindow.fromWebContents(_event.sender);
    return activateTab(filePath, mainWindow);
  });
}
