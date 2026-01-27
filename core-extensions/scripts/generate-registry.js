#!/usr/bin/env node
/**
 * Auto-generates extension registry from manifest.json files
 * This script scans src/ for extension folders with manifest.json
 * and creates a registry that can be imported by the electron app
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SRC_DIR = path.join(__dirname, '../src');
const OUTPUT_FILE = path.join(__dirname, '../src/registry.ts');

function findExtensionManifests(dir) {
  const extensions = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    // Skip special directories
    if (entry.name === 'integrations') continue;

    const manifestPath = path.join(dir, entry.name, 'manifest.json');

    if (fs.existsSync(manifestPath)) {
      try {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

        // Add type: "core" to all core extensions
        manifest.type = 'core';

        extensions.push({
          folder: entry.name,
          manifest
        });
      } catch (error) {
        console.error(`✗ Error reading manifest in ${entry.name}:`, error.message);
      }
    }
  }

  // Sort by priority field (lower priority = loads first)
  // Extensions without priority will be sorted to the end
  extensions.sort((a, b) => {
    const priorityA = a.manifest.priority ?? 999;
    const priorityB = b.manifest.priority ?? 999;
    return priorityA - priorityB;
  });

  return extensions;
}

function generateRegistry(extensions) {
  const imports = extensions
    .map((ext, index) => `import ${ext.folder.replace(/-/g, '_')}Plugin from './${ext.folder}';`)
    .join('\n');

  const registry = extensions.map((ext) => ({
    ...ext.manifest,
    // Export field to map to the imported plugin
    _pluginExport: ext.folder.replace(/-/g, '_') + 'Plugin'
  }));

  // Generate metadata-only export (no plugin imports - safe for Electron main process)
  const metadataOnly = extensions.map(ext => ext.manifest);

  const registryCode = `/**
 * Auto-generated extension registry
 * DO NOT EDIT MANUALLY - run 'yarn generate-registry' to update
 * Generated on: ${new Date().toISOString()}
 */

export interface ExtensionMetadata {
  id: string;
  type: "core" | "community";
  name: string;
  description: string;
  author: string;
  version: string;
  enabled: boolean;
  priority?: number;
  readme: string;
  repo?: string;
  installedPath?: string;
  capabilities?: any;
  dependencies?: any;
  features?: string[];
}

// Metadata-only export for Electron main process (no React/DOM dependencies)
export const coreExtensions: ExtensionMetadata[] = ${JSON.stringify(metadataOnly, null, 2)};
`;

  // Generate plugins file with imports (for UI only)
  const pluginsCode = `/**
 * Auto-generated plugin map
 * DO NOT EDIT MANUALLY - run 'yarn generate-registry' to update
 * Generated on: ${new Date().toISOString()}
 */

${imports}

// Plugin map for UI app (has React/DOM access)
export const coreExtensionPlugins: Record<string, any> = {
${extensions.map(ext => `  '${ext.manifest.id}': ${ext.folder.replace(/-/g, '_')}Plugin`).join(',\n')}
};
`;

  return { registryCode, pluginsCode };
}

// Main execution
const extensions = findExtensionManifests(SRC_DIR);

const { registryCode, pluginsCode } = generateRegistry(extensions);

// Write metadata-only registry (safe for Node.js/Electron main)
fs.writeFileSync(OUTPUT_FILE, registryCode, 'utf8');

// Write plugins map (for browser/UI only)
const PLUGINS_FILE = path.join(__dirname, '../src/plugins.ts');
fs.writeFileSync(PLUGINS_FILE, pluginsCode, 'utf8');
