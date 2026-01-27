// setup.ts
import { vi, afterAll } from "vitest";
import path from "path";
import fs from "fs/promises";
import os from "os";

export let globalUserDataDir: string;

// Helper functions
export const createTestDir = async (name: string) => {
  const dir = path.join(os.tmpdir(), `electron-test-${name}`);
  await fs.mkdir(dir, { recursive: true });
  return dir;
};

export const cleanupDir = async (dir: string) => {
  try {
    await fs.rm(dir, { recursive: true, force: true });
  } catch (error) {
    console.error(`Cleanup error for ${dir}:`, error);
  }
};

export const createTestUserDataDir = async (name: string) => {
  const dir = path.join(os.tmpdir(), `electron-user-data-${name}`);
  await fs.mkdir(dir, { recursive: true });
  return dir;
};

// Setup mocks
vi.mock("electron", async () => {
  globalUserDataDir = await createTestUserDataDir("global");
  return {
    app: {
      getPath: vi.fn((key: string) => (key === "userData" ? globalUserDataDir : "/mock/other/paths")),
      on: vi.fn(),
      quit: vi.fn(),
      setAsDefaultProtocolClient: vi.fn(),
      requestSingleInstanceLock: vi.fn(),
      isPackaged: true,
    },
    BrowserWindow: vi.fn(() => ({
      loadURL: vi.fn(),
      loadFile: vi.fn(),
      on: vi.fn(),
      webContents: {
        send: vi.fn(),
        session: {
          webRequest: {
            onBeforeSendHeaders: vi.fn(),
          },
        },
      },
    })),
    dialog: {
      showMessageBox: vi.fn(),
      showOpenDialog: vi.fn(),
    },
    shell: {
      trashItem: vi.fn(),
      openExternal: vi.fn(),
    },
    ipcMain: {
      on: vi.fn(),
      handle: vi.fn(),
    },
    Menu: {
      buildFromTemplate: vi.fn(),
      setApplicationMenu: vi.fn(),
    },
  };
});

vi.mock("node-pty", () => ({
  spawn: vi.fn(() => ({
    onData: vi.fn(),
    write: vi.fn(),
    kill: vi.fn(),
  })),
}));

vi.mock("simple-git", () => ({
  default: vi.fn(),
}));

vi.mock("update-electron-app", () => ({
  updateElectronApp: vi.fn(),
  UpdateSourceType: {
    StaticStorage: "StaticStorage",
  },
}));

// Global cleanup
afterAll(async () => {
  await cleanupDir(globalUserDataDir);
});
