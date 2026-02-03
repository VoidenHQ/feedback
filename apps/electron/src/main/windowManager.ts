// file: apps/electron/src/main/windowManager.ts

import { BrowserWindow, app } from "electron";
import * as path from "path";
import * as fs from "fs";
import { randomUUID } from "crypto";
import EventBus from "./eventBus";
import { createWindow, initializeWelcomeTabs } from "./window";
import { getCliArguments, handleCliArguments, setupMacOSFileHandler } from "./cliHandler";
import { AppState } from "../shared/types";
import { getDefaultLayout, saveState } from "./persistState";
import { initializeState, updateWindowState } from "./state";
import { removeFileWatcher } from "./fileWatcher";
import { setActiveDirectory } from "./ipc/directory";

declare global {
  interface BrowserWindow {
    windowInfo?: WindowInfo;
  }
}

interface WindowInfo {
  id: string;
}

interface GlobalState {
  settings: any;
  extensions: any[];
}

class WindowManager {
  private windows = new Map<string, AppState | null>();
  browserWindow: BrowserWindow | null = null;
  browserWindows = new Map<string, BrowserWindow>();

  private stateDir = '';
  activeWindowId: string | null = null;
  private activeStateDir = ''

  constructor() {
    this.stateDir = path.join(app.getPath("userData"), "window-states");
    this.activeStateDir = path.join(app.getPath("userData"), "active-states");
    this.ensureStateDirExists();
  }

  private ensureStateDirExists() {
    if (!fs.existsSync(this.stateDir)) {
      fs.mkdirSync(this.stateDir, { recursive: true });
    }
    if (!fs.existsSync(this.activeStateDir)) {
      fs.mkdirSync(this.activeStateDir, { recursive: true });
    }
  }

  getStateFilePath(windowId?: string): string {
    const id = windowId || this.activeWindowId;
    if (!id) {
      throw new Error("No window ID available");
    }
    return path.join(this.stateDir, `voiden-state-${id}.json`);
  }
  getActiveStateFilePath(windowId?: string): string {
    const id = windowId || this.activeWindowId;
    if (!id) {
      throw new Error("No window ID available");
    }
    return path.join(this.activeStateDir, `active-state-${id}.json`);
  }

  register(win: BrowserWindow, id: string) {
    const that = this;
    win.on("focus", () => {
      that.setActiveWindowId(id);
      updateWindowState();
      win.webContents.send('window:changed')
      that.browserWindow = win;
    });
    win.on('unresponsive',()=>{
      that.windows.delete(id);
      that.destroyWindow(id);
      win.close();
    })
    win.on("closed", () => {
      this.activeWindowId = id;
      that.saveWindowState(id);
      that.windows.delete(id);
      this.browserWindows.delete(id);
      that.destroyWindow(id);
    });
  }

  get(id: string): AppState | null | undefined {
    return this.windows.get(id);
  }

  getWindow(id: string): BrowserWindow {
    return this.browserWindows.get(id) as BrowserWindow;
  }

  setActiveWindowId(windowId: string | null) {
    this.activeWindowId = windowId;
  }

  getActiveWindowId(): string | null {
    return this.activeWindowId;
  }

  private async saveWindowState(windowId: string) {
    const state = this.windows.get(windowId);
    if (!state) return;
    await saveState(state);
  }

  private async loadWindowState(windowId: string): Promise<AppState | null> {
    try {
      const filePath = this.getStateFilePath(windowId);
      if (!fs.existsSync(filePath)) return null;

      const data = await fs.promises.readFile(filePath, "utf-8");
      return JSON.parse(data);
    } catch (error) {
      console.error(`Failed to load window state for ${windowId}:`, error);
      return null;
    }
  }

  private deleteWindowStateFile(windowId: string) {
    try {
      const filePath = this.getStateFilePath(windowId);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
    }
  }

  private getAllStateFiles(): string[] {
    try {
      if (!fs.existsSync(this.stateDir)) return [];

      const files = fs.readdirSync(this.stateDir);
      const windowIds: string[] = [];

      for (const file of files) {
        const match = file.match(/^voiden-state-([a-f0-9-]+)\.json$/);
        if (match) {
          windowIds.push(match[1]);
        }
      }

      return windowIds;
    } catch (error) {
      console.error("Failed to read state files:", error);
      return [];
    }
  }


