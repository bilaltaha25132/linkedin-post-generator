"use client";

import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, MoreHorizontal } from "lucide-react";

import { MOBILE_TABS, crumbsFor, isActive } from "@/components/nav";
import { NavRail } from "@/components/nav-rail";
import { PeakNotice } from "@/components/peak-notice";
import { ThemeToggle } from "@/components/theme-toggle";

/**
 * The authenticated chrome, after ANTELUS: a hairline sidebar, a top bar with
 * the breadcrumb and theme switch, one scrolling content column, and on phones
 * a bottom tab bar whose More button opens the full sidebar as a drawer.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const close = () => setDrawerOpen(false);
  const crumbs = crumbsFor(pathname);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  return (
    <div className="app">
      <NavRail />

      {drawerOpen && (
        <>
          <button type="button" className="scrim" aria-label="Close menu" onClick={close} />
          <div className="drawer" role="dialog" aria-modal="true" aria-label="Navigation menu">
            <NavRail variant="drawer" onClose={close} />
          </div>
        </>
      )}

      <div className="app-col">
        <header className="topbar">
          <div className="topbar-row">
            <div className="row" style={{ flexWrap: "nowrap", minWidth: 0, gap: 4 }}>
              <button
                type="button"
                className="icon-btn lg-hide"
                onClick={() => setDrawerOpen(true)}
                aria-label="Open menu"
                aria-expanded={drawerOpen}
              >
                <Menu aria-hidden />
              </button>
              <nav className="crumbs" aria-label="Breadcrumb">
                <Link href="/" className="crumb-root">
                  Signal Desk
                </Link>
                {crumbs.map((c, i) => (
                  <Fragment key={c.label}>
                    <span className="sep" aria-hidden>
                      /
                    </span>
                    {c.href && i < crumbs.length - 1 ? (
                      <Link href={c.href} className="crumb-root">
                        {c.label}
                      </Link>
                    ) : (
                      <span aria-current="page">{c.label}</span>
                    )}
                  </Fragment>
                ))}
              </nav>
            </div>
            <div className="topbar-tools">
              <ThemeToggle />
            </div>
          </div>
        </header>

        <main className="app-main scroll-slim" id="main">
          <div className="app-main-inner">
            <PeakNotice banner />
            {children}
          </div>
        </main>

        <nav className="tabbar" aria-label="Primary mobile navigation">
          <ul>
            {MOBILE_TABS.map(({ href, label, icon: Icon }) => {
              const active = isActive(href, pathname);
              return (
                <li key={href}>
                  <Link href={href} className="tab" data-active={active} aria-current={active ? "page" : undefined}>
                    <Icon aria-hidden strokeWidth={active ? 2.1 : 1.75} />
                    {label}
                  </Link>
                </li>
              );
            })}
            <li>
              <button
                type="button"
                className="tab"
                onClick={() => setDrawerOpen(true)}
                aria-expanded={drawerOpen}
                aria-label="More navigation"
              >
                <MoreHorizontal aria-hidden strokeWidth={1.75} />
                More
              </button>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  );
}
