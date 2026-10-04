"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Sparkles, Copy, Check, Star, Plus, SquarePen, TriangleAlert } from "lucide-react";

import { unwrap } from "@/lib/action-result";
import { enhanceDraftAction } from "@/lib/write/actions";
import { copyForLinkedIn } from "@/lib/linkedin";
import { createPost, updatePostBody, setPostQueued } from "@/lib/posts/actions";
import { CarouselStudio } from "@/components/carousel-studio";
import { SaveIndicator, countWords, type SaveState } from "@/components/save-indicator";

// Below this there's nothing worth keeping as a draft yet.
const MIN_SAVE_CHARS = 20;

const TAB_LABELS = ["Your draft", "Polish", "Rewrite"];

export function Writer() {
  const [pending, startTransition] = useTransition();
  const [body, setBody] = useState("");
  const [guidance, setGuidance] = useState("");
  // versions[0] is the text as it stood before enhancing; the rest are the writer's.
  const [versions, setVersions] = useState<string[]>([]);
  const [selected, setSelected] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [queued, setQueued] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [postId, setPostId] = useState<string | null>(null);

  const postIdRef = useRef<string | null>(null);
  const lastSavedRef = useRef("");
  // Saves run one after another, so a slow first save can't race a second one
  // into creating a duplicate draft.
  const saveChainRef = useRef<Promise<void>>(Promise.resolve());

  const save = async (text: string) => {
    const run = saveChainRef.current.then(async () => {
      if (text === lastSavedRef.current) return;
      if (postIdRef.current) {
        await updatePostBody(postIdRef.current, text);
      } else {
        const id = await createPost({ discoveryId: null, body: text });
        postIdRef.current = id;
        setPostId(id);
      }
      lastSavedRef.current = text;
    });
    saveChainRef.current = run.catch(() => {});
    try {
      await run;
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  };

  // No setState on the keystroke path: one per character piled up nested
  // updates on fast input and React dropped characters past its limit.
  useEffect(() => {
    if (body.trim().length < MIN_SAVE_CHARS || body === lastSavedRef.current) return;
    const timer = setTimeout(() => {
      setSaveState("saving");
      void save(body);
    }, 1200);
    return () => clearTimeout(timer);
  }, [body]);

  const enhance = () =>
    startTransition(async () => {
      setError(null);
      try {
        const out = unwrap(await enhanceDraftAction(body, guidance.trim() || undefined));
        setVersions([body, ...out]);
        setSelected(1);
        setBody(out[0]);
      } catch (err) {
        setError((err as Error).message);
      }
    });

  const pick = (i: number) => {
    setSelected(i);
    setBody(versions[i]);
  };

  const copy = async () => {
    await copyForLinkedIn(body);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const queue = () =>
    startTransition(async () => {
      await save(body);
      if (!postIdRef.current) return;
      await setPostQueued(postIdRef.current, true);
      setQueued(true);
    });

  const startNew = () => {
    postIdRef.current = null;
    lastSavedRef.current = "";
    setPostId(null);
    setBody("");
    setGuidance("");
    setVersions([]);
    setSelected(0);
    setError(null);
    setQueued(false);
    setSaveState("idle");
  };

  const hasText = body.trim().length > 0;

  return (
    <div className="stack">
      <section className="panel reveal" style={{ "--reveal-delay": "60ms" } as React.CSSProperties}>
        <div className="panel-head">
          <span className="panel-icon">
            <SquarePen aria-hidden />
          </span>
          <h2>
            <label htmlFor="post-body">Your post</label>
          </h2>
          {versions.length > 0 && (
            <div className="seg push" role="group" aria-label="Versions">
              {versions.map((_, i) => (
                <button key={i} type="button" aria-pressed={i === selected} onClick={() => pick(i)}>
                  {TAB_LABELS[i] ?? `Take ${i}`}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="stack-sm">
          <textarea
            id="post-body"
            className="field editor"
            rows={14}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Paste a draft, or jot the idea down in a few lines. Enhance shapes it into a post in your voice without adding anything you didn't say."
          />

          <div>
            <label className="lbl" htmlFor="write-guidance">
              Steer the rewrite (optional)
            </label>
            <input
              id="write-guidance"
              className="field"
              value={guidance}
              onChange={(e) => setGuidance(e.target.value)}
              placeholder="Shorter, more contrarian, lead with the number…"
            />
          </div>

          <div className="row">
            <button className="btn btn-primary" onClick={enhance} disabled={pending || !hasText}>
              <Sparkles aria-hidden className={pending ? "spin" : undefined} />
              {pending ? "Enhancing…" : versions.length ? "Enhance again" : "Enhance"}
            </button>
            {pending && (
              <span className="field-hint" role="status">
                You&rsquo;ll get your draft, a light polish and a bolder rewrite to choose from.
              </span>
            )}
          </div>
          {error && (
            <p className="notice notice-danger" role="alert">
              <TriangleAlert aria-hidden />
              {error}
            </p>
          )}

          {hasText && (
            <div className="action-bar action-bar-split">
              <button className="btn" onClick={copy} title="Copy with the line spacing LinkedIn keeps">
                {copied ? <Check aria-hidden /> : <Copy aria-hidden />} {copied ? "Copied" : "Copy"}
              </button>
              <button
                className="btn"
                onClick={queue}
                disabled={pending || body.trim().length < MIN_SAVE_CHARS}
                aria-pressed={queued}
              >
                <Star aria-hidden fill={queued ? "currentColor" : "none"} /> {queued ? "Queued to post" : "Queue to post"}
              </button>
              <button className="btn btn-ghost" onClick={startNew} disabled={pending}>
                <Plus aria-hidden /> New post
              </button>
              <SaveIndicator state={saveState} onRetry={() => void save(body)} />
              <span className="meta-mono push">{countWords(body)} words</span>
            </div>
          )}
        </div>
      </section>

      {postId && <CarouselStudio key={postId} postBody={body} postId={postId} />}
    </div>
  );
}
