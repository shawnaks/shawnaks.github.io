import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import {
  BALL_RADIUS,
  COURT,
  DIFFICULTIES,
  DIFFICULTY_CONFIG,
  PADDLE,
  WIN_MESSAGES,
  createGame,
  stepGame,
} from '../lib/pong';
import type { Difficulty, PongState } from '../lib/pong';
import '../styles/pong.css';

type Hud = Pick<PongState, 'leftScore' | 'rightScore' | 'status' | 'winner'>;

const INITIAL_HUD: Hud = { leftScore: 0, rightScore: 0, status: 'serve', winner: null };

/* Original palette, straight from pong.py. */
const COURT_COLOR = 'rgb(22, 77, 158)';
const LIME = 'rgb(81, 255, 46)';
const RED = 'rgb(181, 18, 18)';
const WHITE = '#ffffff';
const BLACK = '#000000';
const SCORE_FONT = '700 58px "Martian Mono", ui-monospace, monospace';

function drawCourt(ctx: CanvasRenderingContext2D, state: PongState | null): void {
  const scale = ctx.canvas.width / COURT.width;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.clearRect(0, 0, COURT.width, COURT.height);

  ctx.fillStyle = COURT_COLOR;
  ctx.fillRect(0, 0, COURT.width, COURT.height);

  // The original dashes: every other 33px slot, 25px tall, 5px wide.
  ctx.fillStyle = LIME;
  for (let y = 2; y < COURT.height; y += 2 * Math.floor(COURT.height / 15)) {
    ctx.fillRect(COURT.width / 2 - PADDLE.width / 2, y, 5, 25);
  }

  const player = state?.player ?? {
    x: PADDLE.inset,
    y: (COURT.height - PADDLE.height) / 2,
    width: PADDLE.width,
    height: PADDLE.height,
  };
  const opponent = state?.opponent ?? {
    x: COURT.width - PADDLE.inset - PADDLE.width,
    y: (COURT.height - PADDLE.height) / 2,
    width: PADDLE.width,
    height: PADDLE.height,
  };

  ctx.fillStyle = RED;
  ctx.fillRect(player.x, player.y, player.width, player.height);
  ctx.fillRect(opponent.x, opponent.y, opponent.width, opponent.height);

  ctx.fillStyle = WHITE;
  ctx.beginPath();
  ctx.arc(
    state?.ball.x ?? COURT.width / 2,
    state?.ball.y ?? COURT.height / 2,
    state?.ball.radius ?? BALL_RADIUS,
    0,
    Math.PI * 2,
  );
  ctx.fill();

  ctx.fillStyle = BLACK;
  ctx.font = SCORE_FONT;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(String(state?.leftScore ?? 0), COURT.width / 4, 25);
  ctx.fillText(String(state?.rightScore ?? 0), (COURT.width / 4) * 3, 25);
}

function hudFrom(state: PongState): Hud {
  return {
    leftScore: state.leftScore,
    rightScore: state.rightScore,
    status: state.status,
    winner: state.winner,
  };
}

function sameHud(a: Hud, b: Hud): boolean {
  return (
    a.leftScore === b.leftScore &&
    a.rightScore === b.rightScore &&
    a.status === b.status &&
    a.winner === b.winner
  );
}

