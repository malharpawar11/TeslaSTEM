import { Club, ClubCategory, Announcement, Officer } from '@/types/domain';

interface RawClub {
  name: string;
  advisor: string;
  location: string;
  day: string;
  time: string;
  category: ClubCategory;
  description: string;
  /** Real handle override. Omit to fall back to the synthesized `@teslastem.*` handle. */
  instagram?: string;
}

const RAW: RawClub[] = [
  { name: 'AI Innovation', advisor: 'Nguyen', location: 'RM 121', day: 'Wednesday', time: 'At Lunch', category: 'STEM', description: 'A place where Tesla STEM students can explore the world of Artificial Intelligence (AI) and Machine Learning (ML).', instagram: '@stem.ainnovation' },
  { name: 'Applied Programming Club', advisor: 'Christensen', location: 'RM 227', day: 'Tuesday', time: 'After School', category: 'STEM', description: 'Bridges the gap between theoretical programming taught in classes and real-world programming.', instagram: '@teslastemapc' },
  { name: 'Architecture Club', advisor: 'Ostlie', location: 'RM 211', day: 'Tuesday', time: 'After School', category: 'STEM', description: 'Explore architecture through drawing, modeling, CAD, and more.', instagram: '@teslastem_architecture' },
  { name: 'Biology Club', advisor: 'Komorous', location: 'RM 212', day: 'Tuesday', time: 'After School', category: 'STEM', description: 'Labs, lectures, and competitions including USABO and Brain Bee covering microscope handling, anatomy, physiology, and biology concepts.', instagram: '@tshs.biology_club' },
  { name: 'Biomedical Engineering Club', advisor: 'Komorous', location: 'RM 212', day: 'Thursday', time: 'After School', category: 'STEM', description: 'Research-based club combining biological science, medical tools, and engineering processes.', instagram: '@tshs.biomede' },
  { name: 'Chemistry Club', advisor: 'Herzog', location: 'TBD', day: 'Friday', time: 'After School', category: 'STEM', description: 'Watch and participate in labs, talk to chemistry professionals, and prepare for USNCO.' },
  { name: 'Chess Club', advisor: 'Kittay', location: 'RM 110', day: 'Wednesday', time: 'At Lunch', category: 'Academic', description: 'Casual and competitive chess for all skill levels.' },
  { name: 'Competitive Programming Club', advisor: 'C. Scheffel', location: 'TBD', day: 'Monday', time: 'After School', category: 'STEM', description: 'Tackle problems from USACO, Codeforces, and LeetCode covering sorting, graph algorithms, dynamic programming, and more.' },
  { name: 'Dance Club', advisor: 'Zebrack', location: 'RM 127', day: 'Tuesday', time: 'After School', category: 'Arts', description: 'All dance styles welcome. No experience needed — just good music, great people, and the love of dance.', instagram: '@stemdanceclub' },
  { name: 'Economics Club', advisor: 'R. Schafer', location: 'RM 127', day: 'Wednesday', time: 'At Lunch', category: 'Academic', description: 'Prepare for AP Micro and Macroeconomics through weekly lessons and resources.' },
  { name: 'Engineering Club', advisor: 'Wrenchey', location: 'Presentation Hall (RM 117)', day: 'Tuesday & Wednesday', time: 'Lunch / Before School', category: 'STEM', description: 'For those who love building, creating, and working on projects.' },
  { name: 'Environmental Club', advisor: 'S. Bonomo', location: 'RM 215', day: 'Thursday', time: 'After School', category: 'Service', description: 'For students passionate about sustainability — projects to make Tesla STEM more environmentally friendly plus outdoor activities.' },
  { name: 'Equity Board', advisor: 'Karkainen', location: 'TBD', day: 'Wednesday', time: 'At Lunch', category: 'Service', description: 'Promoting equity and inclusion across the Tesla STEM community.' },
  { name: 'FBLA', advisor: 'Zebrack, Schafer', location: 'Presentation Hall (RM 117)', day: 'Tuesday', time: 'At Lunch', category: 'Business', description: 'Future Business Leaders of America — prepares students for success in business and related careers.' },
  { name: 'Girls Who Code', advisor: 'Kankelborg', location: 'RM 221', day: 'Friday', time: 'After School', category: 'STEM', description: 'A safe and comfortable environment for girls interested in or planning to go into computer science.' },
  { name: 'Graphic Design Club', advisor: 'K. Schaeffer', location: 'RM 220', day: 'Tuesday', time: 'After School', category: 'Arts', description: 'Amplify the arts in a STEM environment, creating designs for events like Arduinofest and competition merch.' },
  { name: 'GSA (Gender Sexuality Alliance)', advisor: 'Goss-Gubbs', location: 'TBD', day: 'Thursday', time: 'At Lunch', category: 'Service', description: 'A group for LGBTQ+ students and allies, building awareness and fostering community.' },
  { name: 'History Club', advisor: 'Crowe', location: 'RM 208', day: 'Friday', time: 'After School', category: 'Academic', description: 'A place to talk and learn about historical and current events.' },
  { name: 'IMAGINE Club', advisor: 'S. Bonomo', location: 'RM 215', day: 'Wednesday', time: 'Before School', category: 'STEM', description: 'Bridging the gender gap in STEM while spreading engineering skills and passion to elementary and middle schoolers.' },
  { name: 'Key Club', advisor: 'J. Sheffels', location: 'RM 214', day: 'Tuesday', time: 'After School', category: 'Service', description: 'Student-led organization focused on community service and leadership with guest speakers and service projects.' },
  { name: 'Machine Learning Club', advisor: 'C. Scheffel', location: 'RM 108', day: 'Thursday', time: 'After School', category: 'STEM', description: 'No experience needed. Gain real-world skills in one of the most in-demand fields today.' },
  { name: 'Math Club', advisor: 'Ostlie', location: 'RM 211', day: 'Thursday', time: 'After School', category: 'Academic', description: 'Hosts the AMC competition and participates in a variety of local competitions.' },
  { name: 'Mental Health Club', advisor: 'Goss-Gubbs', location: 'TBD', day: 'Wednesday & Friday', time: 'At Lunch', category: 'Wellness', description: 'A safe space to learn about and discuss mental health topics. No commitment — everyone can attend any meeting.' },
  { name: 'Model United Nations', advisor: 'Fort', location: 'TBD', day: 'Wednesday', time: 'At Lunch / After School', category: 'Academic', description: "Debate-focused club providing resolutions to the world's most pressing problems." },
  { name: 'Muslim Student Association (MSA)', advisor: 'Samad', location: 'TBD', day: 'Wednesday', time: 'At Lunch', category: 'Culture', description: 'Fosters connection between community members through conversations.' },
  { name: 'National Art Honor Society', advisor: 'K. Schaeffer', location: 'RM 220', day: 'Friday', time: 'After School', category: 'Arts', description: 'Art competitions, community service projects, and a variety of creative projects.' },
  { name: 'National Honor Society (NHS)', advisor: 'TBD', location: 'RM 121', day: 'Monday', time: 'After School', category: 'Academic', description: 'Student-led organization centered around scholarship, service, leadership, and character.' },
  { name: 'Personal Finance', advisor: 'Zebrack', location: 'TBD', day: 'Monday', time: 'At Lunch', category: 'Business', description: 'Helping high school students learn personal finance and saving skills.' },
  { name: 'Physics Club', advisor: 'Kittay', location: 'RM 110', day: 'Tuesday', time: 'After School', category: 'STEM', description: 'Cool physics concepts, interesting problems, awesome labs, and intriguing physics videos.' },
  { name: 'Puzzles Club', advisor: 'Kittay', location: 'RM 110', day: 'Monday', time: 'After School', category: 'Academic', description: 'Jigsaw puzzles, brain teasers, chess puzzles, and volunteering opportunities at senior homes.' },
  { name: 'Quantum Computing Club', advisor: 'Schaffer', location: 'TBD', day: 'Wednesday', time: 'At Lunch', category: 'STEM', description: 'Exploring the frontier of quantum computing and its applications.' },
  { name: 'Quiz Bowl', advisor: 'Mickelson', location: 'RM 122', day: 'Monday', time: 'After School', category: 'Academic', description: 'Buzzer competition covering Science, Technology, Math, History, Arts, and Sports.' },
  { name: 'Red Cross Club', advisor: 'Crowe', location: 'RM 208', day: 'Tuesday', time: 'After School', category: 'Service', description: 'Supports individuals and groups through volunteering and donations.' },
  { name: 'Rocketry Club', advisor: 'Wrenchey', location: 'RM 117', day: 'Tuesday & Wednesday', time: 'Lunch / After School', category: 'STEM', description: 'Build and launch rockets with mentorship from senior students — propel your high school experience to new heights.' },
  { name: 'Science Bowl', advisor: 'Christensen', location: 'RM 227', day: 'Monday', time: 'After School', category: 'STEM', description: 'Game-show style tournament covering biology, physics, chemistry, math, and earth science at regional and national levels.' },
  { name: 'Science Olympiad', advisor: 'Christensen, Townsend, Williamson, Walton', location: 'RM 223', day: 'Wednesday', time: 'After School', category: 'STEM', description: 'Teams of 15 compete in events spanning biology, chemistry, engineering, physics, earth science, and more.' },
  { name: 'Spanish Club', advisor: 'Bliss', location: 'TBD', day: 'Monday', time: 'After School', category: 'Culture', description: 'Fun and educational club to improve Spanish skills and explore Spanish culture.' },
  { name: 'Speech & Debate', advisor: 'Mickelson', location: 'RM 122', day: 'Wednesday', time: 'At Lunch', category: 'Academic', description: 'Develop public speaking, critical thinking, and persuasive argumentation skills at monthly tournaments.' },
  { name: 'STEM Reach', advisor: 'Wrenchey', location: 'Presentation Hall (RM 117)', day: 'Thursday', time: 'After School', category: 'Service', description: 'Educate and introduce young children to STEM through events and workshops.' },
  { name: 'StemKidsFirst', advisor: 'Travis', location: 'RM 124', day: 'Thursday', time: 'After School', category: 'Service', description: 'Create STEM materials, plan workshops, build leadership skills, and tutor elementary kids one-to-one.' },
  { name: 'Sustainable Art Club', advisor: 'K. Schaeffer', location: 'RM 220', day: 'Friday', time: 'After School', category: 'Arts', description: 'Create art pieces using sustainable products and volunteer in places that favor sustainability.' },
  { name: 'Tea Club', advisor: 'K. Schaeffer', location: 'RM 220', day: 'Wednesday', time: 'At Lunch', category: 'Wellness', description: 'Free tea, sugar, milk, and cups — take a break and enjoy a cup of tea with friends.' },
  { name: 'Technology Student Association (TSA)', advisor: 'Kankelborg, Boyd', location: 'RM 117', day: 'Thursday', time: 'At Lunch', category: 'STEM', description: '40 high school competitions and opportunities to connect with peers, educators, and industry professionals.' },
  { name: 'The Write Club', advisor: 'Kittay', location: 'RM 110', day: 'Monday', time: 'After School', category: 'Arts', description: 'Improve your writing skills, get feedback, and have fun.' },
  { name: 'Video Game Design Club', advisor: 'Kittay', location: 'RM 110', day: 'Thursday', time: 'After School', category: 'STEM', description: 'For those who enjoy coding or graphic design — collaborate to code a video game and create its graphics.' },
  { name: 'Yearbook Club', advisor: 'Bresnahan', location: 'RM 112', day: 'Wednesday', time: 'At Lunch', category: 'Arts', description: 'Take photos, design pages, and interview peers to create a book the whole school can enjoy.' },
  { name: 'Yoga Club', advisor: 'Robertson', location: 'RM 105', day: 'Wednesday', time: 'At Lunch', category: 'Wellness', description: 'Relaxing and fun yoga sessions — no experience required. All are welcome!' },
];

