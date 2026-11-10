/* ==========================================================================
   project data — single source of truth for the projects grid & case studies
   ========================================================================== */

export type ProjectStat = {
  label: string;
  value: string;
};

export type ProjectLink = {
  label: string;
  href: string;
  external?: boolean;
};

export type ProjectData = {
  slug: string;
  name: string;
  tagline: string;
  badge: string;
  date: string;
  stack: string[];
  stats: ProjectStat[];
  tldr: string;
  role: string;
  tech: string[];
  challenges: string[];
  solutions: string[];
  links: ProjectLink[];
};

const GITHUB = 'https://github.com/shawnaks';

/** All six projects, in the order they appear on `#/projects/`. */
export const PROJECTS: readonly ProjectData[] = [
  {
    slug: 'snapfind',
    name: 'SnapFind',
    tagline: 'AI-assisted campus lost & found',
    badge: 'hackgt 2025',
    date: 'sep 2025',
    stack: ['React 19', 'TypeScript', 'Supabase', 'FastAPI', 'PyTorch'],
    stats: [
      { value: '92%', label: 'classification accuracy' },
      { value: '12', label: 'item categories' },
      { value: '12K+', label: 'training images' },
    ],
    tldr:
      'Post a photo of a lost or found item and a fine-tuned ResNet-18 classifies it across 12 categories — a unified feed, filters, and search-by-image help items find their way back to their owners.',
    role:
      'Team project at HackGT 2025 (Georgia Tech). Repo owner; integrated the FastAPI classification backend into the React frontend and documented the prediction API.',
    tech: [
      'React 19',
      'TypeScript 5.8',
      'Vite',
      'React Router',
      'SCSS',
      'Supabase (Auth/Postgres/Storage)',
      'FastAPI',
      'PyTorch (ResNet-18)',
      'Render',
    ],
    challenges: [
      'Campus lost-item retrieval was fragmented — the idea came from a sign in the Klaus Advanced Computing Building.',
      '12K+ images across 10 public datasets needed cleaning and normalization for robust training.',
      'Connecting a PyTorch model to a web frontend within a hackathon timeframe.',
    ],
    solutions: [
      'Unified post-lost / post-found flows on Supabase (auth, storage, profiles) with a single feed filterable by keyword, type, location, and category.',
      'Built preprocessing over 12K+ images from 10 datasets, then fine-tuned ResNet-18 with a dropout-regularized classification head — 92% accuracy across 12 classes (bag, charger, earbud, headphones, id, key, laptop, notebook, phone, shoes, umbrella, wallet).',
      'Deployed the model via FastAPI (`POST /predict/`) on Render with a render.yaml blueprint, wired into React for real-time classification and search-by-image.',
    ],
    links: [{ label: 'Code', href: `${GITHUB}/SnapFind`, external: true }],
  },
  {
    slug: 'rxguard',
    name: 'RxGuard',
    tagline: 'Semantic drug-interaction search over FDA data',
    badge: '2nd place · hacklytics 2026 · 50+ teams',
    date: 'feb 2026',
    stack: ['Python', 'React', 'Gemini', 'Actian VectorAI'],
    stats: [
      { value: '4', label: 'search engines' },
      { value: '384-dim', label: 'embeddings' },
      { value: '~30%', label: 'better retrieval' },
    ],
    tldr:
      "Describe a regimen in plain English — '65-year-old female on warfarin and metformin, doctor wants to add ibuprofen' — and RxGuard retrieves dangerous interactions, contraindications, and real FDA cases, ranked by a 1–10 composite risk score.",
    role:
      'Hacklytics 2026 (Georgia Tech). Built the React/Vite dashboard and integrated the Gemini query parser; 2nd place, Best Use of Actian VectorAI DB.',
    tech: [
      'Python 3.12',
      'FastAPI',
      'Streamlit',
      'React 19',
      'Vite',
      'Recharts',
      'sentence-transformers (all-MiniLM-L6-v2)',
      'Actian VectorAI DB',
      'Google Gemini',
      'openFDA + DailyMed',
      'pandas / PyArrow',
      'scikit-learn',
      'spaCy',
      'Docker',
    ],
    challenges: [
      'Keyword drug-interaction checkers miss semantically related cases.',
      'Scaling semantic search from an in-memory prototype to production scale.',
      'Turning raw FDA adverse-event data into an actionable clinical signal.',
    ],
    solutions: [
      'Four progressive search engines: keyword exact match → TF-IDF cosine similarity → in-memory sentence-transformers → vector search on Actian VectorAI (HNSW, gRPC). 384-dim embeddings improved retrieval ~30% over keyword search.',
      'Batched, resumable FAERS ingestion (staged 1K→2.5K→5K records) into parquet, with the vector DB deployed via Docker Compose.',
      'A 1–10 composite risk score blending semantic similarity, outcome severity, and demographic match — plus Gemini natural-language risk summaries and safer-alternative recommendations (e.g. acetaminophen with PPI gastroprotection and INR monitoring).',
    ],
    links: [
      { label: 'Code', href: `${GITHUB}/RxGuard`, external: true },
      { label: 'Devpost', href: 'https://devpost.com/software/guess-xp546j', external: true },
    ],
  },
  {
    slug: 'flight-fare-optimizer',
    name: 'Flight Fare Optimizer',
    tagline: 'Graph algorithms over U.S. airfare data',
    badge: 'math 3012 · fall 2024',
    date: 'oct 2024',
    stack: ['Python', 'Pandas', 'NumPy', 'Matplotlib'],
    stats: [
      { value: '186', label: 'airports' },
      { value: '262K', label: 'fare records' },
      { value: '25K', label: 'benchmark routes' },
      { value: '4', label: 'algorithms' },
    ],
    tldr:
      'Models U.S. airports as vertices and flights as fare-weighted edges, implements four pathfinding algorithms from scratch — no graph libraries — and benchmarks them across 25,000 random routes on real DOT fare data.',
    role:
      'Sole author — course project for MATH 3012, Applied Combinatorics (Georgia Tech, Fall 2024), with a 25-page technical report.',
    tech: [
      'Python',
      'pandas',
      'NumPy',
      'Matplotlib',
      'Jupyter — three graph representations (graph_dict, weighted_graph_dict, layover_graph_dict)',
    ],
    challenges: [
      'Implement DFS, BFS, Dijkstra, and a modified Dijkstra entirely from scratch.',
      "Defining what 'optimal' means — fewest flights, lowest fare, or convenience.",
      'Benchmarking fairly at scale.',
    ],
    solutions: [
      'Stack/recursion DFS, collections.deque BFS, and heapq-based Dijkstra, hand-rolled in three graph representations.',
      'A modified Dijkstra that adds a constant $80-per-leg layover penalty — a hybrid of fare and convenience.',
      "25,000 random routes per algorithm over 186 airports from the DOT Consumer Airfare Report Table 1a (1993–Q1 2026, ~262,000 quarterly route observations). Results: BFS averaged 2.06 flights at $486.24; Dijkstra reached $373.69; modified Dijkstra stayed within 0.07 flights of BFS while saving ~$106 per route over BFS and costing only $6.38 more than pure Dijkstra.",
    ],
    links: [{ label: 'Code', href: `${GITHUB}/Flight-Fare-Optimizer`, external: true }],
  },
  {
    slug: 'hearo',
    name: 'Hearo',
    tagline: 'Voice-first AI vision assistant',
    badge: 'ai atl 2025',
    date: '2025',
    stack: ['React Native', 'Gemini 2.5 Flash', 'ElevenLabs'],
    stats: [
      { value: '15-minute', label: 'signed upload URLs' },
      { value: '0.7×–1.2×', label: 'speech rate' },
    ],
    tldr:
      "'Point. Capture. Hear.' — a voice-first vision assistant for blind and low-vision users: point the camera, capture, and Gemini 2.5 Flash describes the scene, spoken aloud by ElevenLabs. Ask a follow-up question out loud and it answers about the image.",
    role:
      'AI ATL 2025 hackathon (Atlanta). Owned the cloud/backend and signed-URL upload pipeline, Gemini prompting, the Cloud Run migration, and several UX fixes — 10 merged PRs to the team repo.',
    tech: [
      'React Native 0.81',
      'Expo SDK 54',
      'TypeScript',
      'React Navigation',
      'expo-camera/av/haptics/speech',
      '@google/genai (Gemini 2.5 Flash via Vertex AI)',
      'ElevenLabs TTS + STT',
      'Node 20',
      'Express',
      'Google Cloud Storage + Cloud Run',
      'Docker',
    ],
    challenges: [
      'Accessibility-first UX: audio-first onboarding, oversized targets, high contrast, minimal chrome.',
      'Handling GCP credentials safely in a mobile app.',
      'Moving a hackathon-grade local server to production.',
    ],
    solutions: [
      "Context-aware prompts that speak directly to the user ('in front of you…'), a spoken onboarding walkthrough, haptics, and a 0.7×–1.2× speech-rate slider that announces itself aloud.",
      'The app never holds a service-account key — the backend issues 15-minute V4 signed upload URLs.',
      'Migrated the local server to Google Cloud Run with Docker.',
    ],
    links: [{ label: 'Code', href: `${GITHUB}/Hearo`, external: true }],
  },
  {
    slug: 'battle-showdown',
    name: 'Battle Showdown',
    tagline: 'Turn-based browser fighting game',
    badge: 'next.js 15',
    date: '2025',
    stack: ['Next.js 15', 'React 19', 'Tailwind 4'],
    stats: [
      { value: '4', label: 'abilities' },
      { value: '100', label: 'HP per side' },
      { value: '800ms', label: 'counterattack' },
    ],
    tldr:
      'A turn-based browser fighting game — Jack vs. a Snowman, 100 HP each, four distinct abilities, and a strict turn order where the Snowman auto-counterattacks 800ms after every move.',
    role: 'Built the complete application (game logic, UI, and image edits) in a shared challenge repo.',
    tech: [
      'Next.js 15.5 (App Router)',
      'React 19.1',
      'TypeScript (strict)',
      'Tailwind CSS 4',
      'Geist fonts',
      'Turbopack',
    ],
    challenges: [
      'Clean turn-state sequencing with timed counterattacks.',
      'Abilities with genuinely distinct mechanics.',
      'Polish on a zero-backend budget.',
    ],
    solutions: [
      'The entire game is one client component using useState and setTimeout sequencing for the 800ms counter window.',
      'Four abilities: Rizz (15 damage), Double Rizz (30 damage, once per game), Melt (30% of current HP — strong early, weak late), and Aura Shield (halves the next hit but costs the turn).',
      'Animated HP bars, bouncing damage arrows, a pulsing shield ring, a 90° loser rotation, a win screen with one-click restart, and a responsive two-column arena.',
    ],
    links: [{ label: 'Code', href: `${GITHUB}/Battle-showdown-game`, external: true }],
  },
  {
    slug: 'pong',
    name: 'Pong',
    tagline: 'The classic, one Python file',
    badge: 'est. 2022',
    date: 'apr 2022',
    stack: ['Python', 'pygame'],
    stats: [
      { value: '4', label: 'difficulties' },
      { value: 'bot', label: 'mode' },
      { value: 'zero', label: 'external assets' },
    ],
    tldr:
      'The arcade classic rebuilt in a single Python file — local 2-player and bot modes, four difficulties, and angle-based rebounds, with every pixel drawn in code.',
    role: 'Sole author — my first project on GitHub (April 2022).',
    tech: ['Python 3', 'pygame', 'cx_Freeze'],
    challenges: [
      'Rendering everything with pygame.draw — no sprites, no assets.',
      'A bot opponent that is actually fun to play against.',
      'Shipping a standalone executable.',
    ],
    solutions: [
      'All rendering is procedural: paddles, ball, and a flashing victory screen.',
      'The bot tracks the ball; four difficulties (Easy → Very Hard) scale ball and paddle speed; edge hits deflect steeper for angle-based play; first to 10 wins.',
      '`exesetup.py` builds a standalone Windows .exe with cx_Freeze — and the README honestly documents a known case-sensitivity bug in the difficulty prompt.',
    ],
    links: [{ label: 'Code', href: `${GITHUB}/Pong`, external: true }],
  },
];

/** Case-insensitive slug lookup (path params are decoded upstream). */
export function getProject(slug: string | undefined): ProjectData | undefined {
  if (!slug) return undefined;
  return PROJECTS.find((project) => project.slug === slug.toLowerCase());
}

/** Next project in listing order, wrapping from the last back to the first. */
export function getNextProject(slug: string): ProjectData {
  const index = PROJECTS.findIndex((project) => project.slug === slug);
  const nextIndex = index < 0 ? 0 : (index + 1) % PROJECTS.length;
  return PROJECTS[nextIndex];
}
