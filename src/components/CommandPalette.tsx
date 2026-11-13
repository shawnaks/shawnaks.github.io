import '../styles/palette.css';

import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EMAIL, RESUME_HREF } from '../data/site';
import { PROJECTS } from '../data/projects';
import { SECTIONS, sectionIdFromPath } from '../lib/sections';
import type { SectionNavHandler } from '../lib/sections';
import type { NavigateHandler } from '../lib/transition';

type GroupId = 'sections' | 'case studies' | 'actions';
type ItemKind = 'section' | 'case' | 'resume' | 'email' | 'theme';

type PaletteItem = {
  id: string;
  group: GroupId;
  kind: ItemKind;
  label: string;
  note?: string;
  keywords: readonly string[];
  href: string;
  download?: boolean;
};

const GROUP_ORDER: readonly { id: GroupId; label: string }[] = [
  { id: 'sections', label: 'sections' },
  { id: 'case studies', label: 'case studies' },
  { id: 'actions', label: 'actions' },
];

const SECTION_KEYWORDS: Record<string, readonly string[]> = {
  hello: ['hello', 'home', 'start', 'top', 'landing'],
  about: ['about', 'bio', 'whoami', 'me'],
  experience: ['experience', 'work', 'jobs', 'career', 'timeline'],
  projects: ['projects', 'project', 'portfolio', 'case studies', 'work showcase'],
  contact: ['contact', 'email', 'mail', 'reach', 'form'],
};

/** Every command, in stable group order. */
const ITEMS: readonly PaletteItem[] = [
  ...SECTIONS.map((section, index) => ({
    id: `section-${section.id}`,
    group: 'sections' as const,
    kind: 'section' as const,
    label: `${String(index + 1).padStart(2, '0')} ${section.id}`,
    keywords: SECTION_KEYWORDS[section.id] ?? [section.id],
    href: section.to,
  })),
  ...PROJECTS.map((project) => ({
    id: `project-${project.slug}`,
    group: 'case studies' as const,
    kind: 'case' as const,
    label: project.name,
    note: project.tagline,
    keywords: [
      project.slug,
      ...project.slug.split('-'),
      project.name,
      project.tagline,
      project.badge,
      'case study',
    ],
    href: `/case-study/${project.slug}/`,
  })),
  {
    id: 'action-resume',
    group: 'actions',
    kind: 'resume',
    label: 'download résumé',
    note: 'pdf',
    keywords: ['resume', 'cv', 'pdf', 'curriculum vitae', 'download'],
    href: RESUME_HREF,
    download: true,
  },
  {
    id: 'action-email',
    group: 'actions',
    kind: 'email',
    label: 'email me',
    note: EMAIL,
    keywords: ['mail', 'email', 'contact', 'reach out'],
    href: `mailto:${EMAIL}`,
  },
  {
    id: 'action-theme',
    group: 'actions',
    kind: 'theme',
    label: 'toggle theme',
    note: 'light / dark',
    keywords: ['theme', 'dark', 'light', 'appearance', 'night'],
    href: '#',
  },
];

const LIST_ID = 'palette-listbox';

const optionId = (item: PaletteItem) => `palette-option-${item.id}`;

/** Router paths need the hash prefix on the raw anchor; external targets do not. */
const anchorHref = (item: PaletteItem) =>
  item.kind === 'section' || item.kind === 'case' ? `#${item.href}` : item.href;

/** Case- and accent-insensitive so "resume" finds "résumé". */
function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/** In-order character match; gaps lower the score. `-1` means no match. */
function subsequence(haystack: string, needle: string): number {
  let from = 0;
  let last = -1;
  let gaps = 0;

  for (const char of needle) {
    const at = haystack.indexOf(char, from);
    if (at < 0) return -1;
    if (last >= 0) gaps += at - last - 1;
    last = at;
    from = at + 1;
  }

  return Math.max(5, 30 - gaps);
}

