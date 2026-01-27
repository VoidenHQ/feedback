import { Extension } from '@tiptap/core';

/**
 * Extension that preserves unknown nodes during JSON round-trips
 * This ensures that when plugins are disabled, their data is not lost
 */
export const DocumentPreserver = Extension.create({
  name: 'documentPreserver',

  // Override the editor's JSON handling AFTER editor is created
  onCreate() {
    const { editor } = this;

    // Store the original getJSON method
    const originalGetJSON = editor.getJSON.bind(editor);

    // Intercept getJSON to restore original data for placeholder nodes
    editor.getJSON = () => {
      const json = originalGetJSON();
      return restoreOriginalNodes(json, editor.schema);
    };
  },
});

/**
 * Recursively restore original node data for placeholder nodes
 */
function restoreOriginalNodes(node: any, schema: any): any {
  if (!node || typeof node !== 'object') return node;

  // If this node has preserved data, return the original
  if (node.attrs && node.attrs.__preserved) {
    return node.attrs.__preserved;
  }

  // Recursively process content
  if (node.content && Array.isArray(node.content)) {
    return {
      ...node,
      content: node.content.map((child: any) => restoreOriginalNodes(child, schema)),
    };
  }

  return node;
}

/**
 * When loading JSON, wrap unknown nodes with preservation data
 */
export function preserveUnknownNodesInJSON(json: any, schema: any): any {
  if (!json || typeof json !== 'object') return json;

  // Check if this node type exists in the schema
  if (json.type && !schema.nodes[json.type]) {
    // Unknown node - wrap it for preservation
    return {
      type: json.type,  // Keep the type name (placeholder will handle it)
      attrs: {
        __preserved: json,  // Store the entire original node
      },
    };
  }

  // Recursively process content
  if (json.content && Array.isArray(json.content)) {
    return {
      ...json,
      content: json.content.map((child: any) => preserveUnknownNodesInJSON(child, schema)),
    };
  }

  return json;
}
