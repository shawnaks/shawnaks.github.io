import { describe, expect, it } from 'vitest';
import {
  BALL_RADIUS,
  COURT,
  DIFFICULTIES,
  DIFFICULTY_CONFIG,
  PADDLE,
  SERVE_DELAY,
  WINNING_SCORE,
  WIN_MESSAGES,
  createGame,
  stepGame,
} from './pong';
import type { Difficulty, PongState } from './pong';

const FRAME = 1 / 60;

/** A live round with the ball parked at the centre unless a test moves it. */
function playing(difficulty: Difficulty, patch: Partial<PongState> = {}): PongState {
  const base = createGame(difficulty);
  return { ...base, status: 'playing', serveTimer: 0, ...patch };
}

describe('court and difficulty configuration', () => {
  it('keeps the original court, paddle and ball dimensions', () => {
    expect(COURT).toEqual({ width: 700, height: 500 });
    expect(PADDLE).toEqual({ width: 20, height: 100, inset: 10 });
    expect(BALL_RADIUS).toBe(7);
    expect(WINNING_SCORE).toBe(10);
  });

  it('offers the five difficulty labels in order', () => {
    expect(DIFFICULTIES).toEqual(['easy', 'medium', 'hard', 'very-hard', 'bot']);
    expect(DIFFICULTIES.map((id) => DIFFICULTY_CONFIG[id].label)).toEqual([
      'Easy',
      'Medium',
      'Hard',
      'Very Hard',
      'Bot',
    ]);
  });

  it('uses the original ball speeds and 0.8 x player speeds', () => {
    const speeds = {
      easy: [2, 1.6],
      medium: [7, 5.6],
      hard: [9, 7.2],
      'very-hard': [13, 10.4],
      bot: [9, 7.2],
    } as const;
    const tracking = {
      easy: 0.4,
      medium: 0.55,
      hard: 0.7,
      'very-hard': 0.85,
      bot: 0,
    } as const;

    for (const difficulty of DIFFICULTIES) {
      const [ballSpeed, playerSpeed] = speeds[difficulty];
      expect(DIFFICULTY_CONFIG[difficulty].ballSpeed, difficulty).toBe(ballSpeed);
      expect(DIFFICULTY_CONFIG[difficulty].playerSpeed, difficulty).toBeCloseTo(playerSpeed);
      expect(DIFFICULTY_CONFIG[difficulty].tracking, difficulty).toBe(tracking[difficulty]);
      expect(DIFFICULTY_CONFIG[difficulty].bot, difficulty).toBe(difficulty === 'bot');
    }
  });
});

describe('createGame', () => {
  it('starts square at 0-0 with centred paddles and a serve pending', () => {
    const game = createGame('medium');

    expect(game.leftScore).toBe(0);
    expect(game.rightScore).toBe(0);
    expect(game.status).toBe('serve');
    expect(game.serveTimer).toBe(SERVE_DELAY);
    expect(game.serveDirection).toBe(1);
    expect(game.winner).toBeNull();
    expect(game.ball).toEqual({
      x: 350,
      y: 250,
      radius: 7,
      xvel: 7,
      yvel: 0,
    });
    expect(game.player).toEqual({ x: 10, y: 200, width: 20, height: 100 });
    expect(game.opponent).toEqual({ x: 670, y: 200, width: 20, height: 100 });
  });

  it('defaults to medium', () => {
    expect(createGame().difficulty).toBe('medium');
  });

  it('moves the ball at each difficulty speed once the serve has elapsed', () => {
    for (const difficulty of DIFFICULTIES) {
      const game = playing(difficulty);
      const moved = stepGame(game, FRAME);
      expect(moved.ball.x, difficulty).toBeCloseTo(350 + DIFFICULTY_CONFIG[difficulty].ballSpeed);
    }
  });
});

describe('serve', () => {
  it('holds the ball still, then launches it without blocking', () => {
    let game = createGame('easy');
    game = stepGame(game, SERVE_DELAY - FRAME);

    expect(game.status).toBe('serve');
    expect(game.ball.x).toBe(350);

    game = stepGame(game, FRAME);
    expect(game.status).toBe('playing');
    expect(game.ball.xvel).toBe(2);
  });

  it('flips the serve direction after a point', () => {
    const game = playing('medium', {
      leftScore: 0,
      rightScore: 0,
      serveDirection: 1,
      ball: { x: -1, y: 50, radius: 7, xvel: -7, yvel: 0 },
    });

    const scored = stepGame(game, FRAME);
    expect(scored.serveDirection).toBe(-1);
    expect(scored.ball.xvel).toBe(-7);
  });
});

