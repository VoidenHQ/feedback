interface ReleaseAsset {
  name: string;
  browser_download_url: string;
}

export async function getExtensionFiles(repo: string, version: string): Promise<{ manifest: string; main: string }> {
  const apiUrl = `https://api.github.com/repos/${repo}/releases/tags/v${version}`;
  const response = await fetch(apiUrl);

  if (!response.ok) {
    throw new Error(`Failed to fetch release info: ${response.status}`);
  }

  const releaseInfo = await response.json();
  const assets: ReleaseAsset[] = releaseInfo.assets;

  const manifestAsset = assets.find((asset) => asset.name === "manifest.json");
  const mainAsset = assets.find((asset) => asset.name === "main.js");

  if (!manifestAsset || !mainAsset) {
    throw new Error("Required files not found in release assets");
  }

  const [manifestResponse, mainResponse] = await Promise.all([fetch(manifestAsset.browser_download_url), fetch(mainAsset.browser_download_url)]);

  const [manifest, main] = await Promise.all([manifestResponse.text(), mainResponse.text()]);

  return { manifest, main };
}
