# Architecture Overview

Clean separation between core app infrastructure and extensions.

## High-Level Structure

```
void/
├── apps/
│   ├── electron/          # Electron main process
│   │   └── src/
│   │       ├── main/      # IPC handlers, window management
│   │       └── preload.ts # Expose APIs to renderer
│   │
│   └── ui/                # React renderer app
│       └── src/
│           ├── core/      # CORE INFRASTRUCTURE
│           │   └── request-engine/  # HTTP execution
│           └── plugins/   # EXTENSIONS
│
├── core-extensions/   # AUTO-DISCOVERED EXTENSIONS
│   └── src/
│       ├── hello-world/
│       └── md-preview/
```

## Core Principles

### 1. Core = Infrastructure

**What belongs in core:**
- Fundamental app features
- Performance-critical systems
- Security-sensitive operations
- Deep system integrations

**Examples:**
- `core/request-engine/` - HTTP requests (PRIMARY PURPOSE of app)
- `core/editor/` - TipTap/ProseMirror foundation
- `core/environment/` - Environment variable management
- `core/panels/` - Panel system

**Why these are core:**
- Request engine = Like an IDE's editor
- Editor = Foundation for all documents
- Environment = Security-sensitive credentials
- Panels = UI framework for everything

### 2. Extensions = Features

**What belongs in extensions:**
- Features built on top of core
- Protocol-specific UI (REST, GraphQL, etc.)
- Optional functionality
- User customizations

**Examples:**
- `voiden-rest-api/` - REST-specific editor nodes
- `md-preview/` - Markdown preview toggle
<!-- - `hello-world/` - Example slash commands -->

## Architecture Layers

### Layer 1: Electron (System Access)

```
apps/electron/
├── main/
│   ├── files/         # File system operations
│   ├── git/           # Git integration
│   ├── terminal/      # Terminal (node-pty)
│   └── extension/     # Extension management
└── preload.ts         # Expose APIs to renderer
```

**Responsibilities:**
- File system access
- Native dialogs
- Git operations
- Terminal emulation
- Extension loading

### Layer 2: Core App (Infrastructure)

```
apps/ui/src/core/
├── request-engine/    # HTTP request execution
│   ├── hooks/         # React hooks
│   ├── utils/         # Pure functions
│   └── components/    # UI components
├── editor/            # (future) Editor core
├── environment/       # (future) Env management
└── panels/            # (future) Panel system
```

**Responsibilities:**
- Request execution engine
- Editor foundation
- State management
- UI framework

### Layer 3: Extensions (Features)

```
packages/core-extensions/src/
├── voiden-rest-api/       # REST API 
├── md-preview/        # Markdown preview
└── (future extensions)
```

**Responsibilities:**
- Add editor nodes
- Add slash commands
- Add UI actions
- Add panels/sidebars

### Layer 4: SDK (Extension API)

The SDK (`@voiden/sdk`) is an external npm package that provides the extension API.

**Responsibilities:**
- Define extension APIs
- Provide type safety
- Abstract app internals

## Data Flow

### HTTP Request Flow

```
User Action (Click Send / Cmd+Enter)
    ↓
SendRequest Component (core/request-engine/components/SendRequest.tsx)
    ↓
useSendRequest Hook (core/request-engine/hooks/useSendRequest.ts)
    ↓
requestOrchestrator.executeRequest (core/request-engine/requestOrchestrator.ts)
    ├── Step 1: Build request through plugin handlers
    ├── Step 2: sendRequestHybrid (core/request-engine/sendRequestHybrid.ts)
    │       ├── UI Stage 1: Pre-processing hooks
    │       ├── UI Stage 2: Request compilation hooks
    │       ├── UI Stage 5: Pre-send hooks
    │       ├── Electron IPC (window.electron.request.sendSecure)
    │       │       ├── Stage 3: Env variable replacement
    │       │       ├── Stage 4: Auth injection
    │       │       ├── Stage 6: HTTP Request via Node.js
    │       │       └── Stage 7: Response extraction
    │       └── UI Stage 8: Post-processing hooks
    └── Step 3: Process response through plugin handlers
    ↓
React Query Cache
    ↓
UI Updates (responseStore)
```

### Extension Loading Flow

```
App Startup
    ↓
Electron: Load registry from @voiden/core-extensions
    ↓
Electron: Sync to user state (preserve enabled/disabled)
    ↓
UI: Import coreExtensionPlugins
    ↓
UI: Load each enabled extension
    ↓
Extension: onload() called with PluginContext
    ↓
Extension: Registers nodes/commands/actions
    ↓
Editor: Combines core + extension features
```

