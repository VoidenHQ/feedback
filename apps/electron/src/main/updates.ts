import { app, dialog, ipcMain, BrowserWindow } from "electron";
import { autoUpdater, type ProgressInfo } from "electron-updater";
import fs from "node:fs";
import path from "node:path";
import * as semver from "semver";
import * as https from "https";
import { execFile } from "child_process";
import { windowManager } from "./windowManager";

// Update state management
enum UpdateState {
  IDLE = "idle",
  CHECKING = "checking",
  DOWNLOADING = "downloading",
  INSTALLING = "installing",
  READY = "ready",
  ERROR = "error"
}

let currentUpdateState: UpdateState = UpdateState.IDLE;

function setUpdateState(state: UpdateState) {
  currentUpdateState = state;
  sendUpdateProgressToWindows({ status: state });
}

function isUpdateInProgress(): boolean {
  return currentUpdateState === UpdateState.CHECKING ||
    currentUpdateState === UpdateState.DOWNLOADING ||
    currentUpdateState === UpdateState.INSTALLING;
}

function isUpdateSupported(): boolean {
  // Updates only work in packaged/production builds
  return app.isPackaged;
}

function sendUpdateProgressToWindows(progress: { percent?: number; bytesPerSecond?: number; transferred?: number; total?: number; status: string }) {
  if (!isUpdateSupported()) return;

  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send("update:progress", progress);
  }
}

function detectLinuxPackageType(): "deb" | "rpm" | "appimage" {
  // Check if running as AppImage
  if (process.env.APPIMAGE) {
    return "appimage";
  }

  // For system-installed packages, detect distro
  try {
    const osRelease = fs.readFileSync("/etc/os-release", "utf8");
    const idLike = osRelease.match(/ID_LIKE=(.*)/)?.[1]?.toLowerCase() ?? "";
    const id = osRelease.match(/ID=(.*)/)?.[1]?.toLowerCase() ?? "";

    if (id.includes("ubuntu") || id.includes("debian") || idLike.includes("debian") || idLike.includes("ubuntu")) {
      return "deb";
    }
  } catch (err) {
    // console.warn("Failed to detect distro. Defaulting to rpm.");
  }

  return "rpm";
}

function downloadAndInstallPackage(url: string, type: "deb" | "rpm" | "appimage", maxRedirects = 5) {
  if (isUpdateInProgress()) {
    setUpdateState(UpdateState.IDLE);
    const win = windowManager.browserWindow ?? BrowserWindow.getAllWindows()[0];
    win?.webContents.send("toast:info", { title: "Update In Progress", description: "An update is already in progress. Please wait for it to complete.", duration: 5000 });
    return;
  }

  const extension = type === "appimage" ? "AppImage" : (type === "deb" ? "deb" : "rpm");
  const tmpPath = path.join(app.getPath("temp"), `voiden-latest.${extension}`);
  const file = fs.createWriteStream(tmpPath);

  const requestOptions = {
    headers: {
      'User-Agent': `Voiden/${app.getVersion()} (${process.platform}: ${process.arch})`,
    },
  };

  setUpdateState(UpdateState.DOWNLOADING);
  sendUpdateProgressToWindows({ status: "downloading", percent: 0 });

  let redirectCount = 0;

  function doDownload(downloadUrl: string) {
    https
      .get(downloadUrl, requestOptions, (response) => {
        // Handle redirects
        if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          redirectCount++;
          if (redirectCount > maxRedirects) {
            setUpdateState(UpdateState.ERROR);
            const window = BrowserWindow.getFocusedWindow();
            if (window) {
              window.webContents.send("toast:error", { title: "Update Download Failed", description: "Too many redirects while downloading update.", duration: 5000 });
            } else {
              dialog.showErrorBox("Download Failed", "Too many redirects while downloading update.");
            }
            return;
          }
          doDownload(response.headers.location);
          return;
        }

        if (response.statusCode !== 200) {
          setUpdateState(UpdateState.ERROR);
          const window = BrowserWindow.getFocusedWindow();
          if (window) {
            window.webContents.send("toast:error", { title: "Update Download Failed", description: `Failed to download update: ${response.statusCode}`, duration: 5000 });
          } else {
            dialog.showErrorBox("Download Failed", `Failed to download update: ${response.statusCode}`);
          }
          return;
        }

        const totalBytes = parseInt(response.headers['content-length'] || '0', 10);
        let downloadedBytes = 0;
        let lastTime = Date.now();
        let lastBytes = 0;
        let bytesPerSecond = 0;

        response.on('data', (chunk) => {
          downloadedBytes += chunk.length;

          const now = Date.now();
          const elapsed = (now - lastTime) / 1000;
          if (elapsed >= 0.5) {
            bytesPerSecond = Math.round((downloadedBytes - lastBytes) / elapsed);
            lastTime = now;
            lastBytes = downloadedBytes;
          }

          if (totalBytes > 0) {
            const percent = Math.round((downloadedBytes / totalBytes) * 100);
            sendUpdateProgressToWindows({
              status: "downloading",
              percent,
              bytesPerSecond,
              transferred: downloadedBytes,
              total: totalBytes
            });
          }
        });

        response.pipe(file);
        file.on("finish", () => {
          file.close(() => {
            setUpdateState(UpdateState.INSTALLING);
            installPackage(tmpPath, type);
          });
        });
      })
      .on("error", (err) => {
        setUpdateState(UpdateState.ERROR);
        const window = BrowserWindow.getFocusedWindow();
        if (window) {
          window.webContents.send("toast:error", { title: "Download Error", description: `${err.message}`, duration: 5000 });
        } else {
          dialog.showErrorBox("Download Error", err.message);
        }
      });
  }

  doDownload(url);
}

