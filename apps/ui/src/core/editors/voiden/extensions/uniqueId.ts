import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { v4 as uuidv4 } from "uuid";

interface UniqueIdOptions {
  types: string[];
  attributeName?: string;
}

const uniqueIdPluginKey = new PluginKey("uniqueIdPlugin");

const UniqueID = Extension.create<UniqueIdOptions>({
  name: "uniqueId",

  addOptions() {
    return {
      types: [],
      attributeName: "uid",
    };
  },

  addGlobalAttributes() {
    const attributeName = this.options.attributeName ?? "uid";

    return (this.options.types || []).map((type) => ({
      types: [type],
      attributes: {
        [attributeName]: {
          default: null,
          renderHTML: (attributes) => {
            const value = (attributes as Record<string, string | null>)[attributeName];
            return value ? { [`data-${attributeName}`]: value } : {};
          },
        },
      },
    }));
  },

  addProseMirrorPlugins() {
    const attributeName = this.options.attributeName ?? "uid";
    const nodeTypes = this.options.types || [];

    return [
      new Plugin({
        key: uniqueIdPluginKey,
        appendTransaction: (_transactions, _oldState, newState) => {
          let tr: typeof newState.tr | null = null;
          const seen = new Set<string>();

          newState.doc.descendants((node, pos) => {
            if (!nodeTypes.includes(node.type.name)) return;

            const existing = (node.attrs as Record<string, string | null | undefined>)[attributeName];

            if (existing && !seen.has(existing)) {
              seen.add(existing);
              return;
            }

            const uid = uuidv4();
            seen.add(uid);
            tr = tr ?? newState.tr;
            tr.setNodeMarkup(pos, undefined, { ...node.attrs, [attributeName]: uid }, node.marks);
          });

          return tr && tr.docChanged ? tr : null;
        },
      }),
    ];
  },
});

export default UniqueID;
