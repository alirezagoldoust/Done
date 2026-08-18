import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export const Input = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "h-10 w-full rounded-xl bg-bg-elevated/70 border border-line px-3.5 text-sm text-text placeholder:text-text-faint",
      "outline-none transition-all focus:border-line-strong focus:ring-4 focus:ring-accent-soft",
      className,
    )}
    {...props}
  />
));
Input.displayName = "Input";

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "w-full rounded-xl bg-bg-elevated/70 border border-line px-3.5 py-2.5 text-sm text-text placeholder:text-text-faint",
      "outline-none transition-all focus:border-line-strong focus:ring-4 focus:ring-accent-soft resize-y min-h-[90px]",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export const Label = forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => (
  <label
    ref={ref}
    className={cn(
      "block text-xs font-medium uppercase tracking-wide text-text-faint mb-1.5",
      className,
    )}
    {...props}
  />
));
Label.displayName = "Label";
