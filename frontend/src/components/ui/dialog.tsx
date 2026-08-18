"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;

/**
 * Accessible dialog. On >=sm it is a centered glass card; on mobile it becomes
 * a full-width bottom sheet. Closing behaviour (Escape / outside click) is
 * controlled by the caller via onInteractOutside / onEscapeKeyDown when it
 * needs to guard unsaved changes.
 */
export function DialogContent({
  className,
  children,
  onInteractOutside,
  onEscapeKeyDown,
  showClose = true,
}: {
  className?: string;
  children: React.ReactNode;
  onInteractOutside?: DialogPrimitive.DialogContentProps["onInteractOutside"];
  onEscapeKeyDown?: DialogPrimitive.DialogContentProps["onEscapeKeyDown"];
  showClose?: boolean;
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md"
        style={{ animation: "overlay-in 150ms ease-out" }}
      />
      {/* Flex wrapper centres the card (bottom-aligned on mobile) so the
          content never needs a translate — eliminating the open flash. */}
      <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
        <DialogPrimitive.Content
          onInteractOutside={onInteractOutside}
          onEscapeKeyDown={onEscapeKeyDown}
          className={cn(
            "relative flex w-full flex-col bg-bg-elevated/85 backdrop-blur-2xl border border-line-strong shadow-[0_30px_80px_-24px_rgba(0,0,0,0.85)]",
            "max-h-[92vh] rounded-t-3xl",
            "sm:w-full sm:max-w-lg sm:rounded-2xl sm:max-h-[88vh]",
            className,
          )}
          style={{ animation: "dialog-pop 170ms cubic-bezier(0.16,1,0.3,1)" }}
        >
          {children}
          {showClose && (
            <DialogPrimitive.Close
              className="absolute right-3 top-3 rounded-md p-1.5 text-text-faint hover:text-text hover:bg-surface-hover transition-colors outline-none cursor-pointer"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </DialogPrimitive.Close>
          )}
        </DialogPrimitive.Content>
      </div>
    </DialogPrimitive.Portal>
  );
}

export function DialogTitle({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <DialogPrimitive.Title
      className={cn("text-base font-semibold text-text", className)}
    >
      {children}
    </DialogPrimitive.Title>
  );
}

export function DialogDescription({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <DialogPrimitive.Description
      className={cn("text-sm text-text-muted", className)}
    >
      {children}
    </DialogPrimitive.Description>
  );
}
