import fs from "fs/promises";
import path from "path";
import { ipcMain } from "electron";
import { getActiveTab } from "./state";

ipcMain.handle("voiden-wrapper:getApyFiles", async (_, directory: string) => {
  try {
    const activeFilePath = getActiveTab("main")?.source;

    // Recursive helper to walk through directories.
    async function getFilesRecursively(dir: string): Promise<Array<{ filePath: string; filename: string; content: string }>> {
      let results: Array<{ filePath: string; filename: string; content: string }> = [];
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          // Recurse into the subdirectory.
          results = results.concat(await getFilesRecursively(fullPath));
        } else if (entry.isFile() && entry.name.endsWith(".void")) {
          const content = await fs.readFile(fullPath, "utf8");
          results.push({ filePath: fullPath, filename: entry.name, content });
        }
      }
      return results;
    }

    // Start the recursive file collection.
    const documents = await getFilesRecursively(directory);
    // Filter out the active file if necessary.
    const filteredDocuments = documents.filter((doc) => doc.filePath !== activeFilePath);
    return filteredDocuments;
  } catch (error) {
    // console.error("Error fetching .void files:", error);
    throw error;
  }
});

ipcMain.handle("voiden-wrapper:getBlockContent", async (_, filePath: string) => {
  const content = await fs.readFile(filePath, "utf8");
  return content;
});
