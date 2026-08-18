import { Avatar } from "@/components/ui/avatar";
import type { BoardMember } from "@/types";

/** Compact overlapping avatars with a "+N" overflow chip. */
export function MemberAvatars({
  members,
  max = 4,
}: {
  members: BoardMember[];
  max?: number;
}) {
  const shown = members.slice(0, max);
  const overflow = members.length - shown.length;

  return (
    <div className="flex items-center -space-x-1.5">
      {shown.map((m) => (
        <Avatar
          key={m.id}
          initials={m.user.initials}
          seed={m.user.id}
          title={m.user.display_name}
        />
      ))}
      {overflow > 0 && (
        <span
          className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-surface text-[11px] font-medium text-text-muted ring-2 ring-bg"
          title={members
            .slice(max)
            .map((m) => m.user.display_name)
            .join(", ")}
        >
          +{overflow}
        </span>
      )}
    </div>
  );
}
