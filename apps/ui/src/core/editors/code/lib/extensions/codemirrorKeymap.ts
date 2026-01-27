import { Editor } from "@tiptap/core";
import { ResolvedPos } from "@tiptap/pm/model";
import { CodeNodeViewRendererProps } from "../components/TiptapCodeEditorWrapper.tsx";

const navigateUp = (editor: Editor, getPos: () => number) => {
  const currentPosition = getPos();
  const $pos = editor.state.doc.resolve(currentPosition);
  // Find the position before the current node
  const before = $pos.before($pos.depth);
  if (before > 0) {
    // Resolve the position before current node
    const $before = editor.state.doc.resolve(before - 1);
    // Try to find the nearest valid position going backwards
    const targetPos = editor.state.selection.constructor.near($before, -1);
    return editor
      .chain()
      .focus()
      .setTextSelection(targetPos.from)
      .run();
  }
  return false;
};

const navigateDown = (editor: Editor, getPos: () => number) => {
  const currentPosition = getPos();
  const nodeSize = editor.state.doc.nodeAt(currentPosition)?.nodeSize ?? 0;
  const endOfNodePosition = currentPosition + nodeSize;
  const resolvedPosition = editor.state.doc.resolve(endOfNodePosition);
  return handleEndOfDocument(editor, resolvedPosition);
};

const handleEndOfDocument = (editor: Editor, resolvedPosition: ResolvedPos) => {
  if (resolvedPosition.nodeAfter === null) {
    return insertNewParagraph(editor);
  } else {
    return focusNextNode(editor, resolvedPosition.pos);
  }
};

const insertNewParagraph = (editor: Editor) => {
  return editor
    .chain()
    .focus()
    .insertContentAt(editor.state.selection.to, { type: "paragraph" })
    .focus() // Focus the new paragraph
    .run();
};

const focusNextNode = (editor: Editor, position: number) => {
  return editor.chain().selectNodeForward().focus(position).run();
};

export const codemirrorKeymap = (props: CodeNodeViewRendererProps) => {
  return [
    {
      key: "ArrowUp",
      run: () => navigateUp(props.editor, props.getPos as () => number),
    },
    {
      key: "ArrowDown",
      run: () => navigateDown(props.editor, props.getPos as () => number),
    },
  ];
};
