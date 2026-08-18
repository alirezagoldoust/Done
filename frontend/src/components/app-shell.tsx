"use client";

import Link from "next/link";
import Image from "next/image";
import { LogOut } from "lucide-react";

import { useAuth } from "@/hooks/use-auth";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

/**
 * Minimal application shell: a slim top bar with the logo and the current
 * user. The board is the focus, so navigation stays intentionally light.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-30 flex h-12 shrink-0 items-center justify-between border-b border-line bg-bg/60 px-4 backdrop-blur-2xl">
        <Link
          href="/boards"
          className="flex items-center gap-2 text-sm font-semibold tracking-tight"
        >
          <Image
            src="/done-icon.png"
            alt="Done"
            width={24}
            height={24}
            priority
            className="h-6 w-6 rounded-lg"
          />
          Done
        </Link>

        {user && (
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 sm:flex">
              <Avatar
                initials={user.initials}
                seed={user.id}
                title={user.display_name}
              />
              <span className="text-sm text-text-muted">
                {user.display_name}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        )}
      </header>

      <main className="flex min-h-0 flex-1 flex-col">{children}</main>
    </div>
  );
}
