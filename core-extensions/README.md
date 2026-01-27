# @voiden/core-extensions

Core extensions bundled with Voiden.

## Extensions

### REST API
HTTP/REST API testing blocks and slash commands.

### Markdown
Basic markdown formatting blocks.

## Usage

```typescript
import { RestAPIPlugin } from '@voiden/core-extensions/rest-api';

// Use in your app
const plugin = RestAPIPlugin(context);
plugin.onload(context);
```

## Development

This package contains the core extensions that ship with Voiden. These are built using `@voiden/sdk` but are bundled with the app rather than loaded dynamically.
