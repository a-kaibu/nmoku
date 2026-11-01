import { describe, expect, it } from "vite-plus/test";
import { chooseMove } from "./ai.ts";
import {
  CPU,
  emptyBoard,
  EMPTY,
  HUMAN,
  longestLine,
  newMatch,
  play,
  SIZE,
  startNextRound,
  type MatchState,
} from "./game.ts";

const idx = (x: number, y: number) => y * SIZE + x;

/** 人間が (0..len-1, 0) に並べ、CPUは (x, 5) に置いていくだけの手順で1ラウンド進める */
function humanWinsRound(s: MatchState) {
  let hx = 0;
  let cx = 0;
  while (!s.roundOver) {
    if (s.turn === HUMAN) play(s, idx(hx++, 0));
    else play(s, idx(cx++ * 2, 10));
  }
}

describe("longestLine", () => {
  it("縦横斜めの最長の連を返す", () => {
    const b = emptyBoard();
    for (const [x, y] of [
      [2, 2],
      [3, 3],
      [4, 4],
    ])
      b[idx(x!, y!)] = HUMAN;
    expect(longestLine(b, idx(3, 3), HUMAN)).toHaveLength(3);
  });
});

describe("ラウンドとN", () => {
  it("4目で勝つと勝者の目標だけが5に上がり、敗者が次の先手になる", () => {
    const s = newMatch();
    humanWinsRound(s);
    expect(s.history[0]).toEqual({ round: 1, winner: HUMAN, atN: 4 });
    expect(s.n[HUMAN]).toBe(5);
    expect(s.n[CPU]).toBe(4);
    startNextRound(s);
    expect(s.round).toBe(2);
    expect(s.turn).toBe(CPU);
    expect(s.board.every((c) => c === EMPTY)).toBe(true);
  });

  it("目標より長い連でも勝ちになる", () => {
    const s = newMatch();
    s.n[HUMAN] = 4;
    // ○○_○○ の真ん中を埋めて5連
    s.board[idx(0, 0)] = HUMAN;
    s.board[idx(1, 0)] = HUMAN;
    s.board[idx(3, 0)] = HUMAN;
    s.board[idx(4, 0)] = HUMAN;
    play(s, idx(2, 0));
    expect(s.roundOver).toBe(true);
    expect(s.winLine).toHaveLength(5);
  });

  it("目標に届かない連では勝ちにならない", () => {
    const s = newMatch();
    s.n[HUMAN] = 5;
    for (let x = 0; x < 3; x++) s.board[idx(x, 0)] = HUMAN;
    play(s, idx(3, 0));
    expect(s.roundOver).toBe(false);
  });

  it("6目で勝つと優勝。5目以下の勝ちでは優勝しない", () => {
    const s = newMatch();
    humanWinsRound(s); // 4目で勝利 → 5
    startNextRound(s);
    humanWinsRound(s); // 5目で勝利 → 6
    expect(s.matchOver).toBe(false);
    startNextRound(s);
    humanWinsRound(s); // 6目で勝利 → 優勝
    expect(s.history.map((h) => h.atN)).toEqual([4, 5, 6]);
    expect(s.matchOver).toBe(true);
    expect(s.n[HUMAN]).toBe(6);
  });

  it("引き分けなら目標は据え置きで先後が入れ替わる", () => {
    const s = newMatch();
    // 最後の1マス以外を誰の連にもならない並びで埋めてから最後を置く
    for (let i = 0; i < SIZE * SIZE - 1; i++) {
      const x = i % SIZE;
      const y = Math.floor(i / SIZE);
      s.board[i] = (Math.floor(x / 2) + y) % 2 === 0 ? HUMAN : CPU;
    }
    s.n[HUMAN] = s.n[CPU] = 6;
    s.turn = HUMAN;
    s.moves = Array.from({ length: SIZE * SIZE - 1 }, (_, i) => i);
    const lastCell = SIZE * SIZE - 1;
    play(s, lastCell);
    expect(s.history[0]?.winner).toBeNull();
    expect(s.n).toEqual({ [HUMAN]: 6, [CPU]: 6 });
    startNextRound(s);
    expect(s.turn).toBe(CPU);
  });

  it("埋まっているマスには置けない", () => {
    const s = newMatch();
    expect(play(s, idx(7, 7))).toBe(true);
    expect(play(s, idx(7, 7))).toBe(false);
  });
});

describe("CPU", () => {
  const noRand = () => 0;

  it("あと1つで勝てるなら勝つ", () => {
    const b = emptyBoard();
    for (let x = 3; x < 6; x++) b[idx(x, 7)] = CPU;
    b[idx(2, 7)] = HUMAN;
    for (let x = 0; x < 3; x++) b[idx(x, 0)] = HUMAN;
    expect(chooseMove(b, 4, 5, "normal", CPU, noRand)).toBe(idx(6, 7));
  });

  it("相手があと1つで勝つなら止める（相手の目標で判定）", () => {
    const b = emptyBoard();
    // 人間の目標は4、3連が片側だけ空いている
    for (let y = 3; y < 6; y++) b[idx(9, y)] = HUMAN;
    b[idx(9, 2)] = CPU;
    expect(chooseMove(b, 6, 4, "normal", CPU, noRand)).toBe(idx(9, 6));
  });

  it("相手の目標が5なら3連はまだ必至ではないので自分の勝ちを優先する", () => {
    const b = emptyBoard();
    for (let y = 3; y < 7; y++) b[idx(9, y)] = HUMAN; // 4連（目標5なのであと1）
    b[idx(9, 2)] = CPU;
    for (let x = 0; x < 3; x++) b[idx(x, 12)] = CPU; // CPU は目標4であと1
    expect(chooseMove(b, 4, 5, "normal", CPU, noRand)).toBe(idx(3, 12));
  });
});
