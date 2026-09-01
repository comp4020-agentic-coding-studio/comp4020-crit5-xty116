import { describe, expect, it } from "vitest";
import {
  LEVELS,
  advanceRun,
  createRun,
  toggleJunction,
  type LevelDefinition,
  type RunState,
} from "../game-model.ts";

function advanceFor(level: LevelDefinition, initial: RunState, durationMs: number): RunState {
  let state = initial;
  let elapsed = 0;
  while (elapsed < durationMs && state.status === "running") {
    const delta = Math.min(16, durationMs - elapsed);
    state = advanceRun(level, state, delta);
    elapsed += delta;
  }
  return state;
}

function finish(level: LevelDefinition, initial: RunState): RunState {
  return advanceFor(level, initial, 30_000);
}

describe("Turnline dispatch model", () => {
  it("is a five-line campaign built from one interactable node kind", () => {
    expect(LEVELS).toHaveLength(5);
    for (const level of LEVELS) {
      expect(level.nodes.filter((node) => node.kind === "junction").length).toBeGreaterThan(0);
      expect(level.signals.length).toBeGreaterThan(0);
      for (const signal of level.signals) {
        expect(
          level.nodes.some((node) => node.kind === "goal" && node.accepts === signal.shape),
        ).toBe(true);
      }
    }
  });

  it("begins on the board and the first junction toggle dispatches traffic", () => {
    const level = LEVELS[0];
    const idle = createRun(level);
    expect(idle.status).toBe("idle");
    expect(idle.signals[0].status).toBe("queued");

    const started = toggleJunction(level, idle, "a");
    expect(started.status).toBe("running");
    expect(started.routes.a).not.toBe(idle.routes.a);
  });

  it("allows a broken route to end the attempt", () => {
    const level = LEVELS[0];
    const running = { ...createRun(level), status: "running" as const };
    expect(finish(level, running).status).toBe("lost");
  });

  it("lets a deliberate first route reach its matching terminal", () => {
    const level = LEVELS[0];
    const started = toggleJunction(level, createRun(level), "a");
    const finished = finish(level, started);
    expect(finished.status).toBe("won");
    expect(finished.signals[0].status).toBe("arrived");
  });

  it("loses when delayed traffic reaches the wrong-shaped terminal", () => {
    const level = LEVELS[1];
    const started = toggleJunction(level, createRun(level), "a");
    const finished = finish(level, started);
    expect(finished.status).toBe("lost");
    expect(finished.signals.some((signal) => signal.status === "failed")).toBe(true);
  });

  it("requires a live re-switch between differently shaped signals", () => {
    const level = LEVELS[1];
    let state = toggleJunction(level, createRun(level), "a");
    state = advanceFor(level, state, 2_800);
    state = toggleJunction(level, state, "a");
    const finished = finish(level, state);
    expect(finished.status).toBe("won");
    expect(finished.signals.every((signal) => signal.status === "arrived")).toBe(true);
  });

  it("makes the final relay coordinate two junctions over time", () => {
    const level = LEVELS[4];
    let state = toggleJunction(level, createRun(level), "a");
    state = advanceFor(level, state, 1_800);
    state = toggleJunction(level, state, "a");
    state = toggleJunction(level, state, "b");
    state = advanceFor(level, state, 3_900);
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