/** Deterministic pseudo-random so counts/officers stay stable across reloads. */
export function seed(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

const FIRST = ['Aiden', 'Maya', 'Liam', 'Sofia', 'Ethan', 'Priya', 'Noah', 'Aria', 'Kai', 'Zoe', 'Ravi', 'Mei', 'Leo', 'Nora', 'Omar', 'Ivy'];
const LAST = ['Patel', 'Nguyen', 'Kim', 'Garcia', 'Chen', 'Singh', 'Lee', 'Brooks', 'Rivera', 'Khan', 'Park', 'Diaz', 'Shah', 'Tran', 'Cruz', 'Ali'];

function pick<T>(arr: T[], s: number): T {
  return arr[Math.floor(s * arr.length) % arr.length];
}

export function makeOfficers(name: string): Officer[] {
  const roles: Officer['role'][] = ['President', 'Vice President', 'Secretary', 'Treasurer'];
  return roles.map((role, i) => {
    const s1 = seed(name + role + 'f');
    const s2 = seed(name + role + 'l' + i);
    return { role, name: `${pick(FIRST, s1)} ${pick(LAST, s2)}` };
  });
}

const ANNOUNCE_TEMPLATES = [
  { title: 'First meeting of the year', body: 'Kick-off meeting — come meet the officers, learn what we do this year, and sign up. Snacks provided!' },
  { title: 'Upcoming competition sign-ups', body: 'Registration is now open for our next competition. Talk to an officer or check the club email for details.' },
  { title: 'Officer applications open', body: 'Interested in a leadership role next semester? Applications are open through the end of the month.' },
  { title: 'Guest speaker this week', body: 'We have an industry professional joining us to share their experience and answer your questions.' },
];

export function makeAnnouncements(name: string): Announcement[] {
  const count = 2 + Math.floor(seed(name + 'count') * 2); // 2–3
  const out: Announcement[] = [];
  for (let i = 0; i < count; i++) {
    const t = ANNOUNCE_TEMPLATES[Math.floor(seed(name + 'a' + i) * ANNOUNCE_TEMPLATES.length) % ANNOUNCE_TEMPLATES.length];
    const month = 1 + Math.floor(seed(name + 'm' + i) * 5); // Jan–May
    const day = 1 + Math.floor(seed(name + 'd' + i) * 27);
    out.push({
      id: `${name}-ann-${i}`,
      title: t.title,
      body: t.body,
      date: `2026-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    });
  }
  return out;
}

export function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export const clubs: Club[] = RAW.map((r) => {
  const memberCount = 8 + Math.floor(seed(r.name + 'mem') * 38); // 8–45
  const followersCount = memberCount + Math.floor(seed(r.name + 'fol') * memberCount * 2);
  return {
    ...r,
    id: slugify(r.name),
    foundingYear: 2014 + Math.floor(seed(r.name + 'yr') * 11), // 2014–2024
    memberCount,
    followersCount,
    contactEmail: `${slugify(r.name).replace(/-/g, '')}@lwsd.org`,
    instagram: r.instagram ?? `@teslastem.${slugify(r.name).replace(/-/g, '')}`.slice(0, 30),
    website: '',
    officers: makeOfficers(r.name),
    announcements: makeAnnouncements(r.name),
  };
});

export function getClub(id: string): Club | undefined {
  return clubs.find((c) => c.id === id);
}