export function PongGame() {
  const [started, setStarted] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [paused, setPaused] = useState(false);
  const [inView, setInView] = useState(true);
  const [tabHidden, setTabHidden] = useState(false);
  const [hud, setHud] = useState<Hud>(INITIAL_HUD);

  const panelRef = useRef<HTMLElement>(null);
  const gameRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pauseRef = useRef<HTMLButtonElement>(null);
  const selectedDifficultyRef = useRef<HTMLButtonElement>(null);
  const stateRef = useRef<PongState | null>(null);
  const inputRef = useRef<{ up: boolean; down: boolean; targetY: number | null }>({
    up: false,
    down: false,
    targetY: null,
  });
  const dragRef = useRef<number | null>(null);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx) drawCourt(ctx, stateRef.current);
  }, []);

  const startGame = useCallback((nextDifficulty: Difficulty) => {
    stateRef.current = createGame(nextDifficulty);
    inputRef.current = { up: false, down: false, targetY: null };
    dragRef.current = null;
    setDifficulty(nextDifficulty);
    setHud(INITIAL_HUD);
    setPaused(false);
    setInView(true);
    setStarted(true);
    requestAnimationFrame(() => gameRef.current?.focus({ preventScroll: true }));
  }, []);

  const pauseGame = useCallback(() => {
    inputRef.current = { up: false, down: false, targetY: null };
    dragRef.current = null;
    setPaused(true);
    requestAnimationFrame(() => pauseRef.current?.focus({ preventScroll: true }));
  }, []);

  const resumeGame = useCallback(() => {
    setPaused(false);
    requestAnimationFrame(() => gameRef.current?.focus({ preventScroll: true }));
  }, []);

  const backToMenu = useCallback(() => {
    stateRef.current = null;
    inputRef.current = { up: false, down: false, targetY: null };
    dragRef.current = null;
    setStarted(false);
    setPaused(false);
    setHud(INITIAL_HUD);
    requestAnimationFrame(() => selectedDifficultyRef.current?.focus({ preventScroll: true }));
  }, []);

  // Size the backing store once on mount; CSS keeps the 700:500 frame.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = COURT.width * dpr;
    canvas.height = COURT.height * dpr;
    render();

    let alive = true;
    document.fonts?.ready.then(() => {
      if (alive) render();
    });

    return () => {
      alive = false;
    };
  }, [render]);

  // Menu and paused frames are static; no loop while they are on screen.
  useEffect(() => {
    if (!started) render();
  }, [started, render]);

  useEffect(() => {
    const update = () => setTabHidden(document.hidden);
    update();
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);

  useEffect(() => {
    if (!started) return;

    const node = panelRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[entries.length - 1];
        if (entry) setInView(entry.isIntersecting);
      },
      { threshold: 0 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [started]);

  // Keyboard interception only while the game region owns focus and the round is live.
  useEffect(() => {
    if (!started) return;

    const ownsFocus = () =>
      !!gameRef.current && gameRef.current.contains(document.activeElement);
    const isLive = () => !paused && hud.status !== 'over';

    const onKeyDown = (event: KeyboardEvent) => {
      if (!isLive() || !ownsFocus()) return;

      switch (event.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          event.preventDefault();
          inputRef.current.up = true;
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          event.preventDefault();
          inputRef.current.down = true;
          break;
        case ' ':
        case 'Spacebar':
          event.preventDefault();
          pauseGame();
          break;
        case 'Escape':
        case 'p':
        case 'P':
          event.preventDefault();
          pauseGame();
          break;
        default:
          break;
      }
    };

    const onKeyUp = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          inputRef.current.up = false;
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          inputRef.current.down = false;
          break;
        default:
          break;
      }
    };

    const release = () => {
      inputRef.current.up = false;
      inputRef.current.down = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', release);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', release);
    };
  }, [started, paused, hud.status, pauseGame]);

  // The one animation loop, alive only while actually playing and visible.
  useEffect(() => {
    if (!started || paused || hud.status === 'over' || !inView || tabHidden) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    let frame = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      const state = stateRef.current;
      if (!state) return;

      const input = inputRef.current;
      const next = stepGame(state, dt, {
        up: input.up,
        down: input.down,
        targetY: input.targetY,
      });
      stateRef.current = next;
      drawCourt(ctx, next);

      const nextHud = hudFrom(next);
      setHud((prev) => (sameHud(prev, nextHud) ? prev : nextHud));

      if (next.status !== 'over') frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [started, paused, hud.status, inView, tabHidden]);

  const pointerTarget = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.height === 0) return;
    inputRef.current.targetY = ((event.clientY - rect.top) / rect.height) * COURT.height;
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!started || paused || hud.status === 'over') return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = event.pointerId;
    pointerTarget(event);
    gameRef.current?.focus({ preventScroll: true });
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (dragRef.current !== event.pointerId) return;
    pointerTarget(event);
  };

  const endDrag = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (dragRef.current !== event.pointerId) return;
    dragRef.current = null;
    inputRef.current.targetY = null;
  };

  const difficultyLabel = DIFFICULTY_CONFIG[difficulty].label;

  return (
    <section
      ref={panelRef}
      className="pong-embed anim"
      aria-labelledby="pong-embed-title"
      aria-describedby="pong-embed-instructions"
    >
      <div className="pong-head">
        <p className="pong-label" id="pong-embed-title">
          // play it
        </p>
        <p className="pong-blurb" id="pong-embed-instructions">
          Arrow keys or W/S; drag on touch. First to 10.
        </p>
      </div>

      <div className="pong-stage">
        <canvas
          ref={canvasRef}
          className="pong-canvas"
          width={COURT.width}
          height={COURT.height}
          aria-hidden="true"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onLostPointerCapture={endDrag}
        />

        {hud.status === 'over' && hud.winner && (
          <div className="pong-overlay">
            <p className="pong-result" role="status">
              {WIN_MESSAGES[hud.winner]}
            </p>
            <p className="pong-result-score">
              {hud.leftScore} &mdash; {hud.rightScore}
            </p>
            <div className="pong-overlay-actions">
              <button
                type="button"
                className="pong-btn pong-btn--primary"
                onClick={() => startGame(difficulty)}
              >
                Play again
              </button>
              <button type="button" className="pong-btn" onClick={backToMenu}>
                Change difficulty
              </button>
            </div>
          </div>
        )}

        {started && paused && hud.status !== 'over' && (
          <div className="pong-overlay pong-overlay--paused" aria-hidden="true">
            <p className="pong-paused">Paused</p>
          </div>
        )}
      </div>

      {!started ? (
        <div className="pong-menu">
          <div className="pong-difficulty" role="group" aria-label="Difficulty">
            {DIFFICULTIES.map((id) => (
              <button
                key={id}
                ref={difficulty === id ? selectedDifficultyRef : undefined}
                type="button"
                className="pong-btn pong-chip"
                aria-pressed={difficulty === id}
                onClick={() => setDifficulty(id)}
              >
                {DIFFICULTY_CONFIG[id].label}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="pong-btn pong-btn--primary"
            onClick={() => startGame(difficulty)}
          >
            Start
          </button>
        </div>
      ) : (
        <div
          className="pong-dock"
          ref={gameRef}
          role="group"
          aria-label="Pong game"
          aria-describedby="pong-embed-instructions"
          tabIndex={-1}
        >
          <p className="pong-score" aria-hidden="true">
            <span>{hud.leftScore}</span>
            <span className="pong-score-sep">&ndash;</span>
            <span>{hud.rightScore}</span>
          </p>
          <p className="sr-only" role="status">
            Score {hud.leftScore} to {hud.rightScore}
          </p>

          <div className="pong-controls">
            <button
              ref={pauseRef}
              type="button"
              className="pong-btn"
              onClick={paused ? resumeGame : pauseGame}
            >
              {paused ? 'Resume' : 'Pause'}
            </button>
            <button
              type="button"
              className="pong-btn"
              onClick={() => startGame(difficulty)}
            >
              Restart
            </button>
            <span className="pong-mode">{difficultyLabel}</span>
          </div>
        </div>
      )}
    </section>
  );
}
