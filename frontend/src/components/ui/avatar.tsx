import { cn } from "@/lib/utils";

/** Deterministic subtle tint per user so avatars are distinguishable but calm. */
const TINTS = [
  "bg-[#3b4a8a] text-[#cdd6ff]",
  "bg-[#2f6b53] text-[#c6f0dc]",
  "bg-[#7a4b2e] text-[#f3d6bd]",
  "bg-[#5a3a70] text-[#e6cdf5]",
  "bg-[#7a3a4a] text-[#f5cdd6]",
  "bg-[#2f5a6b] text-[#c6e6f0]",
];

function tintFor(seed: number) {
  return TINTS[seed % TINTS.length];
}

export function Avatar({
  initials,
  seed = 0,
  size = "md",
  className,
  title,
}: {
  initials: string;
  seed?: number;
  size?: "sm" | "md";
  className?: string;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center justify-center rounded-full font-medium ring-2 ring-bg select-none",
        size === "sm" ? "h-6 w-6 text-[10px]" : "h-7 w-7 text-[11px]",
        tintFor(seed),
        className,
      )}
    >
      {initials}
    </span>
  );
}
