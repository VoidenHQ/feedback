# Extension Auto-Discovery

This document explains how Voiden automatically discovers and loads extensions via their `manifest.json` files.

## Overview

Voiden uses a **pre-build registry generation** approach:

1. A script scans extension directories for `manifest.json` files
2. Valid manifests are compiled into TypeScript registries
3. Extensions are loaded at runtime from these registries

## Discovery Process

### Registry Generation

The discovery runs via the script at `core-extensions/scripts/generate-registry.js`:

1. **Scan** - Looks for subdirectories in `core-extensions/src/`
2. **Detect** - Finds `manifest.json` in each subdirectory
3. **Parse** - Validates and parses JSON
4. **Sort** - Orders by `priority` field (lower = loads first)
5. **Generate** - Creates two registry files

### Generated Files

| File | Purpose |
|------|---------|
| `src/registry.ts` | Metadata export (safe for Electron main process) |
| `src/plugins.ts` | Plugin map with imports (for UI) |

### When Discovery Runs

```bash
# Automatically on build
yarn workspace @voiden/core-extensions build

# Manually
yarn workspace @voiden/core-extensions generate-registry
```

## Manifest Schema

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique extension identifier |
| `name` | string | Human-readable name |
| `description` | string | Short description |
| `author` | string | Author name |
| `version` | string | Semantic version (e.g., "1.0.0") |
| `enabled` | boolean | Default enabled state |
| `readme` | string | Longer documentation text |

### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `priority` | number | Load order (lower = earlier, default: 999) |
| `repo` | string | Repository URL |
| `capabilities` | object | Feature declarations |
| `dependencies` | object | Version constraints |
| `features` | string[] | List of features provided |

## Manifest Examples

### Minimal Manifest

```json
{
  "id": "my-extension",
  "name": "My Extension",
  "version": "1.0.0",
  "description": "A simple extension",
  "author": "Your Name",
  "enabled": true,
  "readme": "This extension does something useful."
}
```

### Full Manifest

```json
{
  "id": "voiden-rest-api",
  "name": "Voiden REST API",
  "version": "1.0.0",
  "description": "HTTP/REST API testing toolkit",
  "author": "Voiden Team",
  "enabled": true,
  "priority": 10,
  "readme": "Complete REST API testing extension...",
  "capabilities": {
    "blocks": {
      "owns": ["method", "url", "request", "headers"],
      "allowExtensions": true
    },
    "pipeline": {
      "hooks": ["pre-send", "post-receive"]
    },
    "editor": {
      "autocomplete": true
    }
  },
  "dependencies": {
    "core": "^1.0.0",
    "sdk": "^1.0.0"
  },
  "features": ["http-requests", "response-viewer"]
}
```

## Directory Structure

```
core-extensions/
├── src/
│   ├── voiden-rest-api/
│   │   ├── manifest.json    # Extension manifest
│   │   ├── plugin.ts        # Plugin implementation
│   │   └── ...
│   ├── voiden-graphql/
│   │   ├── manifest.json
│   │   └── ...
│   ├── registry.ts          # Auto-generated
│   └── plugins.ts           # Auto-generated
└── scripts/
    └── generate-registry.js # Discovery script
```

## Runtime Loading

### Core Extensions

1. Registry is imported from `@voiden/core-extensions`
2. Plugin map provides the implementation for each extension ID
3. Each plugin's `onload()` is called during initialization

### Community Extensions

Community extensions installed at runtime are stored in:

```
~/.voiden/extensions/
├── installed.json           # Metadata for all installed extensions
└── {extension-id}/
    ├── manifest.json
    └── main.js              # Plugin implementation
```

They are dynamically imported via:
```typescript
import(`${extension.installedPath}/main.js`)
```

## Adding a New Extension

1. Create a directory in `core-extensions/src/`:
   ```
   core-extensions/src/my-extension/
   ```

2. Add a `manifest.json`:
   ```json
   {
     "id": "my-extension",
     "name": "My Extension",
     "version": "1.0.0",
     "description": "Does something useful",
     "author": "Your Name",
     "enabled": true,
     "readme": "Detailed description here."
   }
   ```

3. Add a `plugin.ts` that exports the plugin:
   ```typescript
   import { createPlugin } from "@voiden/sdk";

   export default createPlugin({
     onload() {
       // Initialize extension
     }
   });
   ```

4. Rebuild to regenerate the registry:
   ```bash
   yarn workspace @voiden/core-extensions build
   ```

The extension will be automatically discovered and included.

## Priority Order

Extensions load in priority order (lower numbers first):

| Priority | Extensions |
|----------|------------|
| 10 | voiden-rest-api |
| 15 | voiden-graphql |
| 20 | simple-assertions, voiden-advanced-auth, voiden-sockets |
| 30 | voiden-faker |
| 40 | md-preview |
| 50 | openapi-import, postman-import |

Set lower priority for extensions that other extensions depend on.
