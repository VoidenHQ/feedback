// extensionManager.ts
import { getRemoteExtensions } from "./extensionFetcher";
import * as installer from "./extensionInstaller";
import fs from "fs/promises";
import path from "path";
import { app } from "electron";
import { AppState, ExtensionData } from "src/shared/types";
import { coreExtensions } from "../config/coreExtensions";

const communityDir = path.join(app.getPath("userData"), "extensions");

export class ExtensionManager {
  constructor(private store: AppState) {}

  async loadInstalledCommunityExtensions(): Promise<void> {
    // Sync core extensions from config - this ensures new core extensions are automatically added
    this.syncCoreExtensions();

    try {
      const data = await fs.readFile(path.join(communityDir, "installed.json"), "utf8");
      const installed: ExtensionData[] = JSON.parse(data);
      // merge with core extensions in centralized appState
      this.store.extensions = [...this.store.extensions.filter((ext) => ext.type === "core"), ...installed];
    } catch (e) {
      // no installed community ext found, so only keep core extensions in appState
      this.store.extensions = this.store.extensions.filter((ext) => ext.type === "core");
    }
  }

  /**
   * Syncs core extensions from the config file with the current state.
   * This ensures:
   * - New core extensions are automatically added
   * - Existing core extensions are updated with latest metadata
   * - User's enabled/disabled preferences are preserved
   */
  private syncCoreExtensions(): void {
    const existingCoreExtensions = this.store.extensions.filter((ext) => ext.type === "core");
    const syncedCoreExtensions: ExtensionData[] = [];

    for (const coreExt of coreExtensions) {
      // Check if this core extension already exists in state
      const existing = existingCoreExtensions.find((ext) => ext.id === coreExt.id);

      if (existing) {
        // Preserve user's enabled/disabled preference, but update other metadata
        syncedCoreExtensions.push({
          ...coreExt,
          enabled: existing.enabled, // Preserve user preference
        });
      } else {
        // New core extension - add it with default enabled state from config
        syncedCoreExtensions.push(coreExt);
      }
    }

    // Replace core extensions in state with synced versions
    this.store.extensions = [
      ...syncedCoreExtensions,
      ...this.store.extensions.filter((ext) => ext.type !== "core"),
    ];
  }

  async saveInstalledCommunityExtensions(): Promise<void> {
    const communityExtensions = this.store.extensions.filter((ext) => ext.type === "community");
    await fs.mkdir(communityDir, { recursive: true });
    await fs.writeFile(path.join(communityDir, "installed.json"), JSON.stringify(communityExtensions), "utf8");
  }

  async getAllExtensions(): Promise<ExtensionData[]> {
    // this list comes solely from centralized appState
    const remoteExtensions = await getRemoteExtensions();
    // make sure there are no duplicates
    const allExtensions = [...this.store.extensions, ...remoteExtensions].filter(
      (ext, index, self) => self.findIndex((t) => t.id === ext.id) === index,
    );
    return allExtensions;
  }

  async installCommunityExtension(extension: ExtensionData): Promise<ExtensionData> {
    if (!extension.repo) {
      throw new Error("repo not defined");
    }
    const { manifest, main } = await installer.getExtensionFiles(extension.repo, extension.version);
    const installPath = path.join(communityDir, extension.id);
    await fs.mkdir(installPath, { recursive: true });
    await fs.writeFile(path.join(installPath, "manifest.json"), manifest, "utf8");
    await fs.writeFile(path.join(installPath, "main.js"), main, "utf8");

    // update extension info in centralized appState
    extension.installedPath = installPath;
    extension.enabled = true;
    const index = this.store.extensions.findIndex((ext) => ext.id === extension.id);
    if (index > -1) {
      this.store.extensions[index] = extension;
    } else {
      this.store.extensions.push(extension);
    }
    await this.saveInstalledCommunityExtensions();
    return extension;
  }

  async uninstallCommunityExtension(extensionId: string): Promise<void> {
    const ext = this.store.extensions.find((ext) => ext.id === extensionId);
    if (ext && ext.installedPath) {
      await fs.rm(ext.installedPath, { recursive: true, force: true });
      // remove extension from centralized appState
      this.store.extensions = this.store.extensions.filter((ext) => ext.id !== extensionId);
      await this.saveInstalledCommunityExtensions();
    }
  }

  async setExtensionEnabled(extensionId: string, enabled: boolean): Promise<void> {
    const ext = this.store.extensions.find((ext) => ext.id === extensionId);
    if (!ext) throw new Error("extension not found");
    ext.enabled = enabled;
    if (ext.type === "community") {
      await this.saveInstalledCommunityExtensions();
    }
  }

  // getRemoteExtensions remains unchanged: it returns ALL available extensions for browsing.
  // note: enabled/disabled does not apply to remote list.
}