/** One query token against one command: labels beat aliases, prefixes beat infixes. */
function tokenScore(token: string, item: PaletteItem): number {
  const label = normalize(item.label);
  const words = label.split(/[^a-z0-9]+/).filter(Boolean);
  let best = -1;

  if (label === token) best = 150;
  else if (label.startsWith(token)) best = 130;
  else if (words.some((word) => word.startsWith(token))) best = 120;
  else if (label.includes(token)) best = 114 - Math.min(label.indexOf(token), 20);

  for (const keyword of item.keywords) {
    const alias = normalize(keyword);
    if (alias === token) best = Math.max(best, 110);
    else if (alias.startsWith(token)) best = Math.max(best, 84);
    else if (alias.includes(token)) best = Math.max(best, 60 - Math.min(alias.indexOf(token), 20));
    // Fuzzy matching is for short aliases only: a subsequence across a whole
    // tagline matches almost anything ("cv" → "voice-first ai vision").
    else if (!alias.includes(' ')) best = Math.max(best, subsequence(alias, token));
  }

  if (best < 0) best = subsequence(label, token);
  return best;
}

/** Filter + rank: groups ordered by their best hit, rows by score inside. */
function groupResults(query: string) {
  const tokens = normalize(query).trim().split(/\s+/).filter(Boolean);
  const scored: { item: PaletteItem; score: number; order: number }[] = [];

  ITEMS.forEach((item, order) => {
    let score = 0;

    for (const token of tokens) {
      const tokenValue = tokenScore(token, item);
      if (tokenValue < 0) return;
      score += tokenValue;
    }

    scored.push({ item, score, order });
  });

  return GROUP_ORDER.map((group, groupIndex) => ({
    ...group,
    groupIndex,
    items: scored
      .filter((entry) => entry.item.group === group.id)
      .sort((a, b) => b.score - a.score || a.order - b.order),
  }))
    .filter((group) => group.items.length > 0)
    .sort((a, b) => b.items[0].score - a.items[0].score || a.groupIndex - b.groupIndex)
    .map((group) => ({
      id: group.id,
      label: group.label,
      items: group.items.map((entry) => entry.item),
    }));
}

function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}

export type CommandPaletteProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Section controls use the header tiles' scroll contract. */
  onNavigate: SectionNavHandler;
  /** Case studies keep the site's outgoing route transition. */
  onCaseStudyNavigate: NavigateHandler;
};

/**
 * Command palette: sections, case studies and page actions in one filtered
 * list. Focus stays in the search field (combobox pattern) the whole time.
 */
