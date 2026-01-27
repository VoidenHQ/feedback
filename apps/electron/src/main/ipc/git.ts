import { ipcMain, IpcMainInvokeEvent } from "electron";
import simpleGit from "simple-git";
import { getActiveProject } from "../state";

export function registerGitIpcHandlers() {
  // Get git repository root directory
  ipcMain.handle("git:getRepoRoot", async (event:IpcMainInvokeEvent) => {
    const activeProject = await getActiveProject(event);
    if (!activeProject) {
      return null;
    }

    try {
      const git = simpleGit(activeProject);
      const isRepo = await git.checkIsRepo();
      if (!isRepo) {
        return null;
      }
      const root = await git.revparse(["--show-toplevel"]);
      return root.trim();
    } catch (error) {
      return null;
    }
  });

  // Get working directory status (all changed files)
  ipcMain.handle("git:getStatus", async (event:IpcMainInvokeEvent) => {
    const activeProject = await getActiveProject(event);
    if (!activeProject) {
      return null;
    }

    try {
      const git = simpleGit(activeProject);

      // Check if it's a git repository first
      const isRepo = await git.checkIsRepo();
      if (!isRepo) {
        return null;
      }

      const status = await git.status();

      return {
        files: [...status.staged, ...status.modified, ...status.not_added, ...status.deleted].map(file => ({
          path: file,
          status: status.staged.includes(file) ? 'staged' :
                  status.modified.includes(file) ? 'modified' :
                  status.not_added.includes(file) ? 'untracked' : 'deleted'
        })),
        staged: status.staged,
        modified: status.modified,
        untracked: status.not_added,
        deleted: status.deleted,
        current: status.current,
        tracking: status.tracking,
        ahead: status.ahead,
        behind: status.behind,
      };
    } catch (error) {
      console.error("Error getting git status:", error);
      return null;
    }
  });

  // Stage files
  ipcMain.handle("git:stage", async (event:IpcMainInvokeEvent, files: string[]) => {
    const activeProject = await getActiveProject(event);
    if (!activeProject) {
      throw new Error("No active project selected.");
    }

    try {
      const git = simpleGit(activeProject);
      const isRepo = await git.checkIsRepo();
      if (!isRepo) {
        throw new Error("Not a git repository");
      }
      await git.add(files);
      return true;
    } catch (error) {
      console.error("Error staging files:", error);
      throw error;
    }
  });

  // Unstage files
  ipcMain.handle("git:unstage", async (event:IpcMainInvokeEvent, files: string[]) => {
    const activeProject = await getActiveProject(event);
    if (!activeProject) {
      throw new Error("No active project selected.");
    }

    try {
      const git = simpleGit(activeProject);
      const isRepo = await git.checkIsRepo();
      if (!isRepo) {
        throw new Error("Not a git repository");
      }
      await git.reset(['HEAD', '--', ...files]);
      return true;
    } catch (error) {
      console.error("Error unstaging files:", error);
      throw error;
    }
  });

  // Commit staged changes
  ipcMain.handle("git:commit", async (event:IpcMainInvokeEvent, message: string) => {
    const activeProject = await getActiveProject(event);
    if (!activeProject) {
      throw new Error("No active project selected.");
    }

    try {
      const git = simpleGit(activeProject);
      const isRepo = await git.checkIsRepo();
      if (!isRepo) {
        throw new Error("Not a git repository");
      }
      const result = await git.commit(message);
      return result;
    } catch (error) {
      console.error("Error committing changes:", error);
      throw error;
    }
  });

  // Discard changes in working directory
  ipcMain.handle("git:discard", async (event:IpcMainInvokeEvent, files: string[]) => {
    const activeProject = await getActiveProject(event);
    if (!activeProject) {
      throw new Error("No active project selected.");
    }

    try {
      const git = simpleGit(activeProject);
      const isRepo = await git.checkIsRepo();
      if (!isRepo) {
        throw new Error("Not a git repository");
      }

      // Use git restore (modern) or checkout (fallback) to discard changes
      // Try restore first (Git 2.23+), fall back to checkout if it fails
      try {
        await git.raw(['restore', ...files]);
      } catch (restoreError) {
        // Fallback to checkout for older git versions
        await git.checkout(['--', ...files]);
      }

      return true;
    } catch (error: any) {
      console.error("Error discarding changes:", error);

      // Provide helpful error message for lock file issues
      if (error.message?.includes('index.lock')) {
        throw new Error(
          'Git index is locked. Another git process may be running. ' +
          'If not, remove .git/index.lock manually and try again.'
        );
      }

      throw error;
    }
  });

  // Get commit history/log with graph information
  ipcMain.handle("git:getLog", async (event:IpcMainInvokeEvent, limit: number = 50) => {
    const activeProject = await getActiveProject(event);
    if (!activeProject) {
      return null;
    }

    try {
      const git = simpleGit(activeProject);
      const isRepo = await git.checkIsRepo();
      if (!isRepo) {
        return null;
      }

      // Get log with parent information for graph building
      const log = await git.log({
        maxCount: limit,
        format: {
          hash: '%H',
          parents: '%P',
          message: '%s',
          author: '%an',
          date: '%ai',
          refs: '%D',
        }
      });

      return {
        all: log.all.map(commit => ({
          hash: commit.hash,
          shortHash: commit.hash.substring(0, 7),
          message: commit.message,
          author: commit.author,
          date: commit.date,
          refs: commit.refs || '',
          parents: (commit as any).parents ? (commit as any).parents.split(' ').filter(Boolean) : [],
        })),
        latest: log.latest,
      };
    } catch (error) {
      console.error("Error getting git log:", error);
      return null;
    }
  });

  // Get files changed in a specific commit
  ipcMain.handle("git:getCommitFiles", async (event, commitHash: string) => {
    const activeProject = await getActiveProject(event);
    if (!activeProject) {
      return [];
    }

    try {
      const git = simpleGit(activeProject);
      const isRepo = await git.checkIsRepo();
      if (!isRepo) {
        return [];
      }

      // Get diff stat for the commit
      const diffSummary = await git.diffSummary([`${commitHash}^`, commitHash]);

      return diffSummary.files.map(file => ({
        path: file.file,
        changes: file.changes,
        insertions: file.insertions,
        deletions: file.deletions,
      }));
    } catch (error) {
      console.error("Error getting commit files:", error);
      return [];
    }
  });

  ipcMain.handle("git:get-remote", async (_event, _projectName: string) => {
    const activeProject = await getActiveProject(_event);
    if (!activeProject) {
      return null;
    }

    try {
      const git = simpleGit(activeProject);
      const isRepo = await git.checkIsRepo();
      if (!isRepo) {
        return null;
      }
      const remotes = await git.getConfig("remote.origin.url");
      return remotes;
    } catch (error) {
      console.error("Error getting git remote:", error);
      return null;
    }
  });

  ipcMain.handle("git:add-remote", async (_event, _projectName: string, remoteUrl: string) => {
    const activeProject = await getActiveProject(_event);
    if (!activeProject) {
      throw new Error("No active project selected.");
    }

    try {
      const git = simpleGit(activeProject);
      const isRepo = await git.checkIsRepo();
      if (!isRepo) {
        throw new Error("Not a git repository");
      }
      await git.addRemote("origin", remoteUrl);
    } catch (error) {
      console.error("Error adding git remote:", error);
      throw error;
    }
  });

  ipcMain.handle("git:push", async (_event, _projectName: string) => {
    const activeProject = await getActiveProject(_event);
    if (!activeProject) {
      throw new Error("No active project selected.");
    }

    try {
      const git = simpleGit(activeProject);
      const isRepo = await git.checkIsRepo();
      if (!isRepo) {
        throw new Error("Not a git repository");
      }
      await git.push("origin", "master", ["-uf"]);
    } catch (error) {
      console.error("Error pushing to git remote:", error);
      throw error;
    }
  });
}
