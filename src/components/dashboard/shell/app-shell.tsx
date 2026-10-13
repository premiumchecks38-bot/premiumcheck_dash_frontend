"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight, Menu as MenuIcon, Search } from "lucide-react";

import { Brand } from "@/components/dashboard/brand";
import { NotificationBell } from "@/components/dashboard/notifications/notification-bell";
import { Tooltip, TooltipProvider } from "@/components/dashboard/primitives";
import { SessionProvider } from "@/components/dashboard/session-context";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { SkipLink } from "@/components/ui/skip-link";
import type { NavGroup } from "@/config/navigation";
import type { SessionUser } from "@/lib/auth/permissions";
import { cn } from "@/lib/utils/cn";

import { CommandPalette } from "./command-palette";
import { NavIcon } from "./nav-icon";
import { UserMenu } from "./user-menu";

export const SIDEBAR_COOKIE = "ppc_dash_sidebar";

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** The most specific item that matches, so /payments/payouts does not also light up Payments. */
function activeHref(pathname: string, groups: NavGroup[]): string | null {
  return (
    groups
      .flatMap((g) => g.items.map((i) => i.href as string))
      .filter((href) => isActive(pathname, href))
      .sort((a, b) => b.length - a.length)[0] ?? null
  );
}

function SidebarNav({
  groups,
  collapsed,
  onNavigate,
}: {
  groups: NavGroup[];
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const current = activeHref(pathname, groups);
  return (
    <nav aria-label="Dashboard" className="flex flex-col gap-5 py-4" data-testid="sidebar-nav">
      {groups.map((group) => (
        <div key={group.title}>
          <h2
            className={cn(
              "mb-1 px-3 font-heading text-micro font-bold tracking-wider text-text-subtle uppercase whitespace-nowrap transition-all duration-200",
              collapsed ? "h-0 opacity-0 overflow-hidden m-0 p-0" : "h-auto opacity-100",
            )}
          >
            {group.title}
          </h2>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = current === item.href;
              const link = (
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  aria-label={collapsed ? item.title : undefined}
                  className={cn(
                    "flex min-h-touch items-center rounded-md font-body text-small transition-all duration-200",
                    collapsed ? "justify-center px-0 gap-0" : "px-3 gap-3",
                    active
                      ? "bg-accent-subtle font-semibold text-accent-subtle-foreground"
                      : "text-text-muted hover:bg-surface-alt hover:text-text",
                  )}
                >
                  <NavIcon name={item.icon} className="h-5 w-5 shrink-0" />
                  <span
                    className={cn(
                      "whitespace-nowrap transition-all duration-200",
                      collapsed
                        ? "max-w-0 opacity-0 overflow-hidden pointer-events-none"
                        : "max-w-[200px] opacity-100",
                    )}
                  >
                    {item.title}
                  </span>
                </Link>
              );
              return (
                <li key={item.href}>
                  {collapsed ? <Tooltip label={item.title}>{link}</Tooltip> : link}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export interface AppShellProps {
  user: SessionUser;
  groups: NavGroup[];
  initialCollapsed: boolean;
  children: React.ReactNode;
}

/** Sidebar (collapsible, remembered in a cookie), top bar and the main content area. */
export function AppShell({ user, groups, initialCollapsed, children }: AppShellProps) {
  const [collapsed, setCollapsed] = React.useState(initialCollapsed);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [commandOpen, setCommandOpen] = React.useState(false);

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    // A display preference only; never a token.
    document.cookie = `${SIDEBAR_COOKIE}=${next ? "collapsed" : "expanded"}; Path=/; Max-Age=31536000; SameSite=Lax`;
  };

  return (
    <SessionProvider user={user}>
      <TooltipProvider delayDuration={200}>
        <SkipLink targetId="main-content" />
        <div className="flex min-h-screen bg-surface">
          <aside
            className={cn(
              "sticky top-0 z-[45] hidden h-screen shrink-0 flex-col border-r-thin border-border bg-background transition-[width] duration-200 ease-in-out lg:flex",
              collapsed ? "w-sidebar-collapsed" : "w-sidebar",
            )}
            data-collapsed={collapsed}
          >
            <div
              className={cn(
                "relative flex h-topbar items-center border-b-thin border-border px-3.5",
                collapsed ? "justify-center" : "justify-start",
              )}
            >
              {/* Curved SVG background design matching website slug hero section */}
              <div
                className={cn(
                  "pointer-events-none absolute right-0 top-0 bottom-0 w-36 overflow-hidden transition-opacity duration-300",
                  collapsed ? "opacity-0" : "opacity-100",
                )}
                aria-hidden="true"
              >
                <svg
                  viewBox="0 0 160 64"
                  preserveAspectRatio="none"
                  className="h-full w-full"
                  fill="none"
                >
                  {/* Soft organic wave canopy wash */}
                  <path
                    d="M160 0 L40 0 C70 20 105 30 130 45 C145 54 153 60 160 64 Z"
                    fill="color-mix(in srgb, var(--pc-color-accent) 9%, transparent)"
                  />
                  {/* Subtle architectural curved trace lines */}
                  <path
                    d="M35 0 C68 22 102 32 134 48 C146 55 154 60 160 64"
                    stroke="color-mix(in srgb, var(--pc-color-accent) 22%, transparent)"
                    strokeWidth="1.5"
                    fill="none"
                  />
                  <path
                    d="M60 0 C90 18 118 26 146 40 C153 44 157 48 160 52"
                    stroke="color-mix(in srgb, var(--pc-color-accent) 16%, transparent)"
                    strokeWidth="1"
                    strokeDasharray="2.5 2.5"
                    fill="none"
                  />
                </svg>
              </div>

              <Link
                href="/"
                className={cn(
                  "relative z-10 flex items-center",
                  collapsed ? "w-full justify-center" : "justify-start",
                )}
              >
                <Brand compact={collapsed} />
              </Link>
              <button
                type="button"
                onClick={toggle}
                className="absolute -right-3 top-1/2 z-20 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background text-text-subtle shadow-sm transition-all duration-200 hover:bg-surface-alt hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                aria-expanded={!collapsed}
              >
                <ChevronLeft
                  className={cn(
                    "h-3.5 w-3.5 transition-transform duration-200",
                    collapsed && "rotate-180",
                  )}
                  aria-hidden="true"
                />
              </button>
            </div>
            <div className={cn("flex-1 overflow-y-auto overflow-x-hidden transition-all duration-200", collapsed ? "px-2" : "px-3")}>
              <SidebarNav groups={groups} collapsed={collapsed} />
            </div>
          </aside>

          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetContent side="left" className="w-sidebar overflow-y-auto p-4">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <div className="flex justify-center mb-4">
                <Brand />
              </div>
              <SidebarNav
                groups={groups}
                collapsed={false}
                onNavigate={() => setMobileOpen(false)}
              />
            </SheetContent>
          </Sheet>

          <div className="flex min-w-0 flex-1 flex-col">
            <header className="sticky top-0 z-header flex h-topbar items-center gap-3 border-b-thin border-border bg-background px-dash-gutter">
              <Button
                variant="ghost"
                size="none"
                className="min-h-touch min-w-touch lg:hidden"
                aria-label="Open navigation"
                onClick={() => setMobileOpen(true)}
              >
                <MenuIcon className="h-5 w-5" aria-hidden="true" />
              </Button>
              <button
                type="button"
                onClick={() => setCommandOpen(true)}
                className="relative hidden max-w-md flex-1 items-center rounded-md border-thin border-border bg-surface px-3 py-2 text-left font-body text-small text-text-subtle transition-colors hover:border-border-strong md:flex"
                aria-label="Search the dashboard"
              >
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-text-subtle" aria-hidden="true" />
                  <span>Search pages, bookings and settings...</span>
                </div>
              </button>
              <div className="ml-auto flex items-center gap-1">
                <NotificationBell />
                <UserMenu />
              </div>
            </header>
            <main
              id="main-content"
              tabIndex={-1}
              className="flex-1 px-dash-gutter py-6 focus:outline-none"
            >
              <div className="w-full">{children}</div>
            </main>
          </div>
          <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
        </div>
      </TooltipProvider>
    </SessionProvider>
  );
}
