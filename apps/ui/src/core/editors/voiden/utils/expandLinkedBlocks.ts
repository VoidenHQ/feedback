import { JSONContent } from "@tiptap/core";
import { useBlockContentStore } from "@/core/stores/blockContentStore";

/**
 * Recursively expands linkedBlock nodes in editor JSON to their actual content.
 * This allows plugins to process linked blocks as if they were direct blocks.
 *
 * @param json - The editor JSON content (can be a single node or document)
 * @param depth - Current recursion depth (for safety)
 * @returns The JSON with all linkedBlocks expanded to their actual content
 */
export async function expandLinkedBlocks(
  json: JSONContent,
  depth: number = 0
): Promise<JSONContent> {
  // Safety check to prevent infinite recursion
  if (depth > 10) {
    // console.warn('[expandLinkedBlocks] Max recursion depth reached');
    return json;
  }

  // If this is a linkedBlock, resolve it to actual content
  if (json.type === 'linkedBlock') {
    const blockUid = json.attrs?.blockUid;
    const originalFile = json.attrs?.originalFile;

    if (!blockUid) {
      // console.warn('[expandLinkedBlocks] linkedBlock missing blockUid:', json);
      return json;
    }

    try {
      // Try to get from store first (faster)
      const store = useBlockContentStore.getState();
      let blockContent = store.blocks[blockUid];

      // If not in store, fetch it
      if (!blockContent && originalFile) {
        blockContent = await window.electron?.voiden.getBlockContent(originalFile, blockUid);

        // Cache it for future use
        if (blockContent) {
          store.setBlock(blockUid, blockContent);
        }
      }

      if (!blockContent) {
        // console.warn(`[expandLinkedBlocks] Could not resolve linkedBlock ${blockUid}`);
        return json;
      }

      // Recursively expand the block content first
      const expandedBlock = await expandLinkedBlocks(blockContent, depth + 1);

      // Mark the expanded block with importedFrom attribute to track its origin
      // This allows override logic to differentiate between imported and local blocks
      const result = {
        ...expandedBlock,
        attrs: {
          ...expandedBlock.attrs,
          importedFrom: originalFile,
        },
      };

      return result;
    } catch (error) {
      return json;
    }
  }

  // If this node has content array, recursively expand it
  if (json.content && Array.isArray(json.content)) {
    const expandedContent = await Promise.all(
      json.content.map(child => expandLinkedBlocks(child, depth + 1))
    );

    return {
      ...json,
      content: expandedContent,
    };
  }

  // No expansion needed
  return json;
}

/**
 * Expands all linkedBlocks in an editor document's content array.
 * This is the main entry point for processing editor JSON before passing to plugins.
 *
 * @param doc - The editor document JSON
 * @returns The document with all linkedBlocks expanded
 */
export async function expandLinkedBlocksInDoc(doc: JSONContent): Promise<JSONContent> {
  if (!doc.content || !Array.isArray(doc.content)) {
    return doc;
  }

  const startTime = performance.now();

  const expandedContent = await Promise.all(
    doc.content.map(node => expandLinkedBlocks(node))
  );

  const duration = performance.now() - startTime;

  return {
    ...doc,
    content: expandedContent,
  };
}
