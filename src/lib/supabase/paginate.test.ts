import { describe, expect, it } from "vitest";
import { selectAll } from "./paginate";

const pager = (total: number, size: number) => {
  const all = Array.from({ length: total }, (_, index) => ({ id: index }));
  const calls: [number, number][] = [];
  const page = async (from: number, to: number) => {
    calls.push([from, to]);
    return { data: all.slice(from, to + 1), error: null };
  };
  return { page, calls, size };
};

describe("selectAll", () => {
  it("rend une page incomplète sans redemander", async () => {
    const { page, calls } = pager(3, 10);
    expect((await selectAll(page, 10)).data).toHaveLength(3);
    expect(calls).toEqual([[0, 9]]);
  });

  it("continue tant qu'une page est pleine", async () => {
    const { page, calls } = pager(25, 10);
    const { data } = await selectAll(page, 10);
    expect(data).toHaveLength(25);
    expect(calls).toEqual([[0, 9], [10, 19], [20, 29]]);
  });

  it("redemande une fois de plus quand le total tombe juste sur une page pleine", async () => {
    // 20 lignes sur des pages de 10 : impossible de savoir que c'est fini sans demander.
    const { page, calls } = pager(20, 10);
    expect((await selectAll(page, 10)).data).toHaveLength(20);
    expect(calls).toHaveLength(3);
  });

  it("s'arrête à la première erreur et rend ce qui était déjà lu", async () => {
    let seen = 0;
    const { data, error } = await selectAll<{ id: number }>(async () => {
      seen += 1;
      return seen === 1 ? { data: [{ id: 1 }, { id: 2 }], error: null } : { data: null, error: { message: "coupure réseau" } };
    }, 2);
    expect(error?.message).toBe("coupure réseau");
    expect(data).toHaveLength(2);
  });
});
