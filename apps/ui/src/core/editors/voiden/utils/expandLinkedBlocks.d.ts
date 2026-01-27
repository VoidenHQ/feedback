import { JSONContent } from "@tiptap/core";
/**
 * Recursively expands linkedBlock nodes in editor JSON to their actual content.
 * This allows plugins to process linked blocks as if they were direct blocks.
 *
 * @param json - The editor JSON content (can be a single node or document)
 * @param depth - Current recursion depth (for safety)
 * @returns The JSON with all linkedBlocks expanded to their actual content
 */
export declare function expandLinkedBlocks(json: JSONContent, depth?: number): Promise<JSONContent>;
/**
 * Expands all linkedBlocks in an editor document's content array.
 * This is the main entry point for processing editor JSON before passing to plugins.
 *
 * @param doc - The editor document JSON
 * @returns The document with all linkedBlocks expanded
 */
export declare function expandLinkedBlocksInDoc(doc: JSONContent): Promise<JSONContent>;
//# sourceMappingURL=expandLinkedBlocks.d.ts.map