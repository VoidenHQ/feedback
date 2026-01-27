# Extension Architecture

This document explains Voiden's extension system and the types of extensions supported.

## Overview

Extensions add functionality to Voiden through:
- Custom editor blocks (Tiptap nodes)
- Slash commands
- UI panels and sidebars
- Request/response pipeline hooks

## Extension Types

### Core Extensions

Extensions built and maintained by the Voiden team, bundled with the application. This is the only extension type currently available.

| Extension | Purpose |
|-----------|---------|
| `voiden-rest-api` | HTTP/REST API support |
| `voiden-graphql` | GraphQL support |
| `voiden-sockets` | WebSocket support |
| `voiden-faker` | Fake data generation |
| `voiden-advanced-auth` | Authentication methods |
| `openapi-import` | OpenAPI import |
| `postman-import` | Postman import |
| `md-preview` | Markdown preview |
| `simple-assertions` | Test assertions |

**Characteristics:**
- Shipped with the app in `core-extensions/`
- Cannot be uninstalled (can be disabled)
- Always available after install

### Community Extensions (Planned)

Extensions developed by the community and submitted to the Voiden team for verification.

**Planned Process:**
1. Community developer creates an extension
2. Submits extension to Voiden team for review
3. Voiden team verifies the extension meets quality and security checklist
4. Once approved, extension is included in Voiden

**Current Status:** Not yet implemented. Want to contribute an extension? Contact the Voiden team.

### External Extensions (Planned)

Self-hosted or third-party extensions that can be installed directly in the app.

**Planned Features:**
- Install extensions from within the app
- Extension marketplace/registry
- In-app extension management (install, update, uninstall)

**Current Status:** Not yet implemented.

## Extension Loading Flow

```
┌─────────────────────────────────────┐
│         Extension Registry          │
│    (Electron manages extensions)    │
└──────────────────┬──────────────────┘
                   │
                   ▼
┌─────────────────────────────────────┐
│         Plugin Loader               │
│    (filters enabled extensions)     │
└──────────────────┬──────────────────┘
                   │
                   ▼
┌─────────────────────────────────────┐
│         Core Extensions             │
│           (bundled)                 │
└──────────────────┬──────────────────┘
                   │
                   ▼
┌─────────────────────────────────────┐
│         Extension Runtime           │
│    (onload → active → onunload)     │
└─────────────────────────────────────┘
```

## Extension Lifecycle

1. **Discovery** - Extensions found via manifest.json (see [Auto-Discovery](AUTO_DISCOVERY.md))
2. **Registration** - Extension metadata stored in registry
3. **Loading** - Enabled extensions loaded at app startup
4. **Active** - Extension running, providing functionality
5. **Unloading** - Extension cleanup on disable or app close

## Extension Capabilities

Extensions can provide:

| Capability | Description |
|------------|-------------|
| **Blocks** | Custom editor nodes (method, URL, headers, body, etc.) |
| **Slash Commands** | User-triggered commands via `/` menu |
| **Panels** | Response panels, preview panels |
| **Sidebar Tabs** | Left or right sidebar content |
| **Pipeline Hooks** | Modify requests before send, process responses |
| **Helpers** | Utility functions shared with other extensions |

## Block Ownership

Each block type is owned by one extension. This determines:
- Which extension renders the block
- Which extension handles block-specific logic
- Paste behavior for that block type

Example ownership:
- `voiden-rest-api` owns: method, url, headers, body, etc.
- `voiden-graphql` owns: graphql-query, graphql-variables
- `voiden-faker` owns: faker autocomplete suggestions

## Helper System

Extensions can share pure utility functions with other extensions:
- Create node structures
- Parse/transform data
- Validate inputs

This allows extensions to build on each other without tight coupling.

## SDK Documentation

For detailed API documentation on building extensions, see the [@voiden/sdk documentation](https://github.com/VoidenHQ/sdk).

## Related Documentation

- [How to Add Extension](HOW_TO_ADD.md) - Step-by-step guide
- [Auto-Discovery](AUTO_DISCOVERY.md) - Manifest and registry system
