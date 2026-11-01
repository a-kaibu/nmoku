import "./style.css";
import { chooseMove, type Level } from "./ai.ts";
import {
  CPU,
  EMPTY,
  FINAL_N,
  HUMAN,
  newMatch,
  play,
  SIZE,
  START_N,
  startNextRound,
  type MatchState,
  type Player,
} from "./game.ts";
import { BoardView } from "./render.ts";
import { loadState, saveState } from "./storage.ts";

const CPU_DELAY_MS = 380;
const RESULT_DELAY_MS = 700;
const LEVEL_KEY = "nmoku-level";

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

const canvas = $<HTMLCanvasElement>("board");
const view = new BoardView(canvas);
const levelSelect = $<HTMLSelectElement>("level");
const overlay = $("overlay");
const resetBtn = $<HTMLButtonElement>("reset");

// リロードしても続きから遊べるよう、保存済みの試合があれば復元する
let state: MatchState = loadState() ?? newMatch();
let hover = -1;
let cpuTimer: ReturnType<typeof setTimeout> | undefined;
let resultTimer: ReturnType<typeof setTimeout> | undefined;

function redraw() {
  view.draw(state, hover);
}

function humanPlay(idx: number) {
  if (state.roundOver || state.turn !== HUMAN || state.board[idx] !== EMPTY) return;
  hover = -1;
  afterMove(play(state, idx));
}

function afterMove(moved: boolean) {
  if (!moved) return;
  render();
  if (state.roundOver) showResult();
  else if (state.turn === CPU) scheduleCpu();
}

function scheduleCpu() {
  clearTimeout(cpuTimer);
  cpuTimer = setTimeout(() => {
    if (state.roundOver || state.turn !== CPU) return;
    const idx = chooseMove(state.board, state.n[CPU], state.n[HUMAN], levelSelect.value as Level);
    afterMove(play(state, idx));
  }, CPU_DELAY_MS);
}

// ---------- 表示 ----------
function renderLadder(el: HTMLElement, who: Player) {
  const n = state.n[who];
  const wonFinal = state.matchOver && state.history.at(-1)?.winner === who;
  el.replaceChildren(
    ...Array.from({ length: FINAL_N - START_N + 1 }, (_, i) => {
      const k = START_N + i;
      const span = document.createElement("span");
      span.textContent = `${k}目`;
      if (k < n || (k === FINAL_N && wonFinal)) span.className = "done";
      else if (k === n) span.className = "now";
      return span;
    }),
  );
}

function render() {
  $("n-human").textContent = String(state.n[HUMAN]);
  $("n-cpu").textContent = String(state.n[CPU]);
  renderLadder($("l-human"), HUMAN);
  renderLadder($("l-cpu"), CPU);
  $("p-human").classList.toggle("turn", !state.roundOver && state.turn === HUMAN);
  $("p-cpu").classList.toggle("turn", !state.roundOver && state.turn === CPU);

  const msg = $("msg");
  if (state.roundOver) msg.textContent = `第${state.round}ラウンド終了`;
  else if (state.turn === HUMAN)
    msg.innerHTML = `<span class="stone-ico b"></span>第${state.round}ラウンド・あなたの番（${state.n[HUMAN]}目で勝ち）`;
  else msg.innerHTML = `<span class="stone-ico w"></span>第${state.round}ラウンド・CPUが考え中…`;

  const log = $("log");
  if (!state.history.length) {
    const li = document.createElement("li");
    li.className = "empty";
    li.textContent = "まだ決着したラウンドはありません。";
    log.replaceChildren(li);
  } else {
    log.replaceChildren(
      ...state.history.map((h) => {
        const li = document.createElement("li");
        const who = h.winner === HUMAN ? "あなた" : h.winner === CPU ? "CPU" : null;
        li.innerHTML = `<span class="r">R${h.round}</span><span>${who ? `${who}が${h.atN}目で勝利` : "引き分け"}</span>`;
        return li;
      }),
    );
  }
  saveState(state);
  redraw();
}

