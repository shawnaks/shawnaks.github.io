# shawnak samaddar — personal site

Personal portfolio of **Shawnak Samaddar** — computer science student at Georgia Tech building full-stack web apps and machine-learning tools.

The visual design is a faithful homage to [oninross.github.io/infinite-imaginations](https://oninross.github.io/infinite-imaginations/) by Niño Ross Rodriguez, rebuilt from scratch on a modern stack: React + TypeScript + Vite, with every animation and interaction hand-rolled rather than pulled from a library.

## Tech stack

| Layer | Choice |
| --- | --- |
| **UI** | React 19 |
| **Language** | TypeScript |
| **Build** | Vite 8 (`npm run build` type-checks with `tsc -b`, then bundles to `dist/`) |
| **Routing** | react-router-dom 7 — `HashRouter`, preserving the original `#/route/` URLs |
| **Styling** | Hand-rolled design system in plain CSS (`src/styles/main.css` plus one page stylesheet per route) — no Tailwind, no UI kit |
| **Text scramble** | Custom `useScramble` hook (baffle.js equivalent) |
| **Transitions** | Custom expo-eased timing + tile-clone page transition (GSAP equivalent) |
| **Fonts** | Inter + EB Garamond via Google Fonts |
| **Icons** | Inline SVG sprite (`IconSprite` + `Icon`) — no icon package |

Libraries the original leaned on (baffle.js for scramble text, GSAP for easing) are replaced by small local implementations in `src/hooks/useScramble.ts` and `src/lib/transition.ts`.

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
                                 #   landing half of the tile-clone transition
    routes/
      Hello.tsx                  # #/hello/       — home: hero, intro, tile grid, socials
      About.tsx                  # #/about/       — bio, education, coursework, skill bars
      Experience.tsx             # #/experience/  — 3 roles + 3 hackathon records
      Projects.tsx               # #/projects/    — 6 project cards with ShotSlot frames
      CaseStudy.tsx              # #/case-study/:slug/ — full record + next pager
      Contact.tsx                # #/contact/     — email-first, all channels live
      ErrorPage.tsx              # catch-all "// not found"
    components/
      Header.tsx                 # fixed header, condensed nav, menu toggle
      MenuOverlay.tsx            # full-screen menu (Escape + backdrop close)
      NavTile.tsx                # 2-letter home-grid tile (Ho Ab Ex Pr Ct)
      SectionTitle.tsx           # title slab + accent spine, hero variant
      PlanList.tsx / PlanItem.tsx# bordered detail-card list (education, roles, records)
      Cta.tsx                    # double-chevron call to action
      SocialRow.tsx              # github / linkedin / email / résumé row
      ShotSlot.tsx               # framed screenshot slot (placeholder or image)
      SkillBars.tsx              # scroll-triggered skill bars + counters
      Loader.tsx                 # initial loading ring
      TransitionLink.tsx         # in-copy link that triggers a page transition
      Icon.tsx / IconSprite.tsx  # inline SVG sprite + <use> wrapper
    hooks/
      useScramble.ts             # character scramble reveal
      useReveal.ts               # staggered scroll/reveal observer
    lib/
      transition.ts              # page-transition choreographer (clone flight,
                                 #   timing constants, navigation guard)
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
| **Motion** | expo eases `cubic-bezier(0.19, 1, 0.22, 1)` / `cubic-bezier(0.16, 1, 0.3, 1)`, 0.25s micro / 0.5s layout · scramble reveals · cloned-tile page transition · glitch text on hover |

## Site map

| Route | Status | Contents |
| --- | --- | --- |
| `#/hello/` | **BUILT** — home | "Hello World..." hero with scramble reveal, intro paragraphs with inline transition links, "// navigate" tile grid (visual sitemap), social row, colophon |
| `#/about/` | **BUILT** | Three-paragraph bio; education card (Georgia Tech B.S. CS Dec 2027, threads: AI & information internetworks, math minor); 8 coursework chips; 8 scroll-triggered skill bars with counters; tools line |
| `#/experience/` | **BUILT** | 3 role records — Delta Dental data engineering intern (May–Aug 2026: Python + Snowflake ETL, 53M+ raw records → 27M refined rows, AI agent saving 80% developer time, 600M+ record validation across 50 sources) · Safe Robotics Lab undergrad research assistant (Dec 2025–present: OpenArm bimanual robot teleop in MuJoCo, robot-learning models) · NASA GeneLab Multi-Omics AWG data analyst intern (Jun 2024–Sep 2025: microscopy, K-Means, six ML models) — plus 3 hackathon records: Hacklytics 2026 2nd place best use of Actian VectorAI (50+ teams), AI ATL 2025 (Hearo), HackGT 2025 team lead (SnapFind) |
| `#/projects/` | **BUILT** | 6 project cards with 6px borders and framed `ShotSlot` screenshot placeholders: SnapFind (React 19, Supabase, FastAPI, ResNet-18, 92% accuracy), RxGuard (Gemini, sentence-transformers, Actian VectorAI, Hacklytics 2nd place), Flight Fare Optimizer (Python, 186 airports, 262k fares, 4 algorithms from scratch), Hearo (React Native, Gemini 2.5 Flash, ElevenLabs), Battle Showdown (Next.js 15, Tailwind 4), Pong (pygame, 2022) |
| `#/contact/` | **BUILT** | Email-first: wide `mailto:` hero card, 3 channel cards (LinkedIn, GitHub, résumé PDF download), location & status strip — Atlanta, GA, open to SWE/data internships summer 2027 |
| `#/case-study/:slug/` | **BUILT** | Six full case studies (table below) — TLDR; role, technology used, paired challenges & solutions, stats, repo/devpost links, and a `next:` pager that cycles all six |
| anything else | `#/error` | "// not found" |

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

1. Drop real screenshots into the framed `ShotSlot` placeholders on `#/projects/` and each case study
2. Optional live demo links for SnapFind, Battle Showdown, and Hearo
3. Custom domain (owner plans to add one later)
4. A possible profile photo on `#/about/` (owner decision pending)

## Notes

The original vanilla implementation — a zero-dependency, single-file HTML/CSS/JS version — is preserved at `C:\Users\shawn\personal-website-vanilla-backup`.

## Credits

- **Design homage:** "infinite imaginations" by Niño Ross Rodriguez ([oninross.github.io/infinite-imaginations](https://oninross.github.io/infinite-imaginations))
- **Fonts:** Inter + EB Garamond (Google Fonts), fallbacks Helvetica Neue / Georgia
- **Icons:** inline SVG sprite, feather-style line icons
- Built with React 19 + TypeScript + Vite; every animation is a local implementation
