"use client";

import { useState, useTransition } from "react";
import { RotateCw } from "lucide-react";

import { rereadEmail } from "@/lib/email/actions";

export function EmailReread({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState<string | null>(null);
  return (
    <>
      <button
        className="btn btn-ghost btn-sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await rereadEmail(id);
            setNote(result.ok ? `${result.data.items} found` : result.error);
          })
        }
      >
        <RotateCw aria-hidden /> Read again
      </button>
      {note && <span className="muted">{note}</span>}
    </>
  );
}
