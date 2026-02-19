import path from "path";
import { getActiveProject, getAppState } from "./state";
import fs from "node:fs/promises";
import { ipcMain, IpcMainInvokeEvent } from "electron";
import { saveState } from "./persistState";
import { getSettings } from "./settings";

/**
 * Parse the content of a .env file into an object.
 */
function parseEnvContent(content: string) {
  const env: Record<string, string> = {};
  content.split(/\r?\n/).forEach((line) => {
    line = line.trim();
    if (!line || line.startsWith("#")) return;

    const eqIndex = line.indexOf("=");
    if (eqIndex < 0) return; // Skip malformed lines

    const key = line.substring(0, eqIndex).trim();
    let value = line.substring(eqIndex + 1).trim();

    // Remove optional surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.substring(1, value.length - 1);
    }

    env[key] = value;
  });
  return env;
}

/**
 * Recursively search for files starting with ".env" in the given directory.
 * Returns an array of absolute file paths.
 */
async function findEnvFilesRecursively(dir: string) {
  let envFiles: string[] = [];

  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch (err) {
    // console.error(`Unable to read directory ${dir}:`, err);
    return envFiles;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Recursively search in subdirectory
      const subDirEnvFiles = await findEnvFilesRecursively(fullPath);
      envFiles = envFiles.concat(subDirEnvFiles);
    } else if (entry.isFile() && (entry.name.startsWith(".env") || entry.name.endsWith(".env"))) {
      envFiles.push(fullPath);
    }
  }

  return envFiles;
}

/**
 * Load all .env files (including nested ones) in the given project path and combine their content.
 * If there are duplicate keys, later files in the array will override earlier ones.
 */
async function loadProjectEnv(projectPath: string) {
  const envData: Record<string, Record<string, string>> = {};

  // Recursively find .env files starting from the projectPath.
  const envFiles = await findEnvFilesRecursively(projectPath);

  // Optionally sort the file paths to ensure a consistent order.
  envFiles.sort((a, b) => a.localeCompare(b));

  for (const filePath of envFiles) {
    let content;
    try {
      content = await fs.readFile(filePath, "utf8");
    } catch (err) {
      // console.error(`Unable to read ${filePath}:`, err);
      continue;
    }
    const parsedEnv = parseEnvContent(content);

    // Use the full file path as the key
    envData[filePath] = parsedEnv;
  }

  return envData;
}

/**
 * Get the hierarchy of .env files for a given active environment.
 * For example, if activeEnv is "/path/to/project/.env.foo.bar",
 * it returns, in order, ["/path/to/project/.env", "/path/to/project/.env.foo", "/path/to/project/.env.foo.bar"]
 */
function getEnvHierarchy(activeEnvPath: string): string[] {
  const dir = path.dirname(activeEnvPath);
  const parts = path.basename(activeEnvPath).split(".");
  const hierarchy: string[] = [];
  let currentName = "";
  // skipping parts[0], which is empty due to leading dot
  for (let i = 1; i < parts.length; i++) {
    currentName += "." + parts[i];
    hierarchy.push(path.join(dir, currentName));
  }
  return hierarchy.sort((a, b) => a.length - b.length);
}

ipcMain.handle("env:load", async (event:IpcMainInvokeEvent) => {
  const appState = getAppState(event);
  const activeProject = await getActiveProject(event);
  if (!appState.directories[activeProject]) return {};
  let activeEnv = appState.directories[activeProject].activeEnv;
  if (!activeProject) return {};
  const envs = await loadProjectEnv(activeProject);
  if (activeEnv && !envs[activeEnv]) {
    activeEnv = null;
  }

  // Merge environment hierarchy if enabled
  if (getSettings().environment.use_hierarchy && activeEnv) {
    envs[activeEnv] = getEnvHierarchy(activeEnv).reduce((acc, envKey) => {
      return envs[envKey] ? { ...acc, ...envs[envKey] } : acc;
    }, {} as Record<string, string>);
  }

  return {
    activeEnv,
    data: envs,
  };
});

ipcMain.handle("env:setActive", async (event:IpcMainInvokeEvent, envPath) => {
  const appState = getAppState(event);
  const activeProject = await getActiveProject(event);
  appState.directories[activeProject].activeEnv = envPath;
  await saveState(appState);
});

