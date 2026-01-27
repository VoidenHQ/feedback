import { ipcMain } from "electron";
import { isCliInstalled, installCli, uninstallCli, showCliInstructions } from "../cliInstaller";
import { getSettings, saveSettings } from "../settings";

export function registerCliIpcHandlers() {
  // Check if CLI is installed
  ipcMain.handle("cli:isInstalled", async () => {
    return await isCliInstalled();
  });

  // Install CLI
  ipcMain.handle("cli:install", async () => {
    const result = await installCli();

    // Update settings if successful
    if (result.success) {
      const settings = getSettings();
      settings.cli.installed = true;
      saveSettings(settings);
    }

    return result;
  });

  // Uninstall CLI
  ipcMain.handle("cli:uninstall", async () => {
    const result = await uninstallCli();

    // Update settings if successful
    if (result.success) {
      const settings = getSettings();
      settings.cli.installed = false;
      saveSettings(settings);
    }

    return result;
  });

  // Show CLI instructions dialog
  ipcMain.handle("cli:showInstructions", async () => {
    await showCliInstructions();
  });
}
