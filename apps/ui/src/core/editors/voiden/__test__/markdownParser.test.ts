import { describe, it, expect } from "vitest";
import { parseMarkdown, createMarkdownSerializer } from "@/core/editors/voiden/markdownConverter";
import { Schema } from "@tiptap/pm/model";

const normalizeNewlines = (s: string) => s.replace(/\r\n/g, "\n");

// Mock schema for testing - extended with all custom nodes
const mockSchema = new Schema({
  nodes: {
    doc: {
      content: "block+",
    },
    paragraph: {
      group: "block",
      content: "text*",
      toDOM() {
        return ["p", 0];
      },
    },
    text: {
      group: "inline",
    },
    heading: {
      attrs: { level: { default: 1 } },
      content: "inline*",
      group: "block",
      toDOM(node) {
        return [`h${node.attrs.level}`, 0];
      },
    },
    bulletList: {
      group: "block",
      content: "listItem+",
      toDOM() {
        return ["ul", 0];
      },
    },
    orderedList: {
      group: "block",
      content: "listItem+",
      toDOM() {
        return ["ol", 0];
      },
    },
    listItem: {
      content: "paragraph+",
      toDOM() {
        return ["li", 0];
      },
    },
    blockquote: {
      group: "block",
      content: "block+",
      toDOM() {
        return ["blockquote", 0];
      },
    },
    codeBlock: {
      group: "block",
      content: "text*",
      attrs: { language: { default: "" }, body: { default: "" } },
      toDOM() {
        return ["pre", ["code", 0]];
      },
    },
    table: {
      group: "block",
      content: "tableRow+",
      toDOM() {
        return ["table", 0];
      },
    },
    tableRow: {
      content: "(tableCell | tableHeader)+",
      attrs: { disabled: { default: false } },
      toDOM() {
        return ["tr", 0];
      },
    },
    tableCell: {
      content: "paragraph+",
      attrs: {
        colspan: { default: 1 },
        rowspan: { default: 1 },
        colwidth: { default: null },
      },
      toDOM() {
        return ["td", 0];
      },
    },
    tableHeader: {
      content: "paragraph+",
      attrs: {
        colspan: { default: 1 },
        rowspan: { default: 1 },
        colwidth: { default: null },
      },
      toDOM() {
        return ["th", 0];
      },
    },
    // Custom Voiden nodes
    "runtime-variables": {
      group: "block",
      content: "table*",
      attrs: {
        uid: { default: "" },
        importedFrom: { default: "" },
      },
      toDOM() {
        return ["div", { class: "runtime-variables" }, 0];
      },
    },
    request: {
      group: "block",
      content: "(method | url)*",
      attrs: {
        uid: { default: "" },
      },
      toDOM() {
        return ["div", { class: "request" }, 0];
      },
    },
    method: {
      group: "block",
      content: "text*",
      attrs: {
        uid: { default: "" },
        method: { default: "GET" },
        importedFrom: { default: "" },
        visible: { default: true },
      },
      toDOM() {
        return ["div", { class: "method" }, 0];
      },
    },
    url: {
      group: "block",
      content: "text*",
      attrs: {
        uid: { default: "" },
      },
      toDOM() {
        return ["div", { class: "url" }, 0];
      },
    },
    "headers-table": {
      group: "block",
      content: "table*",
      attrs: {
        uid: { default: "" },
        importedFrom: { default: "" },
      },
      toDOM() {
        return ["div", { class: "headers-table" }, 0];
      },
    },
    "query-table": {
      group: "block",
      content: "table*",
      attrs: {
        uid: { default: "" },
        importedFrom: { default: "" },
      },
      toDOM() {
        return ["div", { class: "query-table" }, 0];
      },
    },
    "multipart-table": {
      group: "block",
      content: "table*",
      attrs: {
        uid: { default: "" },
        importedFrom: { default: "" },
      },
      toDOM() {
        return ["div", { class: "multipart-table" }, 0];
      },
    },
    "url-table": {
      group: "block",
      content: "table*",
      attrs: {
        uid: { default: "" },
        importedFrom: { default: "" },
      },
      toDOM() {
        return ["div", { class: "url-table" }, 0];
      },
    },
    "path-table": {
      group: "block",
      content: "table*",
      attrs: {
        uid: { default: "" },
        importedFrom: { default: "" },
      },
      toDOM() {
        return ["div", { class: "path-table" }, 0];
      },
    },
    "assertions-table": {
      group: "block",
      content: "table*",
      attrs: {
        uid: { default: "" },
      },
      toDOM() {
        return ["div", { class: "assertions-table" }, 0];
      },
    },
    json_body: {
      group: "block",
      content: "text*",
      attrs: {
        uid: { default: "" },
        body: { default: "" },
      },
      toDOM() {
        return ["div", { class: "json-body" }, 0];
      },
    },
    xml_body: {
      group: "block",
      content: "text*",
      attrs: {
        uid: { default: "" },
        body: { default: "" },
      },
      toDOM() {
        return ["div", { class: "xml-body" }, 0];
      },
    },
    restFile: {
      group: "block",
      attrs: {
        uid: { default: "" },
        fieldName: { default: "" },
      },
      toDOM() {
        return ["div", { class: "rest-file" }];
      },
    },
    auth: {
      group: "block",
      content: "table*",
      attrs: {
        uid: { default: "" },
        authType: { default: "inherit" },
        importedFrom: { default: "" },
      },
      toDOM() {
        return ["div", { class: "auth" }, 0];
      },
    },
  },
  marks: {},
});

