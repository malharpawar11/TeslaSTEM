import type { Club } from "../types/domain";

/**
 * Club Match engine.
 *
 * Every club's profile is read from its own name and description: the words
 * that triggered each signal are kept as evidence, so a reason shown to a
 * student always points at something the club actually says about itself.
 * Nothing here describes a specific club by hand.
 *
 * The questions follow an activity-based approach (in the spirit of O*NET's
 * Interest Profiler): students pick things they'd enjoy doing, not school
 * categories. Follow-ups appear only when an earlier answer opens an area
 * where several clubs need telling apart.
 */

// ---------------------------------------------------------------------------
// Signals read from club text
// ---------------------------------------------------------------------------

type Pattern = RegExp;

/** Each signal is a set of patterns over "name. description". */
const SIGNALS: Record<string, Pattern[]> = {
  // Things a club does
  "act.build": [/\bbuild(?:s|ing)?\b(?! awareness)/i, /\bengineering\b/i, /\bcad\b/i, /\bmodeling\b/i, /\brockets?\b/i, /\blaunch\b/i, /\bmedical tools\b/i, /\bstem materials\b/i],
  "act.code": [/\bcod(?:e|ing)\b/i, /\bprogramming\b/i, /\bsoftware\b/i, /\bcomputer science\b/i, /\busaco\b/i, /\bcodeforces\b/i, /\bleetcode\b/i, /\bmachine learning\b/i, /\bartificial intelligence\b/i, /\bquantum computing\b/i],
  "act.experiment": [/\blabs?\b/i, /\bexperiments?\b/i, /\bresearch\b/i, /\binvestigat\w*/i],
  "act.puzzle": [/\bpuzzles?\b/i, /\bbrain teasers\b/i, /\bproblems from\b/i, /\binteresting problems\b/i, /\bchess\b/i, /\blogic\b/i, /\balgorithms?\b/i],
  "act.visual": [/\bgraphic(?:s)?\b/i, /\bdesigns?\b/i, /\bdrawing\b/i, /\bart\b/i, /\bamplify the arts\b/i, /\bphotos?\b/i, /\bcreative\b/i],
  "act.debate": [/\bdebate\b/i, /\bpublic speaking\b/i, /\bargumentation\b/i, /\bpersuasive\b/i, /\bresolutions\b/i],
  "act.organize": [/\bleadership\b/i, /\bstudent-led\b/i, /\bplan workshops\b/i, /\borganiz\w+/i, /\bleaders\b/i],
  "act.teach": [/\btutor\b/i, /\beducate\b/i, /\bteach\w*/i, /\belementary\b/i, /\bmiddle schoolers\b/i, /\byoung children\b/i],
  "act.volunteer": [/\bvolunteer\w*/i, /\bdonations\b/i, /\bcommunity service\b/i, /\bservice projects\b/i, /\bsenior homes\b/i],
  "act.culture": [/\bcultures?\b/i, /\bspanish\b/i, /\bmuslim\b/i, /\blgbtq\+?/i, /\bequity\b/i, /\binclusion\b/i],
  "act.digital": [/\bvideo game\b/i, /\bgraphics\b/i, /\bphotos\b/i, /\bdesign pages\b/i],
  "act.compete": [/\bcompetitions?\b(?! merch)/i, /\bcompete\b/i, /\bcompetitive\b/i, /\btournaments?\b/i, /\bolympiad\b/i, /\busaco\b/i, /\busabo\b/i, /\busnco\b/i, /\bamc\b/i, /\bbrain bee\b/i, /\bcodeforces\b/i, /\bbuzzer\b/i, /\bgame-show\b/i],
  "act.write": [/\bwriting\b/i, /\binterview\b/i, /\bbook\b/i],
  "act.move": [/\bdance\b/i, /\byoga\b/i, /\brelax\w*/i, /\btake a break\b/i, /\btea\b/i],

  // Subjects a club covers
  "top.ai": [/\bartificial intelligence\b/i, /\(ai\)/i, /\bmachine learning\b/i, /\(ml\)/i],
  "top.engineering": [/\bengineering\b/i, /\brockets?\b/i, /\bbuild(?:ing)?\b(?! awareness)/i, /\bcad\b/i],
  "top.programming": [/\bprogramming\b/i, /\bcod(?:e|ing)\b/i, /\bcomputer science\b/i, /\bsoftware\b/i, /\busaco\b/i, /\bcodeforces\b/i, /\bleetcode\b/i, /\bquantum computing\b/i, /\balgorithms\b/i],
  "top.math": [/\bmath\b/i, /\bamc\b/i, /\balgorithms\b/i, /\blogic\b/i, /\bdynamic programming\b/i],
  "top.physics": [/\bphysics\b/i, /\brockets?\b/i, /\bquantum\b/i, /\bearth science\b/i],
  "top.bio": [/\bbiolog\w*/i, /\banatomy\b/i, /\bphysiology\b/i, /\bmedical\b/i, /\bbiomedical\b/i, /\busabo\b/i, /\bbrain bee\b/i],
  "top.chem": [/\bchemistry\b/i, /\busnco\b/i],
  "top.business": [/\bbusiness\b/i, /\bfbla\b/i, /\bentrepreneur\w*/i],
  "top.finance": [/\beconomics\b/i, /\bfinance\b/i, /\bsaving\b/i, /\bmacroeconomics\b/i],
  "top.architecture": [/\barchitecture\b/i, /\bcad\b/i],
  "top.art": [/\bart\b/i, /\barts\b/i, /\bgraphic\b/i, /\bdesigns?\b/i, /\bcreative\b/i, /\bphotos\b/i, /\bdrawing\b/i],
  "top.writing": [/\bwriting\b/i, /\binterview\b/i, /\byearbook\b/i],
  "top.world": [/\bhistor\w*/i, /\bcurrent events\b/i, /\bunited nations\b/i, /\bworld's\b/i],
  "top.speaking": [/\bdebate\b/i, /\bpublic speaking\b/i, /\bargumentation\b/i, /\bspeech\b/i],
  "top.environment": [/\bsustainab\w*/i, /\benvironmental\w*/i, /\boutdoor\b/i],
  "top.wellness": [/\bmental health\b/i, /\byoga\b/i, /\brelax\w*/i, /\btake a break\b/i],
  "top.service": [/\bvolunteer\w*/i, /\bcommunity service\b/i, /\bservice projects\b/i, /\bdonations\b/i, /\btutor\b/i, /\beducate\b/i],
  "top.culture": [/\bcultures?\b/i, /\bspanish\b/i, /\bmuslim\b/i, /\blgbtq\+?/i, /\bgender\b/i, /\bequity\b/i, /\binclusion\b/i],
  "top.games": [/\bchess\b/i, /\bpuzzles?\b/i, /\bvideo game\b/i, /\bquiz\b/i, /\bbuzzer\b/i, /\bgame-show\b/i],
  "top.dance": [/\bdance\b/i],

  // How a club runs, in its own words
  "tr.beginner": [/\bno experience(?: needed| required)?\b/i, /\ball skill levels\b/i, /\ball are welcome\b/i, /\beveryone can attend\b/i, /\bno commitment\b/i, /\ball \w+ styles welcome\b/i, /\bsafe and comfortable\b/i, /\bcasual\b/i],
  "tr.team": [/\bteams? of\b/i, /\bcollaborate\b/i, /\bwith friends\b/i, /\bgreat people\b/i, /\btogether\b/i],
  "tr.handsOn": [/\blabs?\b/i, /\bbuild\b/i, /\blaunch\b/i, /\bhands-on\b/i, /\bmodeling\b/i, /\bcreate\b/i],
  "tr.projects": [/\bprojects?\b/i, /\bcode a video game\b/i, /\bdesigns for events\b/i, /\bcreate a book\b/i, /\bart pieces\b/i, /\bbuild and launch\b/i],
  "tr.career": [/\bcareers?\b/i, /\breal-world\b/i, /\bprofessionals\b/i, /\bindustry\b/i, /\bin-demand\b/i],
  "tr.leadership": [/\bleadership\b/i, /\bstudent-led\b/i, /\bleaders\b/i],
  "tr.community": [/\bcommunity\b/i, /\bvolunteer\w*/i, /\bservice\b/i, /\bthe whole school\b/i, /\belementary\b/i, /\bchildren\b/i, /\bkids\b/i],
  "tr.social": [/\bfriends\b/i, /\bconnect\w*/i, /\bgreat people\b/i, /\bfun\b/i, /\bcommunity members\b/i],
  "tr.learn": [/\blearn\w*/i, /\bintroduce\b/i, /\bexplor\w+/i, /\bgain\b/i, /\blessons\b/i],
  "tr.improve": [/\bimprove\b/i, /\bprepare\w*/i, /\bcompetitive\b/i, /\bdevelop\b/i, /\bfeedback\b/i],
};

/** Competitions a description names, so a reason can name them too. */
const NAMED_COMPETITIONS = [/\bUSACO\b/, /\bCodeforces\b/, /\bLeetCode\b/, /\bUSABO\b/, /\bBrain Bee\b/, /\bUSNCO\b/, /\bAMC\b/];

export interface ClubProfile {
  club: Club;
  /** Signal id → the words in the club's own text that triggered it. */
  signals: Map<string, string[]>;
  competitions: string[];
  /** Weekdays and periods parsed from the club's schedule; empty when not listed. */
  days: string[];
  periods: Period[];
  /** "A" or "B" when the schedule names only one lunch. */
  lunchOnly: "A" | "B" | null;
  room: string | null;
}

export type Period = "Before School" | "At Lunch" | "After School";
export const PERIODS: Period[] = ["Before School", "At Lunch", "After School"];
export const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

function evidence(text: string, patterns: Pattern[]) {
  const found: string[] = [];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && !found.some((f) => f.toLowerCase() === match[0].toLowerCase()))
      found.push(match[0]);
  }
  return found;
}

