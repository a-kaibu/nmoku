// N目並べのルール（純粋なロジック。DOMには触らない）

export const SIZE = 15;
export const START_N = 4;
export const FINAL_N = 6;

export const EMPTY = 0;
export const HUMAN = 1;
export const CPU = 2;
export type Player = typeof HUMAN | typeof CPU;
export type Cell = typeof EMPTY | Player;
export type Board = Cell[];

export const DIRS: ReadonlyArray<readonly [number, number]> = [
  [1, 0],
  [0, 1],
  [1, 1],
  [1, -1],
];

export interface RoundResult {
  round: number;
  winner: Player | null;
  /** 勝った時点の目標（引き分けなら null） */
  atN: number | null;
}

export interface MatchState {
  n: Record<Player, number>;
  round: number;
  first: Player;
  turn: Player;
  board: Board;
  moves: number[];
  winLine: number[] | null;
  roundOver: boolean;
  matchOver: boolean;
  history: RoundResult[];
}

export const opponent = (p: Player): Player => (p === HUMAN ? CPU : HUMAN);

export const emptyBoard = (): Board => Array.from({ length: SIZE * SIZE }, () => EMPTY);

/** 盤外なら -1 */
export function at(board: Board, x: number, y: number): Cell | -1 {
  if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return -1;
  return board[y * SIZE + x]!;
}

/** idx を通る who の最長の連（縦横斜め） */
export function longestLine(board: Board, idx: number, who: Player): number[] {
  const x0 = idx % SIZE;
  const y0 = Math.floor(idx / SIZE);
  let best: number[] = [];
  for (const [dx, dy] of DIRS) {
    const cells = [idx];
    for (let k = 1; at(board, x0 + dx * k, y0 + dy * k) === who; k++) {
      cells.push((y0 + dy * k) * SIZE + x0 + dx * k);
    }
    for (let k = 1; at(board, x0 - dx * k, y0 - dy * k) === who; k++) {
      cells.unshift((y0 - dy * k) * SIZE + x0 - dx * k);
    }
    if (cells.length > best.length) best = cells;
  }
  return best;
}

export function newMatch(): MatchState {
  return {
    n: { [HUMAN]: START_N, [CPU]: START_N } as Record<Player, number>,
    round: 1,
    history: [],
    matchOver: false,
    ...newRound(HUMAN),
  };
}

function newRound(first: Player) {
  return {
    first,
    turn: first,
    board: emptyBoard(),
    moves: [] as number[],
    winLine: null,
    roundOver: false,
  };
}

/** 手番のプレイヤーが idx に置く。置けない場合は false。状態は破壊的に更新する。 */
export function play(s: MatchState, idx: number): boolean {
  if (s.roundOver || idx < 0 || idx >= SIZE * SIZE || s.board[idx] !== EMPTY) return false;
  const who = s.turn;
  s.board[idx] = who;
  s.moves.push(idx);
  const line = longestLine(s.board, idx, who);
  if (line.length >= s.n[who]) {
    finishRound(s, who, line);
  } else if (s.moves.length === SIZE * SIZE) {
    finishRound(s, null, null);
  } else {
    s.turn = opponent(who);
  }
  return true;
}

function finishRound(s: MatchState, winner: Player | null, line: number[] | null) {
  s.roundOver = true;
  s.winLine = line;
  s.history.push({ round: s.round, winner, atN: winner ? s.n[winner] : null });
  if (!winner) return;
  if (s.n[winner] >= FINAL_N) s.matchOver = true;
  else s.n[winner] += 1;
}

/** 次のラウンドへ。負けた側が先手、引き分けなら先後を入れ替える。 */
export function startNextRound(s: MatchState): void {
  if (!s.roundOver || s.matchOver) return;
  const last = s.history[s.history.length - 1]!;
  const first = last.winner ? opponent(last.winner) : opponent(s.first);
  Object.assign(s, newRound(first), { round: s.round + 1 });
}
