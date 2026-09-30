import { MessageSquare } from "lucide-react";

import type { Discussion } from "@/lib/db/types";

/** "412 points, 238 comments on Hacker News", linking to the thread. */
export function DiscussionLink({ discussion }: { discussion: Discussion }) {
  const stats = [
    discussion.points !== null ? `${discussion.points} points` : null,
    discussion.comments !== null ? `${discussion.comments} comments` : null,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <a className="thread-link" href={discussion.url} target="_blank" rel="noreferrer">
      <MessageSquare aria-hidden />
      {stats ? `${stats} on ${discussion.platform}` : `Discussed on ${discussion.platform}`}
    </a>
  );
}

export function KeyNumbers({ figures }: { figures: string[] }) {
  if (figures.length === 0) return null;
  return (
    <ul className="figures" aria-label="Key numbers">
      {figures.map((figure) => (
        <li key={figure}>{figure}</li>
      ))}
    </ul>
  );
}