export function schedulePeriods(time: string): Period[] {
  const out: Period[] = [];
  if (/\bbefore school\b/i.test(time)) out.push("Before School");
  if (/\blunch\b/i.test(time)) out.push("At Lunch");
  if (/\bafter school\b/i.test(time)) out.push("After School");
  return out;
}

export function scheduleDays(day: string): string[] {
  return WEEKDAYS.filter((name) =>
    new RegExp(`\\b${name}s?\\b|\\b${name.slice(0, 3)}\\b`, "i").test(day),
  );
}

function lunchOnly(time: string): "A" | "B" | null {
  const a = /\bA lunch\b/i.test(time);
  const b = /\bB lunch\b/i.test(time);
  return a && !b ? "A" : b && !a ? "B" : null;
}

/** The club's own words saying newcomers are welcome, when it says so plainly. */
export function beginnerStatement(profile: ClubProfile): string | null {
  return (
    profile.signals
      .get("tr.beginner")
      ?.find((w) => /experience|skill levels|welcome|everyone/i.test(w)) ?? null
  );
}

const profileCache = new WeakMap<Club, ClubProfile>();

export function profileClub(club: Club): ClubProfile {
  const cached = profileCache.get(club);
  if (cached) return cached;
  const text = `${club.name}. ${club.description ?? ""}`;
  const signals = new Map<string, string[]>();
  for (const [id, patterns] of Object.entries(SIGNALS)) {
    const found = evidence(text, patterns);
    if (found.length) signals.set(id, found);
  }
  const room = club.location?.match(/(?:^|[^0-9A-Z])((?:RM|Room)\s*)?([12]\d{2}A?)(?![0-9])/i)?.[2] ?? null;
  const profile: ClubProfile = {
    club,
    signals,
    competitions: NAMED_COMPETITIONS.map((p) => text.match(p)?.[0]).filter((v): v is string => !!v),
    days: scheduleDays(club.day ?? ""),
    periods: schedulePeriods(club.time ?? ""),
    lunchOnly: lunchOnly(club.time ?? ""),
    room,
  };
  profileCache.set(club, profile);
  return profile;
}

