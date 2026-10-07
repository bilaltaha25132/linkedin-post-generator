"use client";

import { useMemo } from "react";
import { CircleCheck, TriangleAlert } from "lucide-react";

import { preflight } from "@/lib/plan/preflight";

/** Quiet warnings on a draft before it goes out. They never change the text. */
export function PreflightList({ body, carousel }: { body: string; carousel: boolean }) {
  const checks = useMemo(() => preflight(body, { carousel }), [body, carousel]);
  if (!body.trim()) return null;
  if (!checks.length) {
    return (
      <p className="preflight preflight-ok">
        <CircleCheck aria-hidden /> Pre-flight checks pass.
      </p>
    );
  }
  return (
    <details className="preflight">
      <summary>
        <TriangleAlert aria-hidden /> {checks.length} pre-flight {checks.length === 1 ? "note" : "notes"}
      </summary>
      <ul className="list-plain stack-xs">
        {checks.map((c) => (
          <li key={c.key}>{c.message}</li>
        ))}
      </ul>
    </details>
  );
}
