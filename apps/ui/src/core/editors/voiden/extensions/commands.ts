import { PRIORITIES } from "@/constants";
import { Extension } from "@tiptap/core";
import { PluginKey } from "@tiptap/pm/state";
import { Editor } from "@tiptap/react";
import Suggestion from "@tiptap/suggestion";
import { getAllowedSuggestionPopup } from "./utils";

const CommandPluginKey = new PluginKey("commnd");

export const commands = Extension.create({
  name: "command",
  // setting high priority for commands to override event triggers from other components
  priority: PRIORITIES.COMMAND,
  addOptions() {
    return {
      suggestion: {
        char: "/",
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
        pluginKey: CommandPluginKey,
        editor: this.editor,
        ...this.options.suggestion,
        // startOfLine: true,
        allow: getAllowedSuggestionPopup("command"),
      }),
    ];
  },
});
