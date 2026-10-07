import { corpusOf, maxBulletLength, rejectReason } from "@/lib/apply/check";
import { applySpans, commandSpan, escapeLatex, parseResume, toPlain, type Span } from "@/lib/apply/latex";
import type { DiffRow, Ledger, TailorPlan, VersionReport } from "@/lib/apply/types";

// Turns a tailoring plan into LaTeX. Only bullet arguments, skills lines and
// the summary text change; every check runs here, so a plan replayed with
// fewer accepted edits renders the same way.

export interface RenderOptions {
  /** Edits he turned off in review. */
  declined?: Set<string>;
  /** False when he turned off the summary rewrite. */
  useSummary?: boolean;
}

export function renderTailored(ledger: Ledger, plan: TailorPlan, opts: RenderOptions = {}): { latex: string; report: VersionReport } {
  if (!ledger.master) throw new Error("Add your master resume first.");
  const src = ledger.master.latex;
  const corpus = corpusOf(ledger);
  const byId = new Map(ledger.bullets.map((b) => [b.id, b]));
  const roleName = new Map(ledger.roles.map((r) => [r.id, [r.title, r.employer].filter(Boolean).join(", ")]));
  const spans: (Span & { text: string })[] = [];
  const diff: DiffRow[] = [];

  // Bullet text after edits, keyed by bullet id.
  const content = new Map<string, string>();
  for (const b of ledger.bullets) if (b.origin === "resume") content.set(b.id, b.latex);
  for (const e of plan.edits) {
    const b = byId.get(e.bullet_id);
    if (!b || b.origin !== "resume" || b.src_start === null) continue;
    // An "edit" that only drops formatting isn't one.
    if (e.new_text.replace(/\*\*/g, "").trim() === b.plain) continue;
    const facts = e.uses_facts.map((id) => byId.get(id)?.plain).filter((p): p is string => Boolean(p));
    let reason = rejectReason(e.new_text, [b.plain, ...facts], corpus, { maxLength: maxBulletLength(b.plain) });
    let latex: string | null = null;
    if (!reason) {
      try {
        latex = escapeLatex(e.new_text.trim());
      } catch (err) {
        reason = (err as Error).message;
      }
    }
    const declined = opts.declined?.has(e.bullet_id);
    if (latex && !declined) content.set(b.id, latex);
    diff.push({
      bulletId: b.id,
      role: roleName.get(b.role_id ?? "") ?? "",
      before: b.plain,
      after: e.new_text,
      status: reason ? "rejected" : declined ? "kept" : "edited",
      ...(reason ? { reason } : {}),
    });
  }

  // Order and drops, role by role, filling the role's existing slots.
  const drop = new Set(plan.drop);
  for (const role of ledger.roles) {
    const slots = ledger.bullets
      .filter((b) => b.role_id === role.id && b.origin === "resume" && b.src_start !== null)
      .sort((a, b) => a.src_start! - b.src_start!);
    if (!slots.length) continue;
    const wanted = plan.reorder.find((r) => r.role_id === role.id)?.bullet_ids.filter((id) => slots.some((s) => s.id === id)) ?? [];
    const order = [...new Set([...wanted, ...slots.map((s) => s.id)])];
    // Keep at least two bullets (or all, when there are fewer).
    const keep = order.filter((id) => !drop.has(id));
    const final = keep.length >= Math.min(2, slots.length) ? keep : order.slice(0, Math.min(2, slots.length));
    for (const id of order.filter((id) => !final.includes(id))) {
      const b = byId.get(id)!;
      diff.push({ bulletId: id, role: roleName.get(role.id) ?? "", before: b.plain, after: null, status: "dropped" });
    }
    slots.forEach((slot, i) => {
      const id = final[i];
      if (id === undefined) spans.push({ ...commandSpan(src, { start: slot.src_start!, end: slot.src_end! }), text: "" });
      else if (content.get(id) !== slot.latex) spans.push({ start: slot.src_start!, end: slot.src_end!, text: content.get(id)! });
    });
  }

  // Skills lines and the summary come straight from the source.
  const parsed = parseResume(src);
  for (const line of parsed.skills) {
    const wanted = plan.skills_order.find((s) => s.category.toLowerCase() === line.category.toLowerCase());
    if (!wanted) continue;
    const plainOf = (item: string) => toPlain(item).toLowerCase();
    const picked = wanted.items
      .map((w) => line.items.find((item) => plainOf(item) === w.trim().toLowerCase()))
      .filter((i): i is string => Boolean(i));
    const order = [...new Set([...picked, ...line.items])];
    const text = order.join(", ");
    if (text !== src.slice(line.start, line.end)) spans.push({ start: line.start, end: line.end, text });
  }

  let summary: VersionReport["summary"] = null;
  if (parsed.summary && plan.summary) {
    const reason = rejectReason(plan.summary, [parsed.summary.plain], corpus, {
      maxLength: Math.max(220, Math.round(parsed.summary.plain.length * 1.3)),
    });
    summary = { before: parsed.summary.plain, after: plan.summary, ...(reason ? { reason } : {}) };
    if (!reason && opts.useSummary !== false) spans.push({ ...parsed.summary, text: escapeLatex(plan.summary.trim()) });
  }

  const latex = applySpans(src, spans);
  const before = toPlain(src.slice(src.indexOf("\\begin{document}")));
  const after = toPlain(latex.slice(latex.indexOf("\\begin{document}")));
  const coverage = plan.keywords.map((k) => ({ keyword: k, before: hasTerm(before, k), after: hasTerm(after, k) }));

  return { latex, report: { diff, summary, coverage, gaps: plan.gaps } };
}

/** Whole-word, case-insensitive: "AST" isn't in "FastAPI". "full-stack" matches "Full Stack". */
function hasTerm(text: string, term: string): boolean {
  const escaped = term
    .trim()
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .replace(/[-\s]+/g, "[-\\s]?");
  return new RegExp(`(^|[^a-z0-9])${escaped}($|[^a-z0-9])`, "i").test(text);
}
