// Parsers for the LinkedIn emails the Gmail bridge forwards. Pure: no I/O, so
// they can be re-run over stored raw emails when LinkedIn changes a template.
// They anchor on what's stable (the sender, the subject wording, /jobs/view/{id}
// links) rather than on layout.

import { activityIdOf, cleanLinkedInUrl } from "@/lib/links/deep";

export type EmailKind =
  | "job_alert"
  | "application"
  | "notification"
  | "invitation"
  | "message"
  | "suggestion"
  | "newsletter"
  | "other";

export interface InboundEmail {
  sender: string;
  subject: string;
  body: string;
}

export interface AlertJob {
  jobId: string;
  title: string;
  company: string;
  location: string;
  /** "4 connections", salary, "Actively recruiting": LinkedIn's own hint lines. */
  insights: string[];
}

export interface EngagementItem {
  kind: "comment" | "reaction" | "mention" | "profile_view" | "follower" | "post_perf" | "post_alert";
  actor: string | null;
  preview: string | null;
  postUrl: string | null;
}

export interface ApplicationUpdate {
  company: string;
  title: string | null;
  outcome: "viewed" | "rejected" | "update";
}

export interface PersonItem {
  name: string;
  headline: string | null;
  profileUrl: string | null;
  /** For messages: the first lines. */
  preview: string | null;
  accepted?: boolean;
}

export interface ParsedEmail {
  kind: EmailKind;
  jobs: AlertJob[];
  events: EngagementItem[];
  applications: ApplicationUpdate[];
  people: PersonItem[];
  weekly: { appearances: number; foundBy: string[] } | null;
}

const SENDER_KINDS: [RegExp, EmailKind][] = [
  [/^(jobalerts-noreply|jobs-listings)@/i, "job_alert"],
  [/^jobs-noreply@/i, "application"],
  [/^notifications-noreply@/i, "notification"],
  [/^invitations@/i, "invitation"],
  [/^(inmail-hit-reply|hit-reply|inmails-noreply|messaging-digest-noreply)@/i, "message"],
  [/^messages-noreply@/i, "suggestion"],
  [/^newsletters-noreply@/i, "newsletter"],
];

export function emailKind(sender: string): EmailKind {
  const address = sender.match(/<([^>]+)>/)?.[1] ?? sender;
  return SENDER_KINDS.find(([re]) => re.test(address.trim()))?.[1] ?? "other";
}

export function parseEmail(email: InboundEmail): ParsedEmail {
  const kind = emailKind(email.sender);
  const parsed: ParsedEmail = { kind, jobs: [], events: [], applications: [], people: [], weekly: null };
  switch (kind) {
    case "job_alert":
      parsed.jobs = parseJobAlert(email.body);
      break;
    case "application": {
      const update = parseApplication(email);
      if (update) parsed.applications.push(update);
      // Some of these are recommended-job digests in the same card layout.
      else parsed.jobs = parseJobAlert(email.body);
      break;
    }
    case "notification":
      parseNotification(email, parsed);
      break;
    case "invitation": {
      const person = parseInvitation(email);
      if (person) parsed.people.push(person);
      break;
    }
    case "message": {
      const person = parseMessage(email);
      if (person) parsed.people.push(person);
      break;
    }
  }
  return parsed;
}

/** Lines of a plain-text body, trimmed, blanks and pure-punctuation separators dropped. */
function lines(body: string): string[] {
  return body
    .split(/\r?\n/)
    .map((l) => l.replace(/ /g, " ").trim())
    .filter((l) => l && !/^[-_=*·.\s]+$/.test(l));
}

