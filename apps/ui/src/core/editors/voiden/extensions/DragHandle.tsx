// @ts-nocheck

import { Editor, Extension } from "@tiptap/core";
import { Node, ResolvedPos } from "@tiptap/pm/model";
import {
  NodeSelection,
  Plugin,
  PluginKey,
  Selection,
  SelectionRange,
  TextSelection,
} from "@tiptap/pm/state";
import { Mapping } from "@tiptap/pm/transform";
import { EditorView } from "@tiptap/pm/view";
import { useEffect, useRef, useState } from "react";
import tippy, { Instance, Props } from "tippy.js";

const defaultPluginKey = new PluginKey("draghandle");

function findNodeAtCoords({
  x,
  y,
  editor,
}: {
  x: number;
  y: number;
  editor: Editor;
}) {
  let resultElement: HTMLElement | null = null;
  let resultNode: Node | null = null;
  let pos: number | null = null;
  let currentX = x;

  while (resultNode === null && currentX < window.innerWidth && currentX > 0) {
    const elements = document.elementsFromPoint(currentX, y);
    const proseMirrorIndex = elements.findIndex((el) =>
      el.classList.contains("ProseMirror"),
    );
    const elementsBeforeProseMirror = elements.slice(0, proseMirrorIndex);

    if (elementsBeforeProseMirror.length > 0) {
      const element = elementsBeforeProseMirror[0] as HTMLElement;
      resultElement = element;
      pos = editor.view.posAtDOM(element, 0);

      if (pos !== null && pos >= 0) {
        resultNode = editor.state.doc.nodeAt(Math.max(pos - 1, 0));
        if (resultNode?.isText) {
          resultNode = editor.state.doc.nodeAt(Math.max(pos - 1, 0));
        }
        if (!resultNode) {
          resultNode = editor.state.doc.nodeAt(Math.max(pos, 0));
        }
        break;
      }
    }

    currentX += 1;
  }

  return { resultElement, resultNode, pos };
}

function getClosestNodeElement(view: EditorView, element: Element) {
  let currentElement = element;
  while (
    currentElement &&
    currentElement.parentNode &&
    currentElement.parentNode !== view.dom
  ) {
    currentElement = currentElement.parentNode as HTMLElement;
  }
  return currentElement;
}

function getStyle(element: HTMLElement, property: string): string {
  return window.getComputedStyle(element)[property as any];
}

function clamp(value = 0, min = 0, max = 0): number {
  return Math.min(Math.max(value, min), max);
}

export function getInnerCoords(
  view: EditorView,
  x: number,
  y: number,
): { left: number; top: number } {
  const paddingLeft = parseInt(
    getStyle(view.dom as HTMLElement, "paddingLeft"),
    10,
  );
  const paddingRight = parseInt(
    getStyle(view.dom as HTMLElement, "paddingRight"),
    10,
  );
  const borderLeft = parseInt(
    getStyle(view.dom as HTMLElement, "borderLeftWidth"),
    10,
  );
  const borderRight = parseInt(
    getStyle(view.dom as HTMLElement, "borderRightWidth"),
    10,
  );

  const rect = view.dom.getBoundingClientRect();

  return {
    left: clamp(
      x,
      rect.left + paddingLeft + borderLeft,
      rect.right - paddingRight - borderRight,
    ),
    top: y,
  };
}

export class NodeRangeSelection extends Selection {
  ranges: TextSelection[];

  constructor(
    $anchor: ResolvedPos,
    $head: ResolvedPos,
    public depth?: number,
    bias = 1,
  ) {
    const { doc } = $anchor;
    const isSamePos = $anchor === $head;
    const isDocEnd =
      $anchor.pos === doc.content.size && $head.pos === doc.content.size;

    const $from =
      isSamePos && !isDocEnd
        ? doc.resolve($head.pos + (bias > 0 ? 1 : -1))
        : $head;
    const $to =
      isSamePos && isDocEnd
        ? doc.resolve($anchor.pos - (bias > 0 ? 1 : -1))
        : $anchor;

    const ranges = getSelectionRanges($from.min($to), $from.max($to), depth);
    super(
      $from.pos >= $anchor.pos
        ? ranges[0].$from
        : ranges[ranges.length - 1].$to,
      $from.pos >= $anchor.pos
        ? ranges[ranges.length - 1].$to
        : ranges[0].$from,
    );

    this.ranges = ranges;
  }

  get $to(): ResolvedPos {
    return this.ranges[this.ranges.length - 1].$to;
  }

  eq(other: Selection): boolean {
    return (
      other instanceof NodeRangeSelection &&
      other.$from.pos === this.$from.pos &&
      other.$to.pos === this.$to.pos
    );
  }

