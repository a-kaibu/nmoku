import { describe, expect, it } from "vite-plus/test";
import { CPU, HUMAN, newMatch, play, SIZE } from "./game.ts";
import { clearState, loadState, saveState, STATE_KEY } from "./storage.ts";

function memoryStorage() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
    raw: m,
  };
}

describe("保存と復元", () => {
  it("途中の盤面・手番・目標を復元できる", () => {
    const st = memoryStorage();
    const s = newMatch();
    s.n[HUMAN] = 5;
    play(s, 7 * SIZE + 7);
    play(s, 7 * SIZE + 8);
    play(s, 8 * SIZE + 7);
    saveState(s, st);
    const r = loadState(st);
    expect(r).toEqual(s);
    expect(r?.turn).toBe(CPU);
  });

  it("保存が無ければ null", () => {
    expect(loadState(memoryStorage())).toBeNull();
  });

  it("壊れたデータは無視する", () => {
    const st = memoryStorage();
    st.setItem(STATE_KEY, "{not json");
    expect(loadState(st)).toBeNull();
    st.setItem(STATE_KEY, JSON.stringify({ ...newMatch(), board: [1, 2, 3] }));
    expect(loadState(st)).toBeNull();
  });

  it("消したら復元されない", () => {
    const st = memoryStorage();
    saveState(newMatch(), st);
    clearState(st);
    expect(loadState(st)).toBeNull();
  });

  it("ストレージが使えなくても落ちない", () => {
    const broken = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
      removeItem: () => {
        throw new Error("blocked");
      },
    };
    expect(() => saveState(newMatch(), broken)).not.toThrow();
    expect(loadState(broken)).toBeNull();
    expect(() => clearState(broken)).not.toThrow();
  });
});
