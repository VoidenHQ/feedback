# How to Add a New Extension

Complete guide for creating extensions in Voiden.

> **Note:** This guide covers the auto-discovery system. Extensions are automatically found via `manifest.json` - no manual registration needed!

## Quick Start

```bash
# 1. Create extension folder
mkdir packages/core-extensions/src/my-extension

# 2. Add manifest.json
# 3. Create index.ts
# 4. Build and restart
yarn workspace @voiden/core-extensions build
```

That's it! Your extension auto-loads on next app start.

## Complete Guide

See the comprehensive guide at:
**[packages/core-extensions/HOW_TO_ADD_EXTENSION.md](../../packages/core-extensions/HOW_TO_ADD_EXTENSION.md)**

This location contains the full, detailed guide with:
- Step-by-step instructions
- Code templates
- SDK API reference
- Common patterns
- Troubleshooting

## Summary

Core Extensions are:
- 📦 **Self-contained** - All code in extension folder
- 🎨 **Theme-aware** - Use SDK to get theme
- 🔌 **SDK-powered** - Use SDK APIs, not app imports
- ✨ **Auto-discovered** - Just add manifest.json and build!
- 🔄 **Auto-synced** - Metadata syncs to user state on startup

**Full documentation:** [packages/core-extensions/HOW_TO_ADD_EXTENSION.md](../../packages/core-extensions/HOW_TO_ADD_EXTENSION.md)
