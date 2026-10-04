"use client";

import { useEffect } from "react";
import { RotateCcw, TriangleAlert } from "lucide-react";

import { EmptyState } from "@/components/page-header";

// Catches failures while loading a page or in an action nobody caught, so the
// sidebar stays and the page offers a retry instead of Next's blank error.
export default function AppError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <EmptyState
      icon={TriangleAlert}
      title="This page didn’t load"
      action={
        <button className="btn btn-primary" onClick={() => retry()}>
          <RotateCcw aria-hidden /> Try again
        </button>
      }
    >
      Usually a service the app depends on had a brief hiccup. Your drafts are saved; try again in a moment.
    </EmptyState>
  );
}