describe("Markdown Parser - Basic Nodes", () => {
  it("voiden test : parse basic text in paragraph", () => {
    const markdown = "Hello world";
    const result = parseMarkdown(markdown, mockSchema);

    const expected = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Hello world" }],
        },
      ],
    };

    expect(result).toEqual(expected);
  });

  it("voiden test : parse multiple paragraphs", () => {
    const markdown = "Para 1\n\nPara 2";
    const result = parseMarkdown(markdown, mockSchema);

    const expected = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Para 1" }],
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "Para 2" }],
        },
      ],
    };

    expect(result).toEqual(expected);
  });

  it("voiden test : parse headings at different levels", () => {
    const markdown = "# H1\n## H2\n### H3";
    const result = parseMarkdown(markdown, mockSchema);

    const expected = {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: "H1" }],
        },
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "H2" }],
        },
        {
          type: "heading",
          attrs: { level: 3 },
          content: [{ type: "text", text: "H3" }],
        },
      ],
    };

    expect(result).toEqual(expected);
  });

  it("voiden test : parse bullet lists", () => {
    const markdown = "* Item 1\n* Item 2";
    const result = parseMarkdown(markdown, mockSchema);

    const expected = {
      type: "doc",
      content: [
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Item 1" }],
                },
              ],
            },
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Item 2" }],
                },
              ],
            },
          ],
        },
      ],
    };

    expect(result).toEqual(expected);
  });

  it("voiden test : parse ordered lists", () => {
    const markdown = "1. First\n2. Second";
    const result = parseMarkdown(markdown, mockSchema);

    const expected = {
      type: "doc",
      content: [
        {
          type: "orderedList",
          content: [
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "First" }],
                },
              ],
            },
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Second" }],
                },
              ],
            },
          ],
        },
      ],
    };

    expect(result).toEqual(expected);
  });

  it("voiden test : parse blockquotes", () => {
    const markdown = "> This is a quote";
    const result = parseMarkdown(markdown, mockSchema);

    const expected = {
      type: "doc",
      content: [
        {
          type: "blockquote",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "This is a quote" }],
            },
          ],
        },
      ],
    };

    expect(result).toEqual(expected);
  });

  it("voiden test : parse code blocks with language", () => {
    const markdown = "```javascript\nconst x = 1;\n```";
    const result = parseMarkdown(markdown, mockSchema);

    const expected = {
      type: "doc",
      content: [
        {
          type: "codeBlock",
          attrs: { language: "javascript", body: "const x = 1;" },
        },
      ],
    };

    expect(result).toEqual(expected);
  });
});

