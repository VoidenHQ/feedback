import * as React from "react";
import * as Progress from "@radix-ui/react-progress";
import { cn } from "@/core/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  progress: number;
}

const ProgressBar = React.forwardRef<HTMLInputElement, InputProps>(({ className, progress, ...props }, ref) => {
  return (
    <Progress.Root ref={ref} className="ProgressRoot relative overflow-hidden rounded w-full h-[20px] my-1 border border-gray-600" value={progress}>
      <Progress.Indicator
        className={cn(
          `bg-black h-[20px] text-[12px] text-center flex items-center box-border px-2 text-white transition-all  ease-in-out`,
          className,
        )}
        {...props}
        style={{
          width: `${progress}%`,
        }}
      >
        {progress}%
      </Progress.Indicator>
    </Progress.Root>
  );
});

ProgressBar.displayName = "ProgressBar";

export default ProgressBar;
