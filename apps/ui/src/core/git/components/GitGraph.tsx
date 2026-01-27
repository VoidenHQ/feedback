import { useGetGitLog, useGetCommitFiles } from "@/core/git/hooks";
import { Loader2, ChevronRight, ChevronDown, File } from "lucide-react";
import { useMemo, useState, useRef, useEffect } from "react";
import { cn } from "@/core/lib/utils";

interface GraphNode {
  commit: {
    hash: string;
    shortHash: string;
    message: string;
    author: string;
    date: string;
    refs: string;
    parents: string[];
  };
  lane: number;
  color: string;
  branches: { from: number; to: number; isMerge?: boolean }[];
}

const COLORS = [
  '#00D9FF', // Cyan
  '#00FF85', // Green
  '#FF00DC', // Magenta
  '#FFB300', // Orange
  '#00A6FF', // Blue
  '#FF6B6B', // Red
  '#A855F7', // Purple
  '#10B981', // Emerald
];

function buildGraph(commits: any[]): GraphNode[] {
  const nodes: GraphNode[] = [];
  const commitToLane = new Map<string, number>();
  const reservedLanes: string[] = []; // Track what commit each lane is reserved for

  commits.forEach((commit, index) => {
    let lane: number;

    // Check if this commit already has a lane assigned
    const existingLane = commitToLane.get(commit.hash);
    if (existingLane !== undefined) {
      lane = existingLane;
      // Remove from reserved since we're processing it now
      reservedLanes[lane] = '';
    } else {
      // Find first free lane
      let freeLaneIndex = reservedLanes.findIndex(hash => !hash);
      if (freeLaneIndex === -1) {
        freeLaneIndex = reservedLanes.length;
        reservedLanes.push('');
      }
      lane = freeLaneIndex;
      commitToLane.set(commit.hash, lane);
    }

    const branches: { from: number; to: number; isMerge?: boolean }[] = [];

    // Process parents
    if (commit.parents && commit.parents.length > 0) {
      commit.parents.forEach((parentHash: string, parentIndex: number) => {
        let parentLane = commitToLane.get(parentHash);

        if (parentLane === undefined) {
          if (parentIndex === 0) {
            // First parent continues on the same lane
            parentLane = lane;
          } else {
            // Additional parent (merge) - find a free lane
            let freeLaneIndex = reservedLanes.findIndex(hash => !hash);
            if (freeLaneIndex === -1) {
              freeLaneIndex = reservedLanes.length;
              reservedLanes.push('');
            }
            parentLane = freeLaneIndex;
          }
          commitToLane.set(parentHash, parentLane);
          reservedLanes[parentLane] = parentHash;
        }

        branches.push({
          from: lane,
          to: parentLane,
          isMerge: parentIndex > 0,
        });
      });
    }

    nodes.push({
      commit,
      lane,
      color: COLORS[lane % COLORS.length],
      branches,
    });
  });

  return nodes;
}

