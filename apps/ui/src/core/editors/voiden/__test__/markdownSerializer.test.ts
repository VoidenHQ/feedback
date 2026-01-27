import { describe, it, expect } from "vitest";
import { parseMarkdown, createMarkdownSerializer } from "@/core/editors/voiden/markdownConverter";
import { Schema } from "@tiptap/pm/model";

// Helper to normalize platform-specific newlines for exact comparisons
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


describe("Markdown Serializer - Basics ", () => {
  const serializer = createMarkdownSerializer(mockSchema);

  it("voiden test : serialize basic paragraph to markdown", () => {
    // Opposite of: parse basic text in paragraph
    const node = mockSchema.nodeFromJSON({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Hello world" }],
        },
      ],
    });

    const result = serializer.serialize(node);
    expect(normalizeNewlines(result.trim())).toBe(normalizeNewlines("Hello world"));
  });

  it("voiden test : serialize multiple paragraphs with exact content", () => {
    // Opposite of: parse multiple paragraphs
    const node = mockSchema.nodeFromJSON({
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
    });

    const result = serializer.serialize(node);
    expect(normalizeNewlines(result.trim())).toBe(normalizeNewlines("Para 1\n\nPara 2"));
  });

  it("voiden test : serialize headings at all levels with exact format", () => {
    // Opposite of: parse headings at different levels
    const node = mockSchema.nodeFromJSON({
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
    });

    const result = serializer.serialize(node);
    expect(normalizeNewlines(result.trim())).toBe(normalizeNewlines("# H1\n\n## H2\n\n### H3"));
  });

  it("voiden test : serialize bullet lists with exact format", () => {
    // Opposite of: parse bullet lists
    const node = mockSchema.nodeFromJSON({
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
    });

    const result = serializer.serialize(node);
    expect(normalizeNewlines(result.trim())).toBe(normalizeNewlines("* Item 1\n\n* Item 2".trim()));
  });

  it("voiden test : serialize ordered lists with exact format", () => {
    // Opposite of: parse ordered lists
    const node = mockSchema.nodeFromJSON({
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
    });

    const result = serializer.serialize(node);
    expect(normalizeNewlines(result.trim())).toBe(normalizeNewlines("1. First\n\n2. Second"));
  });

  it("voiden test : serialize blockquotes with exact format", () => {
    // Opposite of: parse blockquotes
    const node = mockSchema.nodeFromJSON({
      type: "doc",
      content: [
        {
          type: "blockquote",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Quote text" }],
            },
          ],
        },
      ],
    });

    const result = serializer.serialize(node);
    expect(normalizeNewlines(result.trim())).toBe(normalizeNewlines("> Quote text"));
  });

  it("voiden test : serialize code blocks with exact format", () => {
    // Opposite of: parse code blocks with language
    const node = mockSchema.nodeFromJSON({
      type: "doc",
      content: [
        {
          type: "codeBlock",
          attrs: { language: "javascript", body: "const x = 1;" },
          content: [{ type: "text", text: "const x = 1;" }],
        },
      ],
    });

    const result = serializer.serialize(node);
    expect(normalizeNewlines(result.trim())).toBe(normalizeNewlines("```javascript\nconst x = 1;\n```"));
  });
});

