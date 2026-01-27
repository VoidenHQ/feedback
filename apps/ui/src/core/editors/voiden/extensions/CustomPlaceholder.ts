import { Placeholder } from "./Placeholder";

export const CustomPlaceholder = Placeholder.configure({
  includeChildren: true,
  placeholder: ({ editor, node, pos }) => {
    const nodeAtPos = editor.$pos(pos);

    // if inside table return empty
    if (nodeAtPos.parent?.node.type.name === "tableRow") return;

    switch (node.type.name) {
      case "method":
        return "GET";
      case "title":
        return "Untitled";
      case "url":
        return "https://echo.apyhub.com/";
      case "heading":
        return `Heading ${node.attrs.level}`;
      case "paragraph":
        return "Write something, or press '/' for commands. Or just paste a curl.";
      case "create":
        return "untitled.yml";
      default:
        return "";
    }
  },
});
