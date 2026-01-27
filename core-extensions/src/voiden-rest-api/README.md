# Voiden REST API Extension

Complete HTTP/REST API testing extension built on the new SDK architecture.

## Architecture

This extension uses the **new SDK v2 architecture** with:

- ✅ `UIExtension` base class
- ✅ Pipeline hooks for request/response handling
- ✅ Secure environment API (variable names only)
- ✅ Helper system for pure utilities
- ✅ TypeScript throughout

## Directory Structure

```
voiden-rest-api/
├── manifest.json           # Extension metadata
├── extension.ts            # Main extension class
├── index.ts               # Entry point
├── nodes/                 # Tiptap nodes (blocks)
│   ├── MethodNode.ts      # HTTP method selector
│   ├── UrlNode.ts         # URL input
│   ├── HeadersTable.ts    # Headers table
│   ├── QueryTable.ts      # Query params table
│   └── BodyNode.ts        # Request body editor
├── lib/                   # Core logic
│   ├── requestCompiler.ts # Compile editor → request state
│   └── responseHandler.ts # Handle response → editor
└── utils/                 # Utilities
    └── validators.ts      # Request validation
```

## Implementation Plan

### Phase 1: Core Blocks ✨ CURRENT
- [ ] Method selector node
- [ ] URL input node
- [ ] Headers table node
- [ ] Query params table node
- [ ] Body editor node

### Phase 2: Pipeline Integration
- [ ] Request compilation hook
- [ ] Pre-send validation hook
- [ ] Post-processing response hook

### Phase 3: UI Components
- [ ] Response panel
- [ ] Request history sidebar
- [ ] Slash commands

### Phase 4: Advanced Features
- [ ] Auth helpers
- [ ] Environment variable autocomplete
- [ ] Response assertions

## Usage

```typescript
import { VoidenRestApiExtension } from '@voiden/core-extensions/voiden-rest-api';

// Extension will be auto-loaded by the platform
```

## Development

Built with:
- **SDK**: `@voiden/sdk` v1.0.0+
- **Pipeline**: Hybrid architecture (Phase 3)
- **Security**: Capability-based, no env value access
