# shawnak samaddar — personal site

Personal portfolio of **Shawnak Samaddar** — computer science student at Georgia Tech building full-stack web apps and machine-learning tools.

The site is **one scrollable document**: the hero, about, experience, projects, and contact sections are stacked on a single page. Header tiles, the home-grid tiles, inline pills, and CTAs smooth-scroll between sections, a scroll spy keeps every tile's active state in sync, and the URL tracks the section you are reading (`#/about/`, `#/contact/`, ...) so any section is directly shareable. The six project deep-dives remain real sub-routes at `#/case-study/:slug/`. Navigation also has two persistent forms: a slim fixed left rail from 1200px and a fixed bottom tab bar on phones (both read the same scroll spy), plus a Ctrl/Cmd+K command palette that jumps to sections, case studies and actions. There is no fullscreen menu: the header carries a compact nav, the palette trigger and a light/dark switch.

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
| **Transitions** | Custom expo-eased timing: scroll-driven reveals, section-title wipe + scramble, per-letter hover glyph cycling on the four section titles, and a case-study out-stagger |
| **Fonts** | Self-hosted Martian Mono (400/700, latin woff2 under `public/assets/fonts/`, declared in `src/styles/fonts.css`) — one monospace family for UI and body, no runtime Google Fonts request, with a `ui-monospace` / Cascadia Mono / Consolas fallback stack |
| **Theme** | Light / dark via a `.theme-dark` class and semantic CSS tokens; persisted in `localStorage`, applied pre-paint |
| **Icons** | Inline SVG sprite (`IconSprite` + `Icon`) — no icon package |
| **Navigation** | Header tiles + scroll spy, a fixed left section rail ≥1200px, a fixed bottom tab bar ≤767px, and a command palette (Ctrl/Cmd+K or `/`) with its own fuzzy ranking |
| **Type scale** | One `--text-*` token scale on a 62.5% root (`1rem = 10px`): 13px labels, 14px metadata, 17–18px reading copy, 21–24px statements, 24–28px headings, 57.6px section slabs, 97.2px hero |

Libraries the original leaned on (baffle.js for scramble text, GSAP for easing) are replaced by small local implementations in `src/hooks/useScramble.ts`, `src/hooks/useReveal.ts`, and `src/lib/transition.ts`.

## Quick start

Requires Node 20.19+ or 22.12+ (Node 22 recommended; the deploy workflow pins 22).

```bash
cd "Personal Website"
npm install
npm run dev      # http://localhost:5173
npm run build    # type-checks + builds to dist/
npm run preview  # serve the production build
npm test         # run the unit suites (Vitest, one pass)
```

`npm run lint` runs Oxlint over the project.

## Tests

