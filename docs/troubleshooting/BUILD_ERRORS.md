# Build Errors

Common build errors and their solutions.

## Windows: node-pty Build Failure

### Problem

During a fresh install or build on Windows, the `node-pty` package may fail to compile with an error related to `win_delay_load_hook.cc`.

### Solution

1. **Locate the file**: 

    The build error log in your terminal will provide the path to `win_delay_load_hook.cc`. It will be inside your `node_modules` directory, typically at:
   ```
   node_modules/node-gyp/src/win_delay_load_hook.cc
   ```

2. **Edit the file**: 
    
    Open `win_delay_load_hook.cc` and find:
   ```cpp
   GetModuleHandle
   ```

   Replace it with:
   ```cpp
   GetModuleHandleA
   ```

3. **Rebuild (do NOT reinstall)**: Run the following command:
   ```bash
   yarn rebuild
   ```

   > **Important**: Do not run `yarn install` as it will replace the modified `node_modules` and revert your changes.

4. **Continue with the build**: After the rebuild succeeds, continue with the normal build process:
   ```bash
   yarn workspace @voiden/core-extensions build

   # Start the Electron app in development mode
   cd apps/electron && yarn start
   ```

### Why This Happens

This is a compatibility issue with certain versions of node-gyp on Windows where the `GetModuleHandle` function needs to explicitly use the ANSI version (`GetModuleHandleA`) for proper compilation.
