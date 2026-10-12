"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu as MenuIcon, PanelLeftClose, PanelLeftOpen, Search } from "lucide-react";

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
          {collapsed ? (
            <h2 className="sr-only">{group.title}</h2>
          ) : (
            <h2 className="mb-1 px-3 font-heading text-micro font-bold tracking-wider text-text-subtle uppercase">
              {group.title}
            </h2>
          )}
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
                    "flex min-h-touch items-center gap-3 rounded-md px-3 font-body text-small transition-colors",
                    collapsed && "justify-center px-0",
                    active
                      ? "bg-accent-subtle font-semibold text-accent-subtle-foreground"
                      : "text-text-muted hover:bg-surface-alt hover:text-text",
                  )}
                >
                  <NavIcon name={item.icon} className="h-5 w-5 shrink-0" />
                  {collapsed ? null : <span>{item.title}</span>}
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
              "sticky top-0 hidden h-screen shrink-0 flex-col border-r-thin border-border bg-background lg:flex",
              collapsed ? "w-sidebar-collapsed" : "w-sidebar",
            )}
            data-collapsed={collapsed}
          >
            <div
              className={cn(
                "flex h-topbar items-center justify-center border-b-thin border-border px-4",
              )}
            >
              <Link href="/" className="flex w-full items-center justify-center">
                <Brand compact={collapsed} />
              </Link>
            </div>
            <div className={cn("flex-1 overflow-y-auto", collapsed ? "px-2" : "px-3")}>
              <SidebarNav groups={groups} collapsed={collapsed} />
            </div>
            <div
              className={cn("border-t-thin border-border p-2", collapsed && "flex justify-center")}
            >
              <Button
                variant="ghost"
                size="sm"
                className={cn("w-full justify-start gap-2", collapsed && "w-auto justify-center")}
                onClick={toggle}
                aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                aria-expanded={!collapsed}
              >
                {collapsed ? (
                  <PanelLeftOpen className="h-5 w-5" aria-hidden="true" />
                ) : (
                  <>
                    <PanelLeftClose className="h-5 w-5" aria-hidden="true" /> Collapse
                  </>
                )}
              </Button>
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
                className="relative hidden max-w-md flex-1 items-center justify-between rounded-md border-thin border-border bg-surface px-3 py-2 text-left font-body text-small text-text-subtle transition-colors hover:border-border-strong md:flex"
                aria-label="Search the dashboard (Ctrl+K)"
              >
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-text-subtle" aria-hidden="true" />
                  <span>Search pages, bookings and settings...</span>
                </div>
                <kbd className="rounded bg-background px-1.5 py-0.5 text-[10px] font-mono font-medium text-text-subtle border border-border">
                  Ctrl K
                </kbd>
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
              <div className="mx-auto w-full max-w-dash">{children}</div>
            </main>
          </div>
          <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
        </div>
      </TooltipProvider>
    </SessionProvider>
  );
}