## Key Design Decisions

### Decision 1: Request Engine in Core

**Question:** Should sendRequest be in core or extension?

**Answer:** CORE ✅

**Reasoning:**
1. HTTP requests are the PRIMARY PURPOSE of Voiden
2. Deep integration with editor, environment, panels, electron
3. Performance-critical and security-sensitive
4. Foundation for other protocols (GraphQL, gRPC)

**Implementation:**
```
CORE (apps/ui/src/core/request-engine/)
└── HTTP execution engine
    ├── requestOrchestrator.ts  # Plugin handler orchestration
    ├── sendRequestHybrid.ts    # Hybrid pipeline execution
    └── pipeline/               # Hook registry & stages

EXTENSION (apps/ui/src/plugins/voiden-api/)
└── REST-specific UI
    ├── Method node
    ├── URL node
    └── Headers table
    └── USES core request engine via SDK hooks
```

### Request Orchestrator & Plugin Hooks

The request pipeline allows plugins to hook into different stages of request execution.

#### Two Hook Systems

**1. Request Orchestrator (High-level)**

Used via SDK's `PluginContext` for building requests and processing responses:

```typescript
// In your plugin's onload():
context.onBuildRequest(async (request, editor) => {
  // Called BEFORE request is sent
  // Modify or build the request object
  request.headers.push({ key: 'X-Custom', value: 'value', enabled: true });
  return request;
});

context.onProcessResponse(async (response) => {
  // Called AFTER response is received
  // Process, log, or react to the response
  console.log('Response status:', response.status);
});

context.registerResponseSection({
  name: 'my-section',
  order: 10,
  component: MyResponseComponent,
});
```

**2. Pipeline Hook Registry (Low-level)**

For fine-grained control at specific pipeline stages:

```typescript
import { hookRegistry, PipelineStage } from '@/core/request-engine/pipeline';

// Pre-processing: Validate or cancel request
hookRegistry.registerHook('my-extension', PipelineStage.PreProcessing, async (ctx) => {
  if (!ctx.requestState.url) {
    ctx.cancel(); // Abort the request
  }
}, 50); // priority: lower runs first

// Request compilation: Add data to request
hookRegistry.registerHook('my-extension', PipelineStage.RequestCompilation, async (ctx) => {
  ctx.addHeader('X-Timestamp', Date.now().toString());
  ctx.addQueryParam('source', 'voiden');
});

// Pre-send: Last modifications before sending
hookRegistry.registerHook('my-extension', PipelineStage.PreSend, async (ctx) => {
  ctx.metadata.startTime = performance.now();
});

// Post-processing: After response received
hookRegistry.registerHook('my-extension', PipelineStage.PostProcessing, async (ctx) => {
  const duration = performance.now() - ctx.metadata.startTime;
  console.log('Request took:', duration, 'ms');
});
```

#### Pipeline Stages

| Stage | Location | Extensible | Purpose |
|-------|----------|------------|---------|
| `PreProcessing` | UI | ✅ Yes | Validate, transform, cancel request |
| `RequestCompilation` | UI | ✅ Yes | Add headers, query params, build request |
| `EnvReplacement` | Electron | ❌ No | Replace `{{variables}}` (security) |
| `AuthInjection` | Electron | ❌ No | Add auth headers (security) |
| `PreSend` | UI | ✅ Yes | Final modifications, logging |
| `Sending` | Electron | ❌ No | Execute HTTP request |
| `ResponseExtraction` | Electron | ❌ No | Parse response |
| `PostProcessing` | UI | ✅ Yes | Cache, log, validate response |

#### Hook Context Types

```typescript
// PreProcessing
interface PreProcessingContext {
  editor: Editor;
  requestState: RestApiRequestState;
  cancel: () => void;  // Call to abort request
}

// RequestCompilation
interface RequestCompilationContext {
  editor: Editor;
  requestState: RestApiRequestState;
  addHeader: (key: string, value: string) => void;
  addQueryParam: (key: string, value: string) => void;
}

// PreSend
interface PreSendContext {
  requestState: RestApiRequestState;
  metadata: Record<string, any>;  // Share data between hooks
}

// PostProcessing
interface PostProcessingContext {
  requestState: RestApiRequestState;
  responseState: RestApiResponseState;
  metadata: Record<string, any>;
}
```