export const GitGraph = () => {
  const { data: log, isLoading } = useGetGitLog(50);
  const [expandedCommit, setExpandedCommit] = useState<string | null>(null);

  const graphNodes = useMemo(() => {
    if (!log?.all) return [];
    return buildGraph(log.all);
  }, [log]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="animate-spin text-comment" size={20} />
      </div>
    );
  }

  if (!graphNodes.length) {
    return (
      <div className="flex-1 flex items-center justify-center text-comment text-sm">
        No commit history
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="relative">
        {graphNodes.map((node, index) => (
          <CommitRow
            key={node.commit.hash}
            node={node}
            index={index}
            graphNodes={graphNodes}
            expandedCommit={expandedCommit}
            setExpandedCommit={setExpandedCommit}
          />
        ))}
      </div>
    </div>
  );
};
const CommitRow = ({
  node,
  index,
  graphNodes,
  expandedCommit,
  setExpandedCommit
}: {
  node: any;
  index: number;
  graphNodes: any[];
  expandedCommit: string | null;
  setExpandedCommit: (hash: string | null) => void;
}) => {
  const LANE_WIDTH = 16;
  const contentRef = useRef<HTMLDivElement>(null);
  const [ROW_HEIGHT, setRowHeight] = useState(40);

  // Measure content height and update rowHeight
  useEffect(() => {
    if (contentRef.current) {
      const contentHeight = contentRef.current.offsetHeight;
      const totalHeight = Math.max(contentHeight, 40);
      setRowHeight(totalHeight);
    }
  }, [expandedCommit, node.commit.hash]);

  const isExpanded = expandedCommit === node.commit.hash;
  const graphWidth = Math.max(...graphNodes.map(n => n.lane + 1)) * LANE_WIDTH + 20;

  return (
    <div className="relative">
      <div
        className="flex items-start hover:bg-active/50 cursor-pointer relative"
        style={{
          paddingLeft: `${graphWidth}px`
        }}
        ref={contentRef}
        onClick={() => setExpandedCommit(expandedCommit === node.commit.hash ? null : node.commit.hash)}
      >
        {/* SVG Graph */}
        <svg
          className="absolute left-0 top-0"
          width={graphWidth}
          height={ROW_HEIGHT}
          style={{ overflow: 'visible' }}
        >
          {/* Draw continuation lines from previous row */}
          {index > 0 && (() => {
            const lines: JSX.Element[] = [];
            const maxLanes = Math.max(...graphNodes.map(n => n.lane + 1));

            for (let l = 0; l < maxLanes; l++) {
              let shouldDraw = false;
              let lineColor = COLORS[l % COLORS.length];

              if (index > 0) {
                const prevNode = graphNodes[index - 1];
                const branchToThisLane = prevNode.branches.find(b => b.to === l);

                if (branchToThisLane && prevNode.lane === l) {
                  shouldDraw = true;
                  lineColor = prevNode.color;
                }

                if (node.lane === l && prevNode.branches.find(b => b.to === l)) {
                  shouldDraw = true;
                  lineColor = node.color;
                }
              }

              if (shouldDraw) {
                lines.push(
                  <line
                    key={`continue-${l}`}
                    x1={l * LANE_WIDTH + 10}
                    y1={0}
                    x2={l * LANE_WIDTH + 10}
                    y2={ROW_HEIGHT / 2}
                    stroke={lineColor}
                    strokeWidth="2"
                    opacity="0.6"
                  />
                );
              }
            }
            return lines;
          })()}

          {/* Draw lines to parents */}
          {node.branches.map((branch, branchIndex) => {
            const startX = node.lane * LANE_WIDTH + 10;
            const startY = ROW_HEIGHT / 2;
            const endX = branch.to * LANE_WIDTH + 10;
            const endY = ROW_HEIGHT;

            if (branch.from === branch.to) {
              return (
                <line
                  key={`branch-${branchIndex}`}
                  x1={startX}
                  y1={startY}
                  x2={endX}
                  y2={endY}
                  stroke={node.color}
                  strokeWidth="2"
                  opacity="0.6"
                />
              );
            } else {
              const curveColor = COLORS[branch.to % COLORS.length];
              return (
                <path
                  key={`branch-${branchIndex}`}
                  d={`M ${startX} ${startY} Q ${startX} ${startY + 15}, ${(startX + endX) / 2} ${(startY + endY) / 2} T ${endX} ${endY}`}
                  stroke={curveColor}
                  strokeWidth="2"
                  fill="none"
                  opacity="0.6"
                  strokeLinecap="round"
                />
              );
            }
          })}

          {/* Draw commit dot */}
          <circle
            cx={node.lane * LANE_WIDTH + 10}
            cy={ROW_HEIGHT / 2}
            r="4"
            fill={node.color}
            stroke="#1e1e2e"
            strokeWidth="1.5"
          />
        </svg>

        {/* Commit info */}
        <div className="flex-1 min-w-0 py-1.5 pr-3 pl-2">
          <div className="flex items-center gap-1.5">
            {expandedCommit === node.commit.hash ? (
              <ChevronDown size={12} className="text-comment flex-shrink-0" />
            ) : (
              <ChevronRight size={12} className="text-comment flex-shrink-0" />
            )}
            <p className="text-xs text-text truncate flex-1 min-w-0">{node.commit.message}</p>
          </div>

          {node.commit.refs && (
            <div className="flex gap-1 flex-wrap mt-1 ml-4">
              {node.commit.refs.split(',').map((ref, i) => {
                const trimmedRef = ref.trim();
                const isHead = trimmedRef.includes('HEAD');
                const isBranch = trimmedRef.includes('->') || (!isHead && !trimmedRef.includes('/'));
                const displayRef = trimmedRef
                  .replace('HEAD -> ', '')
                  .replace('origin/', '')
                  .replace('tag: ', '');

                if (!displayRef) return null;

                return (
                  <span
                    key={i}
                    className="text-[10px] px-1 py-0.5 rounded whitespace-nowrap"
                    style={{
                      backgroundColor: isHead ? 'rgba(0, 217, 255, 0.2)' : isBranch ? 'rgba(168, 85, 247, 0.2)' : 'rgba(255, 107, 107, 0.2)',
                      color: isHead ? '#00D9FF' : isBranch ? '#A855F7' : '#FF6B6B',
                    }}
                  >
                    {displayRef}
                  </span>
                );
              })}
            </div>
          )}

          <div className="flex items-center gap-2 text-[10px] text-comment mt-0.5 ml-4">
            <span className="truncate max-w-[120px]">{node.commit.author}</span>
            <span className="font-mono">{node.commit.shortHash}</span>
            <span className="whitespace-nowrap">{new Date(node.commit.date).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      {/* Expanded file list */}
      {isExpanded && (
        <div className="relative" style={{ paddingLeft: `${graphWidth}px` }}>
          {/* Continuation line through expanded section */}
          {index < graphNodes.length - 1 && (
            <svg
              className="absolute left-0 top-0"
              width={graphWidth}
              height="100%"
              style={{ pointerEvents: 'none' }}
            >
              <line
                x1={node.lane * LANE_WIDTH + 10}
                y1={0}
                x2={node.lane * LANE_WIDTH + 10}
                y2="100%"
                stroke={node.color}
                strokeWidth="2"
                opacity="0.6"
              />
            </svg>
          )}
          <div className="pl-2">
            <CommitFileList commitHash={node.commit.hash} />
          </div>
        </div>
      )}
    </div>
  );
};

const CommitFileList = ({ commitHash }: { commitHash: string }) => {
  const { data: files, isLoading } = useGetCommitFiles(commitHash);

  if (isLoading) {
    return (
      <div className="px-3 py-2 bg-active/30 border-t border-border">
        <Loader2 className="animate-spin text-comment" size={16} />
      </div>
    );
  }

  if (!files || files.length === 0) {
    return (
      <div className="px-3 py-2 bg-active/30 border-t border-border text-xs text-comment">
        No files changed
      </div>
    );
  }

  return (
    <div className="bg-active/30 border-t border-border ml-8">
      <div className="px-3 py-1 text-xs text-comment">
        {files.length} file{files.length !== 1 ? 's' : ''} changed
      </div>
      {files.map((file) => (
        <div
          key={file.path}
          className="flex items-center justify-between px-3 py-1 hover:bg-active/50 text-xs"
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <File size={12} className="text-comment flex-shrink-0" />
            <span className="text-text font-mono truncate">{file.path}</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] flex-shrink-0">
            {file.insertions > 0 && (
              <span className="text-green-500">+{file.insertions}</span>
            )}
            {file.deletions > 0 && (
              <span className="text-red-500">-{file.deletions}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