function installPackage(filePath: string, type: "deb" | "rpm" | "appimage") {
  if (type === "appimage") {
    // For AppImage, just make it executable and inform user
    fs.chmod(filePath, 0o755, (chmodErr) => {
      if (chmodErr) {
        setUpdateState(UpdateState.ERROR);
        const window = BrowserWindow.getFocusedWindow();
        if (window) {
          window.webContents.send("toast:error", { title: "Installation Failed", description: `Failed to make AppImage executable: ${chmodErr.message}`, duration: 5000 });
        } else {
          dialog.showErrorBox("Installation Failed", `Failed to make AppImage executable: ${chmodErr.message}`);
        }
        return;
      }

      setUpdateState(UpdateState.READY);
      dialog
        .showMessageBox({
          type: "info",
          buttons: ["OK"],
          defaultId: 0,
          title: "Update Downloaded",
          message: "Voiden AppImage has been downloaded.",
          detail: `The new version is saved at:\n${filePath}\n\nRun this file to use the updated version.`,
        })
        .then(() => {
          setUpdateState(UpdateState.IDLE);
        });
    });
    return;
  }

  const command = type === "deb" ? ["dpkg", "-i", filePath] : ["rpm", "-Uvh", filePath];

  execFile("pkexec", command, (error, _stdout, stderr) => {
    fs.unlink(filePath, (unlinkErr) => {
      if (unlinkErr) {
        // console.warn(`⚠️ Could not delete temp file: ${filePath}`, unlinkErr.message);
      }
    });

    if (error) {
      setUpdateState(UpdateState.ERROR);
      const window = BrowserWindow.getFocusedWindow();
      if (window) {
        window.webContents.send("toast:error", { title: "Installation Failed", description: `${error.message}\n\n${stderr}`, duration: 5000 });
      } else {
        dialog.showErrorBox("Installation Failed", `${error.message}\n\n${stderr}`);
      }
      return;
    }

    setUpdateState(UpdateState.READY);
    dialog
      .showMessageBox({
        type: "info",
        buttons: ["OK"],
        defaultId: 0,
        title: "Update Complete",
        message: "Voiden has been successfully updated.",
        detail: "The app will now restart to complete the update.",
      })
      .then(() => {
        app.relaunch();
        app.exit(0);
      });
  });
}

