import path from "path";
import fs from "fs/promises";
import { app } from "electron";
import { ExtensionData } from "src/shared/types";

const EXTENSIONS_REPO = "VoidenHQ/plugins";
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds
const remoteExtensionsPath = path.join(app.getPath("userData"), "remoteExtensions.json");
const readmeCache = new Map();

export async function fetchReadme(url: string) {
  if (readmeCache.has(url)) {
    // Return cached version if it's still fresh (e.g., within 1 day)
    const { content, timestamp } = readmeCache.get(url);
    if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
      return content;
    }
  }

  const response = await fetch(url);
  const content = response.ok ? await response.text() : `Error: ${response.statusText}`;
  readmeCache.set(url, { content, timestamp: Date.now() });
  return content;
}

export async function getRemoteExtensions(): Promise<ExtensionData[]> {
  let cachedData: { timestamp: number; data: ExtensionData[] } | null = null;

  try {
    const fileContent = await fs.readFile(remoteExtensionsPath, "utf8");
    cachedData = JSON.parse(fileContent);
  } catch (err) {
    // No cached file found or parse error; proceed to fetch remote
    cachedData = null;
  }

  const now = Date.now();

  if (cachedData && cachedData.timestamp && now - cachedData.timestamp < CACHE_DURATION) {
    return cachedData.data;
  }

  try {
    // Fetch from GitHub; note that the content is base64 encoded
    const response = await fetch(`https://api.github.com/repos/${EXTENSIONS_REPO}/contents/extensions.json?ref=main`);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const fileJson = await response.json();
    const base64Content = fileJson.content;
    const remoteJsonString = Buffer.from(base64Content, "base64").toString("utf8");
    const remoteExtensionsRaw = JSON.parse(remoteJsonString);
    // Transform remote extensions by adding defaults for community extensions
    const remoteExtensions: ExtensionData[] = remoteExtensionsRaw.map(
      (ext: ExtensionData): Omit<ExtensionData, "enabled"> => ({
        id: ext.id,
        name: ext.name,
        description: ext.description,
        author: ext.author,
        version: ext.version,
        type: "community",
        readme: "",
        repo: ext.repo,
      }),
    );

    // Write to cache with the current timestamp
    await fs.writeFile(remoteExtensionsPath, JSON.stringify({ timestamp: now, data: remoteExtensions }), "utf8");
    return remoteExtensions;
  } catch (error) {
    // console.error("Error fetching remote extensions: ", error);
    // If fetching fails and we have cached data, use it; else return empty array.
    return cachedData ? cachedData.data : [];
  }
}
