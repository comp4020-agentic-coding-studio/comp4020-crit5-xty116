import { describe, expect, it } from "vitest";
import {
  LEVELS,
  advanceRun,
  createRun,
  toggleJunction,
  type LevelDefinition,
  type RunState,
} from "../game-model.ts";

function finish(level: LevelDefinition, initial: RunState): RunState {
  let state = initial;
  for (let frame = 0; frame < 1_000 && state.status === "running"; frame += 1) {
    state = advanceRun(level, state, 16);
  }
  return state;
}

describe("Turnline route model", () => {
  it("is a five-line campaign built from one interactable node kind", () => {
    expect(LEVELS).toHaveLength(5);
    for (const level of LEVELS) {
      expect(level.nodes.filter((node) => node.kind === "junction").length).toBeGreaterThan(0);
      expect(level.nodes.filter((node) => node.kind === "goal")).toHaveLength(1);
      expect(level.nodes.filter((node) => node.kind === "hazard").length).toBeGreaterThan(0);
    }
  });

  it("begins on the board and the first junction toggle starts the signal", () => {
    const level = LEVELS[0];
    const idle = createRun(level);
    expect(idle.status).toBe("idle");

    const started = toggleJunction(level, idle, "a");
    expect(started.status).toBe("running");
    expect(started.routes.a).not.toBe(idle.routes.a);
  });

  it("allows a wrong route to end the attempt", () => {
    const level = LEVELS[0];
    const idle = createRun(level);
    const running = { ...idle, status: "running" as const };
    expect(finish(level, running).status).toBe("lost");
  });

  it("lets a deliberate route reach the goal", () => {
    const level = LEVELS[0];
    const started = toggleJunction(level, createRun(level), "a");
    expect(finish(level, started).status).toBe("won");
  });

  it("keeps junctions live while the signal is moving", () => {
    const level = LEVELS[1];
    let state = toggleJunction(level, createRun(level), "a");
    expect(state.status).toBe("running");
    state = toggleJunction(level, state, "b");
    expect(finish(level, state).status).toBe("won");
  });

  it("does not mutate a terminal attempt", () => {
    const level = LEVELS[0];
    const lost = finish(level, { ...createRun(level), status: "running" });
    expect(advanceRun(level, lost, 500)).toEqual(lost);
    expect(toggleJunction(level, lost, "a")).toEqual(lost);
  });
});
