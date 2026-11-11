import './styles/main.css';

import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import type { MouseEvent } from 'react';
import { HashRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { Header } from './components/Header';
import { IconSprite } from './components/IconSprite';
import { Loader } from './components/Loader';
import { MenuOverlay } from './components/MenuOverlay';
import { prefersReducedMotion } from './hooks/useScramble';
import { markSectionScroll, scrollBehavior, scrollToSection } from './lib/scroll';
import { isCaseStudyPath, isMainPath, sectionIdFromPath } from './lib/sections';
import type { SectionNavHandler } from './lib/sections';
import { endTransition, navigateWithTransition } from './lib/transition';
import type { NavigateHandler } from './lib/transition';
import { CaseStudy } from './routes/CaseStudy';
import { ErrorPage } from './routes/ErrorPage';
import { MainPage } from './routes/MainPage';

/** Page title + scroll reset for routes that are not the stacked document. */
function RouteEffects() {
  const location = useLocation();

  useEffect(() => {
    if (isMainPath(location.pathname)) {
      document.title = 'Shawnak Samaddar // hello world';
    } else if (isCaseStudyPath(location.pathname)) {
      document.title = 'Shawnak Samaddar // case study';
    } else {
      document.title = 'Shawnak Samaddar // error';
    }
  }, [location.pathname]);

  useLayoutEffect(() => {
    // MainPage owns its own (instant) section landing.
    if (!isMainPath(location.pathname)) window.scrollTo(0, 0);
  }, [location.pathname]);

  useEffect(() => {
    // A history move before the out phase finished wins over the queued swap.
    endTransition();
  }, [location.pathname]);

  return null;
}

type MainRoutesProps = {
  onSectionNavigate: SectionNavHandler;
  onCaseStudyNavigate: NavigateHandler;
};

/** Section paths render the one stacked MainPage; anything else is the 404. */
function MainRoutes({ onSectionNavigate, onCaseStudyNavigate }: MainRoutesProps) {
  const { pathname } = useLocation();

  if (isMainPath(pathname)) {
    return (
      <MainPage
        onNavigate={onSectionNavigate}
        onCaseStudyNavigate={onCaseStudyNavigate}
      />
    );
  }

  return <ErrorPage onNavigate={onCaseStudyNavigate} />;
}

function Shell() {
  const [ready, setReady] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  /** Case-study links keep the outgoing route transition. */
  const handleTransitionNavigate = useCallback(
    (e: MouseEvent, to: string) => {
      navigateWithTransition(e, to, {
        currentPath: location.pathname,
        closeMenu: () => setMenuOpen(false),
        navigate,
      });
    },
    [location.pathname, navigate],
  );

  /**
   * Every section control scrolls instead of routing. A history entry is
   * pushed only when the hash points at another section; passive scrolling
   * has already kept the hash current with replaceState.
   */
  const handleSectionNavigate = useCallback(
    (_event: MouseEvent, to: string) => {
      const id = sectionIdFromPath(to);
      if (!id) return;

      const onMain = isMainPath(location.pathname);

      const closeMenu = () => {
        if (!menuOpen) return;
        setMenuOpen(false);
        // The overlay locks body scrolling via `body.menu-open`; releasing it
        // now lets any following scroll start immediately.
        document.body.classList.remove('menu-open');
      };

      if (!onMain) {
        // Arriving from a case study or the error page: MainPage's location
        // effect lands instantly at the target section.
        closeMenu();
        navigate(to);
        return;
      }

      const currentHash = window.location.hash;
      const pathDiffers = currentHash !== `#${to}`;

      if (pathDiffers) {
        markSectionScroll(to);
        navigate(to);
      }

      const run = () => scrollToSection(id, scrollBehavior());

      if (menuOpen) {
        closeMenu();
        // The overlay closes first (0.4s transform); the scroll waits for it.
        const delay = prefersReducedMotion() ? 0 : 400;
        window.setTimeout(run, delay);
      } else {
        run();
      }
    },
    [location.pathname, menuOpen, navigate],
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
        onNavigate={handleSectionNavigate}
      />
      <MenuOverlay
        menuOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        onNavigate={handleSectionNavigate}
      />

      {ready ? (
        <main id="main">
          <Routes>
            <Route
              path="/case-study/:slug"
              element={<CaseStudy onNavigate={handleTransitionNavigate} />}
            />
            <Route
              path="*"
              element={
                <MainRoutes
                  onSectionNavigate={handleSectionNavigate}
                  onCaseStudyNavigate={handleTransitionNavigate}
                />
              }
            />
          </Routes>
        </main>
      ) : null}
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
