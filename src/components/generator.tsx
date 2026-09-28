"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Sparkles, Copy, Check, RotateCcw, Star } from "lucide-react";

import { unwrap } from "@/lib/action-result";
import { generatePosts } from "@/lib/generate/actions";
import { upsertDraftForDiscovery, updatePostBody, setPostQueued } from "@/lib/posts/actions";
import { CarouselStudio } from "@/components/carousel-studio";
import { BlogStudio } from "@/components/blog-studio";
import { SaveIndicator, countWords, type SaveState } from "@/components/save-indicator";

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
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [queued, setQueued] = useState(false);

  // One draft row per discovery; the ref survives re-renders so edits update it.
  // postId mirrors the ref as state so the carousel studio re-renders with it.
  const postIdRef = useRef<string | null>(null);
  const lastSavedRef = useRef<string>("");
  const [postId, setPostId] = useState<string | null>(null);
  const rememberPostId = (id: string) => {
    postIdRef.current = id;
    setPostId(id);
  };

  const generate = () =>
    startTransition(async () => {
      setError(null);
      setQueued(false);
      try {
        const result = unwrap(await generatePosts(discoveryId, { guidance: guidance.trim() || undefined }));
        setVariants(result.variants);
        setSelected(0);
        const first = result.variants[0] ?? "";
        setBody(first);
        setWarning(result.duplicateWarning);
        // A draft exists the moment it's written — persist it straight away.
        setSaveState("saving");
        try {
          const id = await upsertDraftForDiscovery({ discoveryId, body: first, variants: result.variants });
          rememberPostId(id);
          lastSavedRef.current = first;
          setSaveState("saved");
        } catch {
          setSaveState("error");
        }
      } catch (err) {
        setError((err as Error).message);
      }
    });

  // Debounced autosave: every edit or take-switch persists to the same draft.
  useEffect(() => {
    if (!variants.length || !body.trim() || body === lastSavedRef.current) return;
    // "saving" is set when the save starts, not per keystroke: a setState on
    // every character stacked nested updates and React dropped characters.
    const timer = setTimeout(async () => {
      if (body === lastSavedRef.current) {
        setSaveState("saved");
        return;
      }
      setSaveState("saving");
      try {
        if (postIdRef.current) {
          await updatePostBody(postIdRef.current, body);
        } else {
          rememberPostId(await upsertDraftForDiscovery({ discoveryId, body, variants }));
        }
        lastSavedRef.current = body;
        setSaveState("saved");
      } catch {
        setSaveState("error");
      }
    }, 900);
    return () => clearTimeout(timer);
  }, [body, variants, discoveryId]);

  const pick = (i: number) => {
    setSelected(i);
    setBody(variants[i]);
  };

  const copy = async () => {
    await navigator.clipboard.writeText(body);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const retrySave = () =>
    startTransition(async () => {
      setSaveState("saving");
      try {
        rememberPostId(await upsertDraftForDiscovery({ discoveryId, body, variants }));
        lastSavedRef.current = body;
        setSaveState("saved");
      } catch {
        setSaveState("error");
      }
    });

  const queue = () =>
    startTransition(async () => {
      // Make sure the latest body is saved before we line it up.
      let id = postIdRef.current;
      if (!id || body !== lastSavedRef.current) {
        id = await upsertDraftForDiscovery({ discoveryId, body, variants });
        rememberPostId(id);
        lastSavedRef.current = body;
        setSaveState("saved");
      }
      await setPostQueued(id, true);
      setQueued(true);
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
            <button className="btn btn-ghost" onClick={generate} disabled={pending}>
              <RotateCcw /> New takes
            </button>
            <button
              className="btn"
              onClick={queue}
              disabled={pending || !body.trim()}
              style={queued ? { borderColor: "var(--accent)", color: "var(--accent)" } : undefined}
            >
              <Star fill={queued ? "currentColor" : "none"} /> {queued ? "Queued to post" : "Queue to post"}
            </button>
            <SaveIndicator state={saveState} onRetry={retrySave} />
            <span style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--ink-faint)" }}>
              {countWords(body)} words
            </span>
          </div>

          <CarouselStudio discoveryId={discoveryId} postBody={body} postId={postId} />

          <BlogStudio discoveryId={discoveryId} postBody={body} postId={postId} />
        </>
      )}
    </div>
  );
}

