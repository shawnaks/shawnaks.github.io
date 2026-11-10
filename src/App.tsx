import './styles/main.css';

import { useCallback, useEffect, useState } from 'react';
import type { MouseEvent } from 'react';
import {
  HashRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { Header } from './components/Header';
import { IconSprite } from './components/IconSprite';
import { Loader } from './components/Loader';
import { MenuOverlay } from './components/MenuOverlay';
import {
  CLONE_REMOVE_MS,
  FLIGHT_MS,
  NO_CLONE_SETTLE_MS,
  cancelOutPhase,
  consumeFlight,
  endTransition,
  isTransitioning,
  navigateWithTransition,
  normalizePath,
} from './lib/transition';
import { About } from './routes/About';
import { CaseStudy } from './routes/CaseStudy';
import { Contact } from './routes/Contact';
import { ErrorPage } from './routes/ErrorPage';
import { Experience } from './routes/Experience';
import { Hello } from './routes/Hello';
import { Projects } from './routes/Projects';

/** Maps a hash pathname to the slug used in `document.title`. */
function pageName(pathname: string): string {
  const normalized = pathname.endsWith('/') ? pathname : `${pathname}/`;

  switch (normalized) {
    case '/':
    case '/hello/':
      return 'hello';
    case '/about/':
      return 'about';
    case '/experience/':
      return 'experience';
    case '/projects/':
      return 'projects';
    case '/contact/':
      return 'contact';
    default:
      return 'error';
  }
}

/** `document.title` + scroll reset on every route change. */
function RouteEffects() {
  const location = useLocation();

  useEffect(() => {
    const name = pageName(location.pathname);
    document.title = `Shawnak Samaddar // ${name === 'hello' ? 'hello world' : name}`;
  }, [location.pathname]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return null;
}

/**
 * Landing half of the tile transition: the clone was pinned at the clicked
 * tile's rect by `navigateWithTransition`; once the new page commits, measure
 * its title and collapse the clone into the blue spine.
 */
function LandingTransition() {
  const location = useLocation();

  useEffect(() => {
    // A route change before the queued swap wins (e.g. browser back/forward).
    cancelOutPhase();

    const pending = consumeFlight();

    if (!pending) {
      if (!isTransitioning()) return;
      let released = false;
      const timer = window.setTimeout(() => {
        released = true;
        endTransition();
      }, NO_CLONE_SETTLE_MS);
      // A second route change during the settle window (history navigation,
      // programmatic hash change) cancels this timer; release the guard on
      // cleanup instead of leaving every later click blocked.
      return () => {
        window.clearTimeout(timer);
        if (!released) endTransition();
      };
    }

    const { clone } = pending;

    if (normalizePath(location.pathname) !== pending.to) {
      clone.remove();
      endTransition();
      return;
    }

    const page = document.querySelector<HTMLElement>('#main .section.is-active');
    const title = page?.querySelector<HTMLElement>('.section-title, .hero-title');

    if (!title) {
      clone.remove();
      endTransition();
      return;
    }

    const rect = title.getBoundingClientRect();
    // `.anim` starts translated 50px down — measure where it settles.
    let left = rect.left;
    let top = rect.top;
    const matrix = getComputedStyle(title).transform.match(/^matrix\(([^)]+)\)$/);
    if (matrix) {
      const values = matrix[1].split(',').map(Number);
      left -= values[4] ?? 0;
      top -= values[5] ?? 0;
    }

    let flyRaf = 0;
    let removeTimer = 0;
    let cleanupTimer = 0;
    let completed = false;

    const raf = requestAnimationFrame(() => {
      flyRaf = requestAnimationFrame(() => {
        clone.classList.add('is-flying');
        clone.style.left = `${left}px`;
        clone.style.top = `${top}px`;
        clone.style.width = '15px';
        clone.style.height = `${rect.height}px`;
        // `.element-box` is border-box with horizontal padding; without this the
        // clone can never render narrower than padding + borders (30-36px).
        clone.style.paddingLeft = '0';
        clone.style.paddingRight = '0';
        clone.style.borderLeftWidth = '0';
        clone.style.borderRightWidth = '0';

        removeTimer = window.setTimeout(() => {
          clone.classList.add('is-removing');
          cleanupTimer = window.setTimeout(() => {
            clone.remove();
            completed = true;
            endTransition();
          }, CLONE_REMOVE_MS);
        }, FLIGHT_MS);
      });
    });

    return () => {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(flyRaf);
      window.clearTimeout(removeTimer);
      window.clearTimeout(cleanupTimer);
      // Never leave a stray clone behind if this flight was interrupted.
      if (clone.isConnected) clone.remove();
      // Only release the guard if this flight never finished; a completed
      // effect must not clear the flag for a transition that started later.
      if (!completed) endTransition();
    };
  }, [location.pathname]);

  return null;
}

function Shell() {
  const [ready, setReady] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavigate = useCallback(
    (e: MouseEvent, to: string) => {
      navigateWithTransition(e, to, {
        currentPath: location.pathname,
        closeMenu: () => setMenuOpen(false),
        navigate,
      });
    },
    [location.pathname, navigate],
  );

  return (
    <>
      <IconSprite />
      <Loader onDone={() => setReady(true)} />
      <RouteEffects />
      <Header
        ready={ready}
        menuOpen={menuOpen}
        onMenuToggle={() => setMenuOpen((open) => !open)}
        onNavigate={handleNavigate}
      />
      <MenuOverlay
        menuOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        onNavigate={handleNavigate}
      />

      {ready ? (
        <main id="main">
          <Routes>
            <Route path="/" element={<Navigate to="/hello/" replace />} />
            <Route path="/hello/" element={<Hello onNavigate={handleNavigate} />} />
            <Route path="/about/" element={<About onNavigate={handleNavigate} />} />
            <Route path="/experience/" element={<Experience onNavigate={handleNavigate} />} />
            <Route path="/projects/" element={<Projects onNavigate={handleNavigate} />} />
            <Route path="/case-study/:slug" element={<CaseStudy onNavigate={handleNavigate} />} />
            <Route path="/contact/" element={<Contact onNavigate={handleNavigate} />} />
            <Route path="*" element={<ErrorPage onNavigate={handleNavigate} />} />
          </Routes>
        </main>
      ) : null}

      <LandingTransition />
    </>
  );
}

export default function App() {
  return (
    <HashRouter>
      <Shell />
    </HashRouter>
  );
}
