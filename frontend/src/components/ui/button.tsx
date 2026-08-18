import { forwardRef } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "icon";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variants: Record<Variant, string> = {
  primary:
    "gradient-violet text-white font-medium shadow-[0_6px_20px_-6px_rgba(139,123,255,0.6)] hover:shadow-[0_8px_26px_-6px_rgba(139,123,255,0.75)] active:scale-[0.98]",
  secondary:
    "bg-surface text-text border border-line hover:bg-surface-hover hover:border-line-strong backdrop-blur-sm",
  ghost: "text-text-muted hover:text-text hover:bg-surface-hover",
  danger:
    "bg-danger-soft text-danger border border-transparent hover:border-danger/40",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-sm rounded-lg gap-1.5",
  md: "h-9 px-4 text-sm rounded-lg gap-2",
  icon: "h-8 w-8 rounded-lg justify-center",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "secondary", size = "md", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center transition-all outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none select-none",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = "Button";