function checkForLinuxUpdate(currentVersion: string, channel: "stable" | "early-access" = "stable") {
  if (isUpdateInProgress()) {
      setUpdateState(UpdateState.IDLE);
    const win = windowManager.browserWindow ?? BrowserWindow.getAllWindows()[0];
    win?.webContents.send("toast:info", { title: "Update In Progress", description: "An update is already in progress. Please wait for it to complete.", duration: 5000 });
    return;
  }

  const packageType = detectLinuxPackageType();
  const channelPath = channel === "early-access" ? "beta" : "stable";
  const latestUrl = `https://voiden.md/api/download/${channelPath}/linux/latest.json`;

  const requestOptions = {
    headers: {
      'User-Agent': `Voiden/${currentVersion} (${process.platform}: ${process.arch})`,
    },
  };

  setUpdateState(UpdateState.CHECKING);

  https
    .get(latestUrl, requestOptions, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const latest = JSON.parse(data);
          const latestVersion = latest.version;

          setUpdateState(UpdateState.IDLE);

          if (semver.valid(latestVersion) && semver.gt(latestVersion, currentVersion)) {
            const channelLabel = channel === "early-access" ? " (Early Access)" : "";

            // Determine download URL based on how the app was installed
            let downloadUrl: string;
            let packageTypeLabel: string;

            if (packageType === "appimage") {
              downloadUrl = latest.appimage;
              packageTypeLabel = "AppImage";
            } else if (packageType === "deb") {
              downloadUrl = latest.deb;
              packageTypeLabel = "DEB";
            } else {
              downloadUrl = latest.rpm;
              packageTypeLabel = "RPM";
            }

            // Check if the required package format is available
            if (!downloadUrl) {
              console.error(`Update not available for package type: ${packageType}`);
              return;
            }

            dialog
              .showMessageBox({
                type: "info",
                buttons: ["Download", "Later"],
                defaultId: 0,
                cancelId: 1,
                title: "Voiden Update Available",
                message: `A new version (${latestVersion})${channelLabel} of Voiden is available.`,
                detail: packageType === "appimage"
                  ? `You are running version ${currentVersion}.\n\nClick "Download" to get the latest AppImage.`
                  : `You are running version ${currentVersion}.\n\nClick "Download" to get the latest ${packageTypeLabel} package.\nYou may be prompted for your password.`,
              })
              .then((result) => {
                if (result.response === 0) {
                  downloadAndInstallPackage(downloadUrl, packageType);
                }
              });
          }
        } catch (err) {
          setUpdateState(UpdateState.ERROR);
          // console.error("Failed to parse latest.json:", err);
        }
      });
    })
    .on("error", () => {
      setUpdateState(UpdateState.ERROR);
      // console.error("Error fetching latest.json");
    });
}

export function initializeUpdates(channel: "stable" | "early-access" = "stable") {
  const platform = process.platform;
  const arch = process.arch;
  const currentVersion = app.getVersion();

  if (platform === "win32" || platform === "darwin") {
    // Setup autoUpdater event listeners for progress tracking
    setupAutoUpdaterListeners();

    // Choose channel path based on channel preference
    const channelPath = channel === "early-access" ? "beta" : "stable";

    // Configure electron-updater
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.setFeedURL({
      provider: "generic",
      url: `https://voiden.apyverse.dev/api/download/${channelPath}/${platform}/${arch}`,
    });

    // Check for updates after app is ready, then periodically
    app.whenReady().then(() => {
      setTimeout(() => {
        autoUpdater.checkForUpdates().catch((err: Error) => {
          console.error("Auto update check failed:", err);
        });
      }, 10_000);

      // Check for updates every hour
      setInterval(() => {
        if (!isUpdateInProgress()) {
          autoUpdater.checkForUpdates().catch((err: Error) => {
            console.error("Periodic update check failed:", err);
          });
        }
      }, 60 * 60 * 1000);
    });
  } else if (platform === "linux") {
    app.whenReady().then(() => {
      setTimeout(() => {
        checkForLinuxUpdate(currentVersion, channel);
      }, 10_000);
    });
  }
}

