import { app, ipcMain } from "electron";
import fs from "fs";
import path from "path";
import https from "https";
import { saveSettings, getSettings } from "./settings";

const NERD_FONT_URL = "https://github.com/ryanoasis/nerd-fonts/releases/download/v3.2.1/JetBrainsMono.zip";
const FONT_NAME = "JetBrainsMono Nerd Font";
const fontsDir = path.join(app.getPath("userData"), "fonts");
const fontZipPath = path.join(fontsDir, "JetBrainsMono.zip");

export function getFontPath(): string | null {
  const settings = getSettings();
  if (!settings.terminal.nerd_font_installed) {
    return null;
  }

  // Return the directory where fonts are installed
  return fontsDir;
}

function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https
      .get(url, (response) => {
        if (response.statusCode === 302 || response.statusCode === 301) {
          // Follow redirect
          const redirectUrl = response.headers.location;
          if (redirectUrl) {
            file.close();
            fs.unlinkSync(dest);
            downloadFile(redirectUrl, dest).then(resolve).catch(reject);
            return;
          }
        }

        response.pipe(file);
        file.on("finish", () => {
          file.close();
          resolve();
        });
      })
      .on("error", (err) => {
        fs.unlinkSync(dest);
        reject(err);
      });
  });
}

async function extractFont(): Promise<void> {
  const AdmZip = require("adm-zip");
  const zip = new AdmZip(fontZipPath);

  // Extract only the regular TTF fonts we need
  const entries = zip.getEntries();
  for (const entry of entries) {
    // Only extract Regular, Bold, Italic, and BoldItalic TTF files
    if (entry.entryName.endsWith(".ttf") &&
        (entry.entryName.includes("Regular") ||
         entry.entryName.includes("Bold") ||
         entry.entryName.includes("Italic"))) {
      zip.extractEntryTo(entry, fontsDir, false, true);
    }
  }

  // Clean up zip file
  fs.unlinkSync(fontZipPath);
}

export async function installNerdFont(): Promise<{ success: boolean; error?: string; alreadyInstalled?: boolean }> {
  try {
    // Check if font is already installed
    const regularFontPath = path.join(fontsDir, "JetBrainsMonoNerdFont-Regular.ttf");
    if (fs.existsSync(regularFontPath)) {
      // Font already exists, just update settings
      saveSettings({
        terminal: {
          ...getSettings().terminal,
          nerd_font_installed: true,
        },
      });
      return { success: true, alreadyInstalled: true };
    }

    // Create fonts directory if it doesn't exist
    if (!fs.existsSync(fontsDir)) {
      fs.mkdirSync(fontsDir, { recursive: true });
    }

    // Download font
    await downloadFile(NERD_FONT_URL, fontZipPath);

    // Extract font
    await extractFont();

    // Update settings
    saveSettings({
      terminal: {
        ...getSettings().terminal,
        nerd_font_installed: true,
      },
    });

    return { success: true, alreadyInstalled: false };
  } catch (error) {
    // console.error("Error installing Nerd Font:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

export async function uninstallNerdFont(): Promise<{ success: boolean }> {
  try {
    // Remove fonts directory
    if (fs.existsSync(fontsDir)) {
      fs.rmSync(fontsDir, { recursive: true, force: true });
    }

    // Update settings
    saveSettings({
      terminal: {
        ...getSettings().terminal,
        nerd_font_installed: false,
        use_nerd_font: false,
      },
    });

    return { success: true };
  } catch (error) {
    // console.error("Error uninstalling Nerd Font:", error);
    return { success: false };
  }
}

export async function getFontAsBase64(fontFileName: string): Promise<string | null> {
  const settings = getSettings();
  if (!settings.terminal.nerd_font_installed) {
    return null;
  }

  try {
    const fontPath = path.join(fontsDir, fontFileName);
    if (!fs.existsSync(fontPath)) {
      return null;
    }

    const fontBuffer = fs.readFileSync(fontPath);
    const base64 = fontBuffer.toString('base64');
    return `data:font/truetype;charset=utf-8;base64,${base64}`;
  } catch (error) {
    // console.error(`Error reading font ${fontFileName}:`, error);
    return null;
  }
}

export function registerFontsIpc() {
  ipcMain.handle("fonts:install", () => installNerdFont());
  ipcMain.handle("fonts:uninstall", () => uninstallNerdFont());
  ipcMain.handle("fonts:getPath", () => getFontPath());
  ipcMain.handle("fonts:getAsBase64", (_event, fontFileName: string) => getFontAsBase64(fontFileName));
}
