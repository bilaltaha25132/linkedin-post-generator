export const KIND_LABEL: Record<string, string> = {
  hiring_post: "Hiring post",
  client_post: "Client post",
  gig: "Gig",
  contract_role: "Contract role",
  recruiter_message: "Message",
};

export const SOURCE_LABEL: Record<string, string> = {
  hn: "Hacker News",
  freelancer: "Freelancer.com",
  peopleperhour: "PeoplePerHour",
  workana: "Workana",
  mostaql: "Mostaql",
  arc: "Arc.dev",
  guru: "Guru",
  braintrust: "Braintrust",
  freelancermap: "freelancermap",
  ureed: "Ureed",
  khamsat: "Khamsat",
  reddit: "Reddit",
  tavily: "LinkedIn (via Tavily)",
  exa: "LinkedIn (via Exa)",
  jobs: "Jobs tab",
  linkedin_message: "LinkedIn message",
  manual: "Added by you",
};

/** Days until a Contacted lead comes back if nothing changed. */
export const DEFAULT_NUDGE_DAYS = 6;
