interface TreeNode {
  name: string;
  path: string;
  type: "file" | "folder";
  isDirty?: boolean;
  children?: TreeNode[];
}

export interface FolderNode extends TreeNode {
  type: "folder";
  children: TreeNode[];
}

export interface FileTreeItem {
  path: string;
  type: "file" | "folder";
  name: string;
}