export function CommandPalette({
  open,
  onOpenChange,
  onNavigate,
  onCaseStudyNavigate,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const wasOpen = useRef(false);

  const groups = useMemo(() => groupResults(query), [query]);
  const flat = useMemo(() => groups.flatMap((group) => group.items), [groups]);
  const safeIndex = flat.length ? Math.min(activeIndex, flat.length - 1) : -1;
  const activeItem = safeIndex >= 0 ? flat[safeIndex] : null;

  /** Close and hand focus back unless a navigation owns it (route focus wins). */
  const close = useCallback(
    (restoreFocus: boolean, target?: HTMLElement | null) => {
      const focusTarget = target ?? (restoreFocus ? openerRef.current : null);
      openerRef.current = null;
      onOpenChange(false);
      if (focusTarget) window.requestAnimationFrame(() => focusTarget.focus());
    },
    [onOpenChange],
  );

  // Shortcuts: Ctrl/Cmd+K always toggles; `/` opens only outside form fields.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        if (open) close(true);
        else onOpenChange(true);
        return;
      }

      if (open && event.key === 'Escape') {
        event.preventDefault();
        close(true);
        return;
      }

      if (open || event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) {
        return;
      }
      if (isEditable(event.target)) return;

      event.preventDefault();
      onOpenChange(true);
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, close, onOpenChange]);

  // Capture the opener once per open, lock the page and focus the field.
  useEffect(() => {
    if (open && !wasOpen.current) {
      const current = document.activeElement;
      openerRef.current =
        current instanceof HTMLElement && current !== document.body
          ? current
          : document.querySelector<HTMLElement>('.palette-trigger');
      setQuery('');
      setActiveIndex(0);
    }
    wasOpen.current = open;

    if (!open) return;

    const body = document.body;
    const root = document.documentElement;
    const previousOverflow = body.style.overflow;
    const previousGutter = root.style.scrollbarGutter;

    body.style.overflow = 'hidden';
    // Reserve the scrollbar gutter so locking does not shift the page.
    root.style.scrollbarGutter = 'stable';
    inputRef.current?.focus();

    return () => {
      body.style.overflow = previousOverflow;
      root.style.scrollbarGutter = previousGutter;
    };
  }, [open]);

  // Keep the highlighted row visible inside the dialog's own scroller.
  useEffect(() => {
    if (!open || !activeItem) return;
    document.getElementById(optionId(activeItem))?.scrollIntoView({ block: 'nearest' });
  }, [open, activeItem]);

  const move = (delta: number) => {
    if (!flat.length) return;
    setActiveIndex((safeIndex + delta + flat.length) % flat.length);
  };

  const activate = (event: MouseEvent<HTMLAnchorElement>, item: PaletteItem) => {
    // Modified clicks keep the browser's native new-tab behaviour.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;

    if (item.kind === 'section') {
      event.preventDefault();
      const id = sectionIdFromPath(item.href);
      const tile = id ? document.querySelector<HTMLElement>(`#header [data-section="${id}"]`) : null;
      // A header tile click keeps focus there; hidden tiles fall back to the opener.
      close(false, tile && tile.offsetParent !== null ? tile : openerRef.current);
      onNavigate(event, item.href);
      return;
    }

    if (item.kind === 'case') {
      event.preventDefault();
      close(false);
      onCaseStudyNavigate(event, item.href);
      return;
    }

    if (item.kind === 'theme') {
      event.preventDefault();
      // Reuse the toggle's state machine instead of duplicating it.
      document.querySelector<HTMLButtonElement>('.theme-btn')?.click();
      close(true);
      return;
    }

    // Résumé download / mailto: let the browser act, then close.
    close(true);
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Tab') {
      // Only the search field is tabbable; keep the focus ring in the dialog.
      event.preventDefault();
      inputRef.current?.focus();
      return;
    }

    if (event.target !== inputRef.current) return;

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      move(event.key === 'ArrowDown' ? 1 : -1);
      return;
    }

    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      if (flat.length) setActiveIndex(event.key === 'Home' ? 0 : flat.length - 1);
      return;
    }

    if (event.key === 'Enter') {
      if (!activeItem) return;
      event.preventDefault();
      document.getElementById(optionId(activeItem))?.click();
    }
  };

  if (!open) return null;

  return (
    <div
      className="palette-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close(true);
      }}
    >
      <div
        className="palette-panel"
        role="dialog"
        aria-modal="true"
        aria-label="command palette"
        onKeyDown={handleKeyDown}
      >
        <div className="palette-search">
          <span className="palette-prompt" aria-hidden="true">
            //
          </span>
          <input
            ref={inputRef}
            id="palette-input"
            className="palette-input"
            type="text"
            role="combobox"
            aria-label="search commands"
            aria-autocomplete="list"
            aria-expanded="true"
            aria-controls={LIST_ID}
            aria-activedescendant={activeItem ? optionId(activeItem) : undefined}
            placeholder="search commands…"
            autoComplete="off"
            spellCheck={false}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
            }}
          />
        </div>

        <div id={LIST_ID} className="palette-list" role="listbox" aria-label="commands">
          {groups.map((group) => (
            <div
              className="palette-group"
              role="group"
              aria-labelledby={`palette-group-${group.id.replace(' ', '-')}`}
              key={group.id}
            >
              <div
                className="palette-group-label"
                id={`palette-group-${group.id.replace(' ', '-')}`}
              >
                // {group.label}
              </div>

              {group.items.map((item) => {
                const position = flat.indexOf(item);
                return (
                  <a
                    key={item.id}
                    id={optionId(item)}
                    className="palette-row"
                    role="option"
                    aria-selected={position === safeIndex}
                    tabIndex={-1}
                    href={anchorHref(item)}
                    download={item.download || undefined}
                    onMouseEnter={() => setActiveIndex(position)}
                    onClick={(event) => activate(event, item)}
                  >
                    <span className="palette-row-label">{item.label}</span>
                    {item.note ? <span className="palette-row-note">{item.note}</span> : null}
                  </a>
                );
              })}
            </div>
          ))}

          {!flat.length ? (
            <p className="palette-empty" role="status">
              no matches for “{query}”
            </p>
          ) : null}
        </div>

        <div className="palette-foot" aria-hidden="true">
          <span>↑↓ move</span>
          <span>↵ open</span>
          <span>esc close</span>
        </div>
      </div>
    </div>
  );
}