// Manual update check function
export function checkForUpdatesManually(channel: "stable" | "early-access" = "stable"): Promise<{ available: boolean; version?: string }> {
  return new Promise((resolve) => {
    if (isUpdateInProgress()) {
        setUpdateState(UpdateState.IDLE);
      const win = windowManager.browserWindow ?? BrowserWindow.getAllWindows()[0];
      win?.webContents.send("toast:info", { title: "Update In Progress", description: "An update is already in progress. Please wait for it to complete.", duration: 5000 });
      resolve({ available: false });
      return;
    }

    const platform = process.platform;
    const currentVersion = app.getVersion();

    if (platform === "linux") {
      setUpdateState(UpdateState.CHECKING);

      // For Linux, we need to check manually via latest.json
      const channelPath = channel === "early-access" ? "beta" : "stable";
      const latestUrl = `https://voiden.md/api/download/${channelPath}/linux/latest.json`;

      const requestOptions = {
        headers: {
          'User-Agent': `Voiden/${currentVersion} (${process.platform}: ${process.arch})`,
        },
      };

      https
        .get(latestUrl, requestOptions, (res) => {
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => {
            try {
              const latest = JSON.parse(data);
              const latestVersion = latest.version;

              if (semver.valid(latestVersion) && semver.gt(latestVersion, currentVersion)) {
                // Keep current state (CHECKING) - download will update it
                resolve({ available: true, version: latestVersion });
              } else {
                setUpdateState(UpdateState.IDLE);
                resolve({ available: false });
              }
            } catch (err) {
              setUpdateState(UpdateState.ERROR);
              resolve({ available: false });
            }
          });
        })
        .on("error", () => {
          setUpdateState(UpdateState.ERROR);
          resolve({ available: false });
        });
    } else if (platform === "win32" || platform === "darwin") {
      setUpdateState(UpdateState.CHECKING);

      // For Windows/macOS, check if RELEASES file exists and parse it
      const channelPath = channel === "early-access" ? "beta" : "stable";
      const arch = process.arch;

      // Use RELEASES.json for macOS, RELEASES for Windows
      const releasesFile = platform === "darwin" ? "RELEASES.json" : "RELEASES";
      const releasesUrl = `https://voiden.md/api/download/${channelPath}/${platform}/${arch}/${releasesFile}`;

      const requestOptions = {
        headers: {
          'User-Agent': `Voiden/${currentVersion} (${process.platform}: ${process.arch})`,
        },
      };

      https
        .get(releasesUrl, requestOptions, (res) => {
          // Check for non-200 status codes
          if (res.statusCode !== 200) {
            console.error(`Failed to fetch ${releasesFile}: HTTP ${res.statusCode}`);
            setUpdateState(UpdateState.ERROR);
            resolve({ available: false });
            return;
          }

          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => {
            try {
              let latestVersion: string | null = null;

              if (platform === "win32") {
                // Parse Windows RELEASES file (plain text format)
                // Format: SHA1 filename size
                // Example: A1B2C3D4... Voiden-1.0.0-full.nupkg 12345678
                const lines = data.split("\n").filter((line) => line.trim());
                for (const line of lines) {
                  // Match stable (voiden-1.1.0-full.nupkg), beta (voiden-1.1.0-beta.20-full.nupkg), and dev (voiden-1.1.0-dev.20-full.nupkg)
                  const match = line.match(/voiden-(\d+\.\d+\.\d+(?:-(?:beta|dev)\.\d+)?)-full\.nupkg/i);
                  if (match) {
                    latestVersion = match[1];
                    break;
                  }
                }
              } else {
                // Parse macOS RELEASES.json file
                const releases = JSON.parse(data);
                latestVersion = releases.currentRelease;
              }

              setUpdateState(UpdateState.IDLE);

              if (latestVersion && semver.valid(latestVersion) && semver.gt(latestVersion, currentVersion)) {
                // Don't reset to IDLE here - let the download process handle state
                resolve({ available: true, version: latestVersion });
              } else {
                setUpdateState(UpdateState.IDLE);
                resolve({ available: false });
              }
            } catch (err) {
              // Log error for debugging
              console.error(`Failed to parse ${releasesFile}:`, err, "Data:", data);
              setUpdateState(UpdateState.ERROR);
              resolve({ available: false });
            }
          });
        })
        .on("error", (err) => {
          console.error(`Error fetching ${releasesFile} from`, releasesUrl, ":", err);
          setUpdateState(UpdateState.ERROR);
          resolve({ available: false });
        });
    } else {
      resolve({ available: false });
    }
  });
}

