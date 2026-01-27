import TableCell from "@tiptap/extension-table-cell";

export const CustomTableCell = TableCell.extend({
  addOptions() {
    return {
      ...this.parent?.(),
      HTMLAttributes: {
        class:
          "first:border-l-0 last:border-r-0 border-b-0 p-1 px-2 align-middle h-6 border relative box-border text-sm overflow-hidden max-w-full break-all overflow-visible w-full",
        style: "background-color: var(--editor-bg);",
      },
    };
  },
});