// ---------------------------------------------------------------------------
// Questions
// ---------------------------------------------------------------------------

export interface Option {
  id: string;
  /** Short card title. */
  title: string;
  /** The full statement, in the student's voice. */
  label: string;
  /** Club signals this answer looks for. Each inner list must all match. */
  match: string[][];
  /** How the answer reads inside a reason: "interest in ___". */
  phrase: string;
}

const any = (...ids: string[]) => ids.map((id) => [id]);

export const ACTIVITIES: Option[] = [
  { id: "build", title: "Build", label: "Building and designing things", match: any("act.build"), phrase: "building things" },
  { id: "code", title: "Code", label: "Writing code and creating software", match: any("act.code"), phrase: "coding" },
  { id: "experiment", title: "Experiment", label: "Conducting experiments and investigating questions", match: any("act.experiment"), phrase: "experiments and investigating" },
  { id: "puzzle", title: "Solve", label: "Solving difficult puzzles and problems", match: any("act.puzzle"), phrase: "solving hard problems" },
  { id: "visual", title: "Design", label: "Designing graphics, art, or visual projects", match: any("act.visual"), phrase: "art and design" },
  { id: "debate", title: "Argue", label: "Debating, presenting, and defending ideas", match: any("act.debate"), phrase: "debating and presenting" },
  { id: "organize", title: "Lead", label: "Starting projects and organizing people", match: any("act.organize"), phrase: "organizing people" },
  { id: "teach", title: "Teach", label: "Teaching others and helping people learn", match: any("act.teach"), phrase: "teaching others" },
  { id: "volunteer", title: "Serve", label: "Volunteering and making a difference in the community", match: any("act.volunteer"), phrase: "volunteering" },
  { id: "culture", title: "Connect", label: "Exploring different cultures and perspectives", match: any("act.culture"), phrase: "cultures and perspectives" },
  { id: "digital", title: "Create", label: "Creating games, videos, or digital experiences", match: any("act.digital"), phrase: "digital creation" },
  { id: "compete", title: "Compete", label: "Competing in academic or technical challenges", match: any("act.compete"), phrase: "competing" },
  { id: "write", title: "Write", label: "Writing stories, articles, or ideas", match: any("act.write"), phrase: "writing" },
  { id: "move", title: "Unwind", label: "Dancing, moving, or unwinding with friends", match: any("act.move"), phrase: "moving and unwinding" },
];

export const CHALLENGES: Option[] = [
  { id: "how", title: "How it works", label: "Figuring out how something works", match: any("act.experiment", "top.physics", "act.build"), phrase: "figuring out how things work" },
  { id: "new", title: "Something new", label: "Creating something that has never existed before", match: any("tr.projects", "act.digital", "act.build"), phrase: "creating something new" },
  { id: "pressure", title: "Under pressure", label: "Solving difficult problems under pressure", match: any("act.compete"), phrase: "problems under pressure" },
  { id: "research", title: "Research", label: "Researching a topic and discovering new information", match: any("act.experiment", "top.world"), phrase: "research" },
  { id: "persuade", title: "Persuade", label: "Convincing people and presenting my ideas", match: any("act.debate"), phrase: "persuading people" },
  { id: "hands", title: "Hands-on", label: "Working through practical, hands-on challenges", match: any("tr.handsOn"), phrase: "hands-on challenges" },
  { id: "help", title: "Help someone", label: "Helping someone overcome a problem", match: any("act.teach", "act.volunteer", "top.wellness"), phrase: "helping people" },
  { id: "lead", title: "Make it happen", label: "Organizing a team and making something happen", match: any("act.organize"), phrase: "leading a team" },
];

export const STYLES: Option[] = [
  { id: "solo", title: "On my own", label: "Independently, working on my own projects", match: [], phrase: "" },
  { id: "small", title: "Small group", label: "In a small group with a few people", match: [], phrase: "" },
  { id: "team", title: "Big team", label: "In a larger team with lots of collaboration", match: any("tr.team"), phrase: "working in a team" },
  { id: "mix", title: "A mix", label: "A mixture of independent and group work", match: [], phrase: "" },
  { id: "any", title: "No preference", label: "I don't really have a preference", match: [], phrase: "" },
];

