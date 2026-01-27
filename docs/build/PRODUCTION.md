# Production Build

Guide for building Voiden for distribution.

## Prerequisites

- Complete all [Fresh Install](../getting-started/FRESH_INSTALL.md) steps
- Build all packages first:
  ```bash
  yarn workspace @voiden/core-extensions build
  ```

## Building the App

Navigate to the Electron app directory:

```bash
cd apps/electron
```

### macOS (Apple Silicon)

```bash
yarn make --arch=arm64
```

### macOS (Intel)

```bash
yarn make --arch=x64
```

### Windows

```bash
yarn make
```

### Linux

```bash
yarn make
```

## Build Output

The distributable files will be located in:

```
apps/electron/out/make/
```

## Platform Limitations

> **Important**: Builds are platform-dependent. You can only build for the OS you are currently running on.

| Building On | Can Build For |
|-------------|---------------|
| macOS       | macOS only    |
| Windows     | Windows only  |
| Linux       | Linux only    |

Cross-platform builds are not supported. To build for multiple platforms, you need to run the build process on each respective operating system.

## Publishing

To publish to S3 (requires credentials):

```bash
cd apps/electron
yarn make:publish
```
