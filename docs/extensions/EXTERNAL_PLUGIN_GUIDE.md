# External Plugin Development Guide

> **Status:** Planned feature - External plugin installation is not yet implemented. This guide is for future reference.

This guide covers how to build, test, publish, install, and uninstall external plugins for Voiden.

## Table of Contents

- [Building an External Plugin](#building-an-external-plugin)
- [Testing an External Plugin](#testing-an-external-plugin)
- [Publishing an External Plugin](#publishing-an-external-plugin)
- [Installing an External Plugin](#installing-an-external-plugin)
- [Uninstalling an External Plugin](#uninstalling-an-external-plugin)

---

## Building an External Plugin

### 1. Project Setup

Create a new npm project:

```bash
mkdir my-voiden-extension
cd my-voiden-extension
npm init -y
```

Install the SDK as a dev dependency:

```bash
npm install --save-dev @voiden/sdk
npm install --save-dev typescript
```

### 2. Project Structure

```
my-voiden-extension/
├── src/
│   ├── manifest.json          # Required metadata
│   ├── extension.ts           # Your extension implementation
│   └── index.ts              # Entry point
├── dist/
│   ├── manifest.json         # Copied from src
│   └── main.js              # Compiled output
├── package.json
└── tsconfig.json
```

### 3. Create manifest.json

Create `src/manifest.json`:

```json
{
  "id": "my-extension",
  "type": "community",
  "name": "My Extension",
  "description": "Does something cool",
  "version": "1.0.0",
  "author": "Your Name",
  "enabled": true,
  "priority": 50,
  "capabilities": {
    "blocks": {
      "owns": ["my-block"],
      "allowExtensions": true
    }
  },
  "dependencies": {
    "sdk": "^0.1.0"
  }
}
```

### 4. Create extension.ts

Create `src/extension.ts`:

```typescript
import { UIExtension } from '@voiden/sdk/ui';

export class MyExtension extends UIExtension {
  name = 'my-extension';
  version = '1.0.0';

  async onLoad(): Promise<void> {
    // Register your blocks, commands, etc.
    this.registerSlashCommand({
      name: 'my-command',
      label: 'My Command',
      description: 'Does something',
      slash: '/mycommand',
      action: (editor) => {
        // Your logic
      }
    });
  }
}
```

### 5. Create index.ts (Entry point)

Create `src/index.ts`:

```typescript
import { MyExtension } from './extension';

export default MyExtension;
```

### 6. Configure TypeScript

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "node",
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "strict": true,
    "esModuleInterop": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### 7. Add Build Script

Update `package.json`:

```json
{
  "name": "my-voiden-extension",
  "version": "1.0.0",
  "main": "dist/main.js",
  "scripts": {
    "build": "tsc && cp src/manifest.json dist/manifest.json"
  },
  "devDependencies": {
    "@voiden/sdk": "^0.1.0",
    "typescript": "^5.0.0"
  }
}
```

### 8. Build

```bash
npm run build
```

This creates `dist/main.js` and `dist/manifest.json`.

---

## Testing an External Plugin

### Option 1: Local Installation (Manual)

Manually copy your built extension to the user data directory:

```bash
# Find your userData directory
# macOS: ~/Library/Application Support/Voiden
# Linux: ~/.config/Voiden
# Windows: %APPDATA%/Voiden

# Create extension directory
mkdir -p ~/.config/Voiden/extensions/my-extension

# Copy built files
cp dist/main.js ~/.config/Voiden/extensions/my-extension/
cp dist/manifest.json ~/.config/Voiden/extensions/my-extension/
```

Then update `~/.config/Voiden/extensions/installed.json`:

```json
[
  {
    "id": "my-extension",
    "type": "community",
    "name": "My Extension",
    "version": "1.0.0",
    "installedPath": "/Users/you/.config/Voiden/extensions/my-extension",
    "enabled": true
  }
]
```

Restart Voiden to load the extension.

### Option 2: Dev Mode with Symlinks

You could modify the extension manager to support local development paths:

```typescript
// In apps/electron/src/main/extension/extensionManager.ts
async loadLocalDevExtension(localPath: string) {
  const manifestPath = path.join(localPath, 'dist', 'manifest.json');
  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf-8'));

  this.store.extensions.push({
    ...manifest,
    type: 'community',
    installedPath: path.join(localPath, 'dist'),
    enabled: true,
  });
}
```

---

## Publishing an External Plugin

Based on the installation code at `apps/electron/src/main/extension/extensionManager.ts:139`, extensions are fetched from **GitHub repositories**.

### 1. Create a GitHub Repository

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/my-voiden-extension.git
git push -u origin main
```

### 2. Create a Release

```bash
git tag v1.0.0
git push origin v1.0.0
```

On GitHub, create a release with:
- Tag: `v1.0.0`
- Attach `dist/manifest.json` and `dist/main.js` as release assets

### 3. Extension Repository Structure

The installer expects this structure in your GitHub repo:

```
https://github.com/yourusername/my-voiden-extension
└── releases/v1.0.0/
    ├── manifest.json
    └── main.js
```

The installation code fetches these files via GitHub API or raw URLs.

---

## Installing an External Plugin

### From UI (if implemented)

Looking at the IPC handlers at `apps/electron/src/main/state.ts:147-151`, users would:

1. Open Extension Manager UI in Voiden
2. Search for extensions (possibly from a registry/marketplace)
3. Click "Install" on your extension
4. Provide repo URL: `https://github.com/yourusername/my-voiden-extension`
5. Select version: `v1.0.0`

The app calls:
```typescript
await window.electron.extensions.install({
  id: 'my-extension',
  repo: 'https://github.com/yourusername/my-voiden-extension',
  version: 'v1.0.0'
});
```

### Behind the Scenes

From `apps/electron/src/main/extension/extensionManager.ts:139-167`:

```typescript
async installCommunityExtension(extension: ExtensionData) {
  // 1. Fetch files from GitHub
  const { manifest, main } = await installer.getExtensionFiles(
    extension.repo,
    extension.version
  );

  // 2. Create directory in ~/.userData/extensions/
  const installPath = path.join(communityDir, extension.id);
  await fs.mkdir(installPath, { recursive: true });

  // 3. Write files
  await fs.writeFile(path.join(installPath, "manifest.json"), manifest);
  await fs.writeFile(path.join(installPath, "main.js"), main);

  // 4. Register in state
  this.store.extensions.push(extension);

  // 5. Persist to installed.json
  await this.saveInstalledCommunityExtensions();

  return extension;
}
```

---

## Uninstalling an External Plugin

### From UI

1. Open Extension Manager
2. Find your extension
3. Click "Uninstall"

Calls:
```typescript
await window.electron.extensions.uninstall('my-extension');
```

### Behind the Scenes

From `apps/electron/src/main/extension/extensionManager.ts:169-182`:

```typescript
async uninstallCommunityExtension(extensionId: string) {
  const ext = this.store.extensions.find(e => e.id === extensionId);

  if (ext?.installedPath) {
    // 1. Delete from filesystem
    await fs.rm(ext.installedPath, { recursive: true, force: true });

    // 2. Remove from state
    this.store.extensions = this.store.extensions.filter(
      e => e.id !== extensionId
    );

    // 3. Update installed.json
    await this.saveInstalledCommunityExtensions();
  }
}
```

---

## Summary Workflow

| Step | Command/Action |
|------|----------------|
| **Build** | `npm run build` → creates `dist/main.js` + `dist/manifest.json` |
| **Test Locally** | Copy to `~/.userData/extensions/my-extension/`, update `installed.json`, restart app |
| **Publish** | Push to GitHub, create release with dist files |
| **Install** | Use Extension Manager UI or `window.electron.extensions.install()` |
| **Uninstall** | Use Extension Manager UI or `window.electron.extensions.uninstall()` |

---

## Key Reference Files

- `apps/electron/src/main/extension/extensionManager.ts:139-182` - Install/uninstall logic
- `apps/electron/src/main/extension/installer.ts` - GitHub fetching
- `apps/electron/src/preload/api/misc.ts` - Exposed API
- `packages/sdk/src/ui/Extension.ts` - UIExtension base class
- `docs/extension-architecture.md` - Complete architecture design
- `docs/extensions/HOW_TO_ADD.md` - Quick start for core extensions

---

## Examples

For working examples of extensions, see:

- `core-extensions/src/voiden-rest-api/` - Complex extension with blocks and pipeline hooks
- `core-extensions/src/md-preview/` - Simple extension with editor actions
- `core-extensions/src/simple-assertions/` - Response processing extension
- `core-extensions/src/voiden-faker/` - Pre-send pipeline hooks

---

## SDK Documentation

For detailed SDK API documentation, see:
- `packages/sdk/README.md` - SDK usage guide
- `packages/sdk/SDK_EXTENSIONS_PLAN.md` - Future SDK enhancements
