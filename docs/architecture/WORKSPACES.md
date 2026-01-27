# Workspaces

Voiden uses **Yarn Workspaces** to manage its monorepo structure. This document explains the workspace organization and how packages relate to each other.

## Overview

The project is organized into two workspace locations:

```
voiden/
├── apps/
│   ├── electron/     # Main desktop application
│   └── ui/           # React UI application
└── core-extensions/  # Built-in extensions
```

## Workspaces

### apps/electron

| | |
|---|---|
| **Package** | `voiden` |
| **Version** | 1.1.0-beta.3 |
| **Purpose** | Main Electron desktop application |

The Electron app serves as the shell that hosts the UI and provides native capabilities like file system access, window management, and IPC communication.

**Key Scripts:**
| Script | Description |
|--------|-------------|
| `start` | Start development with Electron Forge |
| `package` | Package the app for distribution |
| `make` | Build platform-specific installers |
| `publish` | Publish to release channels |

---

### apps/ui

| | |
|---|---|
| **Package** | `voiden-ui` |
| **Version** | 0.20.1 |
| **Purpose** | React UI running in Electron renderer |

The UI workspace contains all React components, state management, and the core editor functionality. It runs inside Electron's renderer process.

**Key Scripts:**
| Script | Description |
|--------|-------------|
| `dev` | Start Vite dev server |
| `build` | Build for production |
| `typecheck` | Run TypeScript type checking |
| `test` | Run tests with Vitest |

**Dependencies:**
- `@voiden/core-extensions` (workspace)
- `@voiden/sdk` (npm)

---

### core-extensions

| | |
|---|---|
| **Package** | `@voiden/core-extensions` |
| **Version** | 0.1.0 |
| **Purpose** | Built-in extensions bundled with Voiden |

Core extensions are part of the main Voiden repository and ship with the application. They provide essential functionality:

| Extension | Description |
|-----------|-------------|
| `voiden-rest-api` | REST API support |
| `voiden-graphql` | GraphQL support |
| `voiden-sockets` | WebSocket support |
| `voiden-faker` | Data faker utilities |
| `voiden-advanced-auth` | Advanced authentication |
| `openapi-import` | OpenAPI import |
| `postman-import` | Postman collection import |
| `md-preview` | Markdown preview |
| `simple-assertions` | Testing assertions |

**Key Scripts:**
| Script | Description |
|--------|-------------|
| `build` | Compile TypeScript and Sass |
| `dev` | Watch mode compilation |
| `generate-registry` | Generate extension registry |

---

## Dependency Graph

```
┌─────────────────────────────────────┐
│        voiden (apps/electron)       │
│         Main Electron App           │
└──────────────────┬──────────────────┘
                   │ embeds
                   ▼
┌─────────────────────────────────────┐
│         voiden-ui (apps/ui)         │
│           React UI Layer            │
└──────────────────┬──────────────────┘
                   │
                   ▼
┌─────────────────────────────────────┐
│       @voiden/core-extensions       │
│         Built-in Extensions         │
└─────────────────────────────────────┘
```

## Working with Workspaces

### Running Scripts

Run a script in a specific workspace:

```bash
# Run dev in UI workspace
yarn workspace voiden-ui dev

# Run build in core-extensions
yarn workspace @voiden/core-extensions build
```

### Adding Dependencies

Add a dependency to a specific workspace:

```bash
# Add to UI workspace
yarn workspace voiden-ui add <package>

# Add as dev dependency
yarn workspace voiden-ui add -D <package>
```

### Workspace References

Internal packages use the `workspace:*` protocol:

```json
{
  "dependencies": {
    "@voiden/core-extensions": "workspace:*"
  }
}
```

This ensures local versions are used during development.

### Path Aliases

The UI workspace uses path aliases for cleaner imports:

| Alias | Path |
|-------|------|
| `@/*` | `apps/ui/src/*` |
| `@voiden/core-extensions` | `core-extensions/src` |

## Build System

### Electron (apps/electron)

Uses **Electron Forge** with Vite for building:

- `vite.main.config.ts` - Main process
- `vite.preload.config.ts` - Preload scripts
- `vite.renderer.config.ts` - Renderer process

Supports platform-specific builds for macOS, Windows, and Linux.

### UI (apps/ui)

Uses **Vite** for fast development and optimized production builds.

### Shared Tooling

All workspaces share:

- **TypeScript** - Type checking and compilation
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Vitest** - Testing framework
