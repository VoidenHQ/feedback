/**
 * Voiden Advanced Authentication Extension
 *
 * Entry point for the advanced authentication extension
 */

export { createAuthNode, AuthNode } from './nodes/AuthNode';
export { default as createAdvancedAuthPlugin } from './plugin';

// Default export for plugin loading
export { default } from './plugin';
