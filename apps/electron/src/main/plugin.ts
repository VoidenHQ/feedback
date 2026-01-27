import { app } from "electron";
import path from "node:path";
import * as fs from "node:fs/promises";

export const getPlugins = async () => {
  const pluginDir = path.join(app.getPath("userData"), "extensions");

  const entries = await fs.readdir(pluginDir, { withFileTypes: true });

  const pluginFiles = entries.filter((entry) => entry.isDirectory()).map((entry) => `${entry.parentPath}/${entry.name}/main.js`);
  return pluginFiles;
};
