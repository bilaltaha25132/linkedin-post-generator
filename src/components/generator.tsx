"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Sparkles, Copy, Check, Save, RotateCcw } from "lucide-react";

import { generatePosts } from "@/lib/generate/actions";
import { createPost } from "@/lib/posts/actions";
import { CarouselStudio } from "@/components/carousel-studio";

export function Generator({
  discoveryId,
  defaultGuidance,
}: {
  discoveryId: string;
  defaultGuidance: string;
}) {
  const [pending, startTransition] = useTransition();
  const [guidance, setGuidance] = useState(defaultGuidance);
  const [variants, setVariants] = useState<string[]>([]);
  const [selected, setSelected] = useState(0);
  const [body, setBody] = useState("");
  const [warning, setWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);

  const generate = () =>
    startTransition(async () => {
      setError(null);
      setSavedId(null);
      try {
        const result = await generatePosts(discoveryId, { guidance: guidance.trim() || undefined });
        setVariants(result.variants);
        setSelected(0);
        setBody(result.variants[0] ?? "");
        setWarning(result.duplicateWarning);
      } catch (err) {
        setError((err as Error).message);
      }
    });

  const pick = (i: number) => {
    setSelected(i);
    setBody(variants[i]);
  };

  const copy = async () => {
    await navigator.clipboard.writeText(body);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const save = () =>
    startTransition(async () => {
      const id = await createPost({ discoveryId, body, variants });
      setSavedId(id);
    });

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <div className="panel" style={{ display: "grid", gap: 12 }}>
        <div>
          <label className="lbl" htmlFor="guidance">
            Steer the draft (optional)
          </label>
          <input
            id="guidance"
            className="field"
            value={guidance}
            onChange={(e) => setGuidance(e.target.value)}
            placeholder="A specific take, tone, or hook you want"
          />
        </div>
        <div>
          <button className="btn btn-primary" onClick={generate} disabled={pending}>
            <Sparkles />
            {pending ? "Writing in your voice…" : variants.length ? "Regenerate" : "Write drafts"}
          </button>
        </div>
        {pending && (
          <p style={{ color: "var(--ink-soft)", fontSize: 13 }}>
            The writer drafts three takes and checks them against what you&rsquo;ve posted before. Give it a few seconds.
          </p>
        )}
        {error && <p className="notice" style={{ borderColor: "var(--danger)" }}>{error}</p>}
      </div>

      {warning && <p className="notice">{warning}</p>}

      {variants.length > 0 && (
        <>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {variants.map((_, i) => (
              <button
                key={i}
                className="btn"
                data-active={i === selected}
                onClick={() => pick(i)}
                style={i === selected ? { borderColor: "var(--accent)", color: "var(--accent)" } : undefined}
              >
                Take {i + 1}
              </button>
            ))}
          </div>

          <textarea
            className="field"
            rows={16}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            style={{ lineHeight: 1.6 }}
          />

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <button className="btn" onClick={copy}>
              {copied ? <Check /> : <Copy />} {copied ? "Copied" : "Copy"}
            </button>
            <button className="btn btn-primary" onClick={save} disabled={pending || !body.trim()}>
              <Save /> Save to library
            </button>
            <button className="btn btn-ghost" onClick={generate} disabled={pending}>
              <RotateCcw /> New takes
            </button>
            <span style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--ink-faint)" }}>
              {countWords(body)} words
            </span>
          </div>

          {savedId && (
            <p className="notice" style={{ borderColor: "var(--accent)" }}>
              Saved. <Link href="/library" style={{ color: "var(--accent)", textDecoration: "underline" }}>Open the library</Link> to post it.
            </p>
          )}

          <CarouselStudio discoveryId={discoveryId} postBody={body} />
        </>
      )}
    </div>
  );
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}
