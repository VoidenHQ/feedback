/**
 * Hook to access voiden-api plugin helpers
 * Since we can't pass context directly to React components,
 * we need to access the exposed helpers through the plugin store
 */

// Define the type for voiden-api helpers
export interface VoidenApiHelpers {
  createMethodNode: (method: string) => any;
  createUrlNode: (url: string) => any;
  createHeadersTableNode: (headers: [string, string][]) => any;
  createJsonBodyNode: (body: string, contentType: string) => any;
  createMultipartTableNode: (formData: [string, string][]) => any;
  createQueryTableNode: (params: [string, string][]) => any;
  convertToVoidMarkdown: (jsonContent: any) => Promise<string>;
  convertBlocksToVoidFile: (title: string, blocks: any[]) => string;
  insertParagraphAfterRequestBlocks: (content: any[]) => any[];
}

/**
 * Get voiden-api helpers from the global window object
 * The plugin system exposes this through window.__voidenHelpers__
 */
export function getVoidenApiHelpers(): VoidenApiHelpers {
  // Access exposed helpers from window (set by plugins.tsx)
  const helpers = (window as any).__voidenHelpers__?.['voiden-wrapper-api-extension'];

  if (!helpers) {
    throw new Error(
      'Voiden API helpers not found. Make sure voiden-wrapper-api-extension is loaded before postman-import.'
    );
  }

  return helpers;
}