/**
 * Replace {{VARIABLE}} patterns with values from active environment.
 * This runs in Electron main process - UI never sees the actual values.
 *
 * @security Environment values never leave the main process
 */
export async function replaceVariablesSecure(text: string, projectPath: string): Promise<string> {

  const appState = getAppState();
  const activeEnvPath = appState.directories[projectPath]?.activeEnv;

  if (!activeEnvPath) {
    return text;
  }

  // Load environment data
  const envData = await loadProjectEnv(projectPath);

  if (!envData[activeEnvPath]) {
    return text;
  }

  let env = envData[activeEnvPath];

  // Merge environment hierarchy if enabled
  if (getSettings().environment.use_hierarchy && activeEnvPath) {
    env = getEnvHierarchy(activeEnvPath).reduce((acc, envKey) => {
      return envData[envKey] ? { ...acc, ...envData[envKey] } : acc;
    }, {} as Record<string, string>);
  }

  // Replace {{VAR_NAME}} patterns
  const result = text.replace(/\{\{([^}]+)\}\}/g, (match, varName) => {
    const trimmedVarName = varName.trim();

    // Skip faker variables - they should already be replaced by Stage 5 faker hook
    // This is a defensive check in case the order changes
    if (trimmedVarName.startsWith('$faker.')) {
      return match;
    }

    const value = env[trimmedVarName];

    if (value !== undefined) {
      return value;
    }

    return match; // Keep original if not found
  });

  return result;
}

/**
 * Secure IPC handler for variable replacement.
 * UI sends raw text with {{variables}}, receives replaced text.
 * UI never sees the actual environment values.
 */
ipcMain.handle("env:replaceVariables", async (_, text: string) => {
  const activeProject = await getActiveProject();
  if (!activeProject) {
    // console.error("[env:replaceVariables] No active project");
    return text;
  }
  return replaceVariablesSecure(text, activeProject);
});

/**
 * Get keys (names) of environment variables for autocomplete.
 * Returns only metadata, not values.
 *
 * @security Only returns variable names, not values
 */
ipcMain.handle("env:getKeys", async (event:IpcMainInvokeEvent) => {
  const appState = getAppState(event);
  const activeProject = await getActiveProject();

  if (!activeProject) {
    return [];
  }

  const activeEnvPath = appState.directories[activeProject]?.activeEnv;

  if (!activeEnvPath) {
    return [];
  }

  // Load environment data
  const envData = await loadProjectEnv(activeProject);

  if (!envData[activeEnvPath]) {
    return [];
  }

  // Merge environment hierarchy keys if enabled
  if (getSettings().environment.use_hierarchy) {
    const keys = getEnvHierarchy(activeEnvPath)
        .flatMap(envPath => envData[envPath] ? Object.keys(envData[envPath]) : []);
    return Array.from(new Set(keys));
  } else {
    return Object.keys(envData[activeEnvPath]);
  }
});

// Simple handler to extend all .env files
ipcMain.handle('env:extend-env-files', async (event, { comment, variables }) => {
  try {
    // Use your existing function to find all .env files
    const activeProject = await getActiveProject(eve);
    const envFiles = await findEnvFilesRecursively(activeProject);

    const results = [];
    // Process each .env file
    for (const filePath of envFiles) {
      try {
        await extendEnvFile(filePath, comment, variables);
        results.push({
          file: path.relative(process.cwd(), filePath),
          success: true
        });
      } catch (error) {
        console.log(error)
      }
    }
  } catch (error) {
    console.log(error)
  }
});

// Function to extend a single .env file
async function extendEnvFile(filePath: string, comment: string, variables: Array<{key: string, value: string}>) {
  let content = '';
  try {
    content = await fs.readFile(filePath, 'utf8');
  } catch (error) {
    console.log('File does not exist');
    return;
  }
  if (content && !content.endsWith('\n')) {
    content += '\n';
  }

  content += `\n# ${comment}\n`;
  for (const variable of variables) {
    content += `${variable.key}=${variable.value}\n`;
  }
  await fs.writeFile(filePath, content, 'utf8');
}
