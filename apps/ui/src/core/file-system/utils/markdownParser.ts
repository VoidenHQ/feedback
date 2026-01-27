import { defaultMarkdownParser, defaultMarkdownSerializer, MarkdownSerializer } from "prosemirror-markdown";
import { Editor, JSONContent } from "@tiptap/react";

export function parseMarkdown(markdown: string | undefined, filename: string) {
  const title = filename.split("/").pop()?.replace(/\.md$/, "");
  const doc: JSONContent = {
    type: "doc",
    content: [
      {
        type: "title",
        content: [{ type: "text", text: title }],
      },
    ],
  };

  // early return for empty markdown
  if (!markdown?.trim()) {
    return doc;
  }

  const lines = markdown.split("\n");
  let buffer: string[] = [];

  // dump accumulated non-special lines into the prosemirror doc
  // these are the lines that do not require special handling
  function flushBuffer() {
    if (!buffer.length) return;

    const parsedContent = defaultMarkdownParser.parse(buffer.join("\n")).toJSON();
    doc.content?.push(...(parsedContent.content || []));
    buffer = [];
  }

  // go through each line
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith("```http-endpoint")) {
      flushBuffer();

      const nextLine = lines[i + 1];
      const [method, url] = (nextLine || "").trim().split(" ");

      doc.content?.push({
        type: "method",
        attrs: { method: method || "GET", importedFrom: "", visible: true },
        content: [{ type: "text", text: method || "GET" }],
      });

      doc.content?.push({
        type: "url",
        attrs: { importedFrom: "", visible: true, isEditable: true },
        content: [{ type: "text", text: url || "" }],
      });

      i += 2;
      continue;
    }

    if (line.startsWith("```http-body-json")) {
      if (buffer.length) {
        const parsedContent = defaultMarkdownParser.parse(buffer.join("\n")).toJSON();
        doc.content?.push(...(parsedContent.content || []));
        buffer = [];
      }

      const jsonContent = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        jsonContent.push(lines[i]);
        i++;
      }

      doc.content?.push({
        type: "json_body",
        attrs: {
          importedFrom: "",
          body: jsonContent.join("\n"),
          contentType: "json",
          autofocus: false,
        },
      });

      continue;
    }

    // handle empty lines
    if (line.trim() === "") {
      if (buffer.length) {
        const parsedContent = defaultMarkdownParser.parse(buffer.join("\n")).toJSON();
        doc.content?.push(...(parsedContent.content || []));
        buffer = [];
      }
      doc.content?.push({ type: "paragraph" });
      continue;
    }

    // default case push current line to buffer
    buffer.push(line);
  }

  return doc;
}

export function serializeToMarkdown(editor: Editor) {
  const serialized = new MarkdownSerializer(
    {
      ...defaultMarkdownSerializer.nodes,
      title: () => {},
      method: (state, node) => {
        const url = editor.$node("url")?.node;
        if (node.attrs.visible) {
          state.write("```http-endpoint\n");
          state.text(node.attrs.method);
          state.write(" ");
          state.text(url?.textContent || "");
          state.write("\n```\n\n");
        }
      },
      url: () => {},
      json_body: (state, node) => {
        state.write("```http-body-json\n");
        state.text(node.attrs.body);
        state.write("\n```\n\n");
      },
    },
    {
      ...defaultMarkdownSerializer.marks,
    },
  );

  return serialized.serialize(editor.$doc.node);
}