describe("Markdown Parser - Custom Voiden Nodes", () => {
  it("voiden test : parse method node", () => {
    const markdown = `\`\`\`void
---
type: method
attrs:
  method: GET
  uid: test-123
---
\`\`\``;
    const result = parseMarkdown(markdown, mockSchema);
    const expected = {
      type: "doc",
      content: [
        {
          type: "method",
          attrs: {
            method: "GET",
            uid: "test-123",
          },
        },
      ],
    };

    expect(result).toEqual(expected);
  });

  it("voiden test : parse url node", () => {
    const markdown = `\`\`\`void
---
type: url
attrs:
  uid: url-123
content: https://api.example.com/users
---
\`\`\``;
    const result = parseMarkdown(markdown, mockSchema);
    const expected = {
      type: "doc",
      content: [
        {
          type: "url",
          attrs: {
            uid: "url-123",
          },
          content: [{ type: "text", text: "https://api.example.com/users" }],
        },
      ],
    };

    expect(result).toEqual(expected);
  });

  it("voiden test : parse json_body node", () => {
    const markdown = `\`\`\`void
---
type: json_body
attrs:
  uid: json-123
  body: |
    {
      "key": "value"
    }
---
\`\`\``;
    const result = parseMarkdown(markdown, mockSchema);
    const expected = {
      type: "doc",
      content: [
        {
          type: "json_body",
          attrs: {
            uid: "json-123",
            body: normalizeNewlines(`{
  "key": "value"
}
`),
          },
        },
      ],
    };

    expect(result).toEqual(expected);
  });

  it("voiden test : parse xml_body node", () => {
    const markdown = `\`\`\`void
---
type: xml_body
attrs:
  uid: xml-123
  body: "<root></root>"
---
\`\`\``;
    const result = parseMarkdown(markdown, mockSchema);
    const expected = {
      type: "doc",
      content: [
        {
          type: "xml_body",
          attrs: {
            uid: "xml-123",
            body: "<root></root>",
          },
        },
      ],
    };

    expect(result).toEqual(expected);
  });

  it("voiden test : parse runtime-variables node with table", () => {
    const markdown = `\`\`\`void
---
type: runtime-variables
attrs:
  uid: var-123
  importedFrom: ""
content:
  - type: table
    rows:
      - attrs:
          disabled: false
        row:
          - Variable
          - "{{value}}"
---
\`\`\``;
    const result = parseMarkdown(markdown, mockSchema);
    const expected = {
      type: "doc",
      content: [
        {
          type: "runtime-variables",
          attrs: { uid: "var-123", importedFrom: "" },
          content: [
            {
              type: "table",
              content: [
                {
                  type: "tableRow",
                  attrs: { disabled: false },
                  content: [
                    {
                      type: "tableCell",
                      attrs: { colspan: 1, rowspan: 1, colwidth: null },
                      content: [
                        {
                          type: "paragraph",
                          content: [{ type: "text", text: "Variable" }],
                        },
                      ],
                    },
                    {
                      type: "tableCell",
                      attrs: { colspan: 1, rowspan: 1, colwidth: null },
                      content: [
                        {
                          type: "paragraph",
                          content: [{ type: "text", text: "{{value}}" }],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    expect(result).toEqual(expected);
  });

  it("voiden test : parse request node with method and url", () => {
    const markdown = `\`\`\`void
---
type: request
attrs:
  uid: req-123
content:
  - type: method
    attrs:
      method: POST
      uid: method-123
  - type: url
    attrs:
      uid: url-123
    content: /api/data
---
\`\`\``;
    const result = parseMarkdown(markdown, mockSchema);
    const expected = {
      type: "doc",
      content: [
        {
          type: "request",
          attrs: { uid: "req-123" },
          content: [
            {
              type: "method",
              attrs: { method: "POST", uid: "method-123" },
            },
            {
              type: "url",
              attrs: { uid: "url-123" },
              content: [{ type: "text", text: "/api/data" }],
            },
          ],
        },
      ],
    };

    expect(result).toEqual(expected);
  });

  it("voiden test : parse assertions-table node", () => {
    const markdown = `\`\`\`void
---
type: assertions-table
attrs:
  uid: assert-123
content:
  - type: table
    rows:
      - row:
          - Check status
          - status
          - equals
          - "200"
---
\`\`\``;
    const result = parseMarkdown(markdown, mockSchema);
    const expected = {
      type: "doc",
      content: [
        {
          type: "assertions-table",
          attrs: { uid: "assert-123" },
          content: [
            {
              type: "table",
              content: [
                {
                  type: "tableRow",
                  attrs: { disabled: false },
                  content: [
                    {
                      type: "tableCell",
                      attrs: { colspan: 1, rowspan: 1, colwidth: null },
                      content: [
                        {
                          type: "paragraph",
                          content: [{ type: "text", text: "Check status" }],
                        },
                      ],
                    },
                    {
                      type: "tableCell",
                      attrs: { colspan: 1, rowspan: 1, colwidth: null },
                      content: [
                        {
                          type: "paragraph",
                          content: [{ type: "text", text: "status" }],
                        },
                      ],
                    },
                    {
                      type: "tableCell",
                      attrs: { colspan: 1, rowspan: 1, colwidth: null },
                      content: [
                        {
                          type: "paragraph",
                          content: [{ type: "text", text: "equals" }],
                        },
                      ],
                    },
                    {
                      type: "tableCell",
                      attrs: { colspan: 1, rowspan: 1, colwidth: null },
                      content: [
                        {
                          type: "paragraph",
                          content: [{ type: "text", text: "200" }],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

  });

  it("voiden test : parse auth node", () => {
    const markdown = `\`\`\`void
---
type: auth
attrs:
  uid: auth-123
  authType: bearer
---
\`\`\``;
    const result = parseMarkdown(markdown, mockSchema);
    const expected = {
      type: "doc",
      content: [
        {
          type: "auth",
          attrs: {
            uid: "auth-123",
            authType: "bearer",
          },
        },
      ],
    };

    expect(result).toEqual(expected);
  });

  it("voiden test : parse restFile node", () => {
    const markdown = `\`\`\`void
---
type: restFile
attrs:
  uid: file-123
  fieldName: attachment
---
\`\`\``;
    const result = parseMarkdown(markdown, mockSchema);
    const expected = {
      type: "doc",
      content: [
        {
          type: "restFile",
          attrs: {
            uid: "file-123",
            fieldName: "attachment",
          },
        },
      ],
    };

    expect(result).toEqual(expected);
  });
});

describe("Markdown Parser - Negative Cases", () => {
  it("voiden test : handle empty markdown", () => {
    const markdown = "";
    const result = parseMarkdown(markdown, mockSchema);

    expect(result.type).toBe("doc");
    expect(result.content).toBeDefined();
  });

  it("voiden test : handle malformed void block gracefully", () => {
    const markdown = `\`\`\`void
---
type: invalid_type
---
\`\`\``;

    const result = parseMarkdown(markdown, mockSchema);
    // Should either skip or treat as code block
    expect(result.type).toBe("doc");
  });

  it("voiden test : handle void block with missing type", () => {
    const markdown = `\`\`\`void
---
attrs:
  uid: test
---
\`\`\``;

    expect(() => parseMarkdown(markdown, mockSchema)).not.toThrow();
  });

  it("voiden test : handle void block with invalid YAML", () => {
    const markdown = `\`\`\`void
---
this is not valid yaml: [[[
---
\`\`\``;

    expect(() => parseMarkdown(markdown, mockSchema)).not.toThrow();
  });

  it("voiden test : handle incomplete void block", () => {
    const markdown = `\`\`\`void
---
type: method
`;

    expect(() => parseMarkdown(markdown, mockSchema)).not.toThrow();
  });

  it("voiden test : handle void block with extra fields", () => {
    const markdown = `\`\`\`void
---
type: method
attrs:
  method: GET
extraField: "should be ignored"
unknownProp: 123
---
\`\`\``;

    const result = parseMarkdown(markdown, mockSchema);
    expect(result.content?.[0].type).toBe("method");
  });

  it("voiden test : handle deeply nested content gracefully", () => {
    const markdown = `\`\`\`void
---
type: request
content:
  - type: method
    content:
      - type: invalid_nested
        content: []
---
\`\`\``;

    expect(() => parseMarkdown(markdown, mockSchema)).not.toThrow();
  });
});

describe("Round-trip Conversion Tests", () => {
  const serializer = createMarkdownSerializer(mockSchema);

  it("voiden test : round-trip basic markdown", () => {
    const markdown = "# Heading\n\nParagraph text";
    const parsed = parseMarkdown(markdown, mockSchema);
    const serialized = serializer.serialize(mockSchema.nodeFromJSON(parsed));
    const reparsed = parseMarkdown(serialized, mockSchema);

    expect(reparsed).toEqual({
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: "Heading" }],
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "Paragraph text" }],
        },
      ],
    });
  });

  it("voiden test : round-trip method node", () => {
    const markdown = `\`\`\`void
---
type: method
attrs:
  method: PUT
  uid: test-123
---
\`\`\``;

    const parsed = parseMarkdown(markdown, mockSchema);
    const serialized = serializer.serialize(mockSchema.nodeFromJSON(parsed));
    const reparsed = parseMarkdown(serialized, mockSchema);

    expect(reparsed).toEqual({
      type: "doc",
      content: [
        {
          type: "method",
          attrs: { method: "PUT", uid: "test-123",importedFrom: "", visible: true  },
        },
      ],
    });
  });

  it("voiden test : round-trip url node", () => {
    const markdown = `\`\`\`void
---
type: url
attrs:
  uid: url-123
content: /api/v2/data
---
\`\`\``;

    const parsed = parseMarkdown(markdown, mockSchema);
    const serialized = serializer.serialize(mockSchema.nodeFromJSON(parsed));
    const reparsed = parseMarkdown(serialized, mockSchema);

    expect(reparsed).toEqual({
      type: "doc",
      content: [
        {
          type: "url",
          attrs: { uid: "url-123" },
          content: [{ type: "text", text: "/api/v2/data" }],
        },
      ],
    });
  });

  it("voiden test : round-trip json_body node", () => {
    const markdown = `\`\`\`void
---
type: json_body
attrs:
  uid: json-123
  body: |
    {"test": true}
---
\`\`\``;

    const parsed = parseMarkdown(markdown, mockSchema);
    const serialized = serializer.serialize(mockSchema.nodeFromJSON(parsed));
    const reparsed = parseMarkdown(serialized, mockSchema);

    expect(reparsed).toEqual({
      type: "doc",
      content: [
        {
          type: "json_body",
          attrs: {
            uid: "json-123",
            body: normalizeNewlines("{\"test\": true}\n"),
          },
        },
      ],
    });
  });

  it("voiden test : round-trip complex document", () => {
    const markdown = `# API Documentation

## Endpoint Details

\`\`\`void
---
type: request
attrs:
  uid: req-123
content:
  - type: method
    attrs:
      method: POST
      uid: m-123
  - type: url
    attrs:
      uid: u-123
    content: /api/users
---
\`\`\`

> This creates a new user

\`\`\`void
---
type: json_body
attrs:
  uid: body-123
  body: |
    {
      "name": "John"
    }
---
\`\`\``;

    const parsed = parseMarkdown(markdown, mockSchema);
    const serialized = serializer.serialize(mockSchema.nodeFromJSON(parsed));
    const reparsed = parseMarkdown(serialized, mockSchema);

    expect(reparsed).toEqual({
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: "API Documentation" }],
        },
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "Endpoint Details" }],
        },
        {
          type: "request",
          attrs: { uid: "req-123" },
          content: [
            {
              type: "method",
              attrs: { method: "POST", uid: "m-123" ,importedFrom: "", visible: true },
            },
            {
              type: "url",
              attrs: { uid: "u-123" },
              content: [{ type: "text", text: "/api/users" }],
            },
          ],
        },
        {
          type: "blockquote",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "This creates a new user" }],
            },
          ],
        },
        {
          type: "json_body",
          attrs: {
            uid: "body-123",
            body: normalizeNewlines("{\n  \"name\": \"John\"\n}\n"),
          },
        },
      ],
    });
  });

  it("voiden test : maintain data integrity through multiple conversions", () => {
    const originalMarkdown = `# Test\n\n* Item 1\n* Item 2`;

    let current = originalMarkdown;
    for (let i = 0; i < 3; i++) {
      const parsed = parseMarkdown(current, mockSchema);
      current = serializer.serialize(mockSchema.nodeFromJSON(parsed));
    }

    const final = parseMarkdown(current, mockSchema);
    expect(final).toEqual({
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: "Test" }],
        },
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Item 1" }],
                },
              ],
            },
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Item 2" }],
                },
              ],
            },
          ],
        },
      ],
    });
  });
});

