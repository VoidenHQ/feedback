import { Extension } from "@tiptap/core";
import { Plugin } from "prosemirror-state";

export const CopyExtension = Extension.create({
  name: "copy",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          handlePaste: (view, event) => {
            const clipboardData = event.clipboardData;
            if (!clipboardData) return false;

            const text = clipboardData.getData("text/plain");
            if (text.startsWith("block://")) {
              // Remove the prefix and parse the JSON
              const jsonStr = text.slice("block://".length);
              let nodeData;
              try {
                nodeData = JSON.parse(jsonStr);
              } catch (error) {
                // console.error("Invalid JSON pasted:", error);
                return false;
              }

              // Use nodeFromJSON to create a node from the JSON object.
              let node;
              try {
                node = view.state.schema.nodeFromJSON(nodeData);
              } catch (error) {
                // console.error("Error creating node from JSON:", error);
                return false;
              }

              // Replace the current selection with the newly created node.
              const transaction = view.state.tr.replaceSelectionWith(node);
              view.dispatch(transaction);

              return true;
            }
            // Fall back to default paste behavior if our condition is not met.
            return false;
          },
        },
      }),
    ];
  },
});
