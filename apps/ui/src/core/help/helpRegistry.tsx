/**
 * Global Help Content Registry
 *
 * This registry maps block names to their help content components.
 * It's used by the Command Palette to show "Help: <BlockName>" commands.
 */

import React from 'react';

export interface HelpEntry {
  id: string;
  title: string;
  keywords: string[]; // For better fuzzy search
  content: React.ReactNode;
}

const helpRegistry = new Map<string, HelpEntry>();

/**
 * Register help content for a block/feature
 */
export function registerHelpContent(entry: HelpEntry) {
  helpRegistry.set(entry.id, entry);
}

/**
 * Get help content by ID
 */
export function getHelpContent(id: string): HelpEntry | undefined {
  return helpRegistry.get(id);
}

/**
 * Get all registered help entries
 */
export function getAllHelpEntries(): HelpEntry[] {
  return Array.from(helpRegistry.values());
}

/**
 * Clear all help entries (used for plugin reload)
 */
export function clearHelpRegistry() {
  helpRegistry.clear();
}
