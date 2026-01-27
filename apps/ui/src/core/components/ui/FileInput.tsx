import { cn } from "@/core/lib/utils";
import React from "react";
import { InputProps } from "@/core/components/ui/input.tsx";

const FileInput = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        {...props}
        className={cn(
          "text-xs text-muted-foreground file:mr-2 file:rounded-md dark:file:bg-neutral-700 file:border-none file:p-1 file:text-xs file:font-medium file:text-muted-foreground hover:text-inherit file:hover:text-inherit",
          className
        )}
      />
    );
  }
);

FileInput.displayName = "FileInput";

export { FileInput };