describe("Edge Cases and Error Handling", () => {
  const serializer = createMarkdownSerializer(mockSchema);

  it("voiden test : handle very long text content", () => {
    const longText = "a".repeat(10000);
    const markdown = longText;
    const result = parseMarkdown(markdown, mockSchema);

    expect(result).toEqual({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: longText }],
        },
      ],
    });
  });

  it("voiden test : handle special characters in content", () => {
    const markdown = "Text with <>&\"' special chars";
    const result = parseMarkdown(markdown, mockSchema);

    expect(result).toEqual({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Text with <>&\"' special chars" }],
        },
      ],
    });
  });

  it("voiden test : handle unicode characters", () => {
    const markdown = "Hello 世界 🌍";
    const result = parseMarkdown(markdown, mockSchema);

    expect(result).toEqual({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Hello 世界 🌍" }],
        },
      ],
    });
  });

  it("voiden test : handle nested structures gracefully", () => {
    const markdown = `* Item 1
  * Nested 1
  * Nested 2
* Item 2`;

    expect(() => parseMarkdown(markdown, mockSchema)).not.toThrow();
  });

  it("voiden test : handle mixed content types", () => {
    const markdown = `# Title

Regular text

> Quote

\`\`\`javascript
code
\`\`\`

* List item`;

    const result = parseMarkdown(markdown, mockSchema);
    const expected = {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: "Title" }],
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "Regular text" }],
        },
        {
          type: "blockquote",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Quote" }],
            },
          ],
        },
        {
          type: "codeBlock",
          attrs: { language: "javascript", body: "code" },
        },
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "List item" }],
                },
              ],
            },
          ],
        },
      ],
    };

    expect(result).toEqual(expected);
  });

  it("voiden test : preserve whitespace appropriately", () => {
    const markdown = "Text  with   multiple    spaces";
    const result = parseMarkdown(markdown, mockSchema);

    const expected = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Text  with   multiple    spaces" }],
        },
      ],
    };

    expect(result).toEqual(expected);
  });

  it("voiden test : handle malformed markdown gracefully", () => {
    const markdown = "# Heading without closing\n**bold without closing";

    expect(() => parseMarkdown(markdown, mockSchema)).not.toThrow();
  });
});

