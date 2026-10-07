"use client";

import { useState } from "react";
import { ExternalLink } from "lucide-react";

import { markLinkOpened } from "@/lib/links/actions";

export interface DeepLink {
  key: string;
  label: string;
  href: string;
  openedAt: string | null;
}

/** LinkedIn search links he opens in his own browser. Signal Desk never fetches them. */
export function DeepLinks({ links, now }: { links: DeepLink[]; now: number }) {
  const [opened, setOpened] = useState<Record<string, number>>({});
  return (
    <div className="row" style={{ gap: 8 }}>
      {links.map((link) => {
        const at = opened[link.key] ?? (link.openedAt ? Date.parse(link.openedAt) : null);
        return (
          <a
            key={link.key}
            className="btn btn-sm"
            href={link.href}
            target="_blank"
            rel="noreferrer"
            title={at ? `Opened ${ago(now, at)}` : "Not opened yet"}
            onClick={() => {
              setOpened((o) => ({ ...o, [link.key]: now }));
              void markLinkOpened(link.key);
            }}
          >
            <ExternalLink aria-hidden /> {link.label}
            {at !== null && <span className="muted"> · {ago(now, at)}</span>}
          </a>
        );
      })}
    </div>
  );
}

function ago(now: number, at: number): string {
  const hours = Math.max(0, Math.round((now - at) / 3_600_000));
  if (hours < 1) return "just now";
  return hours < 48 ? `${hours}h ago` : `${Math.round(hours / 24)}d ago`;
}
