"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Sun, Moon } from "lucide-react";

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const { theme, setTheme } = useTheme();
  const [offerCount, setOfferCount] = useState(0);

  useEffect(() => {
    async function loadOfferCount() {
      try {
        const { count } = await supabase
          .from("applications")
          .select("*", { count: "exact", head: true })
          .eq("status", "offer");
        setOfferCount(count ?? 0);
      } catch {
        // ignore
      }
    }
    loadOfferCount();
  }, [pathname, supabase]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="border-b">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 font-semibold"
          >
            <Briefcase className="h-5 w-5" />
            CareerTrack
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link
              href="/dashboard"
              className="text-muted-foreground hover:text-foreground"
            >
              Applications
            </Link>
            <Link
              href="/dashboard/offers"
              className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
            >
              Offers
              {offerCount > 0 && (
                <Badge variant="secondary" className="ml-0.5 px-1.5 py-0 text-xs">
                  {offerCount}
                </Badge>
              )}
            </Link>
            <Link
              href="/dashboard/tags"
              className="text-muted-foreground hover:text-foreground"
            >
              Tags
            </Link>
            <Link
              href="/dashboard/resumes"
              className="text-muted-foreground hover:text-foreground"
            >
              Documents
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            Sign out
          </Button>
        </div>
      </div>
    </header>
  );
}
