/**
 * Socket Request Node
 *
 * Container that holds method and URL nodes for Socket requests
 */

import { mergeAttributes, Node } from "@tiptap/core";

export const SocketRequestNode = Node.create({
  name: "socket-request", 
  group: "block",
  content: "smethod surl proto?", 
  isolating: true,
  defining: true,
  draggable: true,
  parseHTML() {
    return [
      {
        tag: "socket-request",
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { class: "socket-request-block" }), 0];
  },
});
