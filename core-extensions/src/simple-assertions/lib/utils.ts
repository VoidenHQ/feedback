/**
 * Utility functions for simple assertions plugin
 */

import type { Editor } from "@tiptap/core";

/**
 * Insert an assertions table with sample rows
 */
export const insertAssertionsTable = (editor: Editor) => {
  const { from, to } = editor.state.selection;

  // Create sample assertion rows - just regular table cells, no headers
  const sampleRows = [
    // Sample row 1
    {
      type: "tableRow",
      content: [
        {
          type: "tableCell",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Check status is OK" }],
            },
          ],
        },
        {
          type: "tableCell",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "status" }],
            },
          ],
        },
        {
          type: "tableCell",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "equals" }],
            },
          ],
        },
        {
          type: "tableCell",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "200" }],
            },
          ],
        },
      ],
    },
    // Sample row 2
    {
      type: "tableRow",
      content: [
        {
          type: "tableCell",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Response time check" }],
            },
          ],
        },
        {
          type: "tableCell",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "responseTime" }],
            },
          ],
        },
        {
          type: "tableCell",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "less-than" }],
            },
          ],
        },
        {
          type: "tableCell",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "1000" }],
            },
          ],
        },
      ],
    },
    // Empty row for user input
    {
      type: "tableRow",
      content: [
        {
          type: "tableCell",
          content: [{ type: "paragraph" }],
        },
        {
          type: "tableCell",
          content: [{ type: "paragraph" }],
        },
        {
          type: "tableCell",
          content: [{ type: "paragraph" }],
        },
        {
          type: "tableCell",
          content: [{ type: "paragraph" }],
        },
      ],
    },
  ];

  // Insert assertions table node
  editor
    .chain()
    .focus()
    .deleteRange({ from, to })
    .insertContent({
      type: "assertions-table",
      content: [
        {
          type: "table",
          content: sampleRows,
        },
      ],
    })
    .run();
};

/**
 * Get common assertion examples for documentation
 */
export const getAssertionExamples = () => {
  return [
    {
      category: "Status Code",
      examples: [
        { description: "Check status is OK", field: "status", operator: "equals", value: "200" },
        { description: "Status text contains OK", field: "statusText", operator: "contains", value: "OK" },
        { description: "", field: "status", operator: "equals", value: "200" },
      ],
    },
    {
      category: "Response Time",
      examples: [
        { description: "Fast response", field: "responseTime", operator: "less-than", value: "500" },
        { description: "Response under 1 second", field: "duration", operator: "less-than", value: "1000" },
      ],
    },
    {
      category: "Headers",
      examples: [
        { description: "Content type is JSON", field: "header.Content-Type", operator: "contains", value: "json" },
        { description: "Content type check", field: "header.Content-Type", operator: "equals", value: "application/json" },
        { description: "Authorization exists", field: "header.Authorization", operator: "exists", value: "true" },
      ],
    },
    {
      category: "JSON Body",
      examples: [
        { description: "First item ID exists", field: "body.data[0].id", operator: "exists", value: "true" },
        { description: "User ID is positive", field: "body.user.id", operator: "greater-than", value: "0" },
        { description: "Status is success", field: "body.status", operator: "equals", value: "success" },
        { description: "Items array not empty", field: "body.items", operator: "not-empty", value: "true" },
      ],
    },
    {
      category: "String Matching",
      examples: [
        { description: "Message contains success", field: "body.message", operator: "contains", value: "success" },
        { description: "Email format check", field: "body.email", operator: "matches", value: ".*@.*\\.com" },
        { description: "Name starts with John", field: "body.name", operator: "starts-with", value: "John" },
      ],
    },
  ];
};

/**
 * Get list of supported operators
 */
export const getSupportedOperators = () => {
  return [
    { operator: "equals", aliases: ["eq", "==", "==="], description: "Exact equality" },
    { operator: "not-equals", aliases: ["ne", "!=", "!=="], description: "Not equal" },
    { operator: "contains", aliases: ["includes"], description: "String contains" },
    { operator: "not-contains", aliases: ["not-includes"], description: "String does not contain" },
    { operator: "starts-with", aliases: ["startswith"], description: "String starts with" },
    { operator: "ends-with", aliases: ["endswith"], description: "String ends with" },
    { operator: "matches", aliases: ["regex"], description: "Regex pattern match" },
    { operator: "exists", aliases: ["is-defined"], description: "Value exists" },
    { operator: "not-exists", aliases: ["is-null", "is-undefined"], description: "Value does not exist" },
    { operator: "greater-than", aliases: ["gt", ">"], description: "Greater than (numeric)" },
    { operator: "less-than", aliases: ["lt", "<"], description: "Less than (numeric)" },
    { operator: "greater-equal", aliases: ["gte", ">="], description: "Greater or equal (numeric)" },
    { operator: "less-equal", aliases: ["lte", "<="], description: "Less or equal (numeric)" },
    { operator: "is-empty", aliases: ["empty"], description: "Empty array/string/object" },
    { operator: "not-empty", aliases: [], description: "Not empty" },
    { operator: "is-truthy", aliases: ["truthy"], description: "Truthy value" },
    { operator: "is-falsy", aliases: ["falsy"], description: "Falsy value" },
    { operator: "type-is", aliases: ["typeof"], description: "Type check" },
  ];
};