  map(doc: Node, mapping: Mapping): NodeRangeSelection {
    const $anchor = doc.resolve(mapping.map(this.anchor));
    const $head = doc.resolve(mapping.map(this.head));
    return new NodeRangeSelection($anchor, $head, this.depth);
  }

  toJSON(): { type: string; anchor: number; head: number } {
    return {
      type: "nodeRange",
      anchor: this.anchor,
      head: this.head,
    };
  }

  get isForwards(): boolean {
    return this.head >= this.anchor;
  }

  get isBackwards(): boolean {
    return !this.isForwards;
  }

  extendBackwards(): NodeRangeSelection {
    const { doc } = this.$from;

    if (this.isForwards && this.ranges.length > 1) {
      const newRanges = this.ranges.slice(0, -1);
      const $from = newRanges[0].$from;
      const $to = newRanges[newRanges.length - 1].$to;
      return new NodeRangeSelection($from, $to, this.depth);
    }

    const range = this.ranges[0];
    const $pos = doc.resolve(Math.max(0, range.$from.pos - 1));
    return new NodeRangeSelection(this.$anchor, $pos, this.depth);
  }

  extendForwards(): NodeRangeSelection {
    const { doc } = this.$from;

    if (this.isBackwards && this.ranges.length > 1) {
      const newRanges = this.ranges.slice(1);
      const $from = newRanges[0].$from;
      const $to = newRanges[newRanges.length - 1].$to;
      return new NodeRangeSelection($to, $from, this.depth);
    }

    const range = this.ranges[this.ranges.length - 1];
    const $pos = doc.resolve(Math.min(doc.content.size, range.$to.pos + 1));
    return new NodeRangeSelection(this.$anchor, $pos, this.depth);
  }

  static fromJSON(doc: Node, json: any): NodeRangeSelection {
    return new NodeRangeSelection(
      doc.resolve(json.anchor),
      doc.resolve(json.head),
    );
  }

  static create(
    doc: Node,
    anchor: number,
    head: number,
    depth?: number,
    bias = 1,
  ): NodeRangeSelection {
    return new this(doc.resolve(anchor), doc.resolve(head), depth, bias);
  }

  // getBookmark(): NodeRangeBookmark {
  //   return new NodeRangeBookmark(this.anchor, this.head);
  // }
}

NodeRangeSelection.prototype.visible = false;

export function getSelectionRanges(
  $from: ResolvedPos,
  $to: ResolvedPos,
  depth?: number,
): NodeRangeSelection[] {
  const ranges: NodeRangeSelection[] = [];
  const doc = $from.node(0);

  depth =
    typeof depth === "number" && depth >= 0
      ? depth
      : $from.sameParent($to)
        ? Math.max(0, $from.sharedDepth($to.pos) - 1)
        : $from.sharedDepth($to.pos);

  const nodeRange = $from.blockRange($to, depth);

  if (!nodeRange) {
    return ranges;
  }

  const startIndex =
    nodeRange.depth === 0
      ? 0
      : doc.resolve(nodeRange.start).index(nodeRange.depth - 1);

  nodeRange.parent.forEach((node, offset) => {
    const from = nodeRange.start + offset;
    const to = from + node.nodeSize;

    if (from < nodeRange.start || from >= nodeRange.end) {
      return;
    }

    const $from = doc.resolve(from);
    const $to = doc.resolve(to);
    const range = new NodeRangeSelection($from, $to);

    ranges.push(range);
  });

  return ranges;
}

function getSelectionAtEvent(
  event: DragEvent,
  editor: Editor,
): NodeSelection | null {
  const result = findNodeAtCoords({
    editor,
    x: event.clientX,
    y: event.clientY,
  });

  if (!result.resultNode || result.pos === null) {
    return null;
  }

  const coords = getInnerCoords(editor.view, event.clientX, event.clientY);
  const pos = editor.view.posAtCoords(coords);

  if (!pos) {
    return null;
  }

  const { pos: eventPos } = pos;

  if (!editor.view.state.doc.resolve(eventPos).parent) {
    return null;
  }

  const nodeSelection = NodeSelection.create(editor.view.state.doc, result.pos);

  return nodeSelection;
  // return getSelectionRanges($from, $to);
}

function cloneWithInlineStyles(element: HTMLElement): HTMLElement {
  const clone = element.cloneNode(true) as HTMLElement;

  return clone;
}

