import { useGetBranchDiff, useGetFileAtBranch } from "@/core/git/hooks";
import { Loader2, FileIcon, FilePlus, FileEdit, FileX, GitCompareArrows, Split, FileText } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { useState, useRef, useCallback } from "react";
import * as Diff from "diff";
import { useQuery } from "@tanstack/react-query";

// Hook to get git repository root
const useGetGitRepoRoot = () => {
  return useQuery({
    queryKey: ["git:repoRoot"],
    queryFn: async () => {
      return window.electron?.git.getRepoRoot();
    },
  });
};

// Hook to read file from filesystem (for working directory changes)
const useReadFile = (filePath: string | undefined) => {
  const { data: repoRoot } = useGetGitRepoRoot();

  return useQuery({
    queryKey: ["file:read:working", filePath],
    enabled: !!filePath && !!repoRoot,
    queryFn: async () => {
      if (!filePath || !repoRoot) return null;
      // Construct full path - filePath from git status is relative to repo root
      const fullPath = `${repoRoot}/${filePath}`;
      const content = await window.electron?.files.read(fullPath);
      return content || null;
    },
  });
};

interface DiffViewerProps {
  tab: {
    source?: string;
    meta?: {
      baseBranch: string;
      compareBranch: string;
      filePath?: string;
      isWorkingDirectory?: boolean;
    };
  };
}

type DiffMode = "split" | "unified";