// Setup autoUpdater event listeners once
let autoUpdaterInitialized = false;

function setupAutoUpdaterListeners() {
  if (autoUpdaterInitialized || !isUpdateSupported()) return;
  autoUpdaterInitialized = true;

  autoUpdater.on("checking-for-update", () => {
    setUpdateState(UpdateState.CHECKING);
  });

  autoUpdater.on("update-available", () => {
    setUpdateState(UpdateState.DOWNLOADING);
    sendUpdateProgressToWindows({ status: "downloading", percent: 0 });
  });

  autoUpdater.on("update-not-available", () => {
    setUpdateState(UpdateState.IDLE);
  });

  // electron-updater provides detailed progress events
  autoUpdater.on("download-progress", (progress: ProgressInfo) => {
    sendUpdateProgressToWindows({
      status: "downloading",
      percent: Math.round(progress.percent),
      bytesPerSecond: progress.bytesPerSecond,
      transferred: progress.transferred,
      total: progress.total,
    });
  });

  autoUpdater.on("update-downloaded", () => {
    setUpdateState(UpdateState.READY);
    dialog.showMessageBox({
      type: "info",
      buttons: ["Restart Now", "Later"],
      defaultId: 0,
      title: "Update Ready",
      message: "Update downloaded successfully!",
      detail: "The application will restart to complete the installation.",
    }).then((restartResponse) => {
      if (restartResponse.response === 0) {
        autoUpdater.quitAndInstall();
      } else {
        setUpdateState(UpdateState.IDLE);
      }
    });
  });

  autoUpdater.on("error", (error: Error) => {
    console.error("Update error:", error);
    setUpdateState(UpdateState.ERROR);

    const isNetworkError = /ENOTFOUND|ENETUNREACH|ECONNREFUSED|ECONNRESET|ETIMEDOUT|ERR_INTERNET_DISCONNECTED|ERR_NETWORK_CHANGED|getaddrinfo/i.test(error.message);
    const window = BrowserWindow.getFocusedWindow();

    if (isNetworkError) {
      if (window) {
        for (const win of BrowserWindow.getAllWindows()) {
          try {
            win.webContents.send("toast:error", { title: "Update Error", description: "Download failed: No internet connection", duration: Infinity });
          } catch (err) { }
        }
      }
    } else if (window) {
      window.webContents.send("toast:error", { title: "Update Error", description: `Failed to download update: ${error.message}`, duration: 5000 });
    } else {
      dialog.showErrorBox("Update Error", `Failed to download update: ${error.message}`);
    }
  });
}

