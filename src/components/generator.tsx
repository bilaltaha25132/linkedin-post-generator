"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Sparkles, Copy, Check, RotateCcw, Star, TriangleAlert } from "lucide-react";

import { unwrap } from "@/lib/action-result";
import { generatePosts } from "@/lib/generate/actions";
import { copyForLinkedIn } from "@/lib/linkedin";
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
    await copyForLinkedIn(body);
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
    <div className="stack">
      <section className="panel">
        <div className="panel-head">
          <span className="panel-icon">
            <Sparkles aria-hidden />
          </span>
          <h2>Drafts</h2>
          <p>Three takes in your voice, checked against what you&rsquo;ve posted before.</p>
        </div>
        <div className="stack-sm">
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
          <div className="row">
            <button className="btn btn-primary" onClick={generate} disabled={pending}>
              <Sparkles aria-hidden className={pending ? "spin" : undefined} />
              {pending ? "Writing in your voice…" : variants.length ? "Regenerate" : "Write drafts"}
            </button>
            {pending && (
              <span className="field-hint" role="status">
                The writer drafts three takes and checks them against what you&rsquo;ve posted before. Give it a few
                seconds.
              </span>
            )}
          </div>
          {error && (
            <p className="notice notice-danger" role="alert">
              <TriangleAlert aria-hidden />
              {error}
            </p>
          )}
        </div>
      </section>

      {warning && (
        <p className="notice" role="status">
          <TriangleAlert aria-hidden />
          {warning}
        </p>
      )}

      {variants.length > 0 && (
        <>
          <section className="panel">
            <div className="panel-head">
              <h2 id="draft-heading">Your post</h2>
              <div className="seg push" role="group" aria-label="Takes">
                {variants.map((_, i) => (
                  <button key={i} type="button" aria-pressed={i === selected} onClick={() => pick(i)}>
                    Take {i + 1}
                  </button>
                ))}
              </div>
            </div>

            <textarea
              className="field editor"
              rows={16}
              value={body}
              aria-labelledby="draft-heading"
              onChange={(e) => setBody(e.target.value)}
            />

            <div className="action-bar" style={{ marginTop: 12 }}>
              <button className="btn btn-primary" onClick={copy} title="Copy with the line spacing LinkedIn keeps">
                {copied ? <Check aria-hidden /> : <Copy aria-hidden />} {copied ? "Copied" : "Copy"}
              </button>
              <button className="btn" onClick={queue} disabled={pending || !body.trim()} aria-pressed={queued}>
                <Star aria-hidden fill={queued ? "currentColor" : "none"} /> {queued ? "Queued to post" : "Queue to post"}
              </button>
              <button className="btn btn-ghost" onClick={generate} disabled={pending}>
                <RotateCcw aria-hidden /> New takes
              </button>
              <SaveIndicator state={saveState} onRetry={retrySave} />
              <span className="meta-mono push">{countWords(body)} words</span>
            </div>
          </section>

          <CarouselStudio discoveryId={discoveryId} postBody={body} postId={postId} />

          <BlogStudio discoveryId={discoveryId} postBody={body} postId={postId} />
        </>
      )}
    </div>
  );
}
