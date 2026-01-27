# Request Engine

Core HTTP request execution system for Voiden.

## ⚠️ Important

**This is CORE APP INFRASTRUCTURE** - not an extension!

The request engine handles the fundamental HTTP request/response cycle that powers Voiden. It should remain in the core app because:

- It's the primary purpose of the application (like an IDE's editor)
- Requires deep integration with editor, environment, and panel systems
- Performance-critical and security-sensitive
- Extensions build ON TOP of this infrastructure

## Structure

```
core/request-engine/
├── hooks/                    # React hooks for request operations
│   ├── index.ts             # Centralized exports
│   ├── useSendRequest.ts    # HTTP request execution
│   ├── useGetRequest.ts     # Request data retrieval
│   └── useRequestMutation.ts # DB mutations
├── utils/                    # Utility functions
│   └── nodeProcessing.ts    # File & block resolution
├── components/               # UI components
│   └── SendRequest.tsx      # Send button component
├── requestState.ts          # Core sendRequest function
├── getRequestFromJson.ts    # Request parsing from editor
├── index.ts                 # Public API
└── README.md                # This file
```

## Usage

### Sending Requests

```typescript
import { useSendRequest } from "@/core/request-engine/hooks";

const { refetch, isFetching, cancelRequest } = useSendRequest(editor);

// Send request
refetch();

// Cancel ongoing request
cancelRequest();
```

### Getting Request Data

```typescript
import { useGetRequest } from "@/core/request-engine/hooks";

const { data: request } = useGetRequest();
```

### Request Mutations

```typescript
import { useSetRequest, useAddRequestToDb } from "@/core/request-engine/hooks";

// Build request from editor
const { data: requestData } = useSetRequest(editor);

// Save to database
const { mutate: addToDb } = useAddRequestToDb();
addToDb(payload);
```

### UI Component

```typescript
import { SendRequest } from "@/core/request-engine/components/SendRequest";

<SendRequest editor={editor} />
```

## Migration from v2

All v2 request APIs have been migrated to core. Use the following imports:

```typescript
import { useSendRequest, sendRequest, getRequest } from "@/core/request-engine";
```

## Key Features

### Node Processing (`utils/nodeProcessing.ts`)
- **File Link Resolution**: Converts file references to actual file data
- **Linked Block Resolution**: Resolves block references with caching
- **Recursive Processing**: Handles nested document structures

### Request Execution (`hooks/useSendRequest.ts`)
- **Abort Support**: Can cancel ongoing requests
- **Environment Integration**: Uses active environment variables
- **Response Panel Integration**: Auto-opens panel on send
- **Error Handling**: Proper error messages and logging

### Request Retrieval (`hooks/useGetRequest.ts`)
- **Cache-First**: Retrieves from React Query cache
- **Type-Safe**: Proper TypeScript types
- **Auto-Enabled**: Enabled when document is active

## Architecture Benefits

✅ **Separation of Concerns**: Hooks, utils, and components are clearly separated
✅ **Testability**: Each module can be tested independently
✅ **Reusability**: Hooks and utilities can be used across components
✅ **Maintainability**: Clear structure makes code easier to understand
✅ **Type Safety**: Full TypeScript support throughout
✅ **Core Infrastructure**: Clearly positioned as fundamental app functionality

## Relationship with Extensions

```
Core App (apps/ui/src/core/request-engine/)
└── Provides: HTTP request execution engine

Extensions (apps/ui/src/plugins/voiden-api/)
└── Provides: REST-specific editor nodes and UI
└── Uses: The core request engine

Future Extensions (packages/core-extensions/src/)
└── api-clients/graphql-client/    # GraphQL requests
└── api-clients/grpc-client/       # gRPC requests
└── All use the core request engine
```

## Pipeline Architecture

The request engine now uses a **pipeline-based architecture** for executing requests. This provides:

- ✅ **Extension Hooks**: Extensions can hook into any stage of request execution
- ✅ **Capability-Based Security**: Extensions never see environment variables or auth tokens
- ✅ **Composability**: Multiple extensions can contribute to the same request
- ✅ **Testability**: Each pipeline stage can be tested independently

### Pipeline Stages

1. **Pre-Processing**: Validate before compilation
2. **Request Compilation**: Collect data from editor nodes
3. **Env Replacement**: Replace {{variables}} (platform only)
4. **Auth Injection**: Add authentication (platform only)
5. **Pre-Send**: Final modifications
6. **Sending**: Execute HTTP request (platform only)
7. **Response Extraction**: Parse response (platform only)
8. **Post-Processing**: Cache, log, validate

### Usage

```typescript
import { PipelineExecutor, hookRegistry, PipelineStage } from '@/core/request-engine/pipeline';

// Register a hook
hookRegistry.registerHook('my-extension', PipelineStage.PreProcessing, async (context) => {
  // Validate request
  if (!context.requestState.url) {
    context.cancel();
  }
});

// Execute pipeline
const executor = new PipelineExecutor(editor, environment, electron);
const result = await executor.execute();
```

## Future Improvements

- [ ] Add unit tests for pipeline stages
- [ ] Add unit tests for hook system
- [ ] Add unit tests for node processing utilities
- [ ] Add request retry logic
- [ ] Add request timeout configuration
- [ ] Support for streaming responses
- [ ] Integrate with existing sendRequest function
