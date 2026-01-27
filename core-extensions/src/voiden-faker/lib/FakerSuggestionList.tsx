import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';

interface FakerSuggestionListProps {
  items: Array<{
    path: string;
    description: string;
    example: string;
    category: string;
  }>;
  command: (item: { path: string }) => void;
}

interface FakerSuggestionListRef {
  onKeyDown: ({ event }: { event: KeyboardEvent }) => boolean;
}

export const FakerSuggestionList = forwardRef<FakerSuggestionListRef, FakerSuggestionListProps>(
  (props, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    const selectItem = (index: number) => {
      const item = props.items[index];
      if (item) {
        props.command({ path: item.path });
      }
    };

    const upHandler = () => {
      setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length);
    };

    const downHandler = () => {
      setSelectedIndex((selectedIndex + 1) % props.items.length);
    };

    const enterHandler = () => {
      selectItem(selectedIndex);
    };

    useEffect(() => setSelectedIndex(0), [props.items]);

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }) => {
        if (event.key === 'ArrowUp') {
          upHandler();
          return true;
        }
        if (event.key === 'ArrowDown') {
          downHandler();
          return true;
        }
        if (event.key === 'Enter') {
          enterHandler();
          return true;
        }
        return false;
      },
    }));

    // Extract function name from path (remove category prefix)
    const formatFakerFunction = (path: string) => {
      const parts = path.split('.');
      if (parts.length >= 2) {
        return parts.slice(1).join('.');
      }
      return path;
    };

    // Group items by category
    const groupedItems = props.items.reduce((acc, item, originalIndex) => {
      const category = item.category;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push({ ...item, originalIndex });
      return acc;
    }, {} as Record<string, Array<{ path: string; description: string; example: string; category: string; originalIndex: number }>>);

    // Flatten for selection indexing
    const flatItems = Object.entries(groupedItems).flatMap(([category, items]) => items);

    return (
      <div className="text-xs z-50 min-w-80 max-h-80 overflow-auto rounded-md border border-border bg-panel shadow-lg">
        {props.items.length > 0 ? (
          <div className="p-2">
            {Object.entries(groupedItems).map(([category, items], categoryIndex) => (
              <div key={category} className={categoryIndex > 0 ? 'mt-3' : ''}>
                {/* Category header */}
                <div className="px-2 py-1 text-[10px] font-semibold text-comment uppercase tracking-wide">
                  {category}
                </div>
                {/* Items in category */}
                <div className="space-y-0.5 mt-1">
                  {items.map((item) => {
                    const functionName = formatFakerFunction(item.path);
                    const index = flatItems.findIndex(i => i.path === item.path);
                    return (
                      <button
                        key={item.path}
                        className={`${
                          index === selectedIndex ? 'bg-active ring-1 ring-border' : ''
                        } relative flex w-full cursor-pointer select-none items-center rounded px-3 py-2 outline-none transition-all hover:bg-active group`}
                        onClick={() => selectItem(index)}
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {/* Faker chip */}
                          <div className="flex items-center gap-1.5 bg-blue-500/20 text-blue-400 px-2 py-1 rounded text-xs font-medium whitespace-nowrap">
                            <span>Faker</span>
                            <span className="text-blue-300">→</span>
                            <span className="font-mono">{functionName}</span>
                          </div>
                          {/* Example preview */}
                          <div className="text-xs text-green-500 font-mono truncate">
                            {item.example}
                          </div>
                        </div>
                        {/* Description on hover/select */}
                        <div className="text-xs text-comment ml-2 truncate">
                          {item.description}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-3 py-2 text-sm text-comment">No results</div>
        )}
      </div>
    );
  }
);

FakerSuggestionList.displayName = 'FakerSuggestionList';
