"use client";

import { useEffect, useMemo, useRef, useState, useTransition, type ElementType, type KeyboardEvent } from "react";
import { Code2, Download, FileText, Minus, Plus, Redo2, Save, Undo2 } from "lucide-react";

import { saveMasterResume, saveVersionLatex } from "@/lib/apply/actions";
import { previewBlocks, toLatex, type Block, type TexNode, type Unit } from "@/lib/apply/preview";
import type { VersionFile } from "@/lib/apply/queries";

const PAGE_PX = 816; // 8.5in at 96 CSS px per inch

type Commit = (unit: Unit, el: HTMLElement) => void;

/** One editable piece of the page. Its HTML is set once per source change, so typing never re-renders it. */
function Editable({ unit, onCommit, as: Tag = "span", className }: { unit: Unit; onCommit: Commit; as?: ElementType; className?: string }) {
  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.currentTarget.blur();
    } else if (e.key === "Escape") {
      e.currentTarget.innerHTML = unit.html;
      e.currentTarget.blur();
    }
  };
  return (
    <Tag
      className={`tex-edit${className ? ` ${className}` : ""}`}
      contentEditable
      suppressContentEditableWarning
      spellCheck
      dangerouslySetInnerHTML={{ __html: unit.html }}
      onBlur={(e: React.FocusEvent<HTMLElement>) => onCommit(unit, e.currentTarget)}
      onKeyDown={onKeyDown}
      onPaste={(e: React.ClipboardEvent<HTMLElement>) => {
        // Plain text only; pasted markup would turn into LaTeX nobody wrote.
        e.preventDefault();
        document.execCommand("insertText", false, e.clipboardData.getData("text/plain").replace(/\s*\n\s*/g, " "));
      }}
    />
  );
}

function Page({ blocks, onCommit }: { blocks: Block[]; onCommit: Commit }) {
  const out: React.ReactNode[] = [];
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    if (b.kind === "item") {
      const items: Unit[] = [];
      for (; i < blocks.length && blocks[i].kind === "item"; i++) items.push((blocks[i] as { unit: Unit }).unit);
      i--;
      out.push(
        <ul key={`ul${i}`} className="tex-items">
          {items.map((u, j) => (
            <Editable key={j} as="li" unit={u} onCommit={onCommit} />
          ))}
        </ul>,
      );
    } else if (b.kind === "heading") {
      out.push(<Editable key={i} as="div" className="tex-heading" unit={b.unit} onCommit={onCommit} />);
    } else if (b.kind === "section") {
      out.push(
        <h3 key={i} className="tex-section">
          <Editable unit={b.unit} onCommit={onCommit} />
        </h3>,
      );
    } else if (b.kind === "sub") {
      const [a, d, t, l] = b.args;
      out.push(
        <div key={i} className="tex-sub">
          <div className="tex-row">
            <Editable className="tex-bf" unit={a} onCommit={onCommit} />
            <Editable className="tex-bf tex-small" unit={d} onCommit={onCommit} />
          </div>
          <div className="tex-row tex-it tex-small">
            <Editable unit={t} onCommit={onCommit} />
            <Editable unit={l} onCommit={onCommit} />
          </div>
        </div>,
      );
    } else if (b.kind === "subsub") {
      out.push(
        <div key={i} className="tex-row tex-it tex-small tex-subsub">
          <Editable unit={b.args[0]} onCommit={onCommit} />
          <Editable unit={b.args[1]} onCommit={onCommit} />
        </div>,
      );
    } else if (b.kind === "project") {
      out.push(
        <div key={i} className="tex-row tex-small tex-project">
          <Editable unit={b.args[0]} onCommit={onCommit} />
          <Editable className="tex-bf" unit={b.args[1]} onCommit={onCommit} />
        </div>,
      );
    } else {
      out.push(<Editable key={i} as="div" className="tex-text" unit={b.unit} onCommit={onCommit} />);
    }
  }
  return <>{out}</>;
}

