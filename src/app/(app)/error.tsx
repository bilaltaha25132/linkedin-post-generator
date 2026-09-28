"use client";

import { useEffect } from "react";
import { RotateCcw } from "lucide-react";

// Catches failures while loading a page or in an action nobody caught, so the
// sidebar stays and the page offers a retry instead of Next's blank error.
export default function AppError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="empty">
      <h3>This page didn&rsquo;t load</h3>
      <p>
        Usually a service the app depends on had a brief hiccup. Your drafts are saved; try again in a moment.
      </p>
      <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => retry()}>
        <RotateCcw /> Try again
      </button>
    </div>
  );
}