`npm test` runs [Vitest](https://vitest.dev/) once: **57 tests across 6 files**.

- `src/lib/sections.test.ts` — path normalisation, section-path → section-id mapping, and case-study path detection
- `src/data/projects.test.ts` — six unique project slugs, non-empty challenge/solution steps, case-insensitive lookup, and next-pager wrapping
- `src/lib/contactForm.test.ts` — field validation and caps, CR/LF stripping, and mailto subject/body encoding (including header-injection attempts)
- `src/lib/rateLimit.test.ts` — cooldown and rolling-window verdicts, persistence, corrupt-JSON tolerance, and falling back to memory when storage throws
- `worker/src/validate.test.js` — server-side payload rules: required fields, caps, control characters, honeypot, and non-string inputs
- `worker/src/limit.test.js` — per-IP 60 s / 3-per-15-min windows, retry-after math, window rollover, the global daily cap, and corrupt timestamps

Together they cover the path mapping behind the router, the integrity of the project data behind the grid and case studies, the contact form's validation, encoded mailto, and client-side rate limiting, and the worker's validation and rate-limit math. There is no browser E2E harness in the repo.

## Navigation & URL model

- **Smooth scrolling.** All section controls — the five header tiles, the four home-grid tiles, inline pills, and CTAs — scroll to their section instead of swapping pages. The target section leaves a `90px` scroll margin so its title slab clears the fixed 75px header.
- **Header.** One full-width bar: wordmark flush left, five compact nav tiles, the `// goto` palette trigger and the 45px theme switch flush right. Full tile names show from 1281px; 768–1280px uses the two-letter abbreviations (which leaves room for the palette trigger); at 767px and below the nav is hidden behind the bottom tab bar. On phones the wordmark shrinks with the viewport, and a 768–899px band trims it to `1.1em` so the abbreviated nav still fits.
- **Section rail.** From 1200px, a fixed 50px rail in the left gutter draws one 3px mark per section (the active mark is 34px and accent-coloured) and reveals a `// section` label on hover or keyboard focus. It is mounted only on the main document, never on case-study or error routes, and reads the same scroll-spy store as the header.
- **Mobile tab bar.** At 767px and below the rail becomes a fixed 56px bottom bar with the five section icons and abbreviations, padded by `env(safe-area-inset-bottom)`. The page adds matching bottom padding so the contact submit and the final CTA scroll clear of it.
- **Command palette.** Ctrl/Cmd+K toggles it from anywhere; `/` opens it outside form fields (inside the contact form a slash types normally). It lists sections, the six case studies, résumé download, email and a theme toggle, ranked by label then alias (`resume`/`cv`/`pdf`, `whoami`, `work.log`, `rxg`, …). Arrow keys / Home / End move, Enter opens, Esc closes. It is a `dialog` with an `aria-modal` combobox + listbox, keeps Tab inside the search field, restores focus and scroll position on close, and leaves Ctrl/Cmd-click to the browser for a native new tab.
- **Scroll spy.** A centre-band `IntersectionObserver` (`src/lib/scrollSpy.ts`) tracks which stacked section owns the reading line and drives every tile's active state through a `useSyncExternalStore` store.
- **History.** Moving to a different section pushes a history entry, so browser back/forward returns to the section — and the scroll position — you came from.
- **Shareable hashes.** `#/hello/`, `#/about/`, `#/experience/`, `#/projects/`, and `#/contact/` deep-link straight to a section with an instant landing; the trailing slash is optional (`#/about` normalises to `#/about/`). Passive scrolling updates the hash silently with `replaceState`, so browsing does not fill up the history stack.
- **Case studies.** Project cards open the real sub-route `#/case-study/:slug/` with an outgoing content stagger. "back to listing" returns instantly to the projects section; browser back returns to the section you left.
- **Reduced motion.** `prefers-reduced-motion: reduce` makes scrolling instant, renders reveals, skill bars, and title wipes immediately, disables the per-letter title hover cycle, renders the hero scroll cue as a static six-sector pie, turns off the about falling-leaf rain (no leaves, no animation loop), and skips the card scan wipe, the contact stamp and the error shake.

## Interaction details

- **Card scan wipe.** A project card's real screenshot (when one exists) is clipped from the right and wipes in left→right on hover, alongside the existing −4px card lift. It is gated to `(hover: hover) and (pointer: fine)` and off under reduced motion, so touch devices never get a hidden image. The placeholder slots are untouched.
- **Case-study progress spine.** A 15px accent bar on the page edge fills top→bottom with the `--read` custom property (one rAF per scroll frame), echoing the title slab's spine. It sits inside the article, below the fixed header, and is hidden in print.
- **Contact feedback.** A success send plays a 420 ms stamp and a hatch flash (restarted per accepted send); an invalid submit shakes only the first bad field once, then focuses it. Both are off under reduced motion, and the form keeps a single polite live region so a message is never announced twice.

## Theming

The 45px theme switch in the header flips a `.theme-dark` class on `<html>`. The choice is stored in `localStorage` under `theme`; a small inline script in `index.html` applies the class and rewrites `<meta name="theme-color">` before the first paint, so reloading in dark mode never flashes a white page. The first visit defaults to light, and the key survives case-study navigation (it is origin-scoped).

Every surface reads from semantic tokens, so the loader, title slabs, project cards, case-study grids, contact cards, error page, focus rings, and `::selection` all flip without duplicated component rules. The token palettes are listed [below](#semantic-color-tokens). Native scrollbars follow the theme through `color-scheme`, and print media resets the page to the light palette.

## Metadata & social preview

`index.html` carries the Open Graph and Twitter-card tags. The preview image is `https://shawnaks.github.io/assets/og-image.png` (1200×630) — an **absolute URL**, because social crawlers do not resolve relative paths. It is tied to the current `shawnaks.github.io` domain, so update it if the site moves to a custom domain. `apple-touch-icon.png` is linked for iOS, and `public/site.webmanifest` supplies the 192/512 manifest icons with `theme_color` (and `background_color`) `#ffffff`. The viewport meta includes `viewport-fit=cover`, so the fixed bottom tab bar pads itself with the iOS safe-area inset instead of sitting under the home indicator.

## Project structure

```
Personal Website/
  .github/workflows/deploy.yml   # automatic GitHub Pages deployment
  index.html                     # Vite entry document (meta/social tags, theme pre-paint script, #root)
  vite.config.ts                 # React plugin + base: './' for portable builds
  worker/                        # Cloudflare Worker for contact delivery (not built by Vite)
    wrangler.toml                # name, vars, Durable Object binding + SQLite migration
    src/index.js                 # fetch handler: CORS, body cap, limits, Resend send; RateLimiter DO
    src/validate.js              # pure contact-payload validation
    src/limit.js                 # pure per-IP window + daily-cap math
    src/validate.test.js         # payload validation tests (run by the root vitest)
    src/limit.test.js            # rate-limit math tests (run by the root vitest)
  public/
    assets/favicon.svg           # SVG favicon
    assets/apple-touch-icon.png  # 180×180 iOS home-screen icon
    assets/icon-192.png          # manifest icon
    assets/icon-512.png          # manifest icon
    assets/og-image.png          # 1200×630 Open Graph / Twitter preview
    assets/portrait.jpg          # owner portrait used by the home/about frames
    assets/fonts/                # self-hosted Martian Mono 400/700 latin woff2
    assets/Shawnak-Samaddar-Resume.pdf   # 108 KB, linked from the social row & contact
    site.webmanifest             # PWA metadata (theme_color #ffffff)
  src/
    main.tsx                     # React root
    App.tsx                      # HashRouter shell, loader gating, route effects,
                                 #   section scroll handler, command palette, case-study + catch-all routes
    routes/
      MainPage.tsx               # the scrollable document: Hello → About → Experience → Projects → Contact,
                                 #   plus the section rail / mobile tab bar
      Hello.tsx                  # #/hello/       — hero, identity + current-role lines, home tile grid, socials
      About.tsx                  # #/about/       — bio (portrait below the copy) + full-screen falling-leaf rain, education, coursework, skill bars
      Experience.tsx             # #/experience/  — 3 roles + 3 hackathon records
      Projects.tsx               # #/projects/    — 6 project cards with ShotSlot frames
      CaseStudy.tsx              # #/case-study/:slug/ — full record + next pager
      Contact.tsx                # #/contact/     — email-first, channels, status, message form
      ErrorPage.tsx              # catch-all "// not found"
    components/
      Header.tsx                 # fixed header, compact nav, palette trigger, theme switch, scroll state
      CommandPalette.tsx         # Ctrl/Cmd+K dialog: sections, case studies, résumé, email, theme
      SectionRail.tsx            # fixed left section rail (≥1200px) / bottom tab bar (≤767px)
      ThemeToggle.tsx            # 45px light/dark switch; persists + updates theme-color
      NavTile.tsx                # 2-letter nav tile; intercepts clicks for smooth scrolling
      SectionTitle.tsx           # observer-triggered slab wipe + scramble, per-letter hover cycle, hero variant
      PlanList.tsx / PlanItem.tsx # bordered detail-card list (education, roles, records)
      Portrait.tsx               # framed, grayscale-until-hover owner portrait
      LeafRain.tsx               # full-viewport canvas behind the about content: sparse 16–24px
                                 #   leaves in 5 theme-aware green shades sway and tumble as they
                                 #   fall; starts when about fills the viewport, fades out at
                                 #   education, resumes on scroll-up; DPR-scaled, rAF only while
                                 #   raining, nothing under reduced motion
      Cta.tsx                    # double-chevron call to action
      SocialRow.tsx              # github / linkedin / email / résumé row
      ShotSlot.tsx               # framed screenshot slot (placeholder or image)
      SkillBars.tsx              # scroll-triggered skill bars + counters
      Loader.tsx                 # initial loading ring
      TransitionLink.tsx         # in-copy link that triggers a transition
      Icon.tsx / IconSprite.tsx  # inline SVG sprite + <use> wrapper
    hooks/
      useScramble.ts             # character scramble reveal; split-letter reset for hover cycling
      useReveal.ts               # observer-based staged reveals (replay on re-entry)
      useActiveSection.ts        # useSyncExternalStore subscriber for the scroll-spy section
    lib/
      sections.ts                # five-section registry + hash path helpers
      sections.test.ts           # path normalisation / section mapping / case-study path tests
      scrollSpy.ts               # centre-band IntersectionObserver + shared active store
      scroll.ts                  # smooth/instant section scrolling, programmatic marker
      transition.ts              # case-study out-stagger + navigation guard
      contactForm.ts             # contact validation, field caps, CR/LF-safe mailto builder
      contactForm.test.ts        # validation / caps / encoding / header-injection tests
      rateLimit.ts               # 60s cooldown + 3-per-15-min limiter, localStorage + memory fallback
      rateLimit.test.ts          # cooldown / rolling window / corrupt + throwing storage tests
    data/
      site.ts                    # nav items, home tiles, socials, contact details (EMAIL/GITHUB_URL/
                                 #   LINKEDIN_URL/RESUME_HREF), form delivery (CONTACT) + facts (FACTS)
      projects.ts                # six project records + case-study content
      projects.test.ts           # project-data integrity: slugs, steps, lookup, next pager
    styles/
      fonts.css                  # @font-face for the self-hosted Martian Mono woff2 files
      main.css                   # design system: light/dark tokens, shell, primitives
      about.css                  # bio, education, coursework, skill bars
      experience.css             # role/hackathon records, inline project pills
      projects.css               # project cards, case-study blocks, screenshot slots, card scan wipe
      contact.css                # email hero, channel grid, location/status strip, message form,
                                 #   success stamp + one-shot error shake
      portrait.css               # framed portrait + home/about bio layouts
      leaf-rain.css              # fixed full-viewport leaf canvas + about content stacking
      rail.css                   # section rail (wide) / bottom tab bar (phone) + safe-area padding
      palette.css                # header palette trigger + command-palette dialog
```

### Contact form delivery

The form posts JSON to a small **Cloudflare Worker** in `worker/` (plain ESM, no dependencies), which sends the message through [Resend](https://resend.com) to `shawnaksa150@gmail.com`:

```
static site (GitHub Pages) → Cloudflare Worker → Resend → shawnaksa150@gmail.com
```

`src/data/site.ts` exports `CONTACT = { endpoint, email }`. `endpoint` currently points at the deployed worker (`https://shawnak-contact.shawnaks.workers.dev/`), so the form `POST`s JSON and the worker handles delivery. Clearing `endpoint` is the fallback switch: the same form then builds a fully encoded `mailto:` and opens the visitor's mail app, so the static build makes no network request. A 429 from the worker keeps the draft and shows the server's `retryAfter` wait; any other failure keeps every field so nothing typed is lost. `email` is the address used in the mailto and in the error/fallback copy.

The client-side limiter in `src/lib/rateLimit.ts` (one send per 60 seconds, three per rolling 15 minutes, persisted under the `contact-submits-v1` `localStorage` key) is a **UX courtesy only** - clearing storage, or calling the endpoint directly, bypasses it. The worker enforces the real limits: **1 message per IP per 60 s, 3 per IP per rolling 15 min, and 50 send attempts per UTC day globally**. The per-IP timestamp is reserved before the Resend call, so a burst of parallel requests from one IP cannot slip past the cooldown; if the send fails, that reservation is released so the visitor can retry immediately, while the daily attempt stays counted (the daily cap is what protects the Resend quota). It also allows only the site's `Origin` (plus local dev), caps the body at 8 KB, validates every field with the same limits as the client, and drops anything that fills the honeypot. The `Origin` check stops other websites from using the endpoint from a browser, but it is CORS, not authentication - a script can call the worker directly, which is exactly what the rate limits are for. The client-side honeypot plus ~3 s minimum-fill check still runs first and never sends the honeypot field.

#### Deploying the worker

1. Create a free [Resend](https://resend.com) account and an API key with sending access.
2. `cd worker`
3. `npx wrangler@4 login`
4. `npx wrangler@4 secret put RESEND_API_KEY` — paste the key when prompted; it is stored on Cloudflare, never in this repo.
5. `npx wrangler@4 deploy`
6. Confirm the printed `https://shawnak-contact.<subdomain>.workers.dev` URL is the one in `endpoint` in `src/data/site.ts`.
7. Commit and push — GitHub Actions redeploys the static site.

**Sender caveat:** the default `FROM_EMAIL = "onboarding@resend.dev"` only delivers to the Resend account's own address, which is the destination inbox here. To send anywhere else (or later from a custom domain), verify a domain in Resend and change `FROM_EMAIL` in `worker/wrangler.toml`; Resend rejects unverified senders.

#### Local testing

`worker/` has no `package.json` and no dependencies. Run `npx wrangler@4 dev` from `worker/` and point `RESEND_API_URL` at a local mock so nothing real is sent (any server that answers `200` with JSON works):

```bash
npx wrangler@4 dev --port 5251 --var RESEND_API_URL:http://127.0.0.1:5252/emails --var RESEND_API_KEY:test
```

`npm test` at the repo root also runs `worker/src/*.test.js` (payload validation and the pure rate-limit math). The CORS allowlist is `ALLOWED_ORIGIN` in `worker/wrangler.toml`, plus `http://localhost:5173` and `http://127.0.0.1:5173` for dev, hardcoded in `worker/src/index.js` — add a custom domain to `ALLOWED_ORIGIN` and redeploy when one arrives.

## Design tokens

| Area | Tokens |
| --- | --- |
| **Colors** | Semantic roles only — `--bg`, `--fg`, `--fill`, `--bg-subtle`, `--border`, `--gray`, `--accent`, `--accent-ink`, `--red` — with a light and dark value for each (table below) |
| **Type** | Martian Mono (400/700) for everything on one `--text-*` scale (`1rem = 10px`): `--text-xs` 13px labels/nav microcopy, `--text-sm` 14px metadata/buttons, `--text-base` 17px reading copy, `--text-md` 18px wider-measure bio, `--text-lg` 21px statements, `--text-xl` 24px headings, `--text-2xl` 28px case title, `--text-3xl` 32px stats, `--text-slab` 57.6px section slabs, `--text-hero` 97.2px hero; `--leading-read` 1.7 / `--leading-statement` 1.5. Bold (700) for logo, hero + slab titles, tile abbreviations, `//` labels, plan names/meta, pills, CTAs, stats, skill labels, project-card names, the case pager, contact handles, and course chips; regular (400) for body and secondary copy. No italics. Fallback stack: `ui-monospace, 'Cascadia Mono', Consolas, monospace` |
| **Borders** | `3px solid --fg` (tiles / detail cards / CTAs), `6px` project cards, `0` border-radius |
| **Motifs** | title slab + 15px accent spine · `//` labels · 2-letter tile abbreviations (Ho Ab Ex Pr Ct) · diagonal hatch shadows · HUD corner brackets · grayscale screenshots · double-chevron CTAs |
| **Motion** | expo eases `cubic-bezier(0.19, 1, 0.22, 1)` / `cubic-bezier(0.16, 1, 0.3, 1)`, 0.25s micro / 0.5s layout · scroll-driven reveals · slab wipe + scramble · per-letter hover glyph cycle · case-study out-stagger · glitch text on hover |

### Semantic color tokens

| Token | Light | Dark | Role |
| --- | --- | --- | --- |
| `--bg` | `#ffffff` | `#17181d` | page and card surfaces |
| `--fg` | `#2b2c33` | `#e8e9ee` | text, lines, borders |
| `--fill` | `#2b2c33` | `#34353d` | title slabs, pills, rules — white text on top |
| `--bg-subtle` | `#fafafa` | `#1d1e24` | screenshot wells |
| `--border` | `#e0e0e0` | `#3a3b44` | hairline dividers |
| `--gray` | `#6b6d78` | `#9aa0ad` | secondary copy |
| `--accent` | `#0b852d` | `#1b8843` | the single accent (dark value reaches 4.52:1 with white text and 3.96:1 on the page) |
| `--accent-ink` | `#0b852d` | `#3cbf6b` | accent for small text and thin lines (dark value 7.5:1 on the page, 5.1:1 on `--fill`) |
| `--red` | `#cc0000` | `#cc0000` | error slab only |
| `--hatch` | `rgba(43,44,51,.16)` | `rgba(255,255,255,.10)` | diagonal hatch strips |
| `--hatch-soft` | `rgba(43,44,51,.045)` | `rgba(255,255,255,.06)` | screenshot-well texture |
| `--shadow` | `rgba(43,44,51,.10)` | `rgba(0,0,0,.45)` | card lift shadows |

`color-scheme` follows the theme (`light` / `dark`), so native scrollbars and controls match; print media forces the light palette.

## Site map

All five sections live on the one stacked document; any section hash opens the same page scrolled to that section.

| Route | Status | Contents |
| --- | --- | --- |
| `#/` or `#/hello/` | **BUILT** — section 1 (top) | "Hello World..." hero with a one-shot scramble reveal, a 150px portrait beside the identity line (`Shawnak Samaddar — computer science @ Georgia Tech`) and the current-role status line (`currently: robot learning @ the Safe Robotics Lab`), "// navigate" home tile grid (visual sitemap), centred social row, and a six-sector leaf-green pie under it that jumps to About (drifts slowly at rest, spins up on hover/focus) |
| `#/about/` | **BUILT** — section 2 | Three-paragraph bio at the 18px reading step with the 300px portrait below the copy (it absorbed the hero's teleoperation clause, the Hacklytics name and the "next hard problem" line), over a full-screen falling-leaf rain behind the content (sparse 16–24px leaves in 5 theme-aware green shades, each swaying and tumbling as it falls; starts when About is reached, stops and fades at education, resumes on scroll-up, static under reduced motion); education card (Georgia Tech B.S. CS Dec 2027, threads: AI & information internetworks, math minor); 8 coursework chips; 8 scroll-triggered skill bars with counters; tools line |
| `#/experience/` | **BUILT** — section 3 | 3 role records — Delta Dental data engineering intern (May–Aug 2026: Python + Snowflake ETL, 53M+ raw records → 27M refined rows, AI agent saving 80% developer time, 600M+ record validation across 50 sources) · Safe Robotics Lab undergrad research assistant (Dec 2025–present: OpenArm bimanual robot teleop in MuJoCo, robot-learning models) · NASA GeneLab Multi-Omics AWG data analyst intern (Jun 2024–Sep 2025: microscopy, K-Means, six ML models) — plus 3 hackathon records: Hacklytics 2026 2nd place best use of Actian VectorAI (50+ teams), AI ATL 2025 (Hearo), HackGT 2025 team lead (SnapFind) |
| `#/projects/` | **BUILT** — section 4 | 6 project cards with 6px borders and framed `ShotSlot` screenshot placeholders: SnapFind (React 19, Supabase, FastAPI, ResNet-18, 92% accuracy), RxGuard (Gemini, sentence-transformers, Actian VectorAI, Hacklytics 2nd place), Flight Fare Optimizer (Python, 186 airports, 262k fares, 4 algorithms from scratch; Fall 2024 course build, refreshed against DOT data through Q1 2026), Hearo (React Native, Gemini 2.5 Flash, ElevenLabs), Battle Showdown (Next.js 15, Tailwind 4), Pong (pygame, 2022) |
| `#/contact/` | **BUILT** — section 5 (bottom) | Email-first: wide `mailto:` hero card, 3 channel cards (LinkedIn, GitHub, résumé PDF download), location & status strip — Atlanta, GA, open to SWE/data internships summer 2027 — and a `// send a message` form (name, email, optional subject, 2000-character message) that POSTs to the live Cloudflare Worker, with inline validation, focus management, one polite live status line, a success stamp, a one-shot error shake, a 60s / 3-per-15-minute client-side rate limit, and the `mailto:` path as fallback if `CONTACT.endpoint` is cleared |
| `#/case-study/:slug/` | **BUILT** — sub-route | Six full case studies (table below) — TLDR; role, technology used, paired challenges & solutions, stats, repo/devpost links, and a `next:` pager that cycles all six; a 15px reading-progress spine fills with the page; "back to listing" returns to the projects section |
| anything else | **BUILT** — 404 | "// not found" with a CTA back to the top of the page |

### Case studies

| Route | Project | TLDR |
| --- | --- | --- |
| `#/case-study/snapfind/` | SnapFind | Photo-based campus lost & found — ResNet-18 classifies 12 item categories at 92% accuracy |
| `#/case-study/rxguard/` | RxGuard | Plain-English drug-regimen search over FDA data — 4 progressive engines, 384-dim embeddings, ~30% better retrieval |
| `#/case-study/flight-fare-optimizer/` | Flight Fare Optimizer | U.S. airports as fare-weighted graph — 4 hand-rolled algorithms benchmarked on 25,000 routes on DOT fare data (Fall 2024 course build, refreshed against DOT data through Q1 2026) |
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
- **Fonts:** Martian Mono 400/700, self-hosted latin woff2 in `public/assets/fonts/` ([Martian Mono](https://github.com/evilmartians/mono), SIL Open Font License 1.1); fallbacks `ui-monospace` / Cascadia Mono / Consolas
- **Icons:** inline SVG sprite, feather-style line icons
- Built with React 19 + TypeScript + Vite; every animation is a local implementation