describe('paddle movement', () => {
  it('moves the player up and down at 0.8 x the ball speed', () => {
    const up = stepGame(playing('medium'), FRAME, { up: true });
    const down = stepGame(playing('medium'), FRAME, { down: true });
    const both = stepGame(playing('medium'), FRAME, { up: true, down: true });

    expect(up.player.y).toBeCloseTo(200 - 5.6);
    expect(down.player.y).toBeCloseTo(200 + 5.6);
    expect(both.player.y).toBe(200);
  });

  it('clamps the player to the court at both ends', () => {
    const top = stepGame(
      playing('hard', { player: { ...createGame('hard').player, y: 1 } }),
      1 / 30,
      { up: true },
    );
    const bottom = stepGame(
      playing('hard', { player: { ...createGame('hard').player, y: 399 } }),
      1 / 30,
      { down: true },
    );

    expect(top.player.y).toBe(0);
    expect(bottom.player.y).toBe(400);
  });

  it('lets a drag target place the paddle and clamps it to the court', () => {
    const top = stepGame(playing('medium'), FRAME, { targetY: 0 });
    const middle = stepGame(playing('medium'), FRAME, { targetY: 250 });
    const bottom = stepGame(playing('medium'), FRAME, { targetY: 999 });

    expect(top.player.y).toBe(0);
    expect(middle.player.y).toBe(200);
    expect(bottom.player.y).toBe(400);
  });

  it('keeps player movement out of a finished round', () => {
    const over = { ...playing('medium'), status: 'over' as const, winner: 'left' as const };
    expect(stepGame(over, FRAME, { down: true })).toBe(over);
  });
});

describe('collisions', () => {
  it('bounces off the top wall and inverts yvel', () => {
    const game = playing('medium', {
      ball: { x: 350, y: 8, radius: 7, xvel: 7, yvel: -7 },
    });

    const bounced = stepGame(game, FRAME);
    expect(bounced.ball.y).toBe(7);
    expect(bounced.ball.yvel).toBe(7);
  });

  it('bounces off the bottom wall and inverts yvel', () => {
    const game = playing('medium', {
      ball: { x: 350, y: 492, radius: 7, xvel: 7, yvel: 7 },
    });

    const bounced = stepGame(game, FRAME);
    expect(bounced.ball.y).toBe(493);
    expect(bounced.ball.yvel).toBe(-7);
  });

  it('reverses x and deflects up from a hit above the paddle centre', () => {
    const game = playing('medium', {
      ball: { x: 32, y: 200, radius: 7, xvel: -7, yvel: 0 },
    });

    const bounced = stepGame(game, FRAME);
    expect(bounced.ball.xvel).toBe(7);
    expect(bounced.ball.x).toBe(37);
    expect(bounced.ball.yvel).toBe(-7);
  });

  it('deflects down from a hit below the left paddle centre', () => {
    const game = playing('medium', {
      ball: { x: 32, y: 300, radius: 7, xvel: -7, yvel: 0 },
    });

    expect(stepGame(game, FRAME).ball.yvel).toBe(7);
  });

  it('sends a centre hit straight back', () => {
    const game = playing('hard', {
      ball: { x: 32, y: 250, radius: 7, xvel: -9, yvel: 0 },
    });

    expect(stepGame(game, FRAME).ball.yvel).toBe(0);
  });

  it('bounces off the right paddle and deflects away from its centre', () => {
    for (const difficulty of DIFFICULTIES) {
      const speed = DIFFICULTY_CONFIG[difficulty].ballSpeed;
      const game = playing(difficulty, {
        ball: { x: 663, y: 200, radius: 7, xvel: speed, yvel: 0 },
      });

      const bounced = stepGame(game, FRAME);
      expect(bounced.ball.xvel, difficulty).toBe(-speed);

      const centre = bounced.opponent.y + PADDLE.height / 2;
      expect(Math.sign(bounced.ball.yvel) || 0, difficulty).toBe(
        Math.sign(-(centre - bounced.ball.y)) || 0,
      );
    }
  });
});

