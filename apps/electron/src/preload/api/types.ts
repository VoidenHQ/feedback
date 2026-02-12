export interface FileTreeItem {
  path: string;
  type: "file" | "folder";
  name: string;
  isProjectRoot?: boolean;
}
