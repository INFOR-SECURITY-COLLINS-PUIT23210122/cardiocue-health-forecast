import type { ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ClipboardPlus, Heart, History, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export function SiteHeader({ children }: { children?: ReactNode }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="border-b border-border bg-card/70 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
        <Link to="/" className="flex items-center gap-2">
          <Heart className="heartbeat size-5 fill-primary text-primary" />
          <span className="font-serif text-xl text-foreground">Pulse</span>
        </Link>
        <div className="flex items-center gap-6">
          {children}
          {!loading &&
            (user ? (
              <nav className="flex items-center gap-1">
                <Button asChild variant="ghost" size="sm">
                  <Link to="/log">
                    <ClipboardPlus /> <span className="hidden sm:inline">Log results</span>
                  </Link>
                </Button>
                <Button asChild variant="ghost" size="sm">
                  <Link to="/history">
                    <History /> My history
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="Sign out"
                  onClick={async () => {
                    await supabase.auth.signOut();
                    navigate({ to: "/" });
                  }}
                >
                  <LogOut />
                </Button>
              </nav>
            ) : (
              <Button asChild variant="outline" size="sm">
                <Link to="/auth">Sign in</Link>
              </Button>
            ))}
        </div>
      </div>
    </header>
  );
}