describe("Markdown Serializer - Custom Voiden Nodes ", () => {
  const serializer = createMarkdownSerializer(mockSchema);

  it("voiden test : serialize method node with exact json", () => {
    // Opposite of: parse method node
    const node = mockSchema.nodeFromJSON({
      type: "doc",
      content: [
        {
          type: "method",
          attrs: {
            uid: "test-123",
            method: "POST",
            importedFrom: "",
            visible: true,
          },
          content: [],
        },
      ],
    });

    const result = serializer.serialize(node);
    const expected = `\`\`\`void
---
type: method
attrs:
  uid: test-123
  method: POST
  importedFrom: ""
  visible: true
---
\`\`\``;
    expect(normalizeNewlines(result.trim())).toBe(normalizeNewlines(expected));
  });

  it("voiden test : serialize url node with exact content", () => {
    // Opposite of: parse url node
    const node = mockSchema.nodeFromJSON({
      type: "doc",
      content: [
        {
          type: "url",
          attrs: { uid: "url-123" },
          content: [{ type: "text", text: "/api/users" }],
        },
      ],
    });

    const result = serializer.serialize(node);
    const expected = `\`\`\`void
---
type: url
attrs:
  uid: url-123
content: /api/users
---
\`\`\``;
    expect(normalizeNewlines(result.trim())).toBe(normalizeNewlines(expected));
  });

  it("voiden test : serialize json body node with exact json", () => {
    // Opposite of: parse json_body node
    const bodyJson = '{"name":"test","value":123}';
    const node = mockSchema.nodeFromJSON({
      type: "doc",
      content: [
        {
          type: "json_body",
          attrs: {
            uid: "json-123",
            body: bodyJson,
          },
          content: [],
        },
      ],
    });

    const result = serializer.serialize(node);
    const expected = `\`\`\`void
---
type: json_body
attrs:
  uid: json-123
  body: '${bodyJson}'
---
\`\`\``;
    expect(normalizeNewlines(result.trim())).toBe(normalizeNewlines(expected));
  });

  it("voiden test : serialize xml body node with exact format", () => {
    // Opposite of: parse xml_body node
    const xmlContent = '<root><item>test</item></root>';
    const node = mockSchema.nodeFromJSON({
      type: "doc",
      content: [
        {
          type: "xml_body",
          attrs: {
            uid: "xml-123",
            body: xmlContent,
          },
          content: [],
        },
      ],
    });

    const result = serializer.serialize(node);
    const expected = `\`\`\`void
---
type: xml_body
attrs:
  uid: xml-123
  body: ${xmlContent}
---
\`\`\``;
    expect(normalizeNewlines(result.trim())).toBe(normalizeNewlines(expected));
  });

  it("voiden test : serialize runtime variables table with exact content", () => {
    // Opposite of: parse runtime-variables node with table
    const node = mockSchema.nodeFromJSON({
      type: "doc",
      content: [
        {
          type: "runtime-variables",
          attrs: { uid: "rv-123" },
          content: [
            {
              type: "table",
              content: [
                {
                  type: "tableRow",
                  content: [
                    {
                      type: "tableHeader",
                      content: [
                        {
                          type: "paragraph",
                          content: [{ type: "text", text: "Name" }],
                        },
                      ],
                    },
                    {
                      type: "tableHeader",
                      content: [
                        {
                          type: "paragraph",
                          content: [{ type: "text", text: "Value" }],
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
    });

    const result = serializer.serialize(node);
    const expected = `\`\`\`void
---
type: runtime-variables
attrs:
  uid: rv-123
  importedFrom: ""
content:
  - type: table
    rows:
      - attrs:
          disabled: false
        row:
          - Name
          - Value
---
\`\`\``;
    expect(normalizeNewlines(result.trim())).toBe(normalizeNewlines(expected));
  });

  it("voiden test : serialize request node with exact json", () => {
    // Opposite of: parse request node with method and url
    const node = mockSchema.nodeFromJSON({
      type: "doc",
      content: [
        {
          type: "request",
          attrs: { uid: "req-123" },
          content: [
            {
              type: "method",
              attrs: {
                uid: "m-123",
                method: "GET",
                importedFrom: "",
                visible: true,
              },
              content: [],
            },
            {
              type: "url",
              attrs: { uid: "u-123" },
              content: [{ type: "text", text: "https://api.com" }],
            },
          ],
        },
      ],
    });

    const result = serializer.serialize(node);
    const expected = `\`\`\`void
---
type: request
attrs:
  uid: req-123
content:
  - type: method
    attrs:
      uid: m-123
      method: GET
      importedFrom: ""
      visible: true
  - type: url
    attrs:
      uid: u-123
    content: https://api.com
---
\`\`\``;
    expect(normalizeNewlines(result.trim())).toBe(normalizeNewlines(expected));
  });

  it("voiden test : serialize assertions table with exact format", () => {
    // Opposite of: parse assertions-table node
    const node = mockSchema.nodeFromJSON({
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
                  content: [
                    {
                      type: "tableHeader",
                      content: [
                        {
                          type: "paragraph",
                          content: [{ type: "text", text: "Assertion" }],
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
    });

    const result = serializer.serialize(node);
    const expected = `\`\`\`void
---
type: assertions-table
attrs:
  uid: assert-123
content:
  - type: table
    rows:
      - attrs:
          disabled: false
        row:
          - Assertion
---
\`\`\``;
    expect(normalizeNewlines(result.trim())).toBe(normalizeNewlines(expected));
  });

  it("voiden test : serialize auth node with exact json", () => {
    // Opposite of: parse auth node
    const node = mockSchema.nodeFromJSON({
      type: "doc",
      content: [
        {
          type: "auth",
          attrs: { uid: "auth-123", authType: "bearer" },
          content: [
            {
              type: "table",
              content: [
                {
                  type: "tableRow",
                  content: [
                    {
                      type: "tableCell",
                      content: [
                        {
                          type: "paragraph",
                          content: [{ type: "text", text: "token" }],
                        },
                      ],
                    },
                    {
                      type: "tableCell",
                      content: [
                        {
                          type: "paragraph",
                          content: [{ type: "text", text: "abc123" }],
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
    });

    const result = serializer.serialize(node);
    const expected = `\`\`\`void
---
type: auth
attrs:
  uid: auth-123
  authType: bearer
  importedFrom: ""
content:
  - type: table
    rows:
      - attrs:
          disabled: false
        row:
          - token
          - abc123
---
\`\`\``;
    expect(result.trim()).toBe(expected);
  });


});

describe("Markdown Serializer - Negative Cases ", () => {
  const serializer = createMarkdownSerializer(mockSchema);

  it("voiden test : serialize empty document without errors", () => {
    // Opposite of: handle empty markdown
    const node = mockSchema.nodeFromJSON({
      type: "doc",
      content: [],
    });

    expect(() => serializer.serialize(node)).not.toThrow();
    const result = serializer.serialize(node);
    expect(typeof result).toBe("string");
  });

  it("voiden test : serialize node with missing attrs without errors", () => {
    // Opposite of: handle void block with missing type
    const node = mockSchema.nodeFromJSON({
      type: "doc",
      content: [
        {
          type: "method",
          content: [],
        },
      ],
    });

    expect(() => serializer.serialize(node)).not.toThrow();
    const result = serializer.serialize(node);
    const expected = `\`\`\`void
---
type: method
attrs:
  uid: ""
  method: GET
  importedFrom: ""
  visible: true
---
\`\`\``;
    expect(normalizeNewlines(result.trim())).toBe(normalizeNewlines(expected));
  });

  it("voiden test : serialize node with null content without errors", () => {
    // Opposite of: handle void block with missing closing delimiters
    const node = mockSchema.nodeFromJSON({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [],
        },
      ],
    });

    expect(() => serializer.serialize(node)).not.toThrow();
  });

  it("voiden test : serialize corrupted heading without errors", () => {
    // Opposite of: handle corrupted heading markdown
    const node = mockSchema.nodeFromJSON({
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 0 },
          content: [{ type: "text", text: "Bad heading" }],
        },
      ],
    });

    expect(() => serializer.serialize(node)).not.toThrow();
  });

  it("voiden test : serialize incomplete list items without errors", () => {
    // Opposite of: handle incomplete list items
    const node = mockSchema.nodeFromJSON({
      type: "doc",
      content: [
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [],
            },
          ],
        },
      ],
    });

    expect(() => serializer.serialize(node)).not.toThrow();
  });
});

describe("Markdown Serializer - Round-Trip Conversion ", () => {
  const serializer = createMarkdownSerializer(mockSchema);

  it("voiden test : round-trip basic markdown preserves structure", () => {
    // Opposite: Parse -> Serialize -> Parse should preserve type structure
    const jsonNode = {
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
    };

    const serialized = serializer.serialize(mockSchema.nodeFromJSON(jsonNode));
    const reparsed = parseMarkdown(normalizeNewlines(serialized), mockSchema);

    expect(reparsed.content?.[0].type).toBe("heading");
    expect(reparsed.content?.[0].content?.[0].text).toBe("Heading");
    expect(reparsed.content?.[1].type).toBe("paragraph");
    expect(reparsed.content?.[1].content?.[0].text).toBe("Paragraph text");
  });

  it("voiden test : round-trip method node preserves json attributes", () => {
    // Opposite: Serialize method -> Parse -> Verify all attrs match
    const original = {
      type: "doc",
      content: [
        {
          type: "method",
          attrs: {
            uid: "method-123",
            method: "PUT",
            importedFrom: "postman",
            visible: true,
          },
          content: [],
        },
      ],
    };

    const serialized = serializer.serialize(mockSchema.nodeFromJSON(original));
    const reparsed = parseMarkdown(normalizeNewlines(serialized), mockSchema);

    expect(reparsed.content?.[0].type).toBe("method");
    expect(reparsed.content?.[0].attrs?.method).toBe("PUT");
    expect(reparsed.content?.[0].attrs?.uid).toBe("method-123");
  });

  it("voiden test : round-trip url node preserves content exactly", () => {
    // Opposite: Serialize URL -> Parse -> Verify content matches
    const original = {
      type: "doc",
      content: [
        {
          type: "url",
          attrs: { uid: "url-456" },
          content: [{ type: "text", text: "/api/v2/users/123" }],
        },
      ],
    };

    const serialized = serializer.serialize(mockSchema.nodeFromJSON(original));
    const reparsed = parseMarkdown(normalizeNewlines(serialized), mockSchema);

    expect(reparsed.content?.[0].type).toBe("url");
    expect(reparsed.content?.[0].content?.[0].text).toBe("/api/v2/users/123");
  });

  it("voiden test : round-trip json body preserves json content", () => {
    // Opposite: Serialize JSON body -> Parse -> Verify JSON preserved
    const jsonBody = '{"users":[{"id":1,"name":"John"}],"count":1}';
    const original = {
      type: "doc",
      content: [
        {
          type: "json_body",
          attrs: {
            uid: "json-789",
            body: jsonBody,
          },
          content: [],
        },
      ],
    };

    const serialized = serializer.serialize(mockSchema.nodeFromJSON(original));
    const reparsed = parseMarkdown(normalizeNewlines(serialized), mockSchema);

    expect(reparsed.content?.[0].type).toBe("json_body");
    expect(reparsed.content?.[0].attrs?.body).toBe(jsonBody);
  });

  it("voiden test : round-trip complex document preserves all nodes", () => {
    // Opposite: Full document structure preservation
    const original = {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: "API Spec" }],
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "Documentation" }],
        },
        {
          type: "method",
          attrs: {
            uid: "m1",
            method: "POST",
            importedFrom: "",
            visible: true,
          },
          content: [],
        },
        {
          type: "url",
          attrs: { uid: "u1" },
          content: [{ type: "text", text: "/create" }],
        },
        {
          type: "json_body",
          attrs: { uid: "j1", body: '{"id":1}' },
          content: [],
        },
      ],
    };

    const serialized = serializer.serialize(mockSchema.nodeFromJSON(original));
    const reparsed = parseMarkdown(serialized, mockSchema);

    expect(reparsed.content).toHaveLength(5);
    expect(reparsed.content?.[0].type).toBe("heading");
    expect(reparsed.content?.[2].type).toBe("method");
    expect(reparsed.content?.[3].type).toBe("url");
    expect(reparsed.content?.[4].type).toBe("json_body");
  });

  it("voiden test : round-trip maintains data integrity through multiple cycles", () => {
    // Opposite: Multiple conversions preserve data
    const original = {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 2 },
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
                  content: [{ type: "text", text: "Item A" }],
                },
              ],
            },
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Item B" }],
                },
              ],
            },
          ],
        },
      ],
    };

    let current = mockSchema.nodeFromJSON(original);

    for (let i = 0; i < 3; i++) {
      const serialized = serializer.serialize(current);
      const reparsed = parseMarkdown(normalizeNewlines(serialized), mockSchema);
      current = mockSchema.nodeFromJSON(reparsed);
    }

    const final = serializer.serialize(current);
    expect(normalizeNewlines(final.trim())).toBe(normalizeNewlines("## Test\n\n* Item A\n\n* Item B"));
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
      uid: create-user-method
      method: POST
      importedFrom: ""
      visible: true
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
  importedFrom: ""
---
\`\`\`
### Request Headers

\`\`\`void
---
type: headers-table
attrs:
  uid: create-user-headers
  importedFrom: ""
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

* Valid authentication token\n
* Unique email address\n
* Username must be 3-20 characters\n
### Rate Limiting

\`\`\`plaintext
Rate limit: 10 requests per minute
Burst: 20 requests
\`\`\`
`;

    const fullDoc = {
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
              attrs: {  uid: "create-user-method", method: "POST",importedFrom: "", visible: true },
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
            },
          ],
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

    const serialized = serializer.serialize(mockSchema.nodeFromJSON(fullDoc));
    expect(normalizeNewlines(serialized.trim())).toBe(normalizeNewlines(fullSpec.trim()));

    const reparsed = parseMarkdown(serialized, mockSchema);
    expect(reparsed).toEqual(fullDoc);
  });
});

