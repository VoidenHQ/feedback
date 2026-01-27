import { ipcMain, app } from "electron";
import * as fs from "fs";
import * as path from "path";

interface ThemeMetadata {
  id: string;
  name: string;
  type: string;
}

interface Theme {
  id: string;
  name: string;
  type: string;
  colors: Record<string, string>;
}

function getBundledThemesDirectory(): string {
  // In development, use the local themes directory
  if (!app.isPackaged) {
    return path.join(__dirname, "../../themes");
  }

  // In production, themes are in the resources directory
  return path.join(process.resourcesPath, "themes");
}

function getUserThemesDirectory(): string {
  // User themes directory in app data (writable)
  return path.join(app.getPath("userData"), "themes");
}

/**
 * Copy bundled themes to user data directory on app startup.
 * This allows themes to be updated with app updates while keeping them writable.
 */
function syncBundledThemes(): void {
  const bundledDir = getBundledThemesDirectory();
  const userDir = getUserThemesDirectory();

  try {
    // Ensure user themes directory exists
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }

    // Check if bundled themes directory exists
    if (!fs.existsSync(bundledDir)) {
      // console.warn("Bundled themes directory not found:", bundledDir);
      return;
    }

    // Copy all bundled themes to user directory (overwriting existing ones)
    const files = fs.readdirSync(bundledDir);
    for (const file of files) {
      if (file.endsWith(".json")) {
        const sourcePath = path.join(bundledDir, file);
        const destPath = path.join(userDir, file);

        try {
          const themeData = fs.readFileSync(sourcePath, "utf-8");
          fs.writeFileSync(destPath, themeData, "utf-8");
        } catch (error) {
          // console.error(`Failed to copy theme ${file}:`, error);
        }
      }
    }
  } catch (error) {
    // console.error("Failed to sync bundled themes:", error);
  }
}

export function registerThemeIpcHandlers() {
  // Sync bundled themes to user directory on startup
  syncBundledThemes();

  // Manual sync handler for the settings UI
  ipcMain.handle("themes:sync", async (): Promise<{ success: boolean; error?: string }> => {
    try {
      syncBundledThemes();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to sync themes"
      };
    }
  });

  // List all available themes
  ipcMain.handle("themes:list", async (): Promise<ThemeMetadata[]> => {
    const themesDir = getUserThemesDirectory();

    try {
      // Ensure themes directory exists
      if (!fs.existsSync(themesDir)) {
        // console.warn("Themes directory not found:", themesDir);
        return [];
      }

      const files = fs.readdirSync(themesDir);
      const themes: ThemeMetadata[] = [];

      for (const file of files) {
        if (file.endsWith(".json")) {
          const themeId = file.replace(".json", "");
          const themePath = path.join(themesDir, file);

          try {
            const themeData = JSON.parse(fs.readFileSync(themePath, "utf-8")) as Theme;
            themes.push({
              id: themeData.id || themeId,
              name: themeData.name || themeId,
              type: themeData.type || "dark",
            });
          } catch (error) {
            // console.error(`Failed to read theme ${file}:`, error);
          }
        }
      }

      return themes;
    } catch (error) {
      // console.error("Failed to list themes:", error);
      return [];
    }
  });

  // Load a specific theme
  ipcMain.handle("themes:load", async (_event, themeId: string): Promise<Theme | null> => {
    const themesDir = getUserThemesDirectory();
    const themePath = path.join(themesDir, `${themeId}.json`);

    try {
      if (!fs.existsSync(themePath)) {
        // console.warn(`Theme file not found: ${themePath}`);
        return null;
      }

      const themeData = fs.readFileSync(themePath, "utf-8");
      return JSON.parse(themeData) as Theme;
    } catch (error) {
      // console.error(`Failed to load theme ${themeId}:`, error);
      return null;
    }
  });
}
