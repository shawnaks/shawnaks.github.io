/**
 * Pure Pong engine: the mechanics of `pong.py` (pygame) without a DOM.
 *
 * The original moves in pixels per 60 Hz frame. Speeds here keep those values
 * and `stepGame` scales them by `dt * 60`, so a 1/60 s step is one original
 * frame and the court stays 700 x 500 at any refresh rate.
 */

export const COURT = { width: 700, height: 500 } as const;
export const PADDLE = { width: 20, height: 100, inset: 10 } as const;
export const BALL_RADIUS = 7;
export const WINNING_SCORE = 10;
/** Non-blocking serve pause, replacing the original's 3 s `pygame.time.delay`. */
export const SERVE_DELAY = 1.2;
/** Largest simulation step, so a stalled frame cannot tunnel the ball. */
export const MAX_STEP = 1 / 30;

const FRAMES_PER_SECOND = 60;
const PLAYER_SPEED_RATIO = 0.8;

export type Difficulty = 'easy' | 'medium' | 'hard' | 'very-hard' | 'bot';
export type Side = 'left' | 'right';
export type Winner = Side | 'bot';
export type GameStatus = 'serve' | 'playing' | 'over';

export type DifficultyConfig = {
  label: string;
  /** Original pixels per 60 Hz frame. */
  ballSpeed: number;
  /** 0.8 x ball speed, as the original paddle class does. */
  playerSpeed: number;
  bot: boolean;
};

export const DIFFICULTIES: readonly Difficulty[] = [
  'easy',
  'medium',
  'hard',
  'very-hard',
  'bot',
];

export const DIFFICULTY_CONFIG: Record<Difficulty, DifficultyConfig> = {
  easy: { label: 'Easy', ballSpeed: 2, playerSpeed: PLAYER_SPEED_RATIO * 2, bot: false },
  medium: { label: 'Medium', ballSpeed: 7, playerSpeed: PLAYER_SPEED_RATIO * 7, bot: false },
  hard: { label: 'Hard', ballSpeed: 9, playerSpeed: PLAYER_SPEED_RATIO * 9, bot: false },
  'very-hard': {
    label: 'Very Hard',
    ballSpeed: 13,
    playerSpeed: PLAYER_SPEED_RATIO * 13,
    bot: false,
  },
  bot: { label: 'Bot', ballSpeed: 9, playerSpeed: PLAYER_SPEED_RATIO * 9, bot: true },
};

export const WIN_MESSAGES: Record<Winner, string> = {
  left: 'Left player won!',
  right: 'Right player won!',
  bot: 'The bot won!',
};

export type PaddleState = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type BallState = {
  x: number;
  y: number;
  radius: number;
  xvel: number;
  yvel: number;
};

export type PongState = {
  difficulty: Difficulty;
  ball: BallState;
  player: PaddleState;
  opponent: PaddleState;
  leftScore: number;
  rightScore: number;
  status: GameStatus;
  serveTimer: number;
  /** Which way the next serve travels: 1 right, -1 left. */
  serveDirection: 1 | -1;
  winner: Winner | null;
};

export type PongInput = {
  up?: boolean;
  down?: boolean;
  /** Court-space centre for the player paddle (pointer drag). Wins over up/down. */
  targetY?: number | null;
};

export function clampPaddleY(y: number): number {
  return Math.min(Math.max(y, 0), COURT.height - PADDLE.height);
}

export function createGame(difficulty: Difficulty = 'medium'): PongState {
  const cfg = DIFFICULTY_CONFIG[difficulty];

  return {
    difficulty,
    ball: {
      x: COURT.width / 2,
      y: COURT.height / 2,
      radius: BALL_RADIUS,
      xvel: cfg.ballSpeed,
      yvel: 0,
    },
    player: {
      x: PADDLE.inset,
      y: (COURT.height - PADDLE.height) / 2,
      width: PADDLE.width,
      height: PADDLE.height,
    },
    opponent: {
      x: COURT.width - PADDLE.inset - PADDLE.width,
      y: (COURT.height - PADDLE.height) / 2,
      width: PADDLE.width,
      height: PADDLE.height,
    },
    leftScore: 0,
    rightScore: 0,
    status: 'serve',
    serveTimer: SERVE_DELAY,
    serveDirection: 1,
    winner: null,
  };
}