const URL_RE = /https?:\/\/[^\s<>"')\]]+/g;
const HAS_URL = /https?:\/\//i;

// Hint lines LinkedIn puts around a job card. Kept as insights, never taken as
// the title, company or location.
const INSIGHT_RE =
  /^(actively recruiting|promoted|easy apply|be an early applicant|new|\d+\+? (connections?|alumni|applicants?|school alumni)|.*\b(connections?|alum(ni)?) work here|.*\bactively hiring|.*\b(salary|\/yr|\/mo|\/hr|per (year|month|hour))\b|.*[$€£]\s?\d|.*\b(pkr|aed|sar|usd|eur|gbp)\s?\d|\d+ (day|week|hour|minute)s? ago|.*\bresponds? (within|quickly)|.*\bviewed|top applicant|.*\bmatch(es)? your)/i;
const NOISE_RE =
  /^(view job|view jobs|see all jobs|apply( now)?|search (other )?jobs|your job alert|job alert|unsubscribe|manage (job )?alerts|this email was intended for|learn why we included this|help|privacy|linkedin|©|you are receiving|new jobs match your preferences|jobs you may be interested in|.*https?:\/\/)/i;

export function parseJobAlert(body: string): AlertJob[] {
  const all = lines(body);
  const jobs = new Map<string, AlertJob>();
  let start = 0;
  all.forEach((line, i) => {
    const id = line.match(/linkedin\.com\/(?:comm\/)?jobs\/view\/(\d{6,})/i)?.[1];
    if (!id) return;
    const card = all.slice(start, i).filter((l) => !HAS_URL.test(l));
    start = i + 1;
    if (jobs.has(id)) return;

    const insights: string[] = [];
    const fields: string[] = [];
    // Read back from the link: the card's lines sit just above it.
    for (const l of card.slice(-8)) {
      if (NOISE_RE.test(l)) continue;
      if (INSIGHT_RE.test(l)) insights.push(l);
      else fields.push(l);
    }
    const [title, second, third] = fields.slice(-3).length === 3 ? fields.slice(-3) : fields.slice(-2);
    if (!title) return;
    let company = second ?? "";
    let location = third ?? "";
    // "Company · Location" on one line.
    if (!third && second?.includes(" · ")) [company, location] = second.split(" · ", 2);
    jobs.set(id, { jobId: id, title: clean(title), company: clean(company), location: clean(location), insights });
  });
  return [...jobs.values()].filter((j) => j.title && j.company);
}

function clean(s: string): string {
  return s.replace(/\s+/g, " ").replace(/^[•\-–*]\s*/, "").trim();
}

const REJECT_RE =
  /unfortunately|not (to )?(move|moving) forward|decided to (pursue|proceed with) other|position has been filled|no longer (being )?considered|not selected/i;

export function parseApplication(email: InboundEmail): ApplicationUpdate | null {
  const s = email.subject;
  const viewed = s.match(/your application was viewed by (.+?)\.?$/i);
  if (viewed) return { company: clean(viewed[1]), title: null, outcome: "viewed" };
  const to = s.match(/your application to (.+?) at (.+?)\.?$/i) ?? s.match(/(.+?) at (.+?): (?:application|update)/i);
  if (to) {
    return {
      company: clean(to[2]),
      title: clean(to[1]),
      outcome: REJECT_RE.test(email.body) ? "rejected" : "update",
    };
  }
  return null;
}

function postLink(body: string): string | null {
  for (const raw of body.match(URL_RE) ?? []) {
    if (!activityIdOf(raw) && !/\/posts\//.test(raw)) continue;
    const url = cleanLinkedInUrl(raw);
    if (url) return url;
  }
  return null;
}

/** The first lines of the body that read as someone's words, for a preview. */
function quote(body: string, skip: RegExp): string | null {
  const text = lines(body)
    .filter((l) => !HAS_URL.test(l) && !NOISE_RE.test(l) && !skip.test(l))
    .slice(0, 3)
    .join(" ");
  return text ? text.slice(0, 600) : null;
}

export function parseNotification(email: InboundEmail, out: ParsedEmail): void {
  const s = email.subject.trim();
  const add = (kind: EngagementItem["kind"], actor: string | null, preview: string | null = null) =>
    out.events.push({ kind, actor: actor ? clean(actor) : null, preview, postUrl: postLink(email.body) });
  const subjectRe = new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

  const searches = s.match(/you appeared in (\d[\d,]*) search(?:es)?/i) ?? email.body.match(/appeared in (\d[\d,]*) search/i);
  if (searches) {
    const foundBy = [...email.body.matchAll(/(?:people|someone) (?:at|from) ([^\n,.]{2,60}?)(?= and |[\n,.]|$)/gi)].map((m) => clean(m[1]));
    out.weekly = { appearances: Number(searches[1].replace(/,/g, "")), foundBy: [...new Set(foundBy)].slice(0, 10) };
    return;
  }

  let m: RegExpMatchArray | null;
  if ((m = s.match(/^(.+?) (?:commented on|replied to) (?:your|a post you|a comment)/i))) {
    add("comment", m[1], quote(email.body, subjectRe));
  } else if ((m = s.match(/^(.+?) mentioned you/i))) {
    add("mention", m[1], quote(email.body, subjectRe));
  } else if (
    (m = s.match(/^(.+?)(?:,? and \d[\d,]* others?)? (?:reacted to|liked|celebrated|loves?|supports?|found) .*\byour\b/i))
  ) {
    add("reaction", m[1]);
  } else if ((m = s.match(/^(.+?) (?:viewed|is viewing|looked at) your profile/i))) {
    add("profile_view", m[1]);
  } else if ((m = s.match(/^(.+?) (?:started following|followed|is now following) you/i))) {
    add("follower", m[1]);
  } else if (/your post|impressions|views of your/i.test(s) && /\d/.test(s)) {
    add("post_perf", null, s);
  } else if ((m = s.match(/^(.+?) (?:just )?(?:posted|shared a post|shared|published|wrote)\b/i))) {
    // A bell notification for someone he follows: a fresh post worth a comment.
    add("post_alert", m[1], quote(email.body, subjectRe));
  }
}

function profileLink(body: string): string | null {
  for (const raw of body.match(URL_RE) ?? []) {
    if (!/linkedin\.com\/(comm\/)?in\//i.test(raw)) continue;
    const url = cleanLinkedInUrl(raw);
    if (url) return url.replace(/\?.*$/, "");
  }
  return null;
}

export function parseInvitation(email: InboundEmail): PersonItem | null {
  const s = email.subject;
  const accepted = s.match(/^(.+?) accepted your invitation/i);
  const invited =
    s.match(/^(.+?) (?:wants to connect|has invited you|invited you|sent you an invitation)/i) ??
    s.match(/^(?:invitation|i want to connect|please add me).*?from (.+)$/i);
  const name = accepted?.[1] ?? invited?.[1];
  if (!name) return null;
  const all = lines(email.body);
  const at = all.findIndex((l) => l.toLowerCase().startsWith(clean(name).toLowerCase()));
  const headline = at >= 0 && all[at + 1] && !HAS_URL.test(all[at + 1]) ? all[at + 1] : null;
  return {
    name: clean(name),
    headline: headline && !NOISE_RE.test(headline) ? headline.slice(0, 200) : null,
    profileUrl: profileLink(email.body),
    preview: null,
    accepted: Boolean(accepted),
  };
}

export function parseMessage(email: InboundEmail): PersonItem | null {
  const s = email.subject;
  const m =
    s.match(/^(.+?) (?:sent you a (?:new )?message|messaged you|sent you an inmail)/i) ??
    s.match(/^new message from (.+)$/i) ??
    s.match(/^(?:inmail|message)[: ]+(?:from )?([^:]+)/i) ??
    s.match(/^([^:]{3,60}): .+/);
  if (!m) return null;
  return {
    name: clean(m[1]),
    headline: null,
    profileUrl: profileLink(email.body),
    preview: quote(email.body, /^(reply|view message|see message|mark as read)/i),
  };
}