export const OUTCOMES: Option[] = [
  { id: "new", title: "Something new", label: "Learn a completely new skill", match: any("tr.learn", "tr.beginner"), phrase: "learning something new" },
  { id: "improve", title: "Get better", label: "Improve at something I already enjoy", match: any("tr.improve"), phrase: "getting better" },
  { id: "projects", title: "Real projects", label: "Build real projects I can show others", match: any("tr.projects"), phrase: "real projects" },
  { id: "compete", title: "Competitions", label: "Participate in competitions and challenges", match: any("act.compete"), phrase: "competitions" },
  { id: "leadership", title: "Leadership", label: "Develop leadership and organizational skills", match: any("tr.leadership"), phrase: "leadership" },
  { id: "community", title: "Give back", label: "Help my school or local community", match: any("tr.community"), phrase: "giving back" },
  { id: "people", title: "My people", label: "Meet people who share my interests", match: any("tr.social", "tr.team"), phrase: "meeting people" },
  { id: "career", title: "Future career", label: "Explore something that might interest me as a future career", match: any("tr.career"), phrase: "exploring a career" },
  { id: "fun", title: "Something fun", label: "Have something interesting to do outside of class", match: any("tr.social", "act.move", "top.games"), phrase: "something fun" },
];

const TOPIC_LIST: Option[] = [
  { id: "ai", title: "AI and machine learning", label: "Artificial intelligence and machine learning", match: any("top.ai"), phrase: "AI" },
  { id: "engineering", title: "Engineering and rockets", label: "Engineering, building, and rocketry", match: any("top.engineering"), phrase: "engineering" },
  { id: "programming", title: "Programming", label: "Programming and computer science", match: any("top.programming"), phrase: "programming" },
  { id: "math", title: "Math and logic", label: "Mathematics and logic", match: any("top.math"), phrase: "math" },
  { id: "physics", title: "Physics and space", label: "Physics and space", match: any("top.physics"), phrase: "physics" },
  { id: "bio", title: "Biology and medicine", label: "Biology and medicine", match: any("top.bio"), phrase: "biology and medicine" },
  { id: "chem", title: "Chemistry", label: "Chemistry and lab science", match: any("top.chem"), phrase: "chemistry" },
  { id: "business", title: "Business", label: "Business and entrepreneurship", match: any("top.business"), phrase: "business" },
  { id: "finance", title: "Economics and money", label: "Economics and personal finance", match: any("top.finance"), phrase: "economics and finance" },
  { id: "architecture", title: "Architecture", label: "Architecture and design", match: any("top.architecture"), phrase: "architecture" },
  { id: "art", title: "Art and graphic design", label: "Art and graphic design", match: any("top.art"), phrase: "art and design" },
  { id: "writing", title: "Writing", label: "Writing and journalism", match: any("top.writing"), phrase: "writing" },
  { id: "world", title: "History and world affairs", label: "History and international relations", match: any("top.world"), phrase: "history and world affairs" },
  { id: "speaking", title: "Debate and speaking", label: "Politics, debate, and public speaking", match: any("top.speaking"), phrase: "debate and speaking" },
  { id: "environment", title: "Sustainability", label: "Environmental sustainability", match: any("top.environment"), phrase: "sustainability" },
  { id: "wellness", title: "Wellness", label: "Mental health and wellness", match: any("top.wellness"), phrase: "wellness" },
  { id: "service", title: "Community service", label: "Community service and volunteering", match: any("top.service"), phrase: "community service" },
  { id: "culture", title: "Culture and identity", label: "Culture and identity", match: any("top.culture"), phrase: "culture and identity" },
  { id: "games", title: "Games and puzzles", label: "Games, puzzles, and quiz competitions", match: any("top.games"), phrase: "games and puzzles" },
  { id: "dance", title: "Dance", label: "Dance and movement", match: any("top.dance"), phrase: "dance" },
];

export const EXPERIENCE: Option[] = [
  { id: "new", title: "Brand new", label: "I'm completely new and want to learn", match: [], phrase: "" },
  { id: "little", title: "A little", label: "I've explored this a little", match: [], phrase: "" },
  { id: "some", title: "Some", label: "I have some experience", match: [], phrase: "" },
  { id: "lots", title: "A lot", label: "I have significant experience and want to improve", match: [], phrase: "" },
  { id: "any", title: "Doesn't matter", label: "I don't really care about experience requirements", match: [], phrase: "" },
];

export interface FollowUp {
  id: string;
  question: string;
  /** Answers that open this follow-up: activity ids and topic ids. */
  triggers: { activities: string[]; topics: string[] };
  options: Option[];
}

