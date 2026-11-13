/* ==========================================================================
   site data — single source of truth for navigation, home tiles, contact
   details, shared facts & socials
   strings are copied verbatim from the vanilla build's index.html
   ========================================================================== */

export type IconName =
  | 'term'
  | 'user'
  | 'brief'
  | 'code'
  | 'mail'
  | 'down'
  | 'chev'
  | 'github'
  | 'linkedin';

export type NavItem = {
  to: string;
  abbr: string;
  full: string;
  icon: IconName;
};

/** The five routes, in nav order. */
export const NAV_ITEMS = [
  { to: '/hello/', abbr: 'Ho', full: 'home', icon: 'term' },
  { to: '/about/', abbr: 'Ab', full: 'about', icon: 'user' },
  { to: '/experience/', abbr: 'Ex', full: 'experience', icon: 'brief' },
  { to: '/projects/', abbr: 'Pr', full: 'projects', icon: 'code' },
  { to: '/contact/', abbr: 'Ct', full: 'contact', icon: 'mail' },
] as const satisfies readonly NavItem[];

/** The four home-grid tiles (hello itself is never a tile). */
export const HOME_TILES = NAV_ITEMS.slice(1) satisfies readonly NavItem[];

/** Canonical contact details — every section imports these, never re-declares them. */
export const EMAIL = 'shawnaksa150@gmail.com';
export const GITHUB_URL = 'https://github.com/shawnaks';
export const LINKEDIN_URL = 'https://www.linkedin.com/in/shawnaksa/';
export const RESUME_HREF = 'assets/Shawnak-Samaddar-Resume.pdf';

/**
 * Contact-form delivery. Leave `endpoint` empty to use the mailto fallback.
 * To switch to server delivery (the Cloudflare Worker in `worker/`), paste the
 * deployed worker URL here, e.g.
 * `https://shawnak-contact.<subdomain>.workers.dev` — no other change needed.
 */
export const CONTACT: { endpoint: string; email: string } = {
  endpoint: '',
  email: EMAIL,
};

/** Facts repeated across sections. Strings are the exact displayed copy. */
export const FACTS = {
  deltaRecords: '53M+',
  deltaRows: '27M',
  validatedRecords: '600M+',
  dataSources: '50',
  hackathonPlace: '2nd place',
  hackathonTeams: '50+ teams',
  hackathonName: 'Hacklytics',
  graduation: 'December 2027',
  graduationShort: 'dec 2027',
  internshipTerm: 'summer 2027',
} as const;

export type SocialLink = {
  id: 'github' | 'linkedin' | 'email' | 'resume';
  href: string;
  icon: IconName;
  /** aria-label */
  label: string;
  /** title attribute */
  title: string;
  external?: boolean;
  download?: boolean;
};

/** Social row, in the backup's order. */
export const SOCIALS: readonly SocialLink[] = [
  {
    id: 'github',
    href: GITHUB_URL,
    icon: 'github',
    label: 'github',
    title: 'github',
    external: true,
  },
  {
    id: 'linkedin',
    href: LINKEDIN_URL,
    icon: 'linkedin',
    label: 'linkedin',
    title: 'linkedin',
    external: true,
  },
  {
    id: 'email',
    href: `mailto:${EMAIL}`,
    icon: 'mail',
    label: 'email',
    title: 'email',
  },
  {
    id: 'resume',
    href: RESUME_HREF,
    icon: 'down',
    label: 'download résumé (pdf)',
    title: 'résumé (pdf)',
    download: true,
  },
];
