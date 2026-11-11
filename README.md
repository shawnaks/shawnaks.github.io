# shawnak samaddar — personal site

Personal portfolio of **Shawnak Samaddar** — computer science student at Georgia Tech building full-stack web apps and machine-learning tools.

The site is **one scrollable document**: the hero, about, experience, projects, and contact sections are stacked on a single page. Header, overlay, and home-grid tiles smooth-scroll between sections, a scroll spy keeps every tile's active state in sync, and the URL tracks the section you are reading (`#/about/`, `#/contact/`, ...) so any section is directly shareable. The six project deep-dives remain real sub-routes at `#/case-study/:slug/`.

The visual design is a faithful homage to [oninross.github.io/infinite-imaginations](https://oninross.github.io/infinite-imaginations/) by Niño Ross Rodriguez, rebuilt from scratch on a modern stack: React + TypeScript + Vite, with every animation and interaction hand-rolled rather than pulled from a library.

## Tech stack

| Layer | Choice |
| --- | --- |
| **UI** | React 19 |
| **Language** | TypeScript |
| **Build** | Vite 8 (`npm run build` type-checks with `tsc -b`, then bundles to `dist/`) |
| **Routing** | react-router-dom 7 — `HashRouter`; one scrollable page with per-section hashes plus `#/case-study/:slug/` sub-routes |
| **Styling** | Hand-rolled design system in plain CSS (`src/styles/main.css` plus one stylesheet per section) — no Tailwind, no UI kit |
| **Text scramble** | Custom `useScramble` hook (baffle.js equivalent) |
| **Transitions** | Custom expo-eased timing: scroll-driven reveals, section-title wipe + scramble, and a case-study out-stagger |
| **Fonts** | Inter + EB Garamond via Google Fonts |
| **Icons** | Inline SVG sprite (`IconSprite` + `Icon`) — no icon package |

Libraries the original leaned on (baffle.js for scramble text, GSAP for easing) are replaced by small local implementations in `src/hooks/useScramble.ts`, `src/hooks/useReveal.ts`, and `src/lib/transition.ts`.

## Quick start

Requires Node 18+ (Node 22 recommended; the deploy workflow pins 22).

```bash
cd "Personal Website"
npm install
npm run dev      # http://localhost:5173
npm run build    # type-checks + builds to dist/
npm run preview  # serve the production build
```

`npm run lint` runs Oxlint over the project.

## Navigation & URL model

- **Smooth scrolling.** All section controls — the five header tiles, the five fullscreen-menu tiles, the four home-grid tiles, inline pills, and CTAs — scroll to their section instead of swapping pages. The target section leaves a `90px` scroll margin so its title slab clears the fixed 75px header.
- **Scroll spy.** A centre-band `IntersectionObserver` (`src/lib/scrollSpy.ts`) tracks which stacked section owns the reading line and drives every tile's active state through a `useSyncExternalStore` store.
- **History.** Moving to a different section pushes a history entry, so browser back/forward returns to the section — and the scroll position — you came from.
- **Shareable hashes.** `#/hello/`, `#/about/`, `#/experience/`, `#/projects/`, and `#/contact/` deep-link straight to a section with an instant landing; the trailing slash is optional (`#/about` normalises to `#/about/`). Passive scrolling updates the hash silently with `replaceState`, so browsing does not fill up the history stack.
- **Case studies.** Project cards open the real sub-route `#/case-study/:slug/` with an outgoing content stagger. "back to listing" returns instantly to the projects section; browser back returns to the section you left.
- **Reduced motion.** `prefers-reduced-motion: reduce` makes scrolling instant and renders reveals, skill bars, and title wipes immediately.

## Project structure

```
Personal Website/
  .github/workflows/deploy.yml   # automatic GitHub Pages deployment
  index.html                     # Vite entry document (fonts, meta, #root)
  vite.config.ts                 # React plugin + base: './' for portable builds
  public/
    assets/favicon.svg           # 344 B
    assets/Shawnak-Samaddar-Resume.pdf   # 108 KB, linked from the social row & contact
    site.webmanifest             # PWA metadata
  src/
    main.tsx                     # React root
    App.tsx                      # HashRouter shell, loader gating, route effects,
                                 #   section scroll handler, case-study + catch-all routes
    routes/
      MainPage.tsx               # the scrollable document: Hello → About → Experience → Projects → Contact
      Hello.tsx                  # #/hello/       — hero, intro, home tile grid, socials
      About.tsx                  # #/about/       — bio, education, coursework, skill bars
      Experience.tsx             # #/experience/  — 3 roles + 3 hackathon records
      Projects.tsx               # #/projects/    — 6 project cards with ShotSlot frames
      CaseStudy.tsx              # #/case-study/:slug/ — full record + next pager
      Contact.tsx                # #/contact/     — email-first, all channels live
      ErrorPage.tsx              # catch-all "// not found"
    components/
      Header.tsx                 # fixed header, compact nav, menu toggle, scroll state
      MenuOverlay.tsx            # full-screen menu (Escape + backdrop close)
      NavTile.tsx                # 2-letter nav tile; intercepts clicks for smooth scrolling
      SectionTitle.tsx           # observer-triggered slab wipe + scramble, hero variant
      PlanList.tsx / PlanItem.tsx# bordered detail-card list (education, roles, records)
      Cta.tsx                    # double-chevron call to action
      SocialRow.tsx              # github / linkedin / email / résumé row
      ShotSlot.tsx               # framed screenshot slot (placeholder or image)
      SkillBars.tsx              # scroll-triggered skill bars + counters
      Loader.tsx                 # initial loading ring
      TransitionLink.tsx         # in-copy link that triggers a transition
      Icon.tsx / IconSprite.tsx  # inline SVG sprite + <use> wrapper
    hooks/
      useScramble.ts             # character scramble reveal
      useReveal.ts               # observer-based staged reveals (replay on re-entry)
      useActiveSection.ts        # useSyncExternalStore subscriber for the scroll-spy section
    lib/
      sections.ts                # five-section registry + hash path helpers
      scrollSpy.ts               # centre-band IntersectionObserver + shared active store
      scroll.ts                  # smooth/instant section scrolling, programmatic marker
      transition.ts              # case-study out-stagger + navigation guard
    data/
      site.ts                    # nav items, home tiles, socials — single source of truth
      projects.ts                # six project records + case-study content
    styles/
      main.css                   # design system: tokens, shell, primitives
      about.css                  # bio, education, coursework, skill bars
      experience.css             # role/hackathon records, inline project pills
      projects.css               # project cards, case-study blocks, screenshot slots
      contact.css                # email hero, channel grid, location/status strip
```

## Design tokens

| Area | Tokens |
| --- | --- |
| **Colors** | bg `#ffffff` · ink `#2b2c33` · accent `#0b852d` · error `#cc0000` · border `#e0e0e0` · gray `#6b6d78` |
| **Type** | Inter / Helvetica Neue (300/400/700) for UI; EB Garamond for body copy; `1em = 10px` scale |
| **Borders** | `3px solid ink` (tiles / detail cards / CTAs), `6px` project cards, `0` border-radius |
| **Motifs** | black title slab + 15px accent spine · `//` labels · 2-letter tile abbreviations (Ho Ab Ex Pr Ct) · diagonal hatch shadows · HUD corner brackets · grayscale screenshots · double-chevron CTAs |
| **Motion** | expo eases `cubic-bezier(0.19, 1, 0.22, 1)` / `cubic-bezier(0.16, 1, 0.3, 1)`, 0.25s micro / 0.5s layout · scroll-driven reveals · slab wipe + scramble · case-study out-stagger · glitch text on hover |

## Site map

All five sections live on the one stacked document; any section hash opens the same page scrolled to that section.

| Route | Status | Contents |
| --- | --- | --- |
| `#/` or `#/hello/` | **BUILT** — section 1 (top) | "Hello World..." hero with scramble reveal, portrait + intro paragraphs with inline section links, "// navigate" home tile grid (visual sitemap), social row |
| `#/about/` | **BUILT** — section 2 | Three-paragraph bio; education card (Georgia Tech B.S. CS Dec 2027, threads: AI & information internetworks, math minor); 8 coursework chips; 8 scroll-triggered skill bars with counters; tools line |
| `#/experience/` | **BUILT** — section 3 | 3 role records — Delta Dental data engineering intern (May–Aug 2026: Python + Snowflake ETL, 53M+ raw records → 27M refined rows, AI agent saving 80% developer time, 600M+ record validation across 50 sources) · Safe Robotics Lab undergrad research assistant (Dec 2025–present: OpenArm bimanual robot teleop in MuJoCo, robot-learning models) · NASA GeneLab Multi-Omics AWG data analyst intern (Jun 2024–Sep 2025: microscopy, K-Means, six ML models) — plus 3 hackathon records: Hacklytics 2026 2nd place best use of Actian VectorAI (50+ teams), AI ATL 2025 (Hearo), HackGT 2025 team lead (SnapFind) |
| `#/projects/` | **BUILT** — section 4 | 6 project cards with 6px borders and framed `ShotSlot` screenshot placeholders: SnapFind (React 19, Supabase, FastAPI, ResNet-18, 92% accuracy), RxGuard (Gemini, sentence-transformers, Actian VectorAI, Hacklytics 2nd place), Flight Fare Optimizer (Python, 186 airports, 262k fares, 4 algorithms from scratch), Hearo (React Native, Gemini 2.5 Flash, ElevenLabs), Battle Showdown (Next.js 15, Tailwind 4), Pong (pygame, 2022) |
| `#/contact/` | **BUILT** — section 5 (bottom) | Email-first: wide `mailto:` hero card, 3 channel cards (LinkedIn, GitHub, résumé PDF download), location & status strip — Atlanta, GA, open to SWE/data internships summer 2027 |
| `#/case-study/:slug/` | **BUILT** — sub-route | Six full case studies (table below) — TLDR; role, technology used, paired challenges & solutions, stats, repo/devpost links, and a `next:` pager that cycles all six; "back to listing" returns to the projects section |
| anything else | **BUILT** — 404 | "// not found" with a CTA back to the top of the page |

### Case studies

| Route | Project | TLDR |
| --- | --- | --- |
| `#/case-study/snapfind/` | SnapFind | Photo-based campus lost & found — ResNet-18 classifies 12 item categories at 92% accuracy |
| `#/case-study/rxguard/` | RxGuard | Plain-English drug-regimen search over FDA data — 4 progressive engines, 384-dim embeddings, ~30% better retrieval |
| `#/case-study/flight-fare-optimizer/` | Flight Fare Optimizer | U.S. airports as fare-weighted graph — 4 hand-rolled algorithms benchmarked on 25,000 routes |
| `#/case-study/hearo/` | Hearo | Voice-first vision assistant for blind and low-vision users — Gemini 2.5 Flash scene descriptions spoken by ElevenLabs |
| `#/case-study/battle-showdown/` | Battle Showdown | Turn-based browser fighting game — 4 abilities, 100 HP, timed Snowman counterattacks |
| `#/case-study/pong/` | Pong | The arcade classic in one Python file — 2-player and bot modes, 4 difficulties, zero external assets |

An unknown slug renders the in-page "// case study not found" treatment; the projects nav tile stays active throughout.

## Content sources

Content extracted from the owner's résumé (`Shawnak-Samaddar-Resume.pdf`, served from `public/assets/`) and GitHub profile ([github.com/shawnaks](https://github.com/shawnaks)) in Nov 2026.

## Deployment

The site is a static build with **hash routing**, so no SPA fallback, rewrite rule, or 404 page configuration is needed on any host. `vite.config.ts` sets `base: './'`, so the same `dist/` works at a domain root or under a repository subpath.

### Option A — automatic (GitHub Actions) — recommended

Name the repository **`shawnaks.github.io`** so the site serves at the domain root: **https://shawnaks.github.io/**.

1. Push the repo to GitHub as `shawnaks.github.io` with the default branch `main`.
2. The included workflow `.github/workflows/deploy.yml` runs on every push to `main` (and via manual dispatch): installs with `npm ci`, builds, and deploys the `dist/` artifact to Pages.
3. In the repo: **Settings → Pages → Source: GitHub Actions**.

> A project repo (any other name) also works; it serves under `https://shawnaks.github.io/<repo>/` instead.

### Option B — manual (`gh-pages` branch)

```bash
npm run build
npx gh-pages -d dist    # or push dist/ to a gh-pages branch yourself
```

Then set **Settings → Pages → Source: Deploy from a branch → `gh-pages` / `(root)`**.

## Roadmap

1. Drop real screenshots into the framed `ShotSlot` placeholders in the projects section and each case study
2. Optional live demo links for SnapFind, Battle Showdown, and Hearo
3. Custom domain (owner plans to add one later)

## Notes

The original vanilla implementation — a zero-dependency, single-file HTML/CSS/JS version — is preserved at `C:\Users\shawn\personal-website-vanilla-backup`.

## Credits

- **Design homage:** "infinite imaginations" by Niño Ross Rodriguez ([oninross.github.io/infinite-imaginations](https://oninross.github.io/infinite-imaginations))
- **Fonts:** Inter + EB Garamond (Google Fonts), fallbacks Helvetica Neue / Georgia
- **Icons:** inline SVG sprite, feather-style line icons
- Built with React 19 + TypeScript + Vite; every animation is a local implementation