describe("Edge Cases - Serialization ", () => {
  const serializer = createMarkdownSerializer(mockSchema);

  it("voiden test : serialize very long text content without truncation", () => {
    // Opposite of: handle very long text content
    const longText = "a".repeat(10000);
    const node = mockSchema.nodeFromJSON({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: longText }],
        },
      ],
    });

    const result = serializer.serialize(node);
    expect(normalizeNewlines(result.trim())).toBe(normalizeNewlines(longText));
  });

  it("voiden test : serialize special characters content exactly", () => {
    // Opposite of: handle special characters in content
    const special = "Text with !@#$%^&();:'/,.<>&\"' special chars"; // * and ` is avoided to not interfere with markdown syntax
    const node = mockSchema.nodeFromJSON({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: special }],
        },
      ],
    });

    const result = serializer.serialize(node);
    expect(normalizeNewlines(result.trim())).toBe(normalizeNewlines(special));
  });

  it("voiden test : serialize unicode characters correctly", () => {
    // Opposite of: handle unicode characters
    const unicode = "Hello 世界 🌍";
    const node = mockSchema.nodeFromJSON({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: unicode }],
        },
      ],
    });

    const result = serializer.serialize(node);
    expect(normalizeNewlines(result.trim())).toBe(normalizeNewlines(unicode));
  });

  it("voiden test : serialize nested structures without errors", () => {
    // Opposite of: handle nested structures gracefully
    const node = mockSchema.nodeFromJSON({
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
                  content: [{ type: "text", text: "Nested Item" }],
                },
              ],
            },
          ],
        },
      ],
    });

    expect(() => serializer.serialize(node)).not.toThrow();
  });

  it("voiden test : serialize mixed content types with exact formatting", () => {
    // Opposite of: handle mixed content types
    const node = mockSchema.nodeFromJSON({
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
          content: [{ type: "text", text: "code" }],
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
    });

    const result = serializer.serialize(node);
    const expected = `# Title\n\nRegular text\n\n> Quote\n\n\`\`\`javascript\ncode\n\`\`\`\n\n* List item`;
    expect(normalizeNewlines(result.trim())).toBe(normalizeNewlines(expected));
  });

  it("voiden test : serialize whitespace preservation in content", () => {
    // Opposite of: preserve whitespace appropriately
    const text = "Text  with   multiple    spaces";
    const node = mockSchema.nodeFromJSON({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text }],
        },
      ],
    });

    const result = serializer.serialize(node);
    expect(normalizeNewlines(result.trim())).toBe(normalizeNewlines(text));
  });

  it("voiden test : serialize malformed structure gracefully", () => {
    // Opposite of: handle malformed markdown gracefully
    const node = mockSchema.nodeFromJSON({
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: "Heading" }],
        },
      ],
    });

    expect(() => serializer.serialize(node)).not.toThrow();
  });
});