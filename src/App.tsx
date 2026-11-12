import './styles/main.css';

import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import type { MouseEvent } from 'react';
import { HashRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { Header } from './components/Header';
import { IconSprite } from './components/IconSprite';
import { Loader } from './components/Loader';
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
    if (isMainPath(location.pathname)) return;

    window.scrollTo(0, 0);
    // A route swap replaces the focused control: move keyboard focus into the
    // new page. Section paths skip this so the clicked tile keeps focus.
    document.getElementById('main')?.focus({ preventScroll: true });
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
  const navigate = useNavigate();
  const location = useLocation();

  /** Case-study links keep the outgoing route transition. */
  const handleTransitionNavigate = useCallback(
    (e: MouseEvent, to: string) => {
      navigateWithTransition(e, to, {
        currentPath: location.pathname,
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

      if (!isMainPath(location.pathname)) {
        // Arriving from a case study or the error page: MainPage's location
        // effect lands instantly at the target section.
        navigate(to);
        return;
      }

      const currentHash = window.location.hash;
      const pathDiffers = currentHash !== `#${to}`;

      if (pathDiffers) {
        markSectionScroll(to);
        navigate(to);
      }

      scrollToSection(id, scrollBehavior());
    },
    [location.pathname, navigate],
  );

  return (
    <>
      <IconSprite />
      <Loader onDone={() => setReady(true)} />
      <RouteEffects />
      <Header ready={ready} onNavigate={handleSectionNavigate} />

      {ready ? (
        <main id="main" tabIndex={-1}>
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
