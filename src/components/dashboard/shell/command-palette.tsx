"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Calendar,
  CreditCard,
  FileText,
  FolderOpen,
  HelpCircle,
  LayoutDashboard,
  Layers,
  Mail,
  MapPin,
  MessageSquare,
  Search,
  Settings,
  Shield,
  Star,
  Tag,
  Users,
} from "lucide-react";

import { useSessionUser } from "@/components/dashboard/session-context";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { can, type Page } from "@/lib/auth/permissions";

interface NavCommand {
  title: string;
  category: string;
  href: string;
  page?: string;
  icon: React.ComponentType<{ className?: string }>;
}

const COMMANDS: NavCommand[] = [
  { title: "Overview", category: "Navigation", href: "/", icon: LayoutDashboard },
  { title: "Upcoming bookings", category: "Bookings", href: "/bookings/upcoming", page: "bookings_upcoming", icon: Calendar },
  { title: "Past bookings", category: "Bookings", href: "/bookings/past", page: "bookings_past", icon: Calendar },
  { title: "Customers", category: "Operations", href: "/customers", page: "customers", icon: Users },
  { title: "Payments and Payouts", category: "Finance", href: "/payments", page: "payments", icon: CreditCard },
  { title: "Services catalog", category: "Catalog", href: "/services", page: "services", icon: Layers },
  { title: "Prices and VAT", category: "Catalog", href: "/prices", page: "prices", icon: Tag },
  { title: "Coverage areas", category: "Catalog", href: "/areas", page: "areas", icon: MapPin },
  { title: "Availability and slots", category: "Catalog", href: "/availability", page: "availability", icon: Calendar },
  { title: "Blog and Compliance Hub", category: "Content", href: "/blog", page: "blogs", icon: BookOpen },
  { title: "Pages and CMS sections", category: "Content", href: "/pages", page: "pages", icon: FileText },
  { title: "FAQs", category: "Content", href: "/faqs", page: "faqs", icon: HelpCircle },
  { title: "Media library", category: "Content", href: "/media", page: "media", icon: FolderOpen },
  { title: "Contact enquiries", category: "Bookings", href: "/leads", page: "leads", icon: MessageSquare },

  { title: "Team members", category: "Admin", href: "/team", page: "team", icon: Users },
  { title: "Settings", category: "Admin", href: "/settings", page: "settings", icon: Settings },
  { title: "Audit log", category: "Admin", href: "/audit-log", page: "audit_logs", icon: Shield },
  { title: "Email log", category: "Admin", href: "/email-log", page: "audit_logs", icon: Mail },
];

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const user = useSessionUser();
  const [query, setQuery] = React.useState("");

  // Keyboard shortcut Ctrl+K / Cmd+K listener
  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onOpenChange]);

  // Filter commands by permissions and search query
  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return COMMANDS.filter((cmd) => {
      if (cmd.page && user && !can(user, { page: cmd.page as Page })) {
        return false;
      }
      if (!q) return true;
      return (
        cmd.title.toLowerCase().includes(q) ||
        cmd.category.toLowerCase().includes(q) ||
        cmd.href.toLowerCase().includes(q)
      );
    });
  }, [query, user]);

  const handleSelect = (href: string) => {
    onOpenChange(false);
    setQuery("");
    router.push(href as any);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 overflow-hidden shadow-2xl border-dashboard-border">
        <DialogHeader className="sr-only">
          <DialogTitle>Command Palette</DialogTitle>
        </DialogHeader>

        <div className="flex items-center border-b border-dashboard-border px-3">
          <Search className="h-4 w-4 text-dashboard-muted mr-2 flex-shrink-0" />
          <input
            autoFocus
            type="text"
            placeholder="Type a page name or section to jump..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-12 w-full bg-transparent text-sm text-dashboard-text placeholder:text-dashboard-muted focus:outline-none"
          />
          <kbd className="hidden sm:inline-block rounded bg-dashboard-surface px-1.5 py-0.5 text-[10px] font-mono font-medium text-dashboard-muted border border-dashboard-border">
            ESC
          </kbd>
        </div>

        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <p className="p-4 text-center text-xs text-dashboard-muted">
              No matching pages found for &quot;{query}&quot;.
            </p>
          ) : (
            filtered.map((cmd) => {
              const Icon = cmd.icon;
              return (
                <button
                  key={cmd.href}
                  type="button"
                  onClick={() => handleSelect(cmd.href)}
                  className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-xs transition-colors hover:bg-dashboard-primary/10 hover:text-dashboard-primary group"
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="h-4 w-4 text-dashboard-muted group-hover:text-dashboard-primary" />
                    <span className="font-medium text-dashboard-text group-hover:text-dashboard-primary">
                      {cmd.title}
                    </span>
                  </div>
                  <span className="text-[11px] text-dashboard-muted group-hover:text-dashboard-primary font-mono">
                    {cmd.category}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
