// 碁盤の描画（canvas）
import { CPU, EMPTY, HUMAN, SIZE, type MatchState, type Player } from "./game.ts";

const STAR_POINTS: ReadonlyArray<readonly [number, number]> = [
  [3, 3],
  [11, 3],
  [7, 7],
  [3, 11],
  [11, 11],
];

export class BoardView {
  private ctx: CanvasRenderingContext2D;
  private px = 0;
  private cell = 0;
  private pad = 0;
  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
  }

  resize(): void {
    const r = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.px = r.width;
    this.canvas.width = Math.round(r.width * dpr);
    this.canvas.height = Math.round(r.width * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.cell = this.px / (SIZE + 0.6);
    this.pad = this.cell * 0.8;
  }

  /** クライアント座標 → 盤のマス（盤外は -1） */
  cellAt(clientX: number, clientY: number): number {
    const r = this.canvas.getBoundingClientRect();
    const x = Math.round((clientX - r.left - this.pad) / this.cell);
    const y = Math.round((clientY - r.top - this.pad) / this.cell);
    if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return -1;
    return y * SIZE + x;
  }

  private pos(i: number): [number, number] {
    return [this.pad + (i % SIZE) * this.cell, this.pad + Math.floor(i / SIZE) * this.cell];
  }

  draw(s: MatchState, hover: number): void {
    const { ctx, px, cell, pad } = this;
    if (!px) return;

    const g = ctx.createLinearGradient(0, 0, px, px);
    g.addColorStop(0, "#e2bd76");
    g.addColorStop(0.5, "#d6aa60");
    g.addColorStop(1, "#c99a52");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, px, px);

    // 木目
    ctx.globalAlpha = 0.07;
    ctx.strokeStyle = "#5a3a10";
    for (let i = 0; i < 28; i++) {
      ctx.beginPath();
      ctx.lineWidth = 1 + (i % 3);
      const y = (i / 28) * px;
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(px * 0.3, y + 8, px * 0.6, y - 10, px, y + 4);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // 罫線と星
    ctx.strokeStyle = "#3b2a14";
    ctx.lineWidth = Math.max(1, cell * 0.04);
    const end = pad + (SIZE - 1) * cell;
    for (let k = 0; k < SIZE; k++) {
      ctx.beginPath();
      ctx.moveTo(pad, pad + k * cell);
      ctx.lineTo(end, pad + k * cell);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(pad + k * cell, pad);
      ctx.lineTo(pad + k * cell, end);
      ctx.stroke();
    }
    ctx.fillStyle = "#3b2a14";
    for (const [x, y] of STAR_POINTS) {
      ctx.beginPath();
      ctx.arc(pad + x * cell, pad + y * cell, cell * 0.1, 0, Math.PI * 2);
      ctx.fill();
    }

    // 石
    const R = cell * 0.46;
    s.board.forEach((v, i) => {
      if (v !== EMPTY) this.stone(i, v, R, 1);
    });
    if (hover >= 0 && !s.roundOver && s.turn === HUMAN && s.board[hover] === EMPTY) {
      this.stone(hover, HUMAN, R, 0.35);
    }

    // 最後の一手
    const last = s.moves[s.moves.length - 1];
    if (last !== undefined) {
      const [x, y] = this.pos(last);
      ctx.fillStyle = "#c2412a";
      ctx.beginPath();
      ctx.arc(x, y, cell * 0.12, 0, Math.PI * 2);
      ctx.fill();
    }

    // 勝ちライン
    if (s.winLine?.length) {
      const [x1, y1] = this.pos(s.winLine[0]!);
      const [x2, y2] = this.pos(s.winLine[s.winLine.length - 1]!);
      ctx.strokeStyle = "rgba(194,65,42,.85)";
      ctx.lineWidth = cell * 0.16;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
  }

  private stone(i: number, who: Player, R: number, alpha: number): void {
    const { ctx } = this;
    const [x, y] = this.pos(i);
    ctx.globalAlpha = alpha;
    if (alpha === 1) {
      ctx.fillStyle = "rgba(0,0,0,.28)";
      ctx.beginPath();
      ctx.arc(x + R * 0.12, y + R * 0.16, R, 0, Math.PI * 2);
      ctx.fill();
    }
    const g = ctx.createRadialGradient(x - R * 0.35, y - R * 0.4, R * 0.1, x, y, R);
    if (who === CPU) {
      g.addColorStop(0, "#ffffff");
      g.addColorStop(0.6, "#ececec");
      g.addColorStop(1, "#b9b9b9");
    } else {
      g.addColorStop(0, "#6a6a6a");
      g.addColorStop(0.5, "#1a1a1a");
      g.addColorStop(1, "#000");
    }
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, R, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}
