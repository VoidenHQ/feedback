import ListItem from "@tiptap/extension-list-item";

export const CustomListItem = ListItem.extend({
  addKeyboardShortcuts() {
    return {
      Enter: () => this.editor.commands.splitListItem(this.name),
      Backspace: ({ editor }) => {
        const { selection } = editor.state;
        const { empty, $anchor } = selection;
        const anchorPos = $anchor.pos;
        if (
          empty &&
          anchorPos === $anchor.start() &&
          editor.isActive("listItem")
        ) {
          editor.commands.toggleBulletList();
          return true;
        }
        return false;
      },
    };
  },
});
