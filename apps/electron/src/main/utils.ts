import { ipcMain } from "electron";
import path from "node:path";

ipcMain.handle("utils:pathJoin", (event, ...paths) => {
  return path.join(...paths);
});
