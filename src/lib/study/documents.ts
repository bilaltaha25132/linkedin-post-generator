/**
 * The documents most German Master's applications are built from, for a
 * Bachelor's from Pakistan. Prepared once, reused for every program.
 */
export const DOCUMENTS: { key: string; title: string; detail: string; from: string }[] = [
  {
    key: "degree",
    title: "Degree certificate and transcript",
    detail: "With HEC attestation. Scan every page, front and back. Confirm uni-assist accepts the HEC e-certificate.",
    from: "University, then HEC",
  },
  { key: "school", title: "School certificates", detail: "Matric and Intermediate, with subjects and grades.", from: "Board" },
  {
    key: "min-cgpa",
    title: "Proof of the minimum CGPA to award the degree",
    detail: "The minimum for the degree, not for passing a course. It changes how your grade converts.",
    from: "University",
  },
  {
    key: "grading",
    title: "Official grading system document",
    detail: "Issued by the university. anabin and Wikipedia links are rejected.",
    from: "University",
  },
  { key: "passport", title: "Passport", detail: "Photo and data page only.", from: "You" },
  {
    key: "cv",
    title: "CV with no gaps",
    detail: "From first school to today. Write \"no special activities\" for gaps rather than leaving them.",
    from: "You",
  },
  {
    key: "english",
    title: "English test",
    detail: "IELTS 7.0 clears most programs. Some ask for C1 or TOEFL 100. Check sub-score rules.",
    from: "Test centre",
  },
  {
    key: "moi",
    title: "English-medium letter",
    detail: "Stamped and signed, saying the degree was taught entirely in English. Several programs refuse it as proof, so it is a backup, not a substitute.",
    from: "University",
  },
  {
    key: "rank",
    title: "Cohort rank letter",
    detail: "Your rank and the cohort size. Passau accepts the top 70% instead of a grade.",
    from: "University",
  },
  {
    key: "handbook",
    title: "Module handbook",
    detail: "Official, with web links, or stamped by the university. Credit rules are checked against it.",
    from: "University",
  },
  { key: "thesis", title: "Final project or thesis", detail: "Full text and an abstract. Some programs ask for a link.", from: "You" },
  {
    key: "topic-map",
    title: "ECTS conversion and topic map",
    detail: "Each course mapped to maths, theory, programming, systems and so on, with ECTS. Reused across programs.",
    from: "You",
  },
  {
    key: "references",
    title: "Two recommendation letters",
    detail: "Two referees ready to respond by email. Saarland needs them in by its deadline.",
    from: "Professors",
  },
  {
    key: "vpd",
    title: "uni-assist VPD",
    detail: "Needed by TU Berlin, TUM, HPI, Regensburg and others. Allow 4 to 6 weeks.",
    from: "uni-assist",
  },
];
