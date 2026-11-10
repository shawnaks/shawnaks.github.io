/* ==========================================================================
   site data — single source of truth for navigation, home tiles & socials
   strings are copied verbatim from the vanilla build's index.html
   ========================================================================== */

export type IconName =
  | 'term'
  | 'user'
  | 'brief'
  | 'code'
  | 'trophy'
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

export type HomeTile = NavItem & {
  /** exact `.box-desc` copy from the home tile grid */
  desc: string;
};

/** The four home-grid tiles (hello itself is never a tile). */
export const HOME_TILES = [
  {
    to: '/about/',
    abbr: 'Ab',
    full: 'about',
    icon: 'user',
    desc: 'bio, education, coursework & skills',
  },
  {
    to: '/experience/',
    abbr: 'Ex',
    full: 'experience',
    icon: 'brief',
    desc: 'delta dental, nasa genelab, robotics & hackathon podiums',
  },
  {
    to: '/projects/',
    abbr: 'Pr',
    full: 'projects',
    icon: 'code',
    desc: 'snapfind, rxguard, hearo & other things I’ve shipped',
  },
  {
    to: '/contact/',
    abbr: 'Ct',
    full: 'contact',
    icon: 'mail',
    desc: 'email, linkedin, github & résumé',
  },
] as const satisfies readonly HomeTile[];

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
    href: 'https://github.com/shawnaks',
    icon: 'github',
    label: 'github',
    title: 'github',
    external: true,
  },
  {
    id: 'linkedin',
    href: 'https://www.linkedin.com/in/shawnaksa/',
    icon: 'linkedin',
    label: 'linkedin',
    title: 'linkedin',
    external: true,
  },
  {
    id: 'email',
    href: 'mailto:shawnaksa150@gmail.com',
    icon: 'mail',
    label: 'email',
    title: 'email',
  },
  {
    id: 'resume',
    href: 'assets/Shawnak-Samaddar-Resume.pdf',
    icon: 'down',
    label: 'download résumé (pdf)',
    title: 'résumé (pdf)',
    download: true,
  },
];
