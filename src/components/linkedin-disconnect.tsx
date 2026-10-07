"use client";

import { useState, useTransition } from "react";

import { disconnectLinkedIn } from "@/lib/publish/actions";

export function LinkedInDisconnect() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const disconnect = () =>
    startTransition(async () => {
      const result = await disconnectLinkedIn();
      setError(result.ok ? null : result.error);
    });

  return (
    <>
      <button className="btn btn-ghost btn-danger" onClick={disconnect} disabled={pending}>
        {pending ? "Disconnecting…" : "Disconnect"}
      </button>
      {error && (
        <p className="notice notice-danger" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
