// Server actions that call outside providers return failures as values. A thrown
// error reaches the browser in production only as "Minified React error #441",
// with the message stripped, so the user never learns what went wrong.

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

export async function attempt<T>(work: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await work() };
  } catch (err) {
    console.error(err);
    return { ok: false, error: friendlyError(err) };
  }
}

/** Client side: hand back the data, or throw the readable message. */
export function unwrap<T>(result: ActionResult<T>): T {
  if (result.ok) return result.data;
  throw new Error(result.error);
}

function friendlyError(err: unknown): string {
  const status = (err as { status?: number }).status;
  const message = err instanceof Error ? err.message : String(err);

  if (status === 402) return "The AI provider is out of credit. Top up DeepSeek at platform.deepseek.com, then try again.";
  if (status === 401 || status === 403) return "An API key was rejected. Check the keys in your Vercel environment settings.";
  if (status === 429) return "The AI provider is busy or rate-limiting right now. Wait a minute and try again.";
  if (status && status >= 500) return "The AI provider had a server error. Try again in a moment.";
  if (/timed? ?out|timeout|aborted/i.test(message)) return "The AI took too long to answer. Try again.";
  return message || "Something went wrong. Try again.";
}
