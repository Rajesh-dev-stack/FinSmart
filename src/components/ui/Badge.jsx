import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-gradient-to-r from-[#00D4FF] to-[#00B4A0] text-[#0A1628]",
        secondary:
          "border-transparent bg-[rgba(255,255,255,0.08)] text-[var(--text-secondary)]",
        destructive:
          "border-transparent bg-[rgba(255,82,82,0.15)] text-[#FF5252] border-[rgba(255,82,82,0.3)]",
        success:
          "border-transparent bg-[rgba(0,230,118,0.15)] text-[#00E676] border-[rgba(0,230,118,0.3)]",
        outline: "text-[var(--text-primary)] border-[var(--border-subtle)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Badge({ className, variant, ...props }) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
