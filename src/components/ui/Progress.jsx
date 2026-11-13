import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cn } from "../../lib/utils";

const Progress = React.forwardRef(({ className, value = 0, indicatorClassName, isOver = false, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn(
      "relative h-2 w-full overflow-hidden rounded-full bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.04)]",
      className
    )}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className={cn(
        "h-full w-full flex-1 transition-all duration-500 rounded-full",
        isOver
          ? "bg-gradient-to-r from-[#FF974A] to-[#FC5A5A]"
          : "bg-gradient-to-r from-[#00D4FF] to-[#00B4A0]",
        indicatorClassName
      )}
      style={{ transform: `translateX(-${100 - (Math.min(Math.max(value || 0, 0), 100))}%)` }}
    />
  </ProgressPrimitive.Root>
));
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };
