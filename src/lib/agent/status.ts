/** How a browser agent run stands. Shared by the server records and the live views. */

export const RUN_STATUSES = ["running", "waiting", "submitted", "ready", "needs_you", "stopped", "failed", "done"] as const;
export type RunStatus = (typeof RUN_STATUSES)[number];
export type RunReply = "go" | "skip";

/** Still in the agent's hands: the live views keep polling these. */
export const LIVE_STATUSES: readonly RunStatus[] = ["running", "waiting"];

export const STATUS_LABEL: Record<RunStatus, string> = {
  running: "Working on it",
  waiting: "Waiting for you",
  submitted: "Submitted",
  ready: "Ready for you to submit",
  needs_you: "Needs you",
  stopped: "Stopped",
  failed: "Hit a problem",
  done: "Finished, not submitted",
};