export function ResumeEditor({ initial, versionId, files, name }: { initial: string; versionId: string | null; files: VersionFile[]; name: string }) {
  const [latex, setLatex] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const latexRef = useRef(initial);
  const history = useRef<{ past: string[]; future: string[]; typedAt: number }>({ past: [], future: [], typedAt: 0 });
  const [view, setView] = useState<"visual" | "code">("visual");
  const [zoom, setZoom] = useState<number | null>(null);
  const [fit, setFit] = useState(1);
  const [pdf, setPdf] = useState<"idle" | "building">("idle");
  const [message, setMessage] = useState<{ tone: "danger" | "ok"; text: string } | null>(null);
  const [saving, startSave] = useTransition();
  const [depth, setDepth] = useState({ past: 0, future: 0 });
  const stage = useRef<HTMLDivElement>(null);

  const blocks = useMemo(() => previewBlocks(latex), [latex]);
  const dirty = latex !== saved;

  const apply = (next: string, fromCode = false) => {
    const h = history.current;
    if (next === latexRef.current) return;
    // Keystrokes in the code pane within a second of each other undo together.
    const now = Date.now();
    if (!fromCode || now - h.typedAt > 1000) {
      h.past.push(latexRef.current);
      if (h.past.length > 200) h.past.shift();
    }
    h.typedAt = fromCode ? now : 0;
    h.future = [];
    latexRef.current = next;
    setLatex(next);
    setDepth({ past: h.past.length, future: 0 });
  };

  const onCommit: Commit = (unit, el) => {
    const current = latexRef.current;
    apply(current.slice(0, unit.start) + toLatex(el as unknown as TexNode) + current.slice(unit.end));
  };

  const step = (from: "past" | "future") => {
    const h = history.current;
    const to = from === "past" ? "future" : "past";
    const prev = h[from].pop();
    if (prev === undefined) return;
    h[to].push(latexRef.current);
    latexRef.current = prev;
    setLatex(prev);
    setDepth({ past: h.past.length, future: h.future.length });
  };

  /** Ends any edit in progress so its text is in the source before saving or compiling. */
  const settle = () => {
    const active = document.activeElement;
    if (active instanceof HTMLElement && active.classList.contains("tex-edit")) active.blur();
    return latexRef.current;
  };

  const save = () => {
    const source = settle();
    startSave(async () => {
      const result = versionId ? await saveVersionLatex(versionId, source) : await saveMasterResume(source);
      if (!result.ok) return setMessage({ tone: "danger", text: result.error });
      setSaved(source);
      setMessage({ tone: "ok", text: versionId ? "Saved this version." : "Saved. The ledger was rebuilt from the new text." });
    });
  };

  const download = (blob: Blob, file: string) => {
    const url = URL.createObjectURL(blob);
    Object.assign(document.createElement("a"), { href: url, download: file }).click();
    URL.revokeObjectURL(url);
  };

  const downloadPdf = async () => {
    const source = settle();
    setPdf("building");
    setMessage(null);
    try {
      const res = await fetch("/api/apply/resume/compile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ latex: source, name }),
      });
      if (!res.ok) throw new Error((await res.text()) || `The PDF build failed (${res.status}).`);
      download(await res.blob(), res.headers.get("Content-Disposition")?.match(/filename="([^"]+)"/)?.[1] ?? "resume.pdf");
    } catch (err) {
      setMessage({ tone: "danger", text: err instanceof Error ? err.message : "The PDF build failed." });
    } finally {
      setPdf("idle");
    }
  };

  // Fit the page to its column until he picks a zoom himself.
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setFit(Math.min(1.2, Math.max(0.3, (entry.contentRect.width - 24) / PAGE_PX))));
    observer.observe(el);
    return () => observer.disconnect();
  }, [view]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const typing = e.target instanceof HTMLElement && (e.target.isContentEditable || e.target.tagName === "TEXTAREA");
      if (e.key === "s") {
        e.preventDefault();
        save();
      } else if (!typing && e.key.toLowerCase() === "z") {
        e.preventDefault();
        step(e.shiftKey ? "future" : "past");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const scale = zoom ?? fit;
  return (
    <div className="tex-editor">
      <nav className="tex-files" aria-label="Resumes">
        <a href="/resume/editor" aria-current={versionId ? undefined : "page"}>
          <FileText aria-hidden /> <span>Master resume</span>
        </a>
        {files.map((f) => (
          <a key={f.id} href={`/resume/editor?v=${f.id}`} aria-current={f.id === versionId ? "page" : undefined} title={f.title}>
            <FileText aria-hidden />
            <span>
              {f.company}
              <small>
                {f.created_at.slice(0, 10)}
                {f.accepted_at ? ", accepted" : ""}
              </small>
            </span>
          </a>
        ))}
      </nav>

      <div className="tex-main">
        <div className="tex-toolbar">
          <div className="seg" role="group" aria-label="View">
            <button aria-pressed={view === "visual"} onClick={() => setView("visual")}>
              Visual
            </button>
            <button aria-pressed={view === "code"} onClick={() => setView("code")}>
              <Code2 aria-hidden /> Code
            </button>
          </div>
          <button className="btn btn-sm btn-icon" onClick={() => step("past")} disabled={!depth.past} aria-label="Undo">
            <Undo2 aria-hidden />
          </button>
          <button className="btn btn-sm btn-icon" onClick={() => step("future")} disabled={!depth.future} aria-label="Redo">
            <Redo2 aria-hidden />
          </button>
          <div className="tex-zoom">
            <button className="btn btn-sm btn-icon" onClick={() => setZoom(Math.max(0.4, +(scale - 0.1).toFixed(1)))} aria-label="Zoom out">
              <Minus aria-hidden />
            </button>
            <button className="btn btn-sm" onClick={() => setZoom(null)} title="Fit to width">
              {Math.round(scale * 100)}%
            </button>
            <button className="btn btn-sm btn-icon" onClick={() => setZoom(Math.min(2, +(scale + 0.1).toFixed(1)))} aria-label="Zoom in">
              <Plus aria-hidden />
            </button>
          </div>
          <span className="tex-status small muted" aria-live="polite">
            {dirty ? "Unsaved changes" : "Saved"}
          </span>
          <button className="btn btn-sm" onClick={save} disabled={saving || !dirty}>
            <Save aria-hidden /> {saving ? "Saving…" : "Save"}
          </button>
          <button className="btn btn-sm" onClick={() => download(new Blob([settle()], { type: "application/x-tex" }), `${name}.tex`)}>
            <Download aria-hidden /> .tex
          </button>
          <button className="btn btn-sm btn-primary" onClick={downloadPdf} disabled={pdf === "building"}>
            <FileText aria-hidden /> {pdf === "building" ? "Compiling… up to a minute" : "Download PDF"}
          </button>
        </div>

        {message && (
          <pre className={`notice small ${message.tone === "danger" ? "notice-danger" : ""} tex-message`} role={message.tone === "danger" ? "alert" : "status"}>
            {message.text}
          </pre>
        )}

        <div className={`tex-panes${view === "code" ? " tex-split" : ""}`}>
          {view === "code" && (
            <textarea
              className="tex-code"
              value={latex}
              onChange={(e) => apply(e.target.value, true)}
              spellCheck={false}
              aria-label="LaTeX source"
            />
          )}
          <div className="tex-stage" ref={stage}>
            <div className="tex-page" style={{ zoom: scale }}>
              <Page blocks={blocks} onCommit={onCommit} />
            </div>
          </div>
        </div>
        <p className="small muted">
          The page is a close preview; line breaks and the page end can shift slightly in the PDF. Enter finishes a line, Esc undoes the line you&rsquo;re on, Ctrl+B
          bolds.
          {versionId ? " Accepting this version again on its apply page re-renders it from the plan and replaces these edits." : ""}
        </p>
      </div>
    </div>
  );
}