function dragHandler(event: DragEvent, editor: Editor): void {
  if (!event.dataTransfer) return;

  const selection = getSelectionAtEvent(event, editor);
  if (!selection) return;
  const slice = selection.content();

  const domFragment = cloneWithInlineStyles(
    editor.view.nodeDOM(selection.$from.pos) as HTMLElement,
  );

  const dragImage = document.createElement("div");
  dragImage.append(domFragment);

  dragImage.style.position = "absolute";
  dragImage.style.top = "-10000px";
  document.body.append(dragImage);

  event.dataTransfer.clearData();
  event.dataTransfer.setData("text/html", domFragment.innerHTML);

  event.dataTransfer.setDragImage(dragImage, 0, 0);

  editor.view.dragging = { slice, move: true };

  const { tr } = editor.view.state;
  tr.setSelection(selection);
  editor.view.dispatch(tr);

  document.addEventListener("drop", () => dragImage.remove(), { once: true });
}

const DragHandlePlugin = ({
  editor,
  element,
}: {
  editor: Editor;
  element: HTMLElement;
}) => {
  const containerElement = document.createElement("div");
  let tippyInstance: Instance<Props>;

  element.addEventListener("dragstart", (event) => {
    dragHandler(event, editor);
    setTimeout(() => {
      if (element) {
        element.style.pointerEvents = "none";
      }
    }, 0);
  });
  element.addEventListener("dragend", () => {
    if (element) {
      element.style.pointerEvents = "auto";
    }
  });
  element.addEventListener("drop", () => {
  });

  return new Plugin({
    key: defaultPluginKey,

    view(view) {
      element.draggable = true;
      element.style.pointerEvents = "auto";

      editor.view.dom.parentElement?.appendChild(containerElement);
      containerElement.appendChild(element);
      containerElement.style.pointerEvents = "none";
      containerElement.style.position = "absolute";
      containerElement.style.top = "0";
      containerElement.style.left = "0";

      tippyInstance = tippy(view.dom, {
        getReferenceClientRect: null,
        content: element,
        appendTo: containerElement,
        placement: "left-start",
        interactive: true,
        trigger: "manual",
        hideOnClick: false,
        popperOptions: {
          modifiers: [
            { name: "flip", enabled: false },
            {
              name: "preventOverflow",
              options: { rootBoundary: "document", mainAxis: false },
            },
          ],
        },
      });

      return {
        update(view, prevState) {
          if (!element || !tippyInstance) return;
        },
        destroy() {
          tippyInstance.destroy();
          containerElement.remove();
        },
      };
    },
    props: {
      handleDOMEvents: {
        mouseleave(view, event) {
          if (
            event.target &&
            !containerElement.contains(event.relatedTarget as globalThis.Node)
          ) {
            tippyInstance.hide();
          }

          return false;
        },
        mousemove(view, event) {
          function getTopLevelNode(doc: Node, pos: number) {
            const node = doc.nodeAt(pos);
            const $pos = doc.resolve(pos);
            let { depth } = $pos;
            let topLevelNode = node;

            while (depth > 0) {
              const parentNode = $pos.node(depth);
              depth -= 1;
              if (depth === 0) {
                topLevelNode = parentNode;
              }
            }

            return topLevelNode;
          }

          const result = findNodeAtCoords({
            x: event.clientX,
            y: event.clientY,
            editor,
          });

          if (!result.resultElement) return false;

          const nodeElement = getClosestNodeElement(view, result.resultElement);

          if (nodeElement === view.dom) return false;
          if (nodeElement.nodeType !== 1) return false;

          tippyInstance.setProps({
            getReferenceClientRect: () => nodeElement.getBoundingClientRect(),
          });
          tippyInstance.show();
        },
        drop: (view, event) => {
          let droppedNode: Node | null = null;
          const dropPos = view.posAtCoords({
            left: event.clientX,
            top: event.clientY,
          });

          if (!dropPos) return;

          if (view.state.selection instanceof NodeSelection) {
            droppedNode = view.state.selection.node;
          }

        },
      },
    },
  });
};

export const DragHandle = ({
  editor,
  children,
}: {
  editor: Editor;
  children: React.ReactNode;
}) => {
  const pluginRef = useRef<ReturnType<typeof DragHandlePlugin> | null>(null);
  const [element, setElement] = useState<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!element) {
      return () => {
        pluginRef.current = null;
      };
    }

    if (editor.isDestroyed) {
      return () => {
        pluginRef.current = null;
      };
    }

    if (!pluginRef.current) {
      pluginRef.current = DragHandlePlugin({ editor, element });
    }

    editor.registerPlugin(pluginRef.current);

    return () => {
      editor.unregisterPlugin(defaultPluginKey);
      pluginRef.current = null;
    };
  }, [element, editor]);
  return <div ref={setElement}>{children}</div>;
};
