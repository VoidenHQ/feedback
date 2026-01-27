import { app, dialog, shell, BrowserWindow } from "electron";
import path from "node:path";
import fs from "node:fs";
import { TreeNode, FolderNode, FileTreeItem } from "../types";
import { addTab } from "./tabs";
import { aggregateGitStatus } from "./git";
import eventBus from "./eventBus";
import { windowManager } from "./windowManager";

// Files and Directory Operations
const sortNodes = (nodes: TreeNode[]): TreeNode[] => {
  return nodes.sort((a, b) => {
    // Folders before files
    if (a.type !== b.type) {
      return a.type === "folder" ? -1 : 1;
    }
    // Alphabetical sorting with case sensitivity
    return a.name.localeCompare(b.name);
  });
};

export const buildFileTree = async (dir: string, gitStatusMap?: Map<string, any>): Promise<TreeNode> => {
  const items = fs.readdirSync(dir, { withFileTypes: true });
  const nodes = await Promise.all(
    items
      .filter((item) => {
        // Allow all non-dot files.
        if (!item.name.startsWith(".")) return true;
        // For dot files, allow .gitignore and any .env file (like .env, .env.dev, .env.prod, etc).
        if (item.isFile() && (item.name === ".gitignore" || item.name === ".env" || item.name.startsWith(".env") || item.name.endsWith(".env"))) {
          return true;
        }
        // Otherwise, filter it out.
        return false;
      })
      .map(async (item) => {
        const fullPath = path.join(dir, item.name);
        if (item.isDirectory()) {
          // Recursively build the subtree.
          const subtree = await buildFileTree(fullPath, gitStatusMap);
          // Aggregate Git status from children.
          const aggregatedGitStatus = aggregateGitStatus(subtree.children || []);
          return {
            name: item.name,
            path: fullPath,
            type: "folder" as const,
            children: sortNodes(subtree.children || []),
            aggregatedGitStatus,
          };
        }
        // For file nodes, attach Git status if available.
        return {
          name: item.name,
          path: fullPath,
          type: "file" as const,
          ...(gitStatusMap?.has(fullPath) ? { git: gitStatusMap.get(fullPath) } : {}),
        };
      }),
  );
  return {
    name: path.basename(dir),
    path: dir,
    type: "folder" as const,
    children: sortNodes(nodes),
    aggregatedGitStatus: aggregateGitStatus(nodes),
  };
};

export async function createFile(filePath: string, fileName: string): Promise<{ path: string; name: string }> {
  let finalName = fileName;
  let counter = 1;

  // Check if file exists and generate new name if needed
  while (fs.existsSync(path.join(filePath, finalName))) {
    const ext = path.extname(fileName);
    const baseName = path.basename(fileName, ext);
    finalName = `${baseName} ${counter}${ext}`;
    counter++;
  }

  const fullPath = path.join(filePath, finalName);
  await fs.promises.writeFile(fullPath, "");
  return { path: fullPath, name: finalName };
}

export async function createVoidFile(filePath: string, fileName: string): Promise<{ path: string; name: string }> {
  let finalName = fileName.endsWith(".void") ? fileName : fileName + ".void";
  let counter = 1;
  // console.debug("create voiden files");

  // Check if file exists and generate new name if needed
  while (fs.existsSync(path.join(filePath, finalName))) {
    const ext = path.extname(fileName);
    const baseName = path.basename(fileName, ext);
    finalName = `${baseName} ${counter}${ext}`;
    counter++;
  }

  const fullPath = path.join(filePath, finalName);
  await fs.promises.writeFile(fullPath, "");
  windowManager.browserWindow?.webContents.send("files:tree:changed",null);
  // eventBus.emitEvent("files:tree:changed",null);
  return { path: fullPath, name: finalName };
}

export async function deleteFile(filePath: string) {
  // Show confirmation dialog
  const { response } = await dialog.showMessageBox({
    type: "none",
    buttons: ["Cancel", "Delete"],
    defaultId: 1,
    title: "Confirm Delete",
    message: "Are you sure you want to delete this file?",
    detail: `The file "${path.basename(filePath)}" will be moved to trash.`,
  });

  // If user confirms (clicks Delete)
  if (response === 1) {
    // Unwatch the path first to release file handles on Windows
    unwatchPath(filePath);
    await shell.trashItem(filePath);
    return true;
  }
  return false;
}

export async function createDirectory(parentPath: string, dirName: string = "untitled") {
  let finalName = dirName;
  let counter = 1;

  // Check if directory exists and generate new name if needed
  while (fs.existsSync(path.join(parentPath, finalName))) {
    finalName = `${dirName}-${counter}`;
    counter++;
  }

  // Create the directory
  const fullPath = path.join(parentPath, finalName);
  await fs.promises.mkdir(fullPath);
  return finalName;
}

export async function getDirectoryExist(parentPath: string, dirName: string = "untitled") {
  return fs.existsSync(path.join(parentPath, dirName));
}

export async function getFileExist(parentPath: string, fileName: string = "untitled") {
  return fs.existsSync(path.join(parentPath, fileName));
}

