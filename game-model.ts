export type RunStatus = "idle" | "running" | "won" | "lost";
export type NodeKind = "start" | "junction" | "waypoint" | "goal" | "hazard";

export interface TrackNode {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly kind: NodeKind;
  readonly next?: string;
  readonly routes?: readonly [string, string];
}

export interface LevelDefinition {
  readonly id: string;
  readonly speed: number;
  readonly start: string;
  readonly initialRoutes: Readonly<Record<string, 0 | 1>>;
  readonly nodes: readonly TrackNode[];
}

export interface RunState {
  readonly status: RunStatus;
  readonly from: string;
  readonly to: string;
  readonly progress: number;
  readonly elapsedMs: number;
  readonly routes: Readonly<Record<string, 0 | 1>>;
}

export const LEVELS: readonly LevelDefinition[] = [];

export function createRun(_level: LevelDefinition): RunState {
  throw new Error("Turnline model not implemented");
}

export function toggleJunction(
  _level: LevelDefinition,
  state: RunState,
  _junctionId: string,
): RunState {
  return state;
}

export function advanceRun(
  _level: LevelDefinition,
  state: RunState,
  _deltaMs: number,
): RunState {
  return state;
}
