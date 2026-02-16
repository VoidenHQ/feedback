/**
 * Self-contained markdown parser for the preview extension
 *
 * This is a complete copy of the working markdown parser from the Voiden editor.
 * It uses the unified/remark ecosystem for robust markdown parsing.
 */

import { defaultMarkdownParser } from "prosemirror-markdown";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkStringify from "remark-stringify";
import { JSONContent } from "@tiptap/core";

const EMPTY_LINE_MARKER = "%%EMPTY_LINE%%";

/**
 * Strip YAML frontmatter from markdown
 */
function stripFrontmatter(markdown: string): string {
  if (markdown.startsWith("---")) {
    const parts = markdown.split("---");
    if (parts.length >= 3) {
      return parts.slice(2).join("---").trimStart();
    }
  }
  return markdown;
}

/**
 * Helper: convert snake_case node names to camelCase
 */
const convertNodeNames = (node: any): any => {
  const snakeToCamel = (s: string) => s.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  if (node.type) {
    node.type = snakeToCamel(node.type);
  }
  if (node.content && Array.isArray(node.content)) {
    node.content = node.content.map(convertNodeNames);
  }
  return node;
};

/**
 * Helper function to fix mark types from prosemirror-markdown to TipTap schema
 * Converts 'em' -> 'italic' and 'strong' -> 'bold'
 */
function fixMarkTypes(content: any[]): any[] {
  if (!content || !Array.isArray(content)) return content;

  return content.map((node) => {
    if (!node) return node;

    // Fix marks on this node
    if (node.marks && Array.isArray(node.marks)) {
      node.marks = node.marks.map((mark: any) => {
        if (mark.type === 'em') {
          return { ...mark, type: 'italic' };
        } else if (mark.type === 'strong') {
          return { ...mark, type: 'bold' };
        }
        return mark;
      });
    }

    // Recursively fix marks in child content
    if (node.content && Array.isArray(node.content)) {
      node.content = fixMarkTypes(node.content);
    }

    return node;
  });
}

/**
 * Insert markers for extra blank lines
 */
