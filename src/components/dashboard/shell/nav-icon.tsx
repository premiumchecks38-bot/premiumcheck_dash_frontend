import {
  ArrowRightLeft,
  BadgeAlert,
  BookOpen,
  CalendarClock,
  CalendarDays,
  CalendarRange,
  Clock4,
  CreditCard,
  FileText,
  HelpCircle,
  Image as ImageIcon,
  Inbox,
  LayoutDashboard,
  Mail,
  MapPinned,
  PoundSterling,
  ScrollText,
  Search,
  Settings,
  Star,
  Users,
  UsersRound,
  Wallet,
  Wrench,
  type LucideIcon,
} from "lucide-react";

import type { NavIcon as NavIconName } from "@/config/navigation";

const ICONS: Record<NavIconName, LucideIcon> = {
  overview: LayoutDashboard,
  upcoming: CalendarClock,
  past: CalendarRange,
  calendar: CalendarDays,
  customers: UsersRound,
  payments: CreditCard,
  payouts: Wallet,
  disputes: BadgeAlert,
  services: Wrench,
  prices: PoundSterling,
  areas: MapPinned,
  availability: Clock4,
  blog: BookOpen,
  pages: FileText,
  faqs: HelpCircle,
  reviews: Star,
  media: ImageIcon,
  seo: Search,
  redirects: ArrowRightLeft,
  leads: Inbox,
  team: Users,
  settings: Settings,
  audit: ScrollText,
  email: Mail,
};

export function NavIcon({ name, className }: { name: NavIconName; className?: string }) {
  const Icon = ICONS[name];
  return <Icon className={className} aria-hidden="true" />;
}
