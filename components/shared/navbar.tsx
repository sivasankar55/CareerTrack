"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Sun, Moon, Menu, X } from "lucide-react";

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const { theme, setTheme } = useTheme();
  const [offerCount, setOfferCount] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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

  // Close menu on route change
  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const navLinks = [
    { href: "/dashboard", label: "Applications" },
    {
      href: "/dashboard/offers",
      label: "Offers",
      badge: offerCount > 0 ? offerCount : null,
    },
    { href: "/dashboard/tags", label: "Tags" },
    { href: "/dashboard/resumes", label: "Documents" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 font-semibold"
          >
            <Briefcase className="h-5 w-5 text-primary animate-pulse" />
            <span className="bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
              CareerTrack
            </span>
          </Link>
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`transition-colors hover:text-foreground ${
                  pathname === link.href ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                <span className="flex items-center gap-1">
                  {link.label}
                  {link.badge !== null && link.badge !== undefined && (
                    <Badge variant="secondary" className="px-1.5 py-0 text-xs">
                      {link.badge}
                    </Badge>
                  )}
                </span>
              </Link>
            ))}
          </nav>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="rounded-full"
          >
            <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>

          {/* Desktop Sign Out */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="hidden md:flex"
          >
            Sign out
          </Button>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden rounded-full"
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {isMenuOpen && (
        <div className="md:hidden border-b bg-background px-4 py-4 animate-in slide-in-from-top-5 duration-200">
          <nav className="flex flex-col gap-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors hover:text-foreground py-1 border-b border-border/40 ${
                  pathname === link.href ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                <span className="flex items-center justify-between">
                  {link.label}
                  {link.badge !== null && link.badge !== undefined && (
                    <Badge variant="secondary" className="px-1.5 py-0 text-xs">
                      {link.badge}
                    </Badge>
                  )}
                </span>
              </Link>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              className="w-full mt-2 justify-center"
            >
              Sign out
            </Button>
          </nav>
        </div>
      )}
    </header>
  );
}
