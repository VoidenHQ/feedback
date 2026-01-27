# Development Build

Guide for running Voiden in development mode.

## Prerequisites

Make sure you have completed the [Fresh Install](../getting-started/FRESH_INSTALL.md) steps first.

## Running the App

Start the development server:

```bash
yarn workspace voiden start
```

This will launch the Electron app with hot reload enabled for UI changes.

## Extension Development

To watch for changes in core extensions and automatically rebuild:

```bash
yarn workspace @voiden/core-extensions dev
```

This starts a watcher that monitors your extension files and rebuilds on every change, allowing for a faster development cycle.

## Recommended Workflow

For the best development experience, run both commands in separate terminals:

**Terminal 1** - Extension watcher:
```bash
yarn workspace @voiden/core-extensions dev
```

**Terminal 2** - App:
```bash
yarn workspace voiden start
```

This setup allows you to:
- Make changes to extensions and have them rebuild automatically
- See UI changes reflected immediately via hot reload
- Keep the app running while iterating on code
