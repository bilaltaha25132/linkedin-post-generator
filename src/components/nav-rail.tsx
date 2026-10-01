"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Radio, SquarePen, Bookmark, PenLine, Star, Send, Radar, Coins, LogOut } from "lucide-react";

import { LogoMark } from "@/components/logo";
import { PeakNotice } from "@/components/peak-notice";

const LINKS = [
  { href: "/", label: "Feed", icon: Radio },
  { href: "/write", label: "Write", icon: SquarePen },
  { href: "/saved", label: "Saved", icon: Bookmark },
  { href: "/library", label: "Library", icon: PenLine },
  { href: "/queue", label: "To post", icon: Star },
  { href: "/posted", label: "Posted", icon: Send },
  { href: "/sources", label: "Sources", icon: Radar },
  { href: "/usage", label: "Usage", icon: Coins },
];

export function NavRail() {
  const pathname = usePathname();

  return (
    <nav className="rail">
      <Link href="/" className="wordmark">
        <LogoMark />
        Signal Desk
      </Link>

      {LINKS.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link key={href} href={href} className="navlink" data-active={active}>
            <Icon aria-hidden />
            {label}
          </Link>
        );
      })}

      <div style={{ marginTop: "auto" }}>
        <PeakNotice />
      </div>

      <form action="/api/auth/logout" method="post">
        <button type="submit" className="navlink" style={{ width: "100%" }}>
          <LogOut aria-hidden />
          Sign out
        </button>
      </form>
    </nav>
  );
}