// Register IPC handler for manual update checks
export function registerUpdateIpcHandlers() {
  // Setup autoUpdater listeners once on initialization
  setupAutoUpdaterListeners();

  ipcMain.handle("app:checkForUpdates", async (_event, channel: "stable" | "early-access") => {
    // Don't check for updates in development mode
    if (!isUpdateSupported()) {
      dialog.showMessageBox({
        type: "info",
        buttons: ["OK"],
        title: "Updates Not Available",
        message: "Updates are only available in production builds.",
        detail: "You are currently running a development build. Updates can only be checked in packaged/installed versions of the app.",
      });
      return { available: false };
    }

    // Check if update is already in progress
    if (isUpdateInProgress()) {
        setUpdateState(UpdateState.IDLE);
      const win = windowManager.browserWindow ?? BrowserWindow.getAllWindows()[0];
      win?.webContents.send("toast:info", { title: "Update In Progress", description: "An update is already in progress. Please wait for it to complete.", duration: 5000 });
      return { available: false, inProgress: true };
    }

    const result = await checkForUpdatesManually(channel);
    const platform = process.platform;

    if (result.available) {
      const channelLabel = channel === "early-access" ? " (Early Access)" : "";

      if (platform === "linux") {
        // For Linux, prompt user to download and install
        const packageType = detectLinuxPackageType();
        const channelPath = channel === "early-access" ? "beta" : "stable";
        const latestUrl = `https://voiden.md/api/download/${channelPath}/linux/latest.json`;

        const requestOptions = {
          headers: {
            'User-Agent': `Voiden/${app.getVersion()} (${process.platform}: ${process.arch})`,
          },
        };

        // Fetch the download URLs
        https.get(latestUrl, requestOptions, (res) => {
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => {
            try {
              const latest = JSON.parse(data);

              // Determine download URL based on how the app was installed
              let downloadUrl: string;
              let packageTypeLabel: string;

              if (packageType === "appimage") {
                downloadUrl = latest.appimage;
                packageTypeLabel = "AppImage";
              } else if (packageType === "deb") {
                downloadUrl = latest.deb;
                packageTypeLabel = "DEB";
              } else {
                downloadUrl = latest.rpm;
                packageTypeLabel = "RPM";
              }

              // Check if the required package format is available
              if (!downloadUrl) {
                console.error(`Update not available for package type: ${packageType}`);
                const window = BrowserWindow.getFocusedWindow();
                if (window) {
                  window.webContents.send("toast:warning", { title: "Update Error", description: `Update not available for ${packageTypeLabel} format.`, duration: 5000 });
                } else {
                  dialog.showErrorBox("Update Error", `Update not available for ${packageTypeLabel} format.`);
                }
                return;
              }

              dialog
                .showMessageBox({
                  type: "info",
                  buttons: ["Download & Install", "Later"],
                  defaultId: 0,
                  cancelId: 1,
                  title: "Update Available",
                  message: `A new version (${result.version})${channelLabel} is available!`,
                  detail: packageType === "appimage"
                    ? `You are currently running version ${app.getVersion()}.\n\nClick "Download & Install" to update your AppImage.`
                    : `You are currently running version ${app.getVersion()}.\n\nClick "Download & Install" to update now.\nYou may be prompted for your password.`,
                })
                .then((response) => {
                  if (response.response === 0) {
                    downloadAndInstallPackage(downloadUrl, packageType);
                  }
                });
            } catch (err) {
              // console.error("Failed to parse latest.json:", err);
            }
          });
        });
      } else {
        // For Windows/macOS, manually trigger the update download
        dialog.showMessageBox({
          type: "info",
          buttons: ["Download & Install", "Later"],
          defaultId: 0,
          cancelId: 1,
          title: "Update Available",
          message: `A new version (${result.version})${channelLabel} is available!`,
          detail: `You are currently running version ${app.getVersion()}.\n\nClick "Download & Install" to update now.`,
        }).then(async (response) => {
          if (response.response === 0) {
            try {
              setUpdateState(UpdateState.DOWNLOADING);
              sendUpdateProgressToWindows({ status: "downloading", percent: 0 });
              // Use electron-updater to check and download the update
              const updateCheckResult = await autoUpdater.checkForUpdates();
              if (updateCheckResult) {
                // Download the update - progress will be reported via download-progress event
                await autoUpdater.downloadUpdate();
              }
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : String(error);
              setUpdateState(UpdateState.ERROR);
              const window = BrowserWindow.getFocusedWindow();
              if (window) {
                window.webContents.send("toast:error", { title: "Update Error", description: `Failed to download update: ${errorMessage}`, duration: 5000 });
              } else {
                dialog.showErrorBox("Update Error", `Failed to download update: ${errorMessage}`);
              }
            }
          }
        });
      }

      return { available: true, version: result.version };
    } else {
      dialog.showMessageBox({
        type: "info",
        buttons: ["OK"],
        title: "No Updates Available",
        message: "You're running the latest version!",
        detail: `Current version: ${app.getVersion()}`,
      });
      return { available: false };
    }
  });

  // Add IPC handler to get current update state
  ipcMain.handle("app:getUpdateState", () => {
    return { state: currentUpdateState };
  });
}