# Core vs Extensions Philosophy

Understanding the design philosophy behind Voiden's architecture.

## The Question

When building features, how do we decide whether something belongs in:
- **Core** (`apps/ui/src/core/`)
- **Extensions** (`packages/core-extensions/`)

## The Answer

### Core = Infrastructure

**Core** contains the fundamental infrastructure that makes Voiden work.

**Ask yourself:**
- Is this feature fundamental to the app's purpose?
- Does it require deep integration with multiple systems?
- Is it performance-critical or security-sensitive?
- Would the app be incomplete without it?

**If YES → It's Core**

**Examples:**
- `core/request-engine/` - HTTP execution (PRIMARY PURPOSE of the app)
- `core/editor/` - TipTap/ProseMirror foundation
- `core/environment/` - Environment variable management
- `core/panels/` - Panel system framework

### Extensions = Features

**Extensions** are features built ON TOP of the core infrastructure.

**Ask yourself:**
- Is this protocol-specific or format-specific?
- Can users choose to enable/disable it?
- Does it enhance existing functionality rather than provide it?
- Is it self-contained?

**If YES → It's an Extension**

**Examples:**
- `voiden-rest-api/` - REST-specific UI (method nodes, headers tables)
- `md-preview/` - Markdown preview toggle
<!-- - `hello-world/` - Example slash commands -->
- (future) `voiden-graphql/` - GraphQL

## Real-World Example: Request Engine

### The Design Decision

**Question:** Should HTTP request execution be in core or extension?

**Analysis:**
```
What is Voiden?
└── An API development tool

What's the primary purpose?
└── Making HTTP requests

Is it fundamental?
└── YES - it's like the editor in an IDE

Can users disable it?
└── NO - the app wouldn't work

Does it need deep integration?
└── YES - editor, environment, panels, electron

Is it security-sensitive?
└── YES - handles auth tokens, credentials
```

**Answer:** CORE ✅

### The Implementation

```
CORE (apps/ui/src/core/request-engine/)
├── HTTP request execution engine
├── sendRequest() - Actual HTTP calls
├── getRequest() - Parse editor to request
├── Environment variable substitution
└── Response handling

EXTENSION (apps/ui/src/plugins/voiden-api/)
├── REST-specific UI components
├── Method node (GET, POST, etc.)
├── URL node
├── Headers table
├── Query params table
└── USES the core request engine
```

**Why this separation:**
- Core handles the "how" (execute HTTP)
- Extension handles the "what" (REST-specific UI)
- Other protocols (GraphQL, gRPC) can build on same core

## Design Patterns

### Pattern 1: Core Provides Engine, Extensions Provide UI

```
CORE: Generic execution engine
└── sendRequest(url, method, headers, body)

EXTENSION: REST-specific UI
└── REST nodes (method, headers, body editors)
└── Calls core.sendRequest()

FUTURE EXTENSION: GraphQL UI
└── GraphQL nodes (query editor, variables)
└── Transforms to HTTP, calls core.sendRequest()

FUTURE EXTENSION: gRPC UI
└── gRPC nodes (service, method picker)
└── Transforms to gRPC call
```

### Pattern 2: Core Provides APIs, Extensions Consume

```
CORE: Theme system
└── Manages app theme (light/dark)
└── Exposes via SDK: context.ui.getProseClasses()

EXTENSION: Markdown Preview
└── Consumes theme: const theme = context.ui.getProseClasses()
└── Applies to preview rendering
```

### Pattern 3: Core Manages State, Extensions Read

```
CORE: Environment management
└── Stores credentials securely
└── Provides via SDK: context.environment.get()

EXTENSION: API client
└── Reads environment: const token = context.environment.get('TOKEN')
└── Uses in requests
```

## Architectural Benefits

### For Core

✅ **Focused** - Only fundamental features
✅ **Optimized** - Performance-critical code
✅ **Secured** - Sensitive operations controlled
✅ **Stable** - Less frequent changes
✅ **Tested** - Critical paths covered

### For Extensions

✅ **Modular** - Self-contained features
✅ **Optional** - Users can disable
✅ **Extensible** - Easy to add new ones
✅ **Isolated** - Failures don't crash app
✅ **Testable** - Easy to test independently

## Decision Framework

Use this framework to decide where code belongs:

### 1. Purpose Test

**Q:** Is this fundamental to Voiden's purpose?

| Feature | Answer | Location |
|---------|--------|----------|
| HTTP request execution | Yes - it's THE purpose | Core |
| REST UI nodes | No - it's ONE way to make requests | Extension |
| Editor foundation | Yes - documents are core | Core |
| Markdown preview | No - it's ONE file type | Extension |

### 2. Integration Test

**Q:** Does it need deep integration with multiple systems?

| Feature | Dependencies | Location |
|---------|--------------|----------|
| Request engine | Editor, Environment, Panels, Electron | Core |
| Markdown preview | Just editor + theme | Extension |
| Environment system | Storage, Security, IPC | Core |
| Slash commands | Just editor API | Extension |

### 3. Security Test

**Q:** Does it handle sensitive data?

| Feature | Sensitivity | Location |
|---------|-------------|----------|
| Environment variables | High - credentials | Core |
| Request execution | High - auth tokens | Core |
| UI components | Low - just display | Extension |
| Preview rendering | Low - just formatting | Extension |

### 4. Performance Test

**Q:** Is it performance-critical?

| Feature | Performance | Location |
|---------|-------------|----------|
| Editor core | Critical - typing lag bad | Core |
| Request execution | Critical - users wait | Core |
| Syntax highlighting | Important but isolated | Extension |
| UI enhancements | Nice to have | Extension |


## Anti-Patterns

### ❌ Don't: Extension with Core Responsibilities

```typescript
// BAD: Extension trying to manage credentials
const myExtension = (context) => ({
  onload: () => {
    // DON'T manage sensitive data in extensions
    localStorage.setItem('api-key', '...');
  }
});

// GOOD: Extension using core's credential system
const myExtension = (context) => ({
  onload: () => {
    // DO use SDK to get credentials
    const apiKey = context.environment.get('API_KEY');
  }
});
```

### ❌ Don't: Core with Extension-Specific Logic

```typescript
// BAD: Core request engine with REST-specific UI
function sendRequest(request) {
  // Core logic ✅
  const response = await fetch(request.url);

  // REST-specific UI ❌
  showRestMethodBadge(request.method);
  return response;
}

// GOOD: Separate concerns
// Core: Generic execution
function sendRequest(request) {
  return await fetch(request.url);
}

// Extension: REST UI
const restExtension = (context) => ({
  onload: () => {
    context.registerEditorAction({
      component: MethodBadge, // REST-specific UI
    });
  }
});
```

## Summary

**Core Infrastructure:**
- Fundamental to app purpose
- Deep system integration
- Performance/security critical
- Location: `apps/ui/src/core/`

**Extensions (Features):**
- Built on top of core
- Protocol/format-specific
- Self-contained via SDK
- Location: `packages/core-extensions/`

**The Result:**
- ✅ Clean architecture
- ✅ Clear boundaries
- ✅ Easy to extend
- ✅ Easy to maintain
- ✅ Easy to understand

**Further Reading:**
- [Architecture Overview](OVERVIEW.md)
- [Extension Development](../extensions/HOW_TO_ADD.md)
