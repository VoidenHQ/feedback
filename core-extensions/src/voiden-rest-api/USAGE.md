# Voiden REST API Extension - Usage Guide

## Overview

The Voiden REST API extension now uses the new `api` block type (instead of `request`) with full markdown serialization and request population support.

## Block Type: `api`

### Structure

```typescript
{
  type: "api",
  content: [
    { type: "method", content: [{ type: "text", text: "GET" }] },
    { type: "url", content: [{ type: "text", text: "https://api.example.com" }] }
  ]
}
```

### Slash Command

Type `/api` in the editor to insert:
- HTTP method selector (GET by default)
- URL input field (https:// by default)

## Markdown Serialization

The `api` block is automatically serialized to markdown using the fallback YAML serializer:

```markdown
```void
---
type: api
content:
  - type: method
    content:
      - type: text
        text: GET
  - type: url
    content:
      - type: text
        text: https://api.example.com/users
---
```
```

## Request Population

### Usage

```typescript
import { getRequestFromEditor, populateRequestState } from '@voiden/core-extensions/voiden-rest-api';

// Get simple request object
const request = getRequestFromEditor(editor);
// Returns: { method: 'GET', url: 'https://...', headers: [], ... }

// Get full request state (matches SDK RestApiRequestState)
const requestState = populateRequestState(editor);
// Returns: { method, url, headers: [{key, value, enabled}], ... }
```

### What Gets Extracted

Currently extracts:
- ✅ **Method** - From `method` node text content
- ✅ **URL** - From `url` node text content
- ⏳ **Headers** - Ready for implementation (from `headers-table` node)
- ⏳ **Query Params** - Ready for implementation (from `query-table` node)
- ⏳ **Path Params** - Ready for implementation (from `path-table` node)
- ⏳ **Body** - Ready for implementation (from `json_body` node)

### Request Object Structure

```typescript
{
  method: string;           // "GET", "POST", etc.
  url: string;             // Full URL
  headers: Array<{         // Header key-value pairs
    key: string;
    value: string;
    enabled: boolean;
  }>;
  queryParams: Array<{     // Query parameters
    key: string;
    value: string;
    enabled: boolean;
  }>;
  pathParams: Array<{      // Path parameters
    key: string;
    value: string;
    enabled: boolean;
  }>;
  body?: string;           // Request body
  contentType?: string;    // Content-Type header
  metadata: {
    source: 'voiden-rest-api'
  }
}
```

## Example Usage

### 1. Insert API Request

```typescript
// User types /api
// Extension inserts:
{
  type: "api",
  content: [
    { type: "method", content: [{ type: "text", text: "GET" }] },
    { type: "url", content: [{ type: "text", text: "https://" }] }
  ]
}
```

### 2. User Edits Content

User changes:
- Method to `POST`
- URL to `https://api.example.com/users`

### 3. Extract Request

```typescript
const requestState = populateRequestState(editor);
console.log(requestState);
// {
//   method: "POST",
//   url: "https://api.example.com/users",
//   headers: [],
//   queryParams: [],
//   pathParams: [],
//   body: undefined,
//   contentType: undefined,
//   metadata: { source: 'voiden-rest-api' }
// }
```

### 4. Save to Markdown

When saved, the editor content is automatically converted to markdown:

```markdown
---
version: 1.0.0
generatedBy: Voiden app
---

```void
---
type: api
content:
  - type: method
    content:
      - type: text
        text: POST
  - type: url
    content:
      - type: text
        text: https://api.example.com/users
---
```
```

## Next Steps

To add more fields (headers, query params, body):

1. Import the table nodes in `plugin.ts`
2. Update `getRequestFromEditor()` to extract from those nodes
3. Add slash commands for those block types

Example:
```typescript
// Find headers table
const headersTable = json.content.find(node => node.type === 'headers-table');
// Extract rows and populate headers array
```
