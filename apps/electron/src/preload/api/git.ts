import { ipcRenderer } from "electron";

export const gitApi = {
  getBranches: () => ipcRenderer.invoke("git:getBranches"),
  checkout: (projectPath: string, branch: string) => ipcRenderer.invoke("git:checkout", projectPath, branch),
  createBranch: (projectPath: string, branch: string) => ipcRenderer.invoke("git:createBranch", projectPath, branch),
  updateGitignore: (filePatterns: string | string[], rootDir?: string) =>ipcRenderer.invoke("git:updateGitignore", filePatterns, rootDir),
  diffBranches: (baseBranch: string, compareBranch: string) => ipcRenderer.invoke("git:diffBranches", baseBranch, compareBranch),
  diffFile: (baseBranch: string, compareBranch: string, filePath: string) => ipcRenderer.invoke("git:diffFile", baseBranch, compareBranch, filePath),
  getFileAtBranch: (branch: string, filePath: string) => ipcRenderer.invoke("git:getFileAtBranch", branch, filePath),
  getRepoRoot: () => ipcRenderer.invoke("git:getRepoRoot"),
  getStatus: () => ipcRenderer.invoke("git:getStatus"),
  stage: (files: string[]) => ipcRenderer.invoke("git:stage", files),
  unstage: (files: string[]) => ipcRenderer.invoke("git:unstage", files),
  commit: (message: string) => ipcRenderer.invoke("git:commit", message),
  discard: (files: string[]) => ipcRenderer.invoke("git:discard", files),
  getLog: (limit?: number) => ipcRenderer.invoke("git:getLog", limit),
  getCommitFiles: (commitHash: string) => ipcRenderer.invoke("git:getCommitFiles", commitHash),
};