export async function createProjectDirectory(dirName: string = "untitled") {
  let finalName = dirName;
  let counter = 1;

  if(!fs.existsSync(path.join(app.getPath("home"), "Voiden"))){
    await fs.promises.mkdir(path.join(app.getPath("home"), "Voiden"));
  }
  // Check if directory exists and generate new name if needed
  while (fs.existsSync(path.join(app.getPath("home"), "Voiden", finalName))) {
    finalName = `${dirName}-${counter}`;
    counter++;
  }

  // Create the directory
  const fullPath = path.join(app.getPath("home"), "Voiden", finalName);
  await fs.promises.mkdir(fullPath);

  //Create the .voiden directory if not present
  const voidenPath = path.join(app.getPath("home"), "Voiden", finalName, ".voiden");
  await fs.promises.mkdir(voidenPath, { recursive: true });

  // Create simple .voiden file
  const filePath = path.join(app.getPath("home"), "Voiden", finalName, ".voiden/.voiden-projects");
  await fs.promises.writeFile(filePath, JSON.stringify({ project: dirName }));

  return fullPath;
}

export async function deleteDirectory(dirPath: string) {
  const { response } = await dialog.showMessageBox({
    type: "none",
    buttons: ["Cancel", "Delete"],
    defaultId: 0,
    title: "Confirm Delete",
    message: "Are you sure you want to delete this folder?",
    detail: `The folder "${path.basename(dirPath)}" and its contents will be moved to trash.`,
  });

  if (response === 1) {
    // Unwatch the path first to release file handles on Windows
    // This prevents "permission denied" errors when file watcher is active
    await fs.promises.rm(dirPath,{recursive:true,force:true});
    return true;
  }
  return false;
}

export async function renameFileOrDirectory(oldPath: string, newName: string) {
  try {
    // Validate filename
    if (!newName || newName.trim() === "" || /[<>:"/\\|?*]/.test(newName)) {
      return { success: false, error: "Invalid name" };
    }

    const dirPath = path.dirname(oldPath);
    const isDirectory = fs.statSync(oldPath).isDirectory();

    let targetName = newName;

    // Preserve extension for files if no extension is provided
    if (!isDirectory && !path.extname(newName) && path.extname(oldPath)) {
      const extension = path.extname(oldPath);
      targetName += extension;
    }

    const newPath = path.join(dirPath, targetName);

    const oldResolved = path.resolve(oldPath);
    const newResolved = path.resolve(newPath);

    const samePathCaseInsensitive = oldResolved.toLowerCase() === newResolved.toLowerCase();
    const isSamePathButDifferentCase = samePathCaseInsensitive && oldResolved !== newResolved;

    if (!samePathCaseInsensitive && fs.existsSync(newPath)) {
      return {
        success: false,
        error: `A ${isDirectory ? "folder" : "file"} with this name already exists`,
      };
    }

    // If we're only changing the case, go through an intermediate name (cross-platform safe)
    if (isSamePathButDifferentCase) {
      const tempPath = path.join(dirPath, `.__rename_temp__${Date.now()}`);
      await fs.promises.rename(oldPath, tempPath);
      await fs.promises.rename(tempPath, newPath);
    } else {
      await fs.promises.rename(oldPath, newPath);
    }

    return { success: true, data: { path: newPath, name: targetName } };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function findVoidenProjects() {
  const searchPath = path.join(app.getPath("home"), "Voiden");
  const result: string[] = [];

  try {
    const entries = await fs.promises.readdir(searchPath, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const dirPath = path.join(searchPath, entry.name);
      const voidenFile = path.join(dirPath, ".voiden/.voiden-projects");

      try {
        const stat = await fs.promises.stat(voidenFile);
        if (stat.isFile()) {
          result.push(dirPath);
        }
      } catch {
        // .voiden file doesn't exist, ignore
      }
    }
  } catch (err) {
    // console.error("Error scanning Voiden directory:", err);
  }

  return result;
}

export async function dropFiles(targetPath: string, fileName: string, fileData: Uint8Array){
  try{
    const fullPath = path.join(targetPath, fileName);
    console.log(fullPath)
    await fs.promises.writeFile(fullPath, Buffer.from(fileData));
  return { name: fileName, path: fullPath };
  }catch (error) {
    return { success: false, error: error.message };
  }
  
}

export async function moveFiles(dragIds: string[], parentId: string): Promise<{ success: boolean; error?: string }> {
  try {
    for (const dragId of dragIds) {
      const fileName = path.basename(dragId);
      const newPath = path.join(parentId, fileName);

      // Check if target already exists
      if (fs.existsSync(newPath)) {
        return { success: false, error: `A file/folder with name "${fileName}" already exists in the target folder` };
      }

      await fs.promises.rename(dragId, newPath);
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Recent paths
export const getRecentPaths = async () => {
  try {
    const recentPath = path.join(app.getPath("userData"), "recent-paths.json");
    const data = await fs.promises.readFile(recentPath, "utf8");
    return JSON.parse(data);
  } catch {
    return [];
  }
};

export const addRecentPath = async (projectPath: string) => {
  const recentPath = path.join(app.getPath("userData"), "recent-paths.json");
  const recent = await getRecentPaths();
  const newRecent = [projectPath, ...recent.filter((p: string) => p !== projectPath)].slice(0, 5);
  await fs.promises.writeFile(recentPath, JSON.stringify(newRecent));
};

// New function for duplicating a file
export async function duplicateFile(originalPath: string, newName: string): Promise<{ path: string; name: string }> {
  const dirPath = path.dirname(originalPath);
  let finalName = newName;
  let counter = 1;

  // Check if file exists and generate new name if needed
  while (fs.existsSync(path.join(dirPath, finalName))) {
    const ext = path.extname(newName);
    const baseName = path.basename(newName, ext);
    finalName = `${baseName} ${counter}${ext}`;
    counter++;
  }

  const newPath = path.join(dirPath, finalName);
  await fs.promises.copyFile(originalPath, newPath);
  return { path: newPath, name: finalName };
}
