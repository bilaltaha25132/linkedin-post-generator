import { extractNumbers } from "@/lib/apply/latex";
import type { Ledger } from "@/lib/apply/types";

// Deterministic guards on every model edit: nothing it writes may carry a
// number, tool or qualification the ledger doesn't already hold.

const TECH = new Set(
  (
    "python java javascript typescript golang rust kotlin swift scala ruby php sql nosql postgres postgresql mysql " +
    "mongodb redis kafka spark airflow dbt snowflake bigquery docker kubernetes k8s terraform ansible aws gcp azure " +
    "react vue angular svelte django flask fastapi pytorch tensorflow keras jax langchain langgraph llamaindex " +
    "huggingface transformers pandas numpy scikit-learn sklearn xgboost pgvector pinecone weaviate qdrant milvus " +
    "chroma elasticsearch opensearch graphql grpc linux jenkins mlflow kubeflow triton vllm onnx cuda openai " +
    "anthropic gemini llama mistral bedrock sagemaker vertex langfuse prometheus grafana nginx celery rabbitmq " +
    "supabase firebase vercel node nestjs tailwind figma dagster prefect databricks hadoop hive tableau powerbi"
  ).split(" "),
);

const DEGREE = /\b(bachelor|master|ph\.?d|doctorate|msc|bsc|mba|m\.s\.|b\.s\.)\b/gi;

/** Tool and technology names in text: acronyms, CamelCase, dotted names, digits, or the known list. */
export function techTerms(text: string): string[] {
  const words = text.match(/[A-Za-z][A-Za-z0-9+#.\-/]*[A-Za-z0-9+#]|[A-Za-z]/g) ?? [];
  const terms = words.filter(
    (w) => /[A-Z].*[A-Z]/.test(w) || /\d/.test(w) || /[a-z][.+#][a-z+#]?/i.test(w) || TECH.has(w.toLowerCase()),
  );
  return [...new Set(terms.map((t) => t.replace(/[.\-/]+$/, "")))];
}

/** Everything the ledger knows, lower-cased, for "is this term his" lookups. */
export function corpusOf(ledger: Pick<Ledger, "roles" | "bullets" | "skills">): string {
  return [
    ...ledger.roles.flatMap((r) => [r.employer, r.title, r.location ?? ""]),
    ...ledger.bullets.map((b) => b.plain),
    ...ledger.skills.map((s) => s.name),
  ]
    .join("\n")
    .toLowerCase();
}

function inCorpus(term: string, corpus: string): boolean {
  const t = term.toLowerCase();
  if (corpus.includes(t)) return true;
  // "Postgres" vs "PostgreSQL", "Node" vs "Node.js".
  const stem = t.replace(/(ql|\.js|js)$/, "");
  return stem.length >= 3 && corpus.includes(stem);
}

/**
 * Why `text` can't go on the resume, or null if it can. `allowed` is the text
 * of the bullet it replaces plus any facts it cites.
 */
export function rejectReason(
  text: string,
  allowed: string[],
  corpus: string,
  opts: { maxLength?: number } = {},
): string | null {
  if (!text.trim()) return "empty";
  if (text.includes("\\")) return "contains raw LaTeX";
  if (/[—–]/.test(text)) return "uses a dash";
  if (opts.maxLength && text.length > opts.maxLength) return `too long (${text.length} of ${opts.maxLength} characters)`;

  const known = new Set(allowed.flatMap(extractNumbers));
  const newNumbers = extractNumbers(text).filter((n) => !known.has(n));
  if (newNumbers.length) return `number not in your ledger: ${newNumbers.join(", ")}`;

  const allowedText = allowed.join("\n").toLowerCase();
  const newTerms = techTerms(text).filter((t) => !inCorpus(t, corpus) && !inCorpus(t, allowedText));
  if (newTerms.length) return `not in your ledger: ${newTerms.join(", ")}`;

  const degrees = (text.match(DEGREE) ?? []).filter((d) => !corpus.includes(d.toLowerCase()));
  if (degrees.length) return `qualification not in your ledger: ${degrees.join(", ")}`;
  return null;
}

/** A bullet may grow a little; past that the page count shifts. */
export function maxBulletLength(original: string): number {
  return Math.max(Math.round(original.length * 1.15), original.length + 12);
}
