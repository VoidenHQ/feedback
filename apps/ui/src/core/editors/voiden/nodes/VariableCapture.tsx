import { CellSelection } from "@tiptap/pm/tables";
import { Editor, mergeAttributes, Node, NodeViewProps } from "@tiptap/core";
import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import { RequestBlockHeader } from "./RequestBlockHeader";
import { RuntimeVariablesHelp } from "./help";

export function isCellSelection(value: unknown): value is CellSelection {
  return value instanceof CellSelection;
}

const TableWrapperNode = Node.create({
  name: "table-wrapper",
  group: "block",
  content: "table",
  parseHTML() {
    return [{ tag: "table-wrapper" }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "table-wrapper",
      mergeAttributes(HTMLAttributes, {
        class: "w-full overflow-auto",
      }),
      0,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(TableNodeView);
  },
});

const createNodeView =
  (title: string) =>
  ({ editor, node }: NodeViewProps) => {
    const isEditable = !node?.attrs?.importedFrom;

    return (
      <NodeViewWrapper spellCheck="false" className="my-2">
        <RequestBlockHeader
          withBorder
          title="Runtime Variables"
          editor={editor}
          importedDocumentId={node.attrs.importedFrom}
          helpContent={<RuntimeVariablesHelp />}
        />
        <div
          className="w-full max-w-full"
          contentEditable={editor.isEditable && isEditable}
          suppressContentEditableWarning
          style={{
            pointerEvents: !isEditable ? "none" : "unset",
          }}
        >
          <NodeViewContent />
        </div>
      </NodeViewWrapper>
    );
  };

const TableNodeView = (props: { editor: Editor }) => {
  return (
    <NodeViewWrapper>
      <span className="pointer-none" tabIndex={-1} contentEditable={false}>
        Table
      </span>
      <NodeViewContent />
    </NodeViewWrapper>
  );
};

export const VariableCapture = TableWrapperNode.extend({
    name: "runtime-variables",
    addAttributes() {
      return {
        importedFrom: {
          default: "",
        },
      };
    },
    parseHTML() {
      return [{ tag: "runtime-variables" }];
    },
    renderHTML({ HTMLAttributes }) {
      return ["runtime-variables", mergeAttributes(HTMLAttributes), 0];
    },
    addNodeView() {
      return ReactNodeViewRenderer(
        createNodeView("runtime-variables")
      );
    },
  });
  