### Decision 2: Auto-Discovery for Extensions

**Question:** Manual registration or auto-discovery?

**Answer:** AUTO-DISCOVERY ✅

**Implementation:**
1. Each extension has `manifest.json`
2. Build script scans folders
3. Generates `registry.ts` and `plugins.ts`
4. Electron syncs to user state on startup

**Benefits:**
- Zero configuration
- Single source of truth
- Always in sync
- User preferences preserved

### Decision 3: Separate Registry for Node/Browser

**Question:** How to avoid "document is not defined" in Electron main?

**Answer:** Separate files

**Implementation:**
- `registry.ts` - Metadata only (Node-safe)
- `plugins.ts` - Plugin map with imports (browser-only)

Electron imports registry, UI imports plugins.

## Technology Stack

### UI (apps/ui)
- **React** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool (handles TS compilation)
- **TipTap** - Rich text editor (ProseMirror wrapper)
- **CodeMirror** - Code editor
- **Tanstack Query** - Data fetching
- **Tanstack Router** - Routing
- **Zustand** - State management
- **Radix UI** - Unstyled components
- **Tailwind** - Styling

### Electron (apps/electron)
- **Electron** - Desktop framework
- **simple-git** - Git operations
- **node-pty** - Terminal emulation

### Extensions (packages/*)
- **@voiden/sdk** - Extension API types (external npm package)
- **TypeScript** - Compilation

## File Organization

### ✅ Good Patterns

```
apps/ui/src/core/request-engine/hooks/useSendRequest.ts
packages/core-extensions/src/md-preview/index.ts
```

## Import Patterns

### ✅ Correct Imports

```typescript
// Core infrastructure
import { useSendRequest } from "@/core/request-engine";

// Extensions (auto-discovered)
import { coreExtensionPlugins } from "@voiden/core-extensions";

// SDK
import { PluginContext } from "@voiden/sdk/ui";
```

### ❌ Incorrect Imports

```typescript
// DON'T: Extensions importing app internals directly
import { something } from "@/internal/some-feature";

// DO: Use SDK
const theme = context.ui.getProseClasses();
```

## Extension Types

### 1. Core Extensions (Auto-discovered) ✅ Recommended
- **Location:** `packages/core-extensions/src/`
- **Discovery:** Auto via `manifest.json`
- **Dependencies:** SDK only
- **Examples:** `hello-world`, `md-preview`

### 2. App-integrated Extensions
- **Location:** `apps/ui/src/plugins/`
- **Registration:** Manual in `coreExtensions.ts`
- **Dependencies:** Can import from app
- **Example:** `voiden-wrapper-api-extension`

## Performance Considerations

### Core Code
- Optimized and bundled with app
- Always loaded
- Performance-critical

### Extensions
- Lazy-loaded when needed (future)
- Can be disabled
- Lower priority

### Vite Caching
- Aggressive caching for fast dev
- Clear cache when packages change:
  ```bash
  rm -rf apps/ui/node_modules/.vite
  ```

## Security Considerations

### Electron IPC
- Context isolation enabled
- Preload script exposes limited API
- No direct node access from renderer

### Extensions
- SDK provides controlled access
- No file system access (must use SDK)
- No process spawning
- Sandbox in future versions

### Request Engine
- Handles auth tokens securely
- Environment variables isolated
- Credential storage encrypted

## Testing Strategy

### Core
- Unit tests for utilities
- Integration tests for flows
- E2E tests for critical paths

### Extensions
- Unit tests (isolated)
- Easy to mock SDK
- Test independently

## Future Architecture Plans

### Short Term
1. Add more SDK APIs
2. Improve extension hot-reload

### Long Term
1. Extension marketplace
2. Extension sandboxing
3. Plugin versioning system
4. Extension analytics

## Summary

Voiden's architecture follows these principles:

1. **Core = Infrastructure** - Fundamental features in `core/`
2. **Extensions = Features** - Optional functionality in `packages/core-extensions/`
3. **Auto-Discovery** - Extensions found via `manifest.json`
4. **Type Safety** - TypeScript throughout
5. **Performance** - Optimized core, lazy-loaded extensions

The architecture is designed to be:
- ✅ **Maintainable** - Clear separation of concerns
- ✅ **Extensible** - Easy to add features
- ✅ **Performant** - Core optimized, extensions optional
- ✅ **Secure** - Controlled API access
- ✅ **Developer-Friendly** - Clear patterns, good docs