export const DiffViewer = ({ tab }: DiffViewerProps) => {
  const baseBranch = tab.meta?.baseBranch;
  const compareBranch = tab.meta?.compareBranch;
  const isWorkingDirectory = tab.meta?.isWorkingDirectory;
  const singleFilePath = tab.meta?.filePath;

  // Skip branch diff if comparing with working directory
  const { data: diffData, isLoading } = useGetBranchDiff(
    isWorkingDirectory ? undefined : baseBranch,
    isWorkingDirectory ? undefined : compareBranch
  );
  const [selectedFile, setSelectedFile] = useState<string | null>(singleFilePath || null);
  const [diffMode, setDiffMode] = useState<DiffMode>("split");

  // For working directory diffs, skip to file view directly
  if (isWorkingDirectory && singleFilePath) {
    return (
      <div className="flex flex-col h-full bg-bg">
        {/* Diff Header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileIcon size={16} className="text-comment" />
            <span className="text-sm font-mono text-text">{singleFilePath}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDiffMode("split")}
              className={cn(
                "px-3 py-1 text-xs rounded flex items-center gap-1 transition-colors",
                diffMode === "split"
                  ? "bg-accent text-bg"
                  : "bg-active text-comment hover:text-text"
              )}
            >
              <Split size={12} />
              Split
            </button>
            <button
              onClick={() => setDiffMode("unified")}
              className={cn(
                "px-3 py-1 text-xs rounded flex items-center gap-1 transition-colors",
                diffMode === "unified"
                  ? "bg-accent text-bg"
                  : "bg-active text-comment hover:text-text"
              )}
            >
              <FileText size={12} />
              Unified
            </button>
          </div>
        </div>

        {/* Diff Display */}
        <FileDiffContent
          baseBranch={baseBranch}
          compareBranch={compareBranch}
          filePath={singleFilePath}
          mode={diffMode}
          isWorkingDirectory={isWorkingDirectory}
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="animate-spin text-comment" size={24} />
      </div>
    );
  }

  if (!diffData || !baseBranch || !compareBranch) {
    return (
      <div className="flex items-center justify-center h-full text-comment">
        <div className="text-center">
          <p>No diff data available</p>
        </div>
      </div>
    );
  }

  const getFileIcon = (status: string) => {
    switch (status[0]) {
      case "A":
        return <FilePlus size={16} className="text-green-500" />;
      case "M":
        return <FileEdit size={16} className="text-blue-500" />;
      case "D":
        return <FileX size={16} className="text-red-500" />;
      case "R":
        return <FileEdit size={16} className="text-yellow-500" />;
      default:
        return <FileIcon size={16} className="text-comment" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status[0]) {
      case "A":
        return "Added";
      case "M":
        return "Modified";
      case "D":
        return "Deleted";
      case "R":
        return "Renamed";
      default:
        return status;
    }
  };

  return (
    <div className="flex h-full bg-bg">
      {/* File Tree Sidebar */}
      <div className="w-80 border-r border-border flex flex-col">
        {/* Sidebar Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2 mb-3">
            <GitCompareArrows size={16} className="text-accent" />
            <h2 className="text-sm font-medium text-text">Branch Comparison</h2>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-comment">Base:</span>
            <span className="text-accent font-mono">{baseBranch}</span>
          </div>
          <div className="flex items-center gap-2 text-xs mt-1">
            <span className="text-comment">Compare:</span>
            <span className="text-accent font-mono">{compareBranch}</span>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="p-4 border-b border-border bg-active/20">
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="text-center">
              <div className="text-comment">Files</div>
              <div className="text-text font-medium">{diffData.summary.files}</div>
            </div>
            <div className="text-center">
              <div className="text-green-500">+{diffData.summary.insertions}</div>
              <div className="text-comment text-[10px]">additions</div>
            </div>
            <div className="text-center">
              <div className="text-red-500">-{diffData.summary.deletions}</div>
              <div className="text-comment text-[10px]">deletions</div>
            </div>
          </div>
        </div>

        {/* File List */}
        <div className="flex-1 overflow-y-auto">
          {diffData.files.length === 0 ? (
            <div className="p-4 text-center text-comment text-sm">No changes</div>
          ) : (
            <div className="p-2">
              {diffData.files.map((file: any) => (
                <button
                  key={file.path}
                  onClick={() => setSelectedFile(file.path)}
                  className={cn(
                    "w-full flex items-start gap-2 p-2 rounded text-left transition-colors",
                    "hover:bg-active/50",
                    selectedFile === file.path ? "bg-active border-l-2 border-accent" : "border-l-2 border-transparent"
                  )}
                >
                  <div className="flex-shrink-0 mt-0.5">{getFileIcon(file.status)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-text truncate font-mono">{file.path}</div>
                    <div className="text-xs text-comment mt-0.5">{getStatusLabel(file.status)}</div>
                    {file.oldPath && file.oldPath !== file.path && (
                      <div className="text-xs text-comment mt-0.5 truncate">
                        from: {file.oldPath}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Diff Content */}
      <div className="flex-1 flex flex-col">
        {selectedFile ? (
          <>
            {/* Diff Header */}
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileIcon size={16} className="text-comment" />
                <span className="text-sm font-mono text-text">{selectedFile}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setDiffMode("split")}
                  className={cn(
                    "px-3 py-1 text-xs rounded flex items-center gap-1 transition-colors",
                    diffMode === "split"
                      ? "bg-accent text-bg"
                      : "bg-active text-comment hover:text-text"
                  )}
                >
                  <Split size={12} />
                  Split
                </button>
                <button
                  onClick={() => setDiffMode("unified")}
                  className={cn(
                    "px-3 py-1 text-xs rounded flex items-center gap-1 transition-colors",
                    diffMode === "unified"
                      ? "bg-accent text-bg"
                      : "bg-active text-comment hover:text-text"
                  )}
                >
                  <FileText size={12} />
                  Unified
                </button>
              </div>
            </div>

            {/* Diff Display */}
            <FileDiffContent
              baseBranch={baseBranch}
              compareBranch={compareBranch}
              filePath={selectedFile}
              mode={diffMode}
              isWorkingDirectory={false}
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-comment">
            <div className="text-center">
              <FileIcon size={48} className="mx-auto mb-4 opacity-50" />
              <p className="text-sm">Select a file to view diff</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

interface FileDiffContentProps {
  baseBranch: string;
  compareBranch: string;
  filePath: string;
  mode: DiffMode;
  isWorkingDirectory?: boolean;
}

const FileDiffContent = ({ baseBranch, compareBranch, filePath, mode, isWorkingDirectory }: FileDiffContentProps) => {
  const { data: baseContent, isLoading: baseLoading } = useGetFileAtBranch(baseBranch, filePath);

  // For working directory, read file from filesystem instead of git
  const { data: workingFileContent, isLoading: workingFileLoading } = useReadFile(
    isWorkingDirectory ? filePath : undefined
  );

  // For branch comparison, get file from git
  const { data: gitCompareContent, isLoading: compareLoading } = useGetFileAtBranch(
    !isWorkingDirectory ? compareBranch : undefined,
    !isWorkingDirectory ? filePath : undefined
  );

  const finalCompareContent = isWorkingDirectory ? workingFileContent : gitCompareContent;
  const finalCompareLoading = isWorkingDirectory ? workingFileLoading : compareLoading;

  const leftScrollRef = useRef<HTMLDivElement>(null);
  const rightScrollRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef(false);

  const handleLeftScroll = useCallback(() => {
    if (isScrollingRef.current) return;
    isScrollingRef.current = true;
    if (leftScrollRef.current && rightScrollRef.current) {
      rightScrollRef.current.scrollTop = leftScrollRef.current.scrollTop;
    }
    setTimeout(() => { isScrollingRef.current = false; }, 0);
  }, []);

  const handleRightScroll = useCallback(() => {
    if (isScrollingRef.current) return;
    isScrollingRef.current = true;
    if (leftScrollRef.current && rightScrollRef.current) {
      leftScrollRef.current.scrollTop = rightScrollRef.current.scrollTop;
    }
    setTimeout(() => { isScrollingRef.current = false; }, 0);
  }, []);

  if (baseLoading || finalCompareLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="animate-spin text-comment" size={20} />
      </div>
    );
  }

  if (mode === "split") {
    // Use proper diff algorithm
    const changes = Diff.diffLines(baseContent || "", finalCompareContent || "");

    // Build separate arrays for left (base) and right (compare) sides
    const leftLines: Array<{ lineNum: number | null; content: string; type: 'normal' | 'removed' | 'empty' }> = [];
    const rightLines: Array<{ lineNum: number | null; content: string; type: 'normal' | 'added' | 'empty' }> = [];

    let baseLineNum = 1;
    let compareLineNum = 1;

    // Process changes and detect modifications (removed followed by added)
    for (let i = 0; i < changes.length; i++) {
      const change = changes[i];
      const nextChange = changes[i + 1];

      const lines = change.value.split('\n');
      // Remove last empty line if it exists (from split)
      if (lines[lines.length - 1] === '') {
        lines.pop();
      }

      if (change.removed && nextChange?.added) {
        // This is a modification: removed lines followed by added lines
        // Show them side-by-side
        const nextLines = nextChange.value.split('\n');
        if (nextLines[nextLines.length - 1] === '') {
          nextLines.pop();
        }

        const maxLines = Math.max(lines.length, nextLines.length);
        for (let j = 0; j < maxLines; j++) {
          const removedLine = lines[j];
          const addedLine = nextLines[j];

          if (removedLine !== undefined && addedLine !== undefined) {
            // Both sides have content - show as modified
            leftLines.push({ lineNum: baseLineNum++, content: removedLine, type: 'removed' });
            rightLines.push({ lineNum: compareLineNum++, content: addedLine, type: 'added' });
          } else if (removedLine !== undefined) {
            // Only removed line exists
            leftLines.push({ lineNum: baseLineNum++, content: removedLine, type: 'removed' });
            rightLines.push({ lineNum: null, content: '', type: 'empty' });
          } else if (addedLine !== undefined) {
            // Only added line exists
            leftLines.push({ lineNum: null, content: '', type: 'empty' });
            rightLines.push({ lineNum: compareLineNum++, content: addedLine, type: 'added' });
          }
        }

        // Skip the next change since we already processed it
        i++;
      } else if (change.added) {
        // Pure addition: show empty on left, content on right
        lines.forEach((line) => {
          leftLines.push({ lineNum: null, content: '', type: 'empty' });
          rightLines.push({ lineNum: compareLineNum++, content: line, type: 'added' });
        });
      } else if (change.removed) {
        // Pure removal: show content on left, empty on right
        lines.forEach((line) => {
          leftLines.push({ lineNum: baseLineNum++, content: line, type: 'removed' });
          rightLines.push({ lineNum: null, content: '', type: 'empty' });
        });
      } else {
        // Unchanged lines: show on both sides
        lines.forEach((line) => {
          leftLines.push({ lineNum: baseLineNum++, content: line, type: 'normal' });
          rightLines.push({ lineNum: compareLineNum++, content: line, type: 'normal' });
        });
      }
    }

    return (
      <div className="flex-1 flex">
        {/* Left side - Base */}
        <div className="flex-1 border-r border-border flex flex-col">
          <div className="px-4 py-2 bg-red-500/10 border-b border-border text-xs text-comment flex items-center gap-2">
            <span className="font-semibold">{baseBranch}</span>
            <span className="text-[10px]">(base)</span>
          </div>
          <div ref={leftScrollRef} onScroll={handleLeftScroll} className="flex-1 overflow-auto">
            <div className="font-mono text-xs min-w-max">
              {leftLines.map((line, idx) => (
                <div
                  key={`base-${idx}`}
                  className={cn(
                    "flex min-h-[20px] w-max",
                    line.type === 'removed' && "bg-red-500/15",
                    line.type === 'empty' && "bg-gray-500/5"
                  )}
                >
                  <span className="inline-block w-12 text-right px-2 text-comment select-none border-r border-border flex-shrink-0">
                    {line.lineNum || ''}
                  </span>
                  <span className={cn("px-3 py-0.5 whitespace-pre", line.type === 'empty' && "text-comment")}>
                    {line.content || ' '}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right side - Compare */}
        <div className="flex-1 flex flex-col">
          <div className="px-4 py-2 bg-green-500/10 border-b border-border text-xs text-comment flex items-center gap-2">
            <span className="font-semibold">{isWorkingDirectory ? "Working Directory" : compareBranch}</span>
            <span className="text-[10px]">(compare)</span>
          </div>
          <div ref={rightScrollRef} onScroll={handleRightScroll} className="flex-1 overflow-auto">
            <div className="font-mono text-xs min-w-max">
              {rightLines.map((line, idx) => (
                <div
                  key={`compare-${idx}`}
                  className={cn(
                    "flex min-h-[20px] w-max",
                    line.type === 'added' && "bg-green-500/15",
                    line.type === 'empty' && "bg-gray-500/5"
                  )}
                >
                  <span className="inline-block w-12 text-right px-2 text-comment select-none border-r border-border flex-shrink-0">
                    {line.lineNum || ''}
                  </span>
                  <span className={cn("px-3 py-0.5 whitespace-pre", line.type === 'empty' && "text-comment")}>
                    {line.content || ' '}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Unified view using proper diff algorithm
  const changes = Diff.diffLines(baseContent || "", finalCompareContent || "");

  let baseLineNum = 1;
  let compareLineNum = 1;

  return (
    <div className="flex-1 overflow-auto">
      <div className="font-mono text-xs">
        <div>
          {changes.map((change, changeIdx) => {
            const lines = change.value.split('\n');
            // Remove last empty line if it exists (from split)
            if (lines[lines.length - 1] === '') {
              lines.pop();
            }

            if (change.added) {
              // Added lines
              return lines.map((line, lineIdx) => {
                const currentLineNum = compareLineNum++;
                return (
                  <div
                    key={`add-${changeIdx}-${lineIdx}`}
                    className="flex bg-green-500/15 border-l-2 border-green-500"
                  >
                    <span className="inline-block w-12 text-right px-2 text-comment select-none"></span>
                    <span className="inline-block w-12 text-right px-2 text-comment select-none border-r border-border">
                      {currentLineNum}
                    </span>
                    <span className="text-green-500 px-2 select-none w-6">+</span>
                    <span className="text-text px-2 py-0.5">{line}</span>
                  </div>
                );
              });
            } else if (change.removed) {
              // Removed lines
              return lines.map((line, lineIdx) => {
                const currentLineNum = baseLineNum++;
                return (
                  <div
                    key={`remove-${changeIdx}-${lineIdx}`}
                    className="flex bg-red-500/15 border-l-2 border-red-500"
                  >
                    <span className="inline-block w-12 text-right px-2 text-comment select-none border-r border-border">
                      {currentLineNum}
                    </span>
                    <span className="inline-block w-12 text-right px-2 text-comment select-none"></span>
                    <span className="text-red-500 px-2 select-none w-6">-</span>
                    <span className="text-text px-2 py-0.5">{line}</span>
                  </div>
                );
              });
            } else {
              // Unchanged lines
              return lines.map((line, lineIdx) => {
                const currentBaseLineNum = baseLineNum++;
                const currentCompareLineNum = compareLineNum++;
                return (
                  <div key={`same-${changeIdx}-${lineIdx}`} className="flex hover:bg-active/20">
                    <span className="inline-block w-12 text-right px-2 text-comment select-none border-r border-border">
                      {currentBaseLineNum}
                    </span>
                    <span className="inline-block w-12 text-right px-2 text-comment select-none border-r border-border">
                      {currentCompareLineNum}
                    </span>
                    <span className="text-comment px-2 select-none w-6"> </span>
                    <span className="text-text px-2 py-0.5">{line}</span>
                  </div>
                );
              });
            }
          })}
        </div>
      </div>
    </div>
  );
};