function showResult(delay = RESULT_DELAY_MS) {
  const last = state.history.at(-1)!;
  const { winner, atN } = last;
  let title: string;
  let text: string;
  let btn = "次のラウンドへ";
  if (state.matchOver) {
    title = winner === HUMAN ? "優勝！" : "CPUの優勝";
    text =
      winner === HUMAN
        ? `6目を並べて勝ち抜きました（全${state.round}ラウンド）。`
        : "CPUが6目で勝ち抜きました。もう一度挑戦しますか？";
    btn = "新しい試合を始める";
  } else if (!winner) {
    title = "引き分け";
    text = "盤が埋まりました。目標はそのまま、次は手番を入れ替えます。";
  } else if (winner === HUMAN) {
    title = "ラウンド勝利";
    text = `${atN}目達成。あなたの目標は${state.n[HUMAN]}目に上がります。次はCPUが先手です。`;
  } else {
    title = "CPUの勝ち";
    text = `CPUが${atN}目を並べました。CPUの目標は${state.n[CPU]}目に。次はあなたが先手です。`;
  }
  $("ov-title").textContent = title;
  $("ov-text").textContent = text;
  $("ov-btn").textContent = btn;
  // 盤面を見られるよう少し遅らせて表示
  clearTimeout(resultTimer);
  resultTimer = setTimeout(() => {
    overlay.hidden = false;
    $("ov-btn").focus();
  }, delay);
}

function restartMatch() {
  clearTimeout(cpuTimer);
  clearTimeout(resultTimer);
  state = newMatch();
  overlay.hidden = true;
  render();
}

// ---------- 入力 ----------
canvas.addEventListener("click", (e) => {
  const i = view.cellAt(e.clientX, e.clientY);
  if (i >= 0) humanPlay(i);
});
canvas.addEventListener("mousemove", (e) => {
  const i = view.cellAt(e.clientX, e.clientY);
  if (i !== hover) {
    hover = i;
    redraw();
  }
});
canvas.addEventListener("mouseleave", () => {
  hover = -1;
  redraw();
});
canvas.addEventListener("keydown", (e) => {
  if (hover < 0) hover = Math.floor(SIZE / 2) * SIZE + Math.floor(SIZE / 2);
  let x = hover % SIZE;
  let y = Math.floor(hover / SIZE);
  const moves: Record<string, [number, number]> = {
    ArrowLeft: [-1, 0],
    ArrowRight: [1, 0],
    ArrowUp: [0, -1],
    ArrowDown: [0, 1],
  };
  const m = moves[e.key];
  if (m) {
    e.preventDefault();
    x = Math.min(SIZE - 1, Math.max(0, x + m[0]));
    y = Math.min(SIZE - 1, Math.max(0, y + m[1]));
    hover = y * SIZE + x;
    redraw();
  } else if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    humanPlay(hover);
  }
});

$("ov-btn").addEventListener("click", () => {
  if (state.matchOver) return restartMatch();
  startNextRound(state);
  overlay.hidden = true;
  render();
  if (state.turn === CPU) scheduleCpu();
});

let confirmReset = false;
resetBtn.addEventListener("click", () => {
  if (!confirmReset) {
    confirmReset = true;
    resetBtn.textContent = "もう一度押すとリセット";
    setTimeout(() => {
      confirmReset = false;
      resetBtn.textContent = "最初からやり直す";
    }, 2500);
    return;
  }
  confirmReset = false;
  resetBtn.textContent = "最初からやり直す";
  restartMatch();
});

try {
  const saved = localStorage.getItem(LEVEL_KEY);
  if (saved) levelSelect.value = saved;
} catch {
  // ストレージが使えない環境では既定値のまま
}
levelSelect.addEventListener("change", () => {
  try {
    localStorage.setItem(LEVEL_KEY, levelSelect.value);
  } catch {
    // 保存できなくても遊べる
  }
});

new ResizeObserver(() => {
  view.resize();
  redraw();
}).observe(canvas);
render();
if (state.roundOver) showResult(0);
else if (state.turn === CPU) scheduleCpu();
