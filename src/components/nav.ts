import {
  Ban,
  Bookmark,
  Briefcase,
  Coins,
  MessagesSquare,
  PenLine,
  Radar,
  Radio,
  Send,
  Settings,
  SquarePen,
  Star,
  type LucideIcon,
} from "lucide-react";

export type NavLink = { href: string; label: string; icon: LucideIcon };

/** The sidebar, grouped by job: find a story, write about it, find work, run the desk. */
export const NAV_GROUPS: { title: string; links: NavLink[] }[] = [
  {
    title: "Wire",
    links: [
      { href: "/", label: "Feed", icon: Radio },
      { href: "/saved", label: "Saved", icon: Bookmark },
      { href: "/rejected", label: "Rejected", icon: Ban },
    ],
  },
  {
    title: "Posts",
    links: [
      { href: "/write", label: "Write", icon: SquarePen },
      { href: "/library", label: "Library", icon: PenLine },
      { href: "/queue", label: "To post", icon: Star },
      { href: "/posted", label: "Posted", icon: Send },
    ],
  },
  {
    title: "Grow",
    links: [{ href: "/engage", label: "Engage", icon: MessagesSquare }],
  },
  {
    title: "Career",
    links: [{ href: "/jobs", label: "Jobs", icon: Briefcase }],
  },
  {
    title: "Desk",
    links: [
      { href: "/sources", label: "Sources", icon: Radar },
      { href: "/usage", label: "Usage", icon: Coins },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

/** The destinations pinned to the phone tab bar; the rest sit behind More. */
export const MOBILE_TABS: NavLink[] = [
  { href: "/", label: "Feed", icon: Radio },
  { href: "/write", label: "Write", icon: SquarePen },
  { href: "/library", label: "Library", icon: PenLine },
  { href: "/queue", label: "To post", icon: Star },
];

export function isActive(href: string, pathname: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

/** Breadcrumb trail for the top bar. The draft page belongs to the feed. */
export function crumbsFor(pathname: string): { label: string; href?: string }[] {
  if (pathname.startsWith("/generate/")) return [{ label: "Feed", href: "/" }, { label: "Draft" }];
  if (pathname.startsWith("/share")) return [{ label: "Engage", href: "/engage" }, { label: "Share" }];
  const link = NAV_GROUPS.flatMap((g) => g.links).find((l) => isActive(l.href, pathname));
  return [{ label: link?.label ?? "Signal Desk" }];
}