/** One deterministic simulation step. Never mutates `state`. */
export function stepGame(state: PongState, dt: number, input: PongInput = {}): PongState {
  if (state.status === 'over') return state;

  const cfg = DIFFICULTY_CONFIG[state.difficulty];
  const frames = Math.min(Math.max(Number.isFinite(dt) ? dt : 0, 0), MAX_STEP) *
    FRAMES_PER_SECOND;

  const next: PongState = {
    ...state,
    ball: { ...state.ball },
    player: { ...state.player },
    opponent: { ...state.opponent },
  };

  movePlayer(next, cfg.playerSpeed, frames, input);

  if (cfg.bot) {
    next.opponent.y = clampPaddleY(next.ball.y - next.opponent.height / 2);
  }

  if (next.status === 'serve') {
    next.serveTimer = Math.max(0, next.serveTimer - dt);
    if (next.serveTimer === 0) {
      next.status = 'playing';
      next.ball.xvel = cfg.ballSpeed * next.serveDirection;
      next.ball.yvel = 0;
    }
  }

  if (next.status === 'playing') {
    next.ball.x += next.ball.xvel * frames;
    next.ball.y += next.ball.yvel * frames;

    bounceOffWalls(next.ball);
    bounceOffPaddles(next, cfg.ballSpeed);

    if (next.ball.x < 0) scorePoint(next, 'right');
    else if (next.ball.x > COURT.width) scorePoint(next, 'left');
  }

  return next;
}

function movePlayer(
  state: PongState,
  speed: number,
  frames: number,
  input: PongInput,
): void {
  if (input.targetY !== undefined && input.targetY !== null) {
    state.player.y = clampPaddleY(input.targetY - state.player.height / 2);
    return;
  }

  let dy = 0;
  if (input.up) dy -= speed * frames;
  if (input.down) dy += speed * frames;
  state.player.y = clampPaddleY(state.player.y + dy);
}

function bounceOffWalls(ball: BallState): void {
  if (ball.y - ball.radius <= 0) {
    ball.y = ball.radius;
    ball.yvel = Math.abs(ball.yvel);
  } else if (ball.y + ball.radius >= COURT.height) {
    ball.y = COURT.height - ball.radius;
    ball.yvel = -Math.abs(ball.yvel);
  }
}

function bounceOffPaddles(state: PongState, ballSpeed: number): void {
  const { ball, player, opponent } = state;

  if (ball.xvel < 0) {
    if (hitsPaddle(ball, player)) {
      ball.xvel *= -1;
      ball.x = player.x + player.width + ball.radius;
      setBounceVelocity(ball, player, ballSpeed);
    }
  } else if (ball.xvel > 0) {
    if (hitsPaddle(ball, opponent)) {
      ball.xvel *= -1;
      ball.x = opponent.x - ball.radius;
      setBounceVelocity(ball, opponent, ballSpeed);
    }
  }
}

function hitsPaddle(ball: BallState, paddle: PaddleState): boolean {
  const withinY = ball.y >= paddle.y && ball.y <= paddle.y + paddle.height;
  const withinX =
    ball.x + ball.radius >= paddle.x && ball.x - ball.radius <= paddle.x + paddle.width;
  return withinY && withinX;
}

/** Original angle model: edge hits deflect hardest, centre hits go straight. */
function setBounceVelocity(ball: BallState, paddle: PaddleState, ballSpeed: number): void {
  const middleY = paddle.y + paddle.height / 2;
  const reduction = paddle.height / 2 / ballSpeed;
  const yvel = -(middleY - ball.y) / reduction;
  ball.yvel = yvel === 0 ? 0 : yvel;
}

function scorePoint(state: PongState, side: Side): void {
  if (side === 'right') state.rightScore += 1;
  else state.leftScore += 1;

  const cfg = DIFFICULTY_CONFIG[state.difficulty];
  state.serveDirection = state.serveDirection === 1 ? -1 : 1;
  state.ball.x = COURT.width / 2;
  state.ball.y = COURT.height / 2;
  state.ball.xvel = cfg.ballSpeed * state.serveDirection;
  state.ball.yvel = 0;
  state.player.y = (COURT.height - state.player.height) / 2;
  state.opponent.y = (COURT.height - state.opponent.height) / 2;
  state.serveTimer = SERVE_DELAY;

  if (state.leftScore >= WINNING_SCORE) {
    state.status = 'over';
    state.winner = 'left';
  } else if (state.rightScore >= WINNING_SCORE) {
    state.status = 'over';
    state.winner = cfg.bot ? 'bot' : 'right';
  } else {
    state.status = 'serve';
  }
}