  async createWindow(windowId?: string,skipDefault?:boolean): Promise<BrowserWindow> {
    const win = await createWindow();

    try {
      // Generate a UUID for the window if not provided
      const id = windowId || randomUUID();
      this.setActiveWindowId(id);

      // Try to restore state
      const initializedState = await initializeState(skipDefault);
      const savedState = await this.loadWindowState(id);
      // Use savedState if available, otherwise fall back to the initialized state
      this.windows.set(id, savedState || initializedState);
      this.browserWindow = win;
      this.browserWindows.set(id, win);

      const state = this.windows.get(id);
      // If restored state has activeDirectory, set it up
      if (state?.activeDirectory) {
        await this.setActiveDirectory(id, state.activeDirectory);
      }
      // Attach window info
      win.windowInfo = {
        id: id
      };

      win.webContents.on("did-finish-load", async () => {
        await initializeWelcomeTabs();
        const cliArgs = getCliArguments();
        if (cliArgs.length > 0) {
          await handleCliArguments(win, cliArgs);
        }
      });

      setupMacOSFileHandler(win);

      win.on("closed", () => {
        EventBus.unregisterWindow(win);
        removeFileWatcher(id); // unregister BEFORE removing reference
      });

      this.register(win, id);
    } catch (e) {
      console.error("Failed to initialize window:", e);
    }

    return win;
  }

  destroyWindow(windowId: string) {
    const state = this.windows.get(windowId);
    if (!state) return;
    this.windows.delete(windowId);
    this.browserWindows.delete(windowId);
    this.deleteWindowStateFile(windowId);
  }


  async loadAllWindows(): Promise<void> {
    const savedWindowIds = this.getAllStateFiles();
    for (const windowId of savedWindowIds) {
      const savedState = await this.loadWindowState(windowId);

      // Skip and delete windows without active directory
      if (!savedState?.activeDirectory) {
        this.deleteWindowStateFile(windowId);
        continue;
      }

      // Verify directory still exists
      if (!fs.existsSync(savedState.activeDirectory)) {
        this.deleteWindowStateFile(windowId);
        continue;
      }

      // Create window and restore state
      try {
        await this.createWindow(windowId);
      } catch (error) {
        console.error(`Failed to restore window ${windowId}:`, error);
        this.deleteWindowStateFile(windowId);
      }
    }

    // If no windows were restored, create a fresh one
    if (this.windows.size === 0) {
      try {
        await this.createWindow();
      } catch (e) {
      }
    }
  }

  getWindowState(windowId?: string): AppState {
    const id = windowId || this.activeWindowId;
    if (!id) {
      throw new Error("No window ID available");
    }

    const st = this.windows.get(id);
    if (!st) {
      throw new Error(`Window state not found: ${id}`);
    }

    return st;
  }

  getStateFromEvent(sender: Electron.WebContents): AppState {
    const win = BrowserWindow.fromWebContents(sender);
    if (!win || !win.windowInfo) {
      throw new Error("Unknown window (no sender mapping)");
    }
    return this.getWindowState(win.windowInfo.id);
  }

  getAllWindows(): (AppState | null)[] {
    return Array.from(this.windows.values());
  }

  async setActiveDirectory(windowId: string, directory: string) {
    const state = this.getWindowState(windowId);
    directory = directory || state.activeDirectory as string;
    await setActiveDirectory(directory, this.getWindow(windowId));
    state.activeDirectory = directory;
    if (!state.directories[directory]) {
      state.directories[directory] = {
        layout:getDefaultLayout(),
      };
    }
    state.directories[directory]['hidden']=false;
    this.saveWindowState(windowId);
  }

  async saveAllWindowStates() {
    for (const windowId of this.windows.keys()) {
      await this.saveWindowState(windowId);
    }
  }
  focusWindowByProject(projectPath: string) {
    const normalizedPath = path.normalize(projectPath);
    for (const [windowId] of this.windows.entries()) {
      const state = this.getWindowState(windowId);
      const normalizedWindowPath = path.normalize(state.activeDirectory as string);
      if (normalizedWindowPath === normalizedPath) {
        const win: BrowserWindow = this.browserWindows.get(windowId) as BrowserWindow;
        if (!win.isDestroyed()) {
          if (win.isMinimized()) {
            win.restore();
          }
          win.focus();
          if (process.platform === 'darwin') {
            win.show();
          }
          return true;
        } else {
          this.windows.delete(windowId);
        }
      }
    }
    return false;

  }
}

export const windowManager = new WindowManager();