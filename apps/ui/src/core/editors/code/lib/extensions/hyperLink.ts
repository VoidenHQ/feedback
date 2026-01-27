import {
  ViewPlugin,
  EditorView,
  Decoration,
  DecorationSet,
  WidgetType,
} from "@codemirror/view";
import { Extension, StateField, StateEffect } from "@codemirror/state";

const refRegexp = /\$ref:\s*"([^"]+)"/gi;

interface FileInfo {
  id: string;
  filePath: string;
}

interface HyperLinkState {
  at: number;
  filePath: string;
  documentId: string;
}

class HyperLink extends WidgetType {
  private readonly state: HyperLinkState;
  constructor(state: HyperLinkState) {
    super();
    this.state = state;
  }
  eq(other: HyperLink) {
    return (
      this.state.filePath === other.state.filePath &&
      this.state.at === other.state.at &&
      this.state.documentId === other.state.documentId
    );
  }

  toDOM() {
    const wrapper = document.createElement("a");
    wrapper.textContent = this.state.filePath;
    wrapper.className = "cm-hyper-link";
    wrapper.href = "#";
    wrapper.onclick = (event) => {
      event.preventDefault();
      navigateToDocument(this.state.documentId);
    };
    wrapper.rel = "nofollow";
    return wrapper;
  }
}

const addHyperLink = StateEffect.define<HyperLinkState>();
const removeHyperLink = StateEffect.define<null>();

const hyperLinkField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(hyperLinks, tr) {
    hyperLinks = hyperLinks.map(tr.changes);
    for (const e of tr.effects) {
      if (e.is(addHyperLink)) {
        const widget = new HyperLink(e.value);
        hyperLinks = hyperLinks.update({
          add: [
            Decoration.replace({ widget, inclusive: true }).range(
              e.value.at,
              e.value.at + e.value.filePath.length,
            ),
          ],
        });
      } else if (e.is(removeHyperLink)) {
        hyperLinks = Decoration.none;
      }
    }
    return hyperLinks;
  },
  provide: (f) => EditorView.decorations.from(f),
});

function hyperLinkExtension(fileInfos: FileInfo[]) {
  return [
    hyperLinkField,
    ViewPlugin.define((view) => {
      let currentMatch: HyperLinkState | null = null;
      let isMetaKeyPressed = false;

      function checkHover(e: MouseEvent) {
        const pos = view.posAtCoords({ x: e.clientX, y: e.clientY });
        if (pos === null) return;

        const line = view.state.doc.lineAt(pos);
        const lineText = line.text;

        refRegexp.lastIndex = 0;
        let match;
        while ((match = refRegexp.exec(lineText)) !== null) {
          const from = line.from + match.index + match[0].indexOf('"') + 1;
          const to = line.from + match.index + match[0].lastIndexOf('"');
          if (pos >= from && pos <= to) {
            const filePath = match[1];
            const fileInfo = fileInfos.find((fi) => fi.filePath === filePath);
            if (fileInfo) {
              if (
                currentMatch === null ||
                currentMatch.at !== from ||
                currentMatch.filePath !== filePath
              ) {
                currentMatch = { at: from, filePath, documentId: fileInfo.id };
                updateHyperLink();
              }
            }
            return;
          }
        }
        if (currentMatch !== null) {
          currentMatch = null;
          updateHyperLink();
        }
      }

      function updateHyperLink() {
        if (isMetaKeyPressed && currentMatch) {
          view.dispatch({
            effects: addHyperLink.of(currentMatch),
          });
        } else {
          view.dispatch({
            effects: removeHyperLink.of(null),
          });
        }
      }

      function handleKeyDown(e: KeyboardEvent) {
        if (e.metaKey && !isMetaKeyPressed) {
          isMetaKeyPressed = true;
          updateHyperLink();
        }
      }

      function handleKeyUp(e: KeyboardEvent) {
        if (!e.metaKey && isMetaKeyPressed) {
          isMetaKeyPressed = false;
          updateHyperLink();
        }
      }

      view.dom.addEventListener("mousemove", checkHover);
      view.dom.addEventListener("keydown", handleKeyDown);
      view.dom.addEventListener("keyup", handleKeyUp);

      return {
        destroy() {
          view.dom.removeEventListener("mousemove", checkHover);
          view.dom.removeEventListener("keydown", handleKeyDown);
          view.dom.removeEventListener("keyup", handleKeyUp);
        },
      };
    }),
  ];
}

const hyperLinkStyle = EditorView.baseTheme({
  ".cm-hyper-link": {
    color: "#0000EE",
    textDecoration: "underline",
    cursor: "pointer",
  },
});

function navigateToDocument(documentId: string) {
  const url = new URL(window.location.href);
  const pathname = url.pathname;

  const basePath = pathname.split("/").slice(0, -1).join("/");
  const redirectUrl = `${basePath}/${documentId}`;
  window.history.pushState({}, "", redirectUrl);
}

export function createHyperLink(fileInfos: FileInfo[]): Extension {
  return [hyperLinkExtension(fileInfos), hyperLinkStyle];
}