/** Narrow signals used only by follow-ups. Read from club text like the rest. */
const FINE: Record<string, Pattern[]> = {
  "fine.apps": [/\breal-world programming\b/i, /\bapplied\b/i, /\bsoftware\b/i],
  "fine.contest": [/\busaco\b/i, /\bcodeforces\b/i, /\bleetcode\b/i, /\bcompetitive programming\b/i, /\balgorithms\b/i],
  "fine.games": [/\bvideo game\b/i],
  "fine.quantum": [/\bquantum\b/i],
  "fine.rockets": [/\brockets?\b/i, /\blaunch\b/i],
  "fine.structures": [/\barchitecture\b/i, /\bcad\b/i, /\bmodeling\b/i],
  "fine.biomed": [/\bbiomedical\b/i, /\bmedical tools\b/i],
  "fine.kids": [/\belementary\b/i, /\bmiddle schoolers\b/i, /\byoung children\b/i, /\bkids\b/i],
  "fine.labs": [/\blabs?\b/i],
  "fine.graphic": [/\bgraphic\b/i, /\bdesigns? for\b/i, /\bmerch\b/i],
  "fine.publish": [/\bphotos\b/i, /\byearbook\b/i, /\bdesign pages\b/i],
  "fine.fineart": [/\bart pieces\b/i, /\bart competitions\b/i, /\bcreative projects\b/i],
  "fine.donate": [/\bvolunteer\w*/i, /\bdonations\b/i, /\bservice projects\b/i],
  "fine.advocacy": [/\bequity\b/i, /\binclusion\b/i, /\bawareness\b/i, /\bgender gap\b/i, /\blgbtq\+?/i],
  "fine.personalFinance": [/\bpersonal finance\b/i, /\bsaving\b/i],
  "fine.econ": [/\beconomics\b/i],
  "fine.bizCareers": [/\bbusiness\b/i, /\bfbla\b/i],
  "fine.debate": [/\bdebate\b/i, /\btournaments\b/i, /\bpublic speaking\b/i],
  "fine.diplomacy": [/\bunited nations\b/i, /\bresolutions\b/i],
  "fine.history": [/\bhistor\w*/i, /\bcurrent events\b/i],
  "fine.quiz": [/\bquiz\b/i, /\bbuzzer\b/i, /\bgame-show\b/i],
};
Object.assign(SIGNALS, FINE);

export const FOLLOW_UPS: FollowUp[] = [
  {
    id: "coding",
    question: "What kind of coding sounds best?",
    triggers: { activities: ["code", "digital"], topics: ["programming", "ai"] },
    options: [
      { id: "apps", title: "Real software", label: "Building apps and real-world programs", match: [["fine.apps"]], phrase: "real-world programming" },
      { id: "contest", title: "Algorithm contests", label: "Solving algorithm problems and contests", match: [["fine.contest"]], phrase: "algorithm contests" },
      { id: "ai", title: "AI", label: "Exploring artificial intelligence and machine learning", match: [["top.ai"]], phrase: "AI" },
      { id: "games", title: "Games", label: "Making video games", match: [["fine.games"]], phrase: "making games" },
      { id: "quantum", title: "Quantum", label: "The frontier of quantum computing", match: [["fine.quantum"]], phrase: "quantum computing" },
      { id: "start", title: "A place to start", label: "A welcoming place to start coding", match: [["act.code", "tr.beginner"]], phrase: "a welcoming place to start coding" },
    ],
  },
  {
    id: "engineering",
    question: "What kind of engineering pulls you in?",
    triggers: { activities: ["build"], topics: ["engineering", "architecture"] },
    options: [
      { id: "structures", title: "Structures", label: "Designing buildings and structures", match: [["fine.structures"]], phrase: "designing structures" },
      { id: "making", title: "Making things", label: "Building physical projects", match: [["act.build", "top.engineering"]], phrase: "building projects" },
      { id: "rockets", title: "Rockets", label: "Rockets and aerospace", match: [["fine.rockets"]], phrase: "rockets" },
      { id: "biomed", title: "Medical tech", label: "Engineering for medicine and health", match: [["fine.biomed"]], phrase: "biomedical engineering" },
      { id: "kids", title: "Teach it", label: "Sharing engineering with younger kids", match: [["top.engineering", "fine.kids"]], phrase: "teaching engineering" },
    ],
  },
  {
    id: "science",
    question: "Which kind of science?",
    triggers: { activities: ["experiment"], topics: ["bio", "chem", "physics"] },
    options: [
      { id: "labs", title: "Lab work", label: "Running lab experiments", match: [["fine.labs"]], phrase: "lab work" },
      { id: "bio", title: "Biology and medicine", label: "Biological and medical research", match: [["top.bio"]], phrase: "biology" },
      { id: "chem", title: "Chemistry", label: "Chemistry", match: [["top.chem"]], phrase: "chemistry" },
      { id: "physics", title: "Physics and space", label: "Physics and space", match: [["top.physics"]], phrase: "physics" },
      { id: "contests", title: "Science contests", label: "Science competitions", match: [["act.compete", "top.bio"], ["act.compete", "top.chem"], ["act.compete", "top.physics"]], phrase: "science competitions" },
    ],
  },
  {
    id: "arts",
    question: "What kind of creative work?",
    triggers: { activities: ["visual", "write", "digital", "move"], topics: ["art", "writing", "dance"] },
    options: [
      { id: "graphic", title: "Graphic design", label: "Graphic design and merch", match: [["fine.graphic"]], phrase: "graphic design" },
      { id: "publish", title: "Photos and pages", label: "Photography and publishing", match: [["fine.publish"]], phrase: "photography and publishing" },
      { id: "writing", title: "Writing", label: "Writing with feedback", match: [["act.write"]], phrase: "writing" },
      { id: "fineart", title: "Fine art", label: "Art pieces and art competitions", match: [["fine.fineart"]], phrase: "fine art" },
      { id: "dance", title: "Dance", label: "Dance", match: [["top.dance"]], phrase: "dance" },
      { id: "games", title: "Game art", label: "Graphics for games", match: [["fine.games"]], phrase: "game art" },
    ],
  },
  {
    id: "service",
    question: "How would you like to help?",
    triggers: { activities: ["volunteer", "teach"], topics: ["service", "environment", "culture"] },
    options: [
      { id: "donate", title: "Volunteering", label: "Volunteering and service projects", match: [["fine.donate"]], phrase: "volunteering" },
      { id: "kids", title: "Teaching kids", label: "Teaching younger students", match: [["fine.kids"]], phrase: "teaching kids" },
      { id: "environment", title: "The environment", label: "Making the school greener", match: [["top.environment"]], phrase: "sustainability" },
      { id: "advocacy", title: "Advocacy", label: "Advocacy, equity, and inclusion", match: [["fine.advocacy"]], phrase: "advocacy" },
    ],
  },
  {
    id: "business",
    question: "Which side of business?",
    triggers: { activities: ["organize"], topics: ["business", "finance"] },
    options: [
      { id: "careers", title: "Business careers", label: "Business careers and competitions", match: [["fine.bizCareers"]], phrase: "business careers" },
      { id: "money", title: "Personal finance", label: "Managing and saving money", match: [["fine.personalFinance"]], phrase: "personal finance" },
      { id: "econ", title: "Economics", label: "How economies work", match: [["fine.econ"]], phrase: "economics" },
      { id: "lead", title: "Leadership", label: "Leading and organizing", match: [["tr.leadership"]], phrase: "leadership" },
    ],
  },
  {
    id: "speaking",
    question: "Which kind of arguing and ideas?",
    triggers: { activities: ["debate"], topics: ["speaking", "world"] },
    options: [
      { id: "debate", title: "Competitive debate", label: "Speech and debate tournaments", match: [["fine.debate"]], phrase: "competitive debate" },
      { id: "diplomacy", title: "World issues", label: "Solving world problems as a delegate", match: [["fine.diplomacy"]], phrase: "world issues" },
      { id: "history", title: "History", label: "History and current events", match: [["fine.history"]], phrase: "history" },
      { id: "quiz", title: "Quiz contests", label: "Fast-answer quiz competitions", match: [["fine.quiz"]], phrase: "quiz competitions" },
    ],
  },
];

