import { app, dialog } from "electron";
import * as fs from "node:fs";
import * as path from "node:path";
import { exec } from "node:child_process";
import { promisify } from "node:util";
// @ts-ignore - sudo-prompt doesn't have types
import * as sudo from "sudo-prompt";

const execAsync = promisify(exec);

// Promisify sudo.exec
const sudoExec = (command: string, options: any): Promise<{ stdout?: string; stderr?: string }> => {
  return new Promise((resolve, reject) => {
    sudo.exec(command, options, (error: Error | null, stdout?: string, stderr?: string) => {
      if (error) {
        reject(error);
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
};

const platform = process.platform;

/**
 * Get the path to the CLI script in the app bundle
 */
function getCliScriptPath(): string {
  if (platform === "win32") {
    // Windows
    if (app.isPackaged) {
      return path.join(process.resourcesPath, "bin", "voiden.cmd");
    }
    return path.join(__dirname, "../../bin/voiden.cmd");
  } else {
    // macOS/Linux
    if (app.isPackaged) {
      return path.join(process.resourcesPath, "bin", "voiden");
    }
    return path.join(__dirname, "../../bin/voiden");
  }
}

/**
 * Get the target path where the symlink/script should be installed
 */
function getTargetPath(): string {
  if (platform === "win32") {
    // Windows: We'll add instructions instead of auto-installing
    return path.join(process.env.LOCALAPPDATA || "", "Programs", "Voiden", "bin", "voiden.cmd");
  } else if (platform === "darwin") {
    // macOS
    return "/usr/local/bin/voiden";
  } else {
    // Linux
    return "/usr/local/bin/voiden";
  }
}

/**
 * Check if CLI is currently installed
 */
export async function isCliInstalled(): Promise<boolean> {
  const targetPath = getTargetPath();

  if (platform === "win32") {
    // On Windows, check if voiden.cmd is in PATH
    try {
      await execAsync("where voiden.cmd");
      return true;
    } catch {
      return false;
    }
  } else {
    // On Unix, check if symlink exists and points to correct location
    try {
      const stats = fs.lstatSync(targetPath);
      if (stats.isSymbolicLink()) {
        const linkTarget = fs.readlinkSync(targetPath);
        const scriptPath = getCliScriptPath();
        return linkTarget === scriptPath || linkTarget.endsWith("Voiden.app/Contents/Resources/bin/voiden");
      }
      return false;
    } catch {
      return false;
    }
  }
}

/**
 * Install CLI to PATH
 */
export async function installCli(): Promise<{ success: boolean; message: string }> {
  const scriptPath = getCliScriptPath();
  const targetPath = getTargetPath();

  // Verify source script exists
  if (!fs.existsSync(scriptPath)) {
    return {
      success: false,
      message: `CLI script not found at: ${scriptPath}`,
    };
  }

  if (platform === "win32") {
    // Windows: Provide manual instructions
    return {
      success: false,
      message: `To install the CLI on Windows:

1. Add this path to your system PATH:
   ${path.dirname(scriptPath)}

2. Restart your terminal

Or run this in PowerShell (as Administrator):
   $userPath = [Environment]::GetEnvironmentVariable("Path", "User")
   [Environment]::SetEnvironmentVariable("Path", "$userPath;${path.dirname(scriptPath)}", "User")`,
    };
  } else {
    // macOS/Linux: Create symlink using sudo-prompt
    try {
      // Check if target directory exists
      const targetDir = path.dirname(targetPath);
      if (!fs.existsSync(targetDir)) {
        return {
          success: false,
          message: `Target directory does not exist: ${targetDir}`,
        };
      }

      // Make sure the script is executable first
      try {
        fs.chmodSync(scriptPath, 0o755);
      } catch (error) {
        // Not critical if this fails, continue
      }

      // Build the command to remove existing symlink (if exists) and create new one
      const commands = [];
      if (fs.existsSync(targetPath)) {
        commands.push(`rm -f "${targetPath}"`);
      }
      commands.push(`ln -sf "${scriptPath}" "${targetPath}"`);

      const command = commands.join(' && ');

      // Try with sudo-prompt (shows native password dialog)
      const options = {
        name: 'Voiden',
      };

      try {
        await sudoExec(command, options);

        return {
          success: true,
          message: `CLI installed successfully! You can now use 'voiden' in your terminal.`,
        };
      } catch (sudoError: any) {
        // User cancelled the password dialog or sudo failed
        return {
          success: false,
          message: `Installation cancelled or failed. You can install manually by running:

  sudo ln -sf "${scriptPath}" "${targetPath}"

Then restart your terminal.`,
        };
      }
    } catch (error: any) {
      return {
        success: false,
        message: `Installation failed: ${error.message}`,
      };
    }
  }
}

/**
 * Uninstall CLI from PATH
 */
export async function uninstallCli(): Promise<{ success: boolean; message: string }> {
  const targetPath = getTargetPath();

  if (platform === "win32") {
    return {
      success: false,
      message: `To uninstall the CLI on Windows, remove this path from your system PATH:
${path.dirname(getCliScriptPath())}`,
    };
  } else {
    // macOS/Linux: Remove symlink
    try {
      if (!fs.existsSync(targetPath)) {
        return {
          success: true,
          message: "CLI is not currently installed.",
        };
      }

      // Try to remove without sudo first
      try {
        fs.unlinkSync(targetPath);
        return {
          success: true,
          message: "CLI uninstalled successfully.",
        };
      } catch (error: any) {
        // If permission denied, use sudo-prompt
        if (error.code === "EACCES" || error.code === "EPERM") {
          const command = `rm -f "${targetPath}"`;
          const options = {
            name: 'Voiden',
          };

          try {
            await sudoExec(command, options);
            return {
              success: true,
              message: "CLI uninstalled successfully.",
            };
          } catch (sudoError: any) {
            return {
              success: false,
              message: `Uninstallation cancelled or failed. You can uninstall manually by running:

  sudo rm "${targetPath}"`,
            };
          }
        }

        throw error;
      }
    } catch (error: any) {
      return {
        success: false,
        message: `Uninstallation failed: ${error.message}`,
      };
    }
  }
}

/**
 * Show CLI installation instructions dialog
 */
export async function showCliInstructions(): Promise<void> {
  const scriptPath = getCliScriptPath();

  let message = "";

  if (platform === "darwin") {
    message = `To use the 'voiden' command in your terminal:

Run this command:
  sudo ln -sf "${scriptPath}" "/usr/local/bin/voiden"

Then restart your terminal and try:
  voiden --help`;
  } else if (platform === "linux") {
    message = `To use the 'voiden' command in your terminal:

Run this command:
  sudo ln -sf "${scriptPath}" "/usr/local/bin/voiden"

Then restart your terminal and try:
  voiden --help`;
  } else {
    // Windows
    message = `To use the 'voiden' command in your terminal:

Add this path to your system PATH:
  ${path.dirname(scriptPath)}

Or run this in PowerShell (as Administrator):
  $userPath = [Environment]::GetEnvironmentVariable("Path", "User")
  [Environment]::SetEnvironmentVariable("Path", "$userPath;${path.dirname(scriptPath)}", "User")

Then restart your terminal and try:
  voiden --help`;
  }

  await dialog.showMessageBox({
    type: "info",
    title: "Install Voiden CLI",
    message: "CLI Installation Instructions",
    detail: message,
    buttons: ["OK"],
  });
}