describe('scoring', () => {
  it('scores for the right side when the ball leaves on the left', () => {
    const game = playing('medium', {
      ball: { x: -1, y: 50, radius: 7, xvel: -7, yvel: 0 },
    });

    const scored = stepGame(game, FRAME);
    expect(scored.rightScore).toBe(1);
    expect(scored.leftScore).toBe(0);
    expect(scored.status).toBe('serve');
    expect(scored.serveTimer).toBe(SERVE_DELAY);
    expect(scored.winner).toBeNull();
    expect(scored.ball).toEqual({ x: 350, y: 250, radius: 7, xvel: -7, yvel: 0 });
    expect(scored.player.y).toBe(200);
    expect(scored.opponent.y).toBe(200);
  });

  it('scores for the left side when the ball leaves on the right', () => {
    const game = playing('medium', {
      ball: { x: 701, y: 50, radius: 7, xvel: 7, yvel: 0 },
    });

    const scored = stepGame(game, FRAME);
    expect(scored.leftScore).toBe(1);
    expect(scored.rightScore).toBe(0);
    expect(scored.status).toBe('serve');
  });

  it('does not score during the serve pause', () => {
    const game = createGame('medium');
    const served = stepGame(game, FRAME);
    expect(served.leftScore).toBe(0);
    expect(served.rightScore).toBe(0);
  });

  it('ends the round on the tenth point', () => {
    const game = playing('medium', {
      leftScore: 9,
      ball: { x: 701, y: 50, radius: 7, xvel: 7, yvel: 0 },
    });

    const won = stepGame(game, FRAME);
    expect(won.leftScore).toBe(10);
    expect(won.status).toBe('over');
    expect(won.winner).toBe('left');
    expect(stepGame(won, FRAME)).toBe(won);
  });

  it('names the bot as the winner in bot mode', () => {
    const game = playing('bot', {
      rightScore: 9,
      ball: { x: -1, y: 50, radius: 7, xvel: -9, yvel: 0 },
    });

    const won = stepGame(game, FRAME);
    expect(won.rightScore).toBe(10);
    expect(won.winner).toBe('bot');
  });

  it('uses the right player name outside bot mode', () => {
    const game = playing('hard', {
      rightScore: 9,
      ball: { x: -1, y: 50, radius: 7, xvel: -9, yvel: 0 },
    });

    expect(stepGame(game, FRAME).winner).toBe('right');
  });

  it('maps every winner to the original message', () => {
    expect(WIN_MESSAGES).toEqual({
      left: 'Left player won!',
      right: 'Right player won!',
      bot: 'The bot won!',
    });
  });
});

describe('bot mode', () => {
  it('tracks the ball with the right paddle centre', () => {
    const game = playing('bot', {
      ball: { x: 350, y: 100, radius: 7, xvel: 9, yvel: 0 },
    });

    expect(stepGame(game, FRAME).opponent.y).toBe(50);
  });

  it('clamps to the top and bottom of the court', () => {
    const top = playing('bot', {
      ball: { x: 350, y: 0, radius: 7, xvel: 9, yvel: 0 },
    });
    const bottom = playing('bot', {
      ball: { x: 350, y: 500, radius: 7, xvel: 9, yvel: 0 },
    });

    expect(stepGame(top, FRAME).opponent.y).toBe(0);
    expect(stepGame(bottom, FRAME).opponent.y).toBe(400);
  });
});

describe('opponent paddle', () => {
  it('tracks the ball in every non-bot mode', () => {
    for (const difficulty of DIFFICULTIES.filter((id) => id !== 'bot')) {
      const cfg = DIFFICULTY_CONFIG[difficulty];
      const game = playing(difficulty, {
        ball: { x: 350, y: 100, radius: 7, xvel: cfg.ballSpeed, yvel: 0 },
      });

      const moved = stepGame(game, FRAME);
      expect(moved.opponent.y, difficulty).toBeCloseTo(200 - cfg.ballSpeed * cfg.tracking);
    }
  });

  it('cannot cross more than its tracked speed in one frame', () => {
    const cfg = DIFFICULTY_CONFIG.medium;
    const game = playing('medium', {
      opponent: { ...createGame('medium').opponent, y: 400 },
      ball: { x: 350, y: 0, radius: 7, xvel: cfg.ballSpeed, yvel: 0 },
    });

    expect(stepGame(game, FRAME).opponent.y).toBeCloseTo(400 - cfg.ballSpeed * cfg.tracking);
  });

  it('clamps to the court at both ends', () => {
    const cfg = DIFFICULTY_CONFIG.hard;
    const top = playing('hard', {
      opponent: { ...createGame('hard').opponent, y: 5 },
      ball: { x: 350, y: 0, radius: 7, xvel: cfg.ballSpeed, yvel: 0 },
    });
    const bottom = playing('hard', {
      opponent: { ...createGame('hard').opponent, y: 395 },
      ball: { x: 350, y: 500, radius: 7, xvel: cfg.ballSpeed, yvel: 0 },
    });

    expect(stepGame(top, FRAME).opponent.y).toBe(0);
    expect(stepGame(bottom, FRAME).opponent.y).toBe(400);
  });
});

describe('determinism', () => {
  it('produces the same state for the same dt and input sequence', () => {
    const run = () => {
      let game = createGame('hard');
      const dts = [FRAME, FRAME / 2, 0.5, 0, FRAME, FRAME];
      const inputs = [
        {},
        { up: true },
        { targetY: 120 },
        {},
        { down: true },
        { up: true, down: true },
      ];

      dts.forEach((dt, i) => {
        game = stepGame(game, dt, inputs[i]);
      });
      return game;
    };

    expect(run()).toEqual(run());
  });

  it('does not mutate the state it receives', () => {
    const game = playing('medium', {
      ball: { x: 100, y: 210, radius: 7, xvel: 7, yvel: 3 },
    });
    const before = JSON.stringify(game);

    stepGame(game, FRAME, { down: true });
    expect(JSON.stringify(game)).toBe(before);
  });
});
