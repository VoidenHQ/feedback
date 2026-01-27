/**
 * Request Container Node
 *
 * Container that holds method and URL nodes for HTTP requests
 */

import { mergeAttributes, Node } from "@tiptap/core";

export const RequestNode = Node.create({
  name: "request",

  group: "block",
  content: "method url",

  isolating: true,
  defining: true,
  draggable: true,

  parseHTML() {
    return [
      {
        tag: "request",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, {}), 0];
  },

  addCommands() {
    return {
      insertTwoParagraphs:
        () =>
        ({ commands }: { commands: any }) => {
          return commands.insertContent({
            type: this.name,
            content: [
              {
                type: "method",
                content: [{ type: "text", text: "GET" }],
              },
              {
                type: "url",
                content: [{ type: "text", text: "https://" }],
              },
            ],
          });
        },
    } as any;
  },
});