function insertEmptyLineMarkers(markdown: string) {
  const lines = markdown.split(/\r?\n/);
  const resultLines: string[] = [];
  let previousWasEmpty = false;
  let inFencedBlock = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (/^```/.test(trimmed)) {
      inFencedBlock = !inFencedBlock;
      resultLines.push(line);
      previousWasEmpty = false;
      continue;
    }

    if (inFencedBlock) {
      resultLines.push(line);
      previousWasEmpty = false;
      continue;
    }

    if (line.trim() === "") {
      if (previousWasEmpty) {
        resultLines.push("%%EMPTY_LINE%%");
      } else {
        resultLines.push("");
      }
      previousWasEmpty = true;
    } else {
      resultLines.push(line);
      previousWasEmpty = false;
    }
  }
  return resultLines.join("\n");
}

/**
 * Apply mark recursively to content
 */
function applyMarkRecursively(node: JSONContent, markType: string, schema?: any, definitions?: Record<string, { url: string; title?: string }>): JSONContent[] {
  const children = node.children?.flatMap((child: any) => convertMdastNode(child, schema, definitions)) || [];

  // Check if the mark type exists in the schema
  const markExists = !schema || schema.marks[markType];

  return children
    .filter((child: JSONContent) => child !== null && child !== undefined)
    .map((child: JSONContent) => {
      if (child.type === "text") {
        if (!child.text || child.text === "") return null;
        return {
          ...child,
          marks: markExists ? [...(child.marks || []), { type: markType }] : (child.marks || []),
        };
      } else if (child.content && Array.isArray(child.content)) {
        return {
          ...child,
          content: child.content
            .filter((c: JSONContent) => c !== null && c !== undefined)
            .map((c: JSONContent) => {
              if (c.type === "text") {
                if (!c.text || c.text === "") return null;
                return {
                  ...c,
                  marks: markExists ? [...(c.marks || []), { type: markType }] : (c.marks || []),
                };
              }
              return c;
            })
            .filter(Boolean),
        };
      } else {
        return child;
      }
    })
    .filter(Boolean);
}

/**
 * Convert mdast node to ProseMirror JSON
 */
const convertMdastNode = (node: any, schema?: any, definitions?: Record<string, { url: string; title?: string }>): JSONContent | JSONContent[] | null => {
  switch (node.type) {
    case "heading":
      return {
        type: "heading",
        attrs: {
          level: node.depth,
        },
        content: node.children.flatMap((child: any) => convertMdastNode(child, schema, definitions)).filter(Boolean),
      };
    case "blockquote":
      return {
        type: "blockquote",
        content: node.children.flatMap((child: any) => convertMdastNode(child, schema, definitions)).filter(Boolean),
      };
    case "table":
      return {
        type: "table",
        content: node.children.flatMap((child: any) => convertMdastNode(child, schema, definitions)).filter(Boolean),
      };
    case "tableRow":
      return {
        type: "tableRow",
        content: node.children.flatMap((child: any) => convertMdastNode(child, schema, definitions)).filter(Boolean),
      };
    case "tableCell":
    case "tableHeader": {
      const cellContent =
        node.children && node.children.length
          ? node.children[0].type === "paragraph"
            ? node.children.flatMap((child: any) => convertMdastNode(child, schema, definitions)).filter(Boolean)
            : [
                {
                  type: "paragraph",
                  content: node.children.flatMap((child: any) => convertMdastNode(child, schema, definitions)).filter(Boolean),
                },
              ]
          : [
              {
                type: "paragraph",
                content: [],
              },
            ];
      return {
        type: "tableCell",
        attrs: { colspan: 1, rowspan: 1, colwidth: null },
        content: cellContent,
      };
    }
    case "paragraph":
      return {
        type: "paragraph",
        content: node.children.flatMap((child: any) => convertMdastNode(child, schema, definitions)).filter(Boolean),
      };
    case "listItem":
      return {
        type: "listItem",
        content: node.children.flatMap((child: any) => convertMdastNode(child, schema, definitions)).filter(Boolean),
      };
    case "list":
      return {
        type: node.ordered ? "orderedList" : "bulletList",
        content: node.children.flatMap((child: any) => convertMdastNode(child, schema, definitions)).filter(Boolean),
      };
    case "text":
      // Don't create empty text nodes
      if (!node.value || node.value === "") return null;
      return {
        type: "text",
        text: node.value,
      };
    case "link": {
      const text = node.children?.map((child: any) => child.value || "").join("") || "";
      // Don't create empty text nodes
      if (!text || text === "") return null;
      return {
        type: "text",
        text,
        marks: [
          {
            type: "link",
            attrs: {
              href: node.url,
              target: "_blank",
              rel: "noopener noreferrer nofollow",
              class: null,
            },
          },
        ],
      };
    }
    case "linkReference": {
      if (definitions && definitions[node.identifier]) {
        const def = definitions[node.identifier];
        const children = node.children?.flatMap((child: any) => convertMdastNode(child, schema, definitions)) || [];

        if (children.length > 0) {
          return children.map((child: any) => {
            if (child.type === "text") {
              return {
                ...child,
                marks: [
                  ...(child.marks || []),
                  {
                    type: "link",
                    attrs: {
                      href: def.url,
                      target: "_blank",
                      rel: "noopener noreferrer nofollow",
                      class: null,
                    },
                  },
                ],
              };
            }
            return child;
          });
        }
        return null;
      }
      const children = node.children?.flatMap((child: any) => convertMdastNode(child, schema, definitions)) || [];
      if (children.length > 0 && children[0].type === "text") {
        return {
          type: "text",
          text: `[${children[0].text}][${node.identifier || ''}]`
        };
      }
      return null;
    }
    case "inlineCode":
      return {
        type: "text",
        text: node.value,
        marks: [{ type: "code" }],
      };
    case "strong": {
      const result = applyMarkRecursively(node, "bold", schema, definitions);
      if (!result || result.length === 0) {
        return node.children?.flatMap((child: any) => convertMdastNode(child, schema, definitions)) || [];
      }
      return result;
    }
    case "emphasis": {
      if (schema && !schema.marks.italic) {
        return node.children?.flatMap((child: any) => convertMdastNode(child, schema, definitions)) || [];
      }
      const result = applyMarkRecursively(node, "italic", schema, definitions);
      if (!result || result.length === 0) {
        return node.children?.flatMap((child: any) => convertMdastNode(child, schema, definitions)) || [];
      }
      return result;
    }
    case "delete": {
      const result = applyMarkRecursively(node, "strike", schema, definitions);
      if (!result || result.length === 0) {
        return node.children?.flatMap((child: any) => convertMdastNode(child, schema, definitions)) || [];
      }
      return result;
    }
    case "break":
      return {
        type: "text",
        text: "\n"
      };
    case "image":
      return {
        type: "image",
        attrs: {
          src: node.url,
          alt: node.alt,
          title: node.title
        }
      };
    case "imageReference":
      if (definitions && definitions[node.identifier]) {
        const def = definitions[node.identifier];
        return {
          type: "image",
          attrs: {
            src: def.url,
            alt: node.alt || '',
            title: def.title
          }
        };
      }
      return {
        type: "text",
        text: `![${node.alt || ''}][${node.identifier || ''}]`
      };
    case "definition":
      return null;
    default:
      if (node.children) {
        return {
          type: node.type,
          content: node.children.map((child: any) => convertMdastNode(child, schema, definitions)).filter(Boolean)
        };
      }
      if (node.value && node.value !== "") {
        return { type: "text", text: node.value };
      }
      return null;
  }
};

/**
 * Inflate a simplified table node back to full ProseMirror JSON
 */
function inflateTableNode(simplified: any): any {
  const tableNode: any = {
    type: "table",
    content: [],
  };

  if (!simplified.rows || !Array.isArray(simplified.rows)) return tableNode;

  simplified.rows.forEach((rowObj: any) => {
    const tableRow: any = {
      type: "tableRow",
      attrs: rowObj.attrs || {},
      content: [],
    };

    (rowObj.row || []).forEach((cellValue: any) => {
      const paragraph: any = {
        type: "paragraph",
        content: [],
      };

      if (cellValue === null || cellValue === undefined) {
        // Empty cell
      } else if (typeof cellValue === "string") {
        paragraph.content.push({
          type: "text",
          text: cellValue,
        });
      } else if (Array.isArray(cellValue)) {
        cellValue.forEach((item) => {
          if (typeof item === "string") {
            paragraph.content.push({
              type: "text",
              text: item,
            });
          } else if (typeof item === "object") {
            paragraph.content.push(item);
          }
        });
      } else if (typeof cellValue === "object") {
        paragraph.content.push(cellValue);
      }

      const tableCell: any = {
        type: "tableCell",
        attrs: { colspan: 1, rowspan: 1, colwidth: null },
        content: [paragraph],
      };
      tableRow.content.push(tableCell);
    });

    tableNode.content.push(tableRow);
  });

  return tableNode;
}

/**
 * Recursively inflate a simplified node back into full ProseMirror JSON
 */
function inflateSimplifiedNode(node: any): any {
  if (!node || typeof node !== "object") return node;

  // If this node is a simplified table, inflate it
  if (node.type === "table" && node.rows) {
    node = inflateTableNode(node);
  }

  // Process the content recursively
  if (typeof node.content === "string") {
    node.content = [{ type: "text", text: node.content }];
  } else if (Array.isArray(node.content)) {
    node.content = node.content.map((child: any) => inflateSimplifiedNode(child));
  }

  return node;
}

/**
 * Process cube block text (YAML-based custom blocks)
 */
const processCubeBlockText = (text: string, schema?: any): JSONContent => {
  const rawCubeText = text;
  const lines = text.split("\n");

  if (lines[0].trim() !== "---") {
    throw new Error("expected cube header to start with ---");
  }
  const headerEnd = lines.indexOf("---", 1);
  if (headerEnd === -1) {
    throw new Error("missing cube header closing ---");
  }

  const headerYaml = lines.slice(1, headerEnd).join("\n");
  let nodeJson: any;
  try {
    // Try to parse YAML - if we don't have YAML library, skip cube blocks
    const YAML = require("yaml");
    nodeJson = YAML.parse(headerYaml);
  } catch (e) {
    // If YAML parsing fails or YAML library not available, return as code block
    return {
      type: "codeBlock",
      attrs: { language: "void" },
      content: [{ type: "text", text: rawCubeText }],
    };
  }

  // Restore empty-line placeholders that may appear inside YAML scalar values
  // (e.g. attrs.body for script/code nodes) back to real blank lines.
  const restoreEmptyLineMarkers = (value: any): any => {
    if (typeof value === "string") {
      return value.replace(/%%EMPTY_LINE%%/g, "");
    }
    if (Array.isArray(value)) {
      return value.map((item) => restoreEmptyLineMarkers(item));
    }
    if (value && typeof value === "object") {
      const result: Record<string, any> = {};
      Object.entries(value).forEach(([k, v]) => {
        result[k] = restoreEmptyLineMarkers(v);
      });
      return result;
    }
    return value;
  };
  nodeJson = restoreEmptyLineMarkers(nodeJson);

  if (schema && !schema.nodes[nodeJson.type]) {
    return {
      type: "codeBlock",
      attrs: { language: "void" },
      content: [{ type: "text", text: rawCubeText }],
    };
  }

  nodeJson = inflateSimplifiedNode(nodeJson);
  return nodeJson;
};

/**
 * Process cube node
 */
const processCubeNode = (node: any, schema?: any) => {
  try {
    return processCubeBlockText(node.value, schema);
  } catch (e) {
    // console.error("error processing cube node:", e);
    return {
      type: "paragraph",
      content: [{ type: "text", text: node.value }],
    };
  }
};

/**
 * Check if a node is inline content (allowed in paragraphs)
 */
function isInlineContent(node: any): boolean {
  if (!node || typeof node !== "object") return false;

  const inlineTypes = ["text", "hardBreak"];
  return inlineTypes.includes(node.type);
}

/**
 * Recursively filter out empty text nodes and fix invalid paragraph content
 */
function filterEmptyTextNodes(node: any): any {
  if (!node || typeof node !== "object") return node;

  // If this is an empty text node, return null
  if (node.type === "text") {
    if (!node.text || node.text === "" || node.text === null || node.text === undefined) {
      return null;
    }
  }

  // For array returns (from applyMarkRecursively), filter each item
  if (Array.isArray(node)) {
    return node
      .map((item: any) => filterEmptyTextNodes(item))
      .filter((item: any) => {
        if (!item) return false;
        // Filter out empty text nodes
        if (item.type === "text" && (!item.text || item.text === "")) return false;
        return true;
      });
  }

  // Recursively filter content
  if (node.content && Array.isArray(node.content)) {
    node.content = node.content
      .map((child: any) => filterEmptyTextNodes(child))
      .filter((child: any) => {
        if (!child) return false;
        // Filter out empty text nodes
        if (child.type === "text" && (!child.text || child.text === "")) return false;
        return true;
      });

    // Special handling for paragraphs - ensure they only contain inline content
    if (node.type === "paragraph") {
      // Filter to only inline content
      const inlineContent = node.content.filter((child: any) => isInlineContent(child));

      // If we have no inline content, set to empty array (valid empty paragraph)
      node.content = inlineContent.length > 0 ? inlineContent : [];
    } else if (node.content.length === 0 && node.type === "paragraph") {
      // Empty paragraph is valid
      node.content = [];
    }
  }

  return node;
}

/**
 * Parse markdown string to ProseMirror JSON format
 * This is the exact parser used by the Voiden editor
 */
export function parseMarkdown(markdown: string, schema?: any): any {
  // Strip frontmatter
  const markdownWithoutFrontmatter = stripFrontmatter(markdown);

  // Preprocess: insert markers for extra blank lines
  const preprocessedMarkdown = insertEmptyLineMarkers(markdownWithoutFrontmatter);

  // Parse with Unified (using remarkParse and remarkGfm)
  const mdast = unified().use(remarkParse).use(remarkGfm).parse(preprocessedMarkdown);

  // Collect all definitions (for reference-style links/images)
  const definitions: Record<string, { url: string; title?: string }> = {};
  mdast.children.forEach((child: any) => {
    if (child.type === "definition") {
      definitions[child.identifier] = {
        url: child.url,
        title: child.title,
      };
    }
  });

  const result: any[] = [];
  mdast.children.forEach((child: any) => {
    if (child.type === "paragraph") {
      // Check if paragraph contains any images
      const hasImages = child.children && child.children.some((c: any) => c.type === "image");

      if (hasImages) {
        const textNodes: any[] = [];
        const imageNodes: any[] = [];

        child.children.forEach((c: any) => {
          if (c.type === "image") {
            imageNodes.push(c);
          } else {
            textNodes.push(c);
          }
        });

        if (textNodes.length > 0) {
          result.push({
            type: "paragraph",
            content: textNodes.flatMap((n: any) => convertMdastNode(n, schema, definitions)),
          });
        }

        imageNodes.forEach((imageNode: any) => {
          result.push(convertMdastNode(imageNode, schema, definitions));
        });

        return;
      }

      // Join all text from children
      const fullText = child.children
        ? child.children
            .map((n: any) => {
              if (n.type === "inlineCode") {
                return `\`${n.value}\``;
              }
              return n.value || "";
            })
            .join("")
        : "";

      if (fullText.includes(EMPTY_LINE_MARKER)) {
        const parts = fullText.split(EMPTY_LINE_MARKER);
        const newNodes: any[] = [];
        for (let i = 0; i < parts.length; i++) {
          if (i > 0) {
            newNodes.push({
              type: "paragraph",
              content: [],
            });
          }
          const trimmed = parts[i].trim();
          if (trimmed) {
            const parsed = defaultMarkdownParser.parse(trimmed).toJSON();
            if (parsed.content && parsed.content.length) {
              const fixedContent = fixMarkTypes(parsed.content[0].content);
              newNodes.push({
                type: "paragraph",
                content: fixedContent,
              });
            }
          }
        }
        if (newNodes.length === 0) {
          newNodes.push({
            type: "paragraph",
            content: [],
          });
        }
        newNodes.forEach((node) => result.push(node));
      } else {
        result.push(convertMdastNode(child, schema, definitions));
      }
    } else if (child.type === "code" && child.lang === "void") {
      result.push(processCubeNode(child, schema));
    } else if (child.type === "table") {
      result.push(convertMdastNode(child, schema, definitions));
    } else if (child.type === "heading") {
      result.push(convertMdastNode(child, schema, definitions));
    } else if (child.type === "blockquote") {
      result.push(convertMdastNode(child, schema, definitions));
    } else if (child.type === "list") {
      result.push(convertMdastNode(child, schema, definitions));
    } else if (child.type === "image") {
      result.push(convertMdastNode(child, schema, definitions));
    } else if (child.type === "definition") {
      // Skip definition nodes - they're already collected
      return;
    } else {
      // For any other node types, fall back to re-stringifying and re-parsing
      const childMarkdown = unified().use(remarkGfm).use(remarkStringify).stringify(child);
      if (!childMarkdown.trim()) {
        return;
      } else {
        const parsed = defaultMarkdownParser.parse(childMarkdown).toJSON();
        if (child.type === "code" && child.lang && parsed.content) {
          parsed.content.forEach((node: any) => {
            if (node.type === "codeBlock") {
              node.attrs = { ...node.attrs, language: child.lang };
            }
          });
        }
        if (parsed.content && parsed.content.length) {
          const fixedContent = parsed.content.map((node: any) => {
            const converted = convertNodeNames(node);
            if (converted.content) {
              converted.content = fixMarkTypes(converted.content);
            }
            return converted;
          });
          result.push(...fixedContent);
        }
      }
    }
  });

  // Handle empty markdown
  if (result.length === 0) {
    return { type: "doc", content: [{ type: "paragraph", content: [] }] };
  }

  // Filter out all empty text nodes from the result
  const filteredResult = result
    .map((node) => filterEmptyTextNodes(node))
    .filter((node) => node !== null && node !== undefined);

  return { type: "doc", content: filteredResult };
}
