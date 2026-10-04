"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, X } from "lucide-react";

import { LogoMark } from "@/components/logo";
import { NAV_GROUPS, isActive } from "@/components/nav";
import { PeakNotice } from "@/components/peak-notice";
import { GREEN } from "@/lib/carousel/design";

/**
 * The sidebar. `inline` is the desktop column; `drawer` is the phone overlay,
 * which gets an explicit close button and closes itself on navigation.
 */
export function NavRail({ variant = "inline", onClose }: { variant?: "inline" | "drawer"; onClose?: () => void }) {
  const pathname = usePathname();
  const drawer = variant === "drawer";

  return (
    <aside className={drawer ? "sidebar" : "sidebar sidebar-inline"}>
      <div className="sidebar-brand">
        <Link href="/" className="brand-link" onClick={onClose}>
          <LogoMark size={30} />
          <span>
            Signal <b>Desk</b>
          </span>
        </Link>
        {drawer && (
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close menu" autoFocus>
            <X aria-hidden />
          </button>
        )}
      </div>

      <nav className="sidebar-nav" aria-label="Primary">
        {NAV_GROUPS.map((group) => (
          <div key={group.title}>
            <div className="nav-section">{group.title}</div>
            <ul className="nav-list">
              {group.links.map(({ href, label, icon: Icon }) => {
                const active = isActive(href, pathname);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      className="navlink"
                      data-active={active}
                      aria-current={active ? "page" : undefined}
                      onClick={onClose}
                    >
                      <Icon aria-hidden strokeWidth={1.75} />
                      {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="sidebar-foot">
        <PeakNotice />
        <div className="account">
          <span className="account-mark">
            <LogoMark size={18} />
          </span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="account-name">
              Bilal Taha
              <i style={{ background: GREEN }} aria-hidden />
            </div>
            <div className="account-sub">Signal Desk</div>
          </div>
          <form action="/api/auth/logout" method="post">
            <button type="submit" className="icon-btn" aria-label="Sign out" title="Sign out">
              <LogOut aria-hidden strokeWidth={1.75} />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