// ---------------------------------------------------------------------------
// Answers
// ---------------------------------------------------------------------------

export interface QuizAnswers {
  version: 2;
  activities: string[];
  challenge: string | null;
  style: string | null;
  outcomes: string[];
  topics: string[];
  /** Follow-up id → chosen option ids. */
  followUps: Record<string, string[]>;
  experience: string | null;
  lunch: "A" | "B" | null;
}

export const EMPTY_ANSWERS: QuizAnswers = {
  version: 2,
  activities: [],
  challenge: null,
  style: null,
  outcomes: [],
  topics: [],
  followUps: {},
  experience: null,
  lunch: null,
};

export function readAnswers(value: unknown): QuizAnswers | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Partial<QuizAnswers>;
  if (v.version !== 2) return null;
  const list = (x: unknown) => (Array.isArray(x) ? x.filter((i): i is string => typeof i === "string") : []);
  const one = (x: unknown) => (typeof x === "string" ? x : null);
  const followUps: Record<string, string[]> = {};
  if (v.followUps && typeof v.followUps === "object")
    for (const [k, val] of Object.entries(v.followUps)) followUps[k] = list(val);
  return {
    version: 2,
    activities: list(v.activities),
    challenge: one(v.challenge),
    style: one(v.style),
    outcomes: list(v.outcomes),
    topics: list(v.topics),
    followUps,
    experience: one(v.experience),
    lunch: v.lunch === "A" || v.lunch === "B" ? v.lunch : null,
  };
}

function matches(profile: ClubProfile, option: Option) {
  return option.match.some((all) => all.every((id) => profile.signals.has(id)));
}

/** Topics at least one real club covers. Topics with no club are never offered. */
export function availableTopics(clubs: Club[]) {
  const profiles = clubs.map(profileClub);
  return TOPIC_LIST.filter((t) => profiles.some((p) => matches(p, t)));
}

/** Periods some club actually meets in. */
export function availablePeriods(clubs: Club[]) {
  const used = new Set(clubs.flatMap((c) => profileClub(c).periods));
  return PERIODS.filter((p) => used.has(p));
}

/** True when some club meets at only one lunch, so A or B matters. */
export function lunchMatters(clubs: Club[]) {
  return clubs.some((c) => profileClub(c).lunchOnly);
}

/**
 * Follow-ups worth asking now: opened by an earlier answer, and with at least
 * two options that real clubs cover between them three or more clubs. Fewer
 * than that and the earlier answers already tell those clubs apart.
 */
