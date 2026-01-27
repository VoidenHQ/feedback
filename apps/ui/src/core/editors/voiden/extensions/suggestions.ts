import { PRIORITIES } from "@/constants";
import { Extension } from "@tiptap/core";
import { Editor } from "@tiptap/react";
import Suggestion from "@tiptap/suggestion";
import { getAllowedSuggestionPopup, getNodeType } from "./utils";
import { PluginKey } from "@tiptap/pm/state";

const SuggestionPluginKey = new PluginKey("suggestion");

export const suggestions = Extension.create({
  name: "suggestion",
  // setting high priority for suggestions to override event triggers from other components
  priority: PRIORITIES.SUGGESTIONS,
  addOptions() {
    return {
      suggestion: {
        char: "",
        command: ({
          editor,
          range,
          props,
        }: {
          editor: Editor;
          range: Range;
          props: any;
        }) => {
          props.command({ editor, range });
        },
      },
    };
  },
  addProseMirrorPlugins() {
    return [
      Suggestion({
        pluginKey: SuggestionPluginKey,
        editor: this.editor,
        ...this.options.suggestion,
        startOfLine: true,
        allow: getAllowedSuggestionPopup("suggestion"),
      }),
    ];
  },
});
