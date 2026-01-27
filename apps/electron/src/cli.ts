#!/usr/bin/env node

/**
 * Voiden CLI
 *
 * This script handles command-line invocations of Voiden, similar to how VS Code's `code` command works.
 * It processes arguments and either launches the app or communicates with an existing instance.
 */

import { app } from "electron";
import path from "node:path";
import fs from "node:fs";

// Parse command-line arguments
const args = process.argv.slice(2);

interface CliOptions {
  pathsToOpen: string[];
  newWindow: boolean;
  help: boolean;
  version: boolean;
}

function parseArguments(args: string[]): CliOptions {
  const options: CliOptions = {
    pathsToOpen: [],
    newWindow: false,
    help: false,
    version: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "-h" || arg === "--help") {
      options.help = true;
    } else if (arg === "-v" || arg === "--version") {
      options.version = true;
    } else if (arg === "-n" || arg === "--new-window") {
      options.newWindow = true;
    } else if (!arg.startsWith("-")) {
      // It's a path argument
      const resolvedPath = path.resolve(process.cwd(), arg);
      options.pathsToOpen.push(resolvedPath);
    }
  }

  return options;
}

function printHelp() {
  console.log(`
Voiden - API Development Tool

Usage: voiden [options] [paths...]

Options:
  -h, --help         Show this help message
  -v, --version      Show version number
  -n, --new-window   Force a new window

Examples:
  voiden                        Open Voiden
  voiden file.void              Open a specific file
  voiden /path/to/project       Open a folder
  voiden file1.void file2.void  Open multiple files
`);
}

function printVersion() {
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(__dirname, "../package.json"), "utf-8")
  );
  console.log(`Voiden version ${packageJson.version}`);
}

// Main CLI logic
async function main() {
  const options = parseArguments(args);

  if (options.help) {
    printHelp();
    process.exit(0);
  }

  if (options.version) {
    printVersion();
    process.exit(0);
  }

  // Store the paths and options in environment variables or a temporary location
  // so the main app can pick them up
  if (options.pathsToOpen.length > 0) {
    // We'll pass these to the main process through app.commandLine or environment
    process.env.VOIDEN_CLI_PATHS = JSON.stringify(options.pathsToOpen);
    process.env.VOIDEN_CLI_NEW_WINDOW = options.newWindow ? "true" : "false";
  }

  // Exit with success - the actual app will handle opening files
  process.exit(0);
}

// Only run if this is the main module
if (require.main === module) {
  main().catch((error) => {
    console.error("Error:", error.message);
    process.exit(1);
  });
}

export { parseArguments, CliOptions };
