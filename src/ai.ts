// CPUの思考。各マスを含む「長さN（その手番側の目標）の窓」ごとに攻めと守りを評価する。
import { at, CPU, DIRS, EMPTY, opponent, SIZE, type Board, type Player } from "./game.ts";

export type Level = "easy" | "normal" | "hard";

// index = 置いた後あと何個で完成するか
const ATK = [1e9, 2e5, 2500, 60, 4, 1, 0];
// index = 相手があと何個で完成するか（ここを塞ぐ価値）
const DEF = [0, 6e7, 9000, 180, 8, 1, 0];
const ATK_DOUBLE = 5e5;
const DEF_DOUBLE = 2e7;

function windowScore(
  board: Board,
  idx: number,
  who: Player,
  n: number,
  table: number[],
  afterPlace: boolean,
): number {
  const opp = opponent(who);
  const x0 = idx % SIZE;
  const y0 = Math.floor(idx / SIZE);
  let total = 0;
  let hotDirs = 0;
  for (const [dx, dy] of DIRS) {
    let dirBest = Infinity;
    for (let s = -(n - 1); s <= 0; s++) {
      let own = 0;
      let ok = true;
      for (let k = 0; k < n; k++) {
        const v = at(board, x0 + dx * (s + k), y0 + dy * (s + k));
        if (v === -1 || v === opp) {
          ok = false;
          break;
        }
        if (v === who) own++;
      }
      if (!ok) continue;
      const rem = afterPlace ? n - own - 1 : n - own;
      total += table[Math.min(rem, table.length - 1)]!;
      dirBest = Math.min(dirBest, rem);
    }
    if (dirBest <= 1) hotDirs++;
  }
  // 2方向以上で「あと1」= 実質の両取り
  if (hotDirs >= 2) total += table === ATK ? ATK_DOUBLE : DEF_DOUBLE;
  return total;
}

export function attackScore(board: Board, idx: number, who: Player, n: number): number {
  return windowScore(board, idx, who, n, ATK, true);
}

export function defenseScore(board: Board, idx: number, who: Player, oppN: number): number {
  return windowScore(board, idx, opponent(who), oppN, DEF, false);
}

function hasNeighbor(board: Board, idx: number): boolean {
  const x0 = idx % SIZE;
  const y0 = Math.floor(idx / SIZE);
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      if ((dx || dy) && (at(board, x0 + dx, y0 + dy) as number) > 0) return true;
    }
  }
  return false;
}

/**
 * CPU（デフォルトは白）の次の一手を返す。
 * @param myN 自分の目標
 * @param oppN 相手の目標
 */
export function chooseMove(
  board: Board,
  myN: number,
  oppN: number,
  level: Level = "normal",
  me: Player = CPU,
  rand: () => number = Math.random,
): number {
  const center = Math.floor(SIZE / 2) * SIZE + Math.floor(SIZE / 2);
  if (board.every((c) => c === EMPTY)) return center;

  const mid = (SIZE - 1) / 2;
  const noiseAmp = level === "easy" ? 400 : level === "normal" ? 25 : 3;
  const defWeight = level === "easy" ? 0.25 : level === "hard" ? 1.15 : 1;
  const candidates: number[] = [];
  let best = -1;
  let bestScore = -Infinity;

  for (let i = 0; i < board.length; i++) {
    if (board[i] !== EMPTY || !hasNeighbor(board, i)) continue;
    candidates.push(i);
    const x = i % SIZE;
    const y = Math.floor(i / SIZE);
    const score =
      attackScore(board, i, me, myN) +
      defenseScore(board, i, me, oppN) * defWeight +
      (3 - (Math.abs(x - mid) + Math.abs(y - mid)) * 0.2) +
      rand() * noiseAmp;
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  }

  // やさしい：勝ちが見えている時以外は、たまにうっかりする
  if (level === "easy" && candidates.length && rand() < 0.15) {
    if (attackScore(board, best, me, myN) < ATK[0]!) {
      best = candidates[Math.floor(rand() * candidates.length)]!;
    }
  }
  return best;
}
