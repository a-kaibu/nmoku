// 試合の状態をブラウザに保存し、リロード後に復元する
import { CPU, EMPTY, FINAL_N, HUMAN, SIZE, START_N, type MatchState } from "./game.ts";

export const STATE_KEY = "nmoku-state-v1";

type KV = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function defaultStorage(): KV | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export function saveState(s: MatchState, storage: KV | null = defaultStorage()): void {
  try {
    storage?.setItem(STATE_KEY, JSON.stringify(s));
  } catch {
    // 容量不足やプライベートモードでは保存しない（遊ぶのには困らない）
  }
}

export function clearState(storage: KV | null = defaultStorage()): void {
  try {
    storage?.removeItem(STATE_KEY);
  } catch {
    // 何もしない
  }
}

const isPlayer = (v: unknown) => v === HUMAN || v === CPU;
const isN = (v: unknown) =>
  Number.isInteger(v) && (v as number) >= START_N && (v as number) <= FINAL_N;
const isCellIdx = (v: unknown) =>
  Number.isInteger(v) && (v as number) >= 0 && (v as number) < SIZE * SIZE;

/** 保存済みの状態を読み込む。無い・壊れている場合は null */
export function loadState(storage: KV | null = defaultStorage()): MatchState | null {
  let raw: string | null = null;
  try {
    raw = storage?.getItem(STATE_KEY) ?? null;
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    const s = JSON.parse(raw) as MatchState;
    const ok =
      s &&
      isN(s.n?.[HUMAN]) &&
      isN(s.n?.[CPU]) &&
      Number.isInteger(s.round) &&
      s.round >= 1 &&
      isPlayer(s.first) &&
      isPlayer(s.turn) &&
      Array.isArray(s.board) &&
      s.board.length === SIZE * SIZE &&
      s.board.every((c) => c === EMPTY || isPlayer(c)) &&
      Array.isArray(s.moves) &&
      s.moves.every(isCellIdx) &&
      (s.winLine === null || (Array.isArray(s.winLine) && s.winLine.every(isCellIdx))) &&
      typeof s.roundOver === "boolean" &&
      typeof s.matchOver === "boolean" &&
      Array.isArray(s.history);
    return ok ? s : null;
  } catch {
    return null;
  }
}