describe("Integration Tests - Complex Documents", () => {
  const serializer = createMarkdownSerializer(mockSchema);

  it("voiden test : handle complete API documentation with all node types", () => {
    const complexMarkdown = `# API Documentation

This is a complete REST API request.

## Request Configuration

\`\`\`void
---
type: request
attrs:
  uid: req-001
content:
  - type: method
    attrs:
      method: POST
      uid: method-001
  - type: url
    attrs:
      uid: url-001
    content: /api/users
---
\`\`\`

### Headers

\`\`\`void
---
type: headers-table
attrs:
  uid: headers-001
content:
  - type: table
    rows:
      - attrs:
          disabled: false
        row:
          - Content-Type
          - application/json
---
\`\`\`

### Request Body

\`\`\`void
---
type: json_body
attrs:
  uid: body-001
  body: |
    {
      "name": "John Doe",
      "email": "john@example.com"
    }
---
\`\`\`

### Response Assertions

\`\`\`void
---
type: assertions-table
attrs:
  uid: assert-001
content:
  - type: table
    rows:
      - attrs:
          disabled: false
        row:
          - Status Check
          - status
          - equals
          - "201"
---
\`\`\`

> **Note:** This endpoint requires authentication

* Requires valid API key
* Rate limit: 100 requests/hour

## Example Code

\`\`\`javascript
const response = await fetch('/api/users', {
  method: 'POST',
  body: JSON.stringify({ name: 'John' })
});
\`\`\`
`;

    const parsed = parseMarkdown(complexMarkdown, mockSchema);
    expect(parsed.type).toBe("doc");
    expect(parsed.content?.length).toBeGreaterThan(5);
    
    // Verify it contains various node types
    const nodeTypes = parsed.content?.map(node => node.type);
    expect(nodeTypes).toContain("heading");
    expect(nodeTypes).toContain("request");
    expect(nodeTypes).toContain("json_body");
  });

  it("voiden test : round-trip complex document without data loss", () => {
    const originalMarkdown = `# Complete Request

\`\`\`void
---
type: request
attrs:
  uid: req-123
content:
  - type: method
    attrs:
      method: PUT
      uid: m-123
  - type: url
    attrs:
      uid: u-123
    content: /api/data/{id}
---
\`\`\`

\`\`\`void
---
type: runtime-variables
attrs:
  uid: var-123
content:
  - type: table
    rows:
      - attrs:
          disabled: false
        row:
          - API_KEY
          - "{{env.API_KEY}}"
---
\`\`\`

\`\`\`void
---
type: json_body
attrs:
  uid: body-123
  body: |
    {"updated": true}
---
\`\`\`
`;

    const parsed = parseMarkdown(originalMarkdown, mockSchema);
    const serialized = serializer.serialize(mockSchema.nodeFromJSON(parsed));
    const reparsed = parseMarkdown(serialized, mockSchema);

    const expected = {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: "Complete Request" }],
        },
        {
          type: "request",
          attrs: { uid: "req-123" },
          content: [
            {
              type: "method",
              attrs: { method: "PUT", uid: "m-123",importedFrom: "", visible: true  },
            },
            {
              type: "url",
              attrs: { uid: "u-123" },
              content: [{ type: "text", text: "/api/data/{id}" }],
            },
          ],
        },
        {
          type: "runtime-variables",
          attrs: { uid: "var-123", importedFrom: "" },
          content: [
            {
              type: "table",
              content: [
                {
                  type: "tableRow",
                  attrs: { disabled: false },
                  content: [
                    {
                      type: "tableCell",
                      attrs: { colspan: 1, rowspan: 1, colwidth: null },
                      content: [
                        {
                          type: "paragraph",
                          content: [{ type: "text", text: "API_KEY" }],
                        },
                      ],
                    },
                    {
                      type: "tableCell",
                      attrs: { colspan: 1, rowspan: 1, colwidth: null },
                      content: [
                        {
                          type: "paragraph",
                          content: [{ type: "text", text: "{{env.API_KEY}}" }],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          type: "json_body",
          attrs: {
            uid: "body-123",
            body: normalizeNewlines("{\"updated\": true}\n"),
          },
        },
      ],
    };

    expect(reparsed).toEqual(expected);
  });

  it("voiden test : handle interleaved standard and custom nodes", () => {
    const markdown = `# Title

Some paragraph text

\`\`\`void
---
type: method
attrs:
  method: GET
  uid: test-123
---
\`\`\`

> A blockquote

* List item 1
* List item 2

\`\`\`void
---
type: url
attrs:
  uid: url-123
content: /api/endpoint
---
\`\`\`

More paragraph text

\`\`\`javascript
// Code block
const x = 1;
\`\`\`
`;
    const parsed = parseMarkdown(markdown, mockSchema);

    const expected = {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: "Title" }],
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "Some paragraph text" }],
        },
        {
          type: "method",
          attrs: { method: "GET", uid: "test-123" },
        },
        {
          type: "blockquote",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "A blockquote" }],
            },
          ],
        },
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "List item 1" }],
                },
              ],
            },
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "List item 2" }],
                },
              ],
            },
          ],
        },
        {
          type: "url",
          attrs: { uid: "url-123" },
          content: [{ type: "text", text: "/api/endpoint" }],
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "More paragraph text" }],
        },
        {
          type: "codeBlock",
          attrs: { language: "javascript", body: "// Code block\nconst x = 1;" },
        },
      ],
    };

    expect(parsed).toEqual(expected);
  });

  it("voiden test : preserve order of mixed content", () => {
    const markdown = `First paragraph

\`\`\`void
---
type: method
attrs:
  method: POST
  uid: m1
---
\`\`\`

Second paragraph

\`\`\`void
---
type: url
attrs:
  uid: u1
content: /test
---
\`\`\`

Third paragraph`;

    const parsed = parseMarkdown(markdown, mockSchema);

    const expected = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "First paragraph" }],
        },
        {
          type: "method",
          attrs: { method: "POST", uid: "m1" },
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "Second paragraph" }],
        },
        {
          type: "url",
          attrs: { uid: "u1" },
          content: [{ type: "text", text: "/test" }],
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "Third paragraph" }],
        },
      ],
    };

    expect(parsed).toEqual(expected);
  });

  it("voiden test : handle document with only custom nodes", () => {
    const markdown = `\`\`\`void
---
type: method
attrs:
  method: GET
  uid: m1
---
\`\`\`

\`\`\`void
---
type: url
attrs:
  uid: u1
content: /api
---
\`\`\`

\`\`\`void
---
type: json_body
attrs:
  uid: b1
  body: "{}"
---
\`\`\``;
    const parsed = parseMarkdown(markdown, mockSchema);

    const expected = {
      type: "doc",
      content: [
        {
          type: "method",
          attrs: { method: "GET", uid: "m1" },
        },
        {
          type: "url",
          attrs: { uid: "u1" },
          content: [{ type: "text", text: "/api" }],
        },
        {
          type: "json_body",
          attrs: { uid: "b1", body: "{}" },
        },
      ],
    };

    expect(parsed).toEqual(expected);
  });

  it("voiden test : handle deeply nested lists with void blocks", () => {
    const markdown = `* Top level
  * Nested level 1
    * Nested level 2
      \`\`\`void
---
type: method
attrs:
  method: GET
  uid: nested-method
---
\`\`\``;

    expect(() => parseMarkdown(markdown, mockSchema)).not.toThrow();
  });

  it("voiden test : handle tables mixed with void blocks", () => {
    const markdown = `| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |

\`\`\`void
---
type: method
attrs:
  method: POST
  uid: after-table
---
\`\`\`

| Another | Table |
|---------|-------|
| Data    | Here  |`;

    const parsed = parseMarkdown(markdown, mockSchema);
    expect(parsed.type).toBe("doc");
  });

  it("voiden test : serialize and parse full REST API spec", () => {
    const fullSpec = `# User Management API

## Create User

\`\`\`void
---
type: request
attrs:
  uid: create-user-req
content:
  - type: method
    attrs:
      method: POST
      uid: create-user-method
  - type: url
    attrs:
      uid: create-user-url
    content: /api/v1/users
---
\`\`\`

### Authentication

\`\`\`void
---
type: auth
attrs:
  uid: create-user-auth
  authType: bearer
---
\`\`\`

### Request Headers

\`\`\`void
---
type: headers-table
attrs:
  uid: create-user-headers
content:
  - type: table
    rows:
      - attrs:
          disabled: false
        row:
          - Content-Type
          - application/json
      - attrs:
          disabled: false
        row:
          - Authorization
          - Bearer {{token}}
---
\`\`\`

### Request Body

\`\`\`void
---
type: json_body
attrs:
  uid: create-user-body
  body: |
    {
      "username": "johndoe",
      "email": "john@example.com",
      "role": "user"
    }
---
\`\`\`

### Response Validation

\`\`\`void
---
type: assertions-table
attrs:
  uid: create-user-assertions
content:
  - type: table
    rows:
      - attrs:
          disabled: false
        row:
          - Check status
          - status
          - equals
          - "201"
      - attrs:
          disabled: false
        row:
          - Validate response time
          - responseTime
          - less-than
          - "500"
      - attrs:
          disabled: false
        row:
          - Check user ID exists
          - body.id
          - exists
          - "true"
---
\`\`\`

## Notes

> This endpoint creates a new user in the system.
> The user will receive a verification email.

### Requirements

* Valid authentication token
* Unique email address
* Username must be 3-20 characters

### Rate Limiting

\`\`\`plaintext
Rate limit: 10 requests per minute
Burst: 20 requests
\`\`\`
`;

    const parsed = parseMarkdown(fullSpec, mockSchema);
    const serialized = serializer.serialize(mockSchema.nodeFromJSON(parsed));
    const reparsed = parseMarkdown(serialized, mockSchema);

    const expected = {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: "User Management API" }],
        },
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "Create User" }],
        },
        {
          type: "request",
          attrs: { uid: "create-user-req" },
          content: [
            {
              type: "method",
              attrs: { method: "POST", uid: "create-user-method" ,importedFrom: "", visible: true  },
            },
            {
              type: "url",
              attrs: { uid: "create-user-url" },
              content: [{ type: "text", text: "/api/v1/users" }],
            },
          ],
        },
        {
          type: "heading",
          attrs: { level: 3 },
          content: [{ type: "text", text: "Authentication" }],
        },
        {
          type: "auth",
          attrs: { uid: "create-user-auth", authType: "bearer", importedFrom: "" },
        },
        {
          type: "heading",
          attrs: { level: 3 },
          content: [{ type: "text", text: "Request Headers" }],
        },
        {
          type: "headers-table",
          attrs: { uid: "create-user-headers", importedFrom: "" },
          content: [
            {
              type: "table",
              content: [
                {
                  type: "tableRow",
                  attrs: { disabled: false },
                  content: [
                    {
                      type: "tableCell",
                      attrs: { colspan: 1, rowspan: 1, colwidth: null },
                      content: [
                        {
                          type: "paragraph",
                          content: [{ type: "text", text: "Content-Type" }],
                        },
                      ],
                    },
                    {
                      type: "tableCell",
                      attrs: { colspan: 1, rowspan: 1, colwidth: null },
                      content: [
                        {
                          type: "paragraph",
                          content: [{ type: "text", text: "application/json" }],
                        },
                      ],
                    },
                  ],
                },
                {
                  type: "tableRow",
                  attrs: { disabled: false },
                  content: [
                    {
                      type: "tableCell",
                      attrs: { colspan: 1, rowspan: 1, colwidth: null },
                      content: [
                        {
                          type: "paragraph",
                          content: [{ type: "text", text: "Authorization" }],
                        },
                      ],
                    },
                    {
                      type: "tableCell",
                      attrs: { colspan: 1, rowspan: 1, colwidth: null },
                      content: [
                        {
                          type: "paragraph",
                          content: [{ type: "text", text: "Bearer {{token}}" }],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          type: "heading",
          attrs: { level: 3 },
          content: [{ type: "text", text: "Request Body" }],
        },
        {
          type: "json_body",
          attrs: {
            uid: "create-user-body",
            body: normalizeNewlines("{\n  \"username\": \"johndoe\",\n  \"email\": \"john@example.com\",\n  \"role\": \"user\"\n}\n"),
          },
        },
        {
          type: "heading",
          attrs: { level: 3 },
          content: [{ type: "text", text: "Response Validation" }],
        },
        {
          type: "assertions-table",
          attrs: { uid: "create-user-assertions" },
          content: [
            {
              type: "table",
              content: [
                {
                  type: "tableRow",
                  attrs: { disabled: false },
                  content: [
                    {
                      type: "tableCell",
                      attrs: { colspan: 1, rowspan: 1, colwidth: null },
                      content: [
                        {
                          type: "paragraph",
                          content: [{ type: "text", text: "Check status" }],
                        },
                      ],
                    },
                    {
                      type: "tableCell",
                      attrs: { colspan: 1, rowspan: 1, colwidth: null },
                      content: [
                        {
                          type: "paragraph",
                          content: [{ type: "text", text: "status" }],
                        },
                      ],
                    },
                    {
                      type: "tableCell",
                      attrs: { colspan: 1, rowspan: 1, colwidth: null },
                      content: [
                        {
                          type: "paragraph",
                          content: [{ type: "text", text: "equals" }],
                        },
                      ],
                    },
                    {
                      type: "tableCell",
                      attrs: { colspan: 1, rowspan: 1, colwidth: null },
                      content: [
                        {
                          type: "paragraph",
                          content: [{ type: "text", text: "201" }],
                        },
                      ],
                    },
                  ],
                },
                {
                  type: "tableRow",
                  attrs: { disabled: false },
                  content: [
                    {
                      type: "tableCell",
                      attrs: { colspan: 1, rowspan: 1, colwidth: null },
                      content: [
                        {
                          type: "paragraph",
                          content: [{ type: "text", text: "Validate response time" }],
                        },
                      ],
                    },
                    {
                      type: "tableCell",
                      attrs: { colspan: 1, rowspan: 1, colwidth: null },
                      content: [
                        {
                          type: "paragraph",
                          content: [{ type: "text", text: "responseTime" }],
                        },
                      ],
                    },
                    {
                      type: "tableCell",
                      attrs: { colspan: 1, rowspan: 1, colwidth: null },
                      content: [
                        {
                          type: "paragraph",
                          content: [{ type: "text", text: "less-than" }],
                        },
                      ],
                    },
                    {
                      type: "tableCell",
                      attrs: { colspan: 1, rowspan: 1, colwidth: null },
                      content: [
                        {
                          type: "paragraph",
                          content: [{ type: "text", text: "500" }],
                        },
                      ],
                    },
                  ],
                },
                {
                  type: "tableRow",
                  attrs: { disabled: false },
                  content: [
                    {
                      type: "tableCell",
                      attrs: { colspan: 1, rowspan: 1, colwidth: null },
                      content: [
                        {
                          type: "paragraph",
                          content: [{ type: "text", text: "Check user ID exists" }],
                        },
                      ],
                    },
                    {
                      type: "tableCell",
                      attrs: { colspan: 1, rowspan: 1, colwidth: null },
                      content: [
                        {
                          type: "paragraph",
                          content: [{ type: "text", text: "body.id" }],
                        },
                      ],
                    },
                    {
                      type: "tableCell",
                      attrs: { colspan: 1, rowspan: 1, colwidth: null },
                      content: [
                        {
                          type: "paragraph",
                          content: [{ type: "text", text: "exists" }],
                        },
                      ],
                    },
                    {
                      type: "tableCell",
                      attrs: { colspan: 1, rowspan: 1, colwidth: null },
                      content: [
                        {
                          type: "paragraph",
                          content: [{ type: "text", text: "true" }],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "Notes" }],
        },
        {
          type: "blockquote",
          content: [
            {
              type: "paragraph",
              content: [
                { type: "text", text: "This endpoint creates a new user in the system.\nThe user will receive a verification email." },
              ],
            }
          ]
        },
        {
          type: "heading",
          attrs: { level: 3 },
          content: [{ type: "text", text: "Requirements" }],
        },
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [
                { type: "paragraph", content: [{ type: "text", text: "Valid authentication token" }] },
              ],
            },
            {
              type: "listItem",
              content: [
                { type: "paragraph", content: [{ type: "text", text: "Unique email address" }] },
              ],
            },
            {
              type: "listItem",
              content: [
                { type: "paragraph", content: [{ type: "text", text: "Username must be 3-20 characters" }] },
              ],
            },
          ],
        },
        {
          type: "heading",
          attrs: { level: 3 },
          content: [{ type: "text", text: "Rate Limiting" }],
        },
        {
          type: "codeBlock",
          attrs: { language: "plaintext", body: "Rate limit: 10 requests per minute\nBurst: 20 requests" },
        },
      ],
    };

    expect(reparsed).toEqual(expected);
  });
});