export function followUpsFor(answers: QuizAnswers, clubs: Club[], limit = 3) {
  const profiles = clubs.map(profileClub);
  return FOLLOW_UPS.map((f) => {
    const strength =
      f.triggers.activities.filter((a) => answers.activities.includes(a)).length +
      f.triggers.topics.filter((t) => answers.topics.includes(t)).length;
    const options = f.options.filter((o) => profiles.some((p) => matches(p, o)));
    const covered = new Set(
      profiles.filter((p) => options.some((o) => matches(p, o))).map((p) => p.club.id),
    );
    return { followUp: { ...f, options }, strength, covered: covered.size };
  })
    .filter((f) => f.strength > 0 && f.followUp.options.length >= 2 && f.covered >= 3)
    .sort((a, b) => b.strength - a.strength || b.covered - a.covered)
    .slice(0, limit)
    .map((f) => f.followUp);
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

/**
 * The whole recommendation in one table. Each answer adds points only when the
 * club's own text shows it; per-question caps keep any one answer from
 * deciding every result. Nothing is ever subtracted for being a beginner, and
 * member counts are never used.
 */
export const WEIGHTS = {
  activity: 3,
  activityCap: 6,
  topic: 3.5,
  topicCap: 7,
  followUp: 4,
  followUpCap: 8,
  challenge: 1.5,
  outcome: 1.25,
  outcomeCap: 2.5,
  style: 0.75,
  beginnerFriendly: 1.5,
  experiencedCompetitive: 1,
  scheduleFit: 2.5,
  /** Interest points kept when a club meets only at times marked busy. */
  scheduleConflict: 0.5,
  /** Repeat picks from the same area are scaled by this, once per repeat. */
  diversity: 0.85,
  /** Minimum interest points to count as a match at all. */
  threshold: 3,
};

export type ScheduleFit = "fits" | "conflict" | "unknown" | "unasked";

export interface Availability {
  day: string;
  start: string;
  end: string;
  period?: string;
}

export interface Match {
  club: Club;
  profile: ClubProfile;
  score: number;
  interest: number;
  schedule: ScheduleFit;
  /** The answer area that contributed most, used to keep results varied. */
  area: string | null;
  reasons: string[];
  /** The fitting time, like "Tuesday after school". */
  fitWhen: string | null;
}

function list(items: string[]) {
  if (items.length < 2) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

function scheduleFor(
  profile: ClubProfile,
  availability: Availability[],
  lunch: "A" | "B" | null,
  fits: (club: Club, windows: Availability[]) => boolean,
): { fit: ScheduleFit; when: string | null } {
  if (!availability.length) return { fit: "unasked", when: null };
  if (!profile.days.length || (!profile.periods.length && !/\d/.test(profile.club.time ?? "")))
    return { fit: "unknown", when: null };
  const lunchClash = profile.lunchOnly && lunch && profile.lunchOnly !== lunch;
  for (const day of profile.days)
    for (const window of availability.filter((w) => w.day === day)) {
      if (window.period === "At Lunch" && lunchClash) continue;
      if (fits({ ...profile.club, day }, [window]))
        return {
          fit: "fits",
          when: `${day} ${(window.period ?? "").toLowerCase() || "when you're free"}`.trim(),
        };
    }
  return { fit: "conflict", when: null };
}

export function scoreClub(
  club: Club,
  answers: QuizAnswers,
  availability: Availability[],
  fits: (club: Club, windows: Availability[]) => boolean,
): Match {
  const p = profileClub(club);
  const W = WEIGHTS;
  const liked: { phrase: string; weight: number; area: string }[] = [];

  const pick = (options: Option[], chosen: string[], each: number, cap: number, area: string) => {
    let total = 0;
    for (const id of chosen) {
      const option = options.find((o) => o.id === id);
      if (!option || !matches(p, option)) continue;
      if (total + each > cap) break;
      total += each;
      liked.push({ phrase: option.phrase, weight: each, area: `${area}:${option.id}` });
    }
    return total;
  };

  let interest = 0;
  interest += pick(ACTIVITIES, answers.activities, W.activity, W.activityCap, "activity");
  interest += pick(TOPIC_LIST, answers.topics, W.topic, W.topicCap, "topic");
  let followUpPoints = 0;
  for (const f of FOLLOW_UPS) {
    const chosen = answers.followUps[f.id] ?? [];
    const got = pick(f.options, chosen, W.followUp, W.followUpCap - followUpPoints, f.id);
    followUpPoints += got;
  }
  interest += followUpPoints;

  const challenge = CHALLENGES.find((c) => c.id === answers.challenge);
  const challengeHit = !!challenge && matches(p, challenge);
  if (challengeHit) interest += W.challenge;

  const outcomeHits = OUTCOMES.filter((o) => answers.outcomes.includes(o.id) && matches(p, o));
  interest += Math.min(W.outcomeCap, outcomeHits.length * W.outcome);

  if ((answers.style === "team" || answers.style === "mix") && p.signals.has("tr.team")) interest += W.style;

  const beginnerFriendly = p.signals.has("tr.beginner");
  const newcomer = answers.experience === "new" || answers.experience === "little";
  if (newcomer && beginnerFriendly) interest += W.beginnerFriendly;
  const competitive = p.signals.has("act.compete");
  if (answers.experience === "lots" && competitive) interest += W.experiencedCompetitive;

  const { fit, when } = scheduleFor(p, availability, answers.lunch, fits);
  let score = interest;
  if (fit === "fits") score += W.scheduleFit;
  if (fit === "conflict") score *= W.scheduleConflict;

  // Reasons, strongest first, each backed by the club's own text.
  const reasons: string[] = [];
  // Most specific first (follow-ups weigh most); drop a broader phrase that
  // repeats a word already said, like "biology and medicine" after "biology".
  const phrases: string[] = [];
  for (const l of liked.sort((a, b) => b.weight - a.weight)) {
    const first = l.phrase.split(" ")[0].toLowerCase();
    if (phrases.some((p) => p.toLowerCase().split(" ").includes(first))) continue;
    if (!phrases.includes(l.phrase)) phrases.push(l.phrase);
    if (phrases.length === 3) break;
  }
  if (phrases.length) reasons.push(`Matches your interest in ${list(phrases)}.`);
  const wantsCompetition =
    answers.activities.includes("compete") ||
    answers.outcomes.includes("compete") ||
    answers.challenge === "pressure" ||
    answers.experience === "lots";
  if (competitive && wantsCompetition)
    reasons.push(
      p.competitions.length
        ? `Takes on ${list(p.competitions)}.`
        : "Includes competitions and challenges.",
    );
  for (const o of outcomeHits) {
    if (reasons.length >= 3) break;
    const line =
      o.id === "projects" ? "Works on real projects you can show."
      : o.id === "leadership" ? "Offers leadership experience."
      : o.id === "community" ? "Gives back to the school or community."
      : o.id === "career" ? "Connects what you do to real careers."
      : o.id === "new" && beginnerFriendly ? null
      : null;
    if (line && !reasons.includes(line)) reasons.push(line);
  }
  const welcome = beginnerStatement(p);
  if (welcome && (newcomer || answers.outcomes.includes("new")))
    reasons.push(`Welcomes beginners: “${welcome}”.`);
  if (challengeHit && reasons.length < 2 && challenge)
    reasons.push(`Fits your taste for ${challenge.phrase}.`);

  const area = liked.sort((a, b) => b.weight - a.weight)[0]?.area ?? null;
  return { club, profile: p, score, interest, schedule: fit, area, reasons, fitWhen: when };
}

/** Concrete things a club can offer that are worth a detour from your picks. */
const DISCOVERY_OUTCOMES = ["projects", "compete", "leadership", "community", "career", "people"];

export interface MatchResults {
  best: Match[];
  more: Match[];
  /** Strong interest matches that meet only when the student is busy. */
  busy: Match[];
  /** A few fitting clubs from areas the student didn't pick, for discovery. */
  different: Match[];
  /** Clubs whose descriptions say too little to place well. */
  thin: Club[];
}

/**
 * Ranks every club. Matches that share the same strongest area are scaled
 * down one step per repeat, so the list doesn't fill with near-duplicates.
 */
export function recommend(
  clubs: Club[],
  answers: QuizAnswers,
  availability: Availability[],
  fits: (club: Club, windows: Availability[]) => boolean,
): MatchResults {
  const all = clubs.map((c) => scoreClub(c, answers, availability, fits));
  const W = WEIGHTS;
  const candidates = all
    .filter((m) => m.interest >= W.threshold && m.schedule !== "conflict")
    .sort((a, b) => b.score - a.score || a.club.name.localeCompare(b.club.name));

  const ordered: Match[] = [];
  const seen = new Map<string, number>();
  const pool = [...candidates];
  while (pool.length) {
    let bestIndex = 0;
    let bestValue = -Infinity;
    pool.forEach((m, i) => {
      const repeats = m.area ? seen.get(m.area) ?? 0 : 0;
      const value = m.score * Math.pow(W.diversity, repeats);
      if (value > bestValue) {
        bestValue = value;
        bestIndex = i;
      }
    });
    const [next] = pool.splice(bestIndex, 1);
    if (next.area) seen.set(next.area, (seen.get(next.area) ?? 0) + 1);
    ordered.push(next);
  }

  const top = ordered[0]?.score ?? 0;
  const best = ordered.filter((m, i) => i < 6 && m.score >= Math.max(W.threshold, top * 0.45));
  const more = ordered.filter((m) => !best.includes(m)).slice(0, 12);

  const busy = all
    .filter((m) => m.schedule === "conflict" && m.interest >= W.threshold + 2)
    .sort((a, b) => b.interest - a.interest)
    .slice(0, 4);

  // Discovery: clubs that fit the student's time and match what they want out
  // of a club or how they like to work, but none of their activities or topics.
  const shown = new Set([...best, ...more].map((m) => m.club.id));
  const pickedCategories = new Set(best.map((m) => m.club.category));
  const different = all
    .filter(
      (m) =>
        !shown.has(m.club.id) &&
        m.schedule !== "conflict" &&
        !pickedCategories.has(m.club.category) &&
        DISCOVERY_OUTCOMES.some((id) => answers.outcomes.includes(id) && matches(m.profile, OUTCOMES.find((o) => o.id === id)!)),
    )
    .sort((a, b) => b.score - a.score || a.club.name.localeCompare(b.club.name))
    .slice(0, 3)
    .map((m) => {
      const why = OUTCOMES.filter(
        (o) => DISCOVERY_OUTCOMES.includes(o.id) && answers.outcomes.includes(o.id) && matches(m.profile, o),
      ).map((o) => o.phrase);
      return { ...m, reasons: [`Different from what you picked, but it offers ${list(why.slice(0, 2))}.`] };
    });

  const thin = clubs.filter((c) => {
    const p = profileClub(c);
    return [...p.signals.keys()].filter((k) => k.startsWith("act.") || k.startsWith("top.")).length < 2;
  });

  return { best, more, busy, different, thin };
}

/** Short labels for compact places like the Clubs page. */
export function shortReasons(match: Match): string[] {
  const out: string[] = [];
  if (match.area) {
    const [kind, id] = match.area.split(":");
    const source =
      kind === "activity" ? ACTIVITIES
      : kind === "topic" ? TOPIC_LIST
      : FOLLOW_UPS.find((f) => f.id === kind)?.options ?? [];
    const option = source.find((o) => o.id === id);
    if (option) out.push(option.title);
  }
  if (match.schedule === "fits") out.push("Fits your availability");
  return out;
}

export function hasAnswers(answers: QuizAnswers | null | undefined) {
  if (!answers) return false;
  return (
    answers.activities.length +
      answers.topics.length +
      answers.outcomes.length +
      Object.values(answers.followUps).flat().length >
      0 || !!answers.challenge
  );
}

export const ALL_TOPICS = TOPIC_LIST;
