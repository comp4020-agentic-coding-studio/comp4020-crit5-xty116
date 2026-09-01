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

export const LEVELS: readonly LevelDefinition[] = [
  {
    id: "first-light",
    speed: 0.13,
    start: "s",
    initialRoutes: { a: 0 },
    nodes: [
      { id: "s", x: 0.08, y: 0.58, kind: "start", next: "a" },
      { id: "a", x: 0.45, y: 0.58, kind: "junction", routes: ["x", "g"] },
      { id: "x", x: 0.82, y: 0.8, kind: "hazard" },
      { id: "g", x: 0.88, y: 0.22, kind: "goal" },
    ],
  },
  {
    id: "cross-current",
    speed: 0.15,
    start: "s",
    initialRoutes: { a: 0, b: 1 },
    nodes: [
      { id: "s", x: 0.06, y: 0.72, kind: "start", next: "a" },
      { id: "a", x: 0.3, y: 0.58, kind: "junction", routes: ["x", "b"] },
      { id: "x", x: 0.54, y: 0.84, kind: "hazard" },
      { id: "b", x: 0.58, y: 0.38, kind: "junction", routes: ["g", "y"] },
      { id: "y", x: 0.86, y: 0.62, kind: "hazard" },
      { id: "g", x: 0.91, y: 0.14, kind: "goal" },
    ],
  },
  {
    id: "three-way",
    speed: 0.165,
    start: "s",
    initialRoutes: { a: 0, b: 0, c: 1 },
    nodes: [
      { id: "s", x: 0.05, y: 0.48, kind: "start", next: "a" },
      { id: "a", x: 0.27, y: 0.48, kind: "junction", routes: ["x", "b"] },
      { id: "x", x: 0.48, y: 0.76, kind: "hazard" },
      { id: "b", x: 0.5, y: 0.25, kind: "junction", routes: ["y", "c"] },
      { id: "y", x: 0.7, y: 0.08, kind: "hazard" },
      { id: "c", x: 0.72, y: 0.48, kind: "junction", routes: ["g", "z"] },
      { id: "z", x: 0.9, y: 0.74, kind: "hazard" },
      { id: "g", x: 0.94, y: 0.22, kind: "goal" },
    ],
  },
  {
    id: "return-loop",
    speed: 0.18,
    start: "s",
    initialRoutes: { a: 0, b: 0, c: 0 },
    nodes: [
      { id: "s", x: 0.06, y: 0.76, kind: "start", next: "a" },
      { id: "a", x: 0.28, y: 0.58, kind: "junction", routes: ["x", "b"] },
      { id: "x", x: 0.47, y: 0.84, kind: "hazard" },
      { id: "b", x: 0.52, y: 0.28, kind: "junction", routes: ["c", "y"] },
      { id: "y", x: 0.74, y: 0.08, kind: "hazard" },
      { id: "c", x: 0.75, y: 0.52, kind: "junction", routes: ["a", "g"] },
      { id: "g", x: 0.94, y: 0.25, kind: "goal" },
    ],
  },
  {
    id: "rush-line",
    speed: 0.205,
    start: "s",
    initialRoutes: { a: 0, b: 1, c: 0, d: 1, e: 0 },
    nodes: [
      { id: "s", x: 0.04, y: 0.5, kind: "start", next: "a" },
      { id: "a", x: 0.2, y: 0.5, kind: "junction", routes: ["x", "b"] },
      { id: "x", x: 0.34, y: 0.78, kind: "hazard" },
      { id: "b", x: 0.37, y: 0.27, kind: "junction", routes: ["c", "y"] },
      { id: "y", x: 0.51, y: 0.08, kind: "hazard" },
      { id: "c", x: 0.53, y: 0.5, kind: "junction", routes: ["z", "d"] },
      { id: "z", x: 0.64, y: 0.78, kind: "hazard" },
      { id: "d", x: 0.69, y: 0.28, kind: "junction", routes: ["e", "w"] },
      { id: "w", x: 0.82, y: 0.08, kind: "hazard" },
      { id: "e", x: 0.83, y: 0.5, kind: "junction", routes: ["q", "g"] },
      { id: "q", x: 0.94, y: 0.76, kind: "hazard" },
      { id: "g", x: 0.96, y: 0.26, kind: "goal" },
    ],
  },
];

export function nodeById(level: LevelDefinition, id: string): TrackNode {
  const node = level.nodes.find((candidate) => candidate.id === id);
  if (!node) throw new Error(`Unknown node ${id} in ${level.id}`);
  return node;
}

export function createRun(level: LevelDefinition): RunState {
  const start = nodeById(level, level.start);
  if (start.kind !== "start" || !start.next) throw new Error(`${level.id} needs a connected start`);
  nodeById(level, start.next);
  return {
    status: "idle",
    from: start.id,
    to: start.next,
    progress: 0,
    elapsedMs: 0,
    routes: { ...level.initialRoutes },
  };
}

export function toggleJunction(
  level: LevelDefinition,
  state: RunState,
  junctionId: string,
): RunState {
  if (state.status === "won" || state.status === "lost") return state;
  const junction = nodeById(level, junctionId);
  if (junction.kind !== "junction" || !junction.routes) return state;
  const current = state.routes[junctionId] ?? 0;
  return {
    ...state,
    status: state.status === "idle" ? "running" : state.status,
    routes: { ...state.routes, [junctionId]: current === 0 ? 1 : 0 },
  };
}

export function advanceRun(
  level: LevelDefinition,
  state: RunState,
  deltaMs: number,
): RunState {
  if (state.status !== "running" || deltaMs <= 0) return state;

  let from = state.from;
  let to = state.to;
  let progress = state.progress;
  let remainingSeconds = Math.min(deltaMs, 1_000) / 1_000;
  let transitions = 0;

  while (remainingSeconds > 0 && transitions < 24) {
    const fromNode = nodeById(level, from);
    const toNode = nodeById(level, to);
    const distance = Math.max(0.001, Math.hypot(toNode.x - fromNode.x, toNode.y - fromNode.y));
    const secondsToArrival = ((1 - progress) * distance) / level.speed;

    if (remainingSeconds < secondsToArrival) {
      progress += (remainingSeconds * level.speed) / distance;
      remainingSeconds = 0;
      break;
    }

    remainingSeconds -= secondsToArrival;
    progress = 0;
    from = toNode.id;
    transitions += 1;

    if (toNode.kind === "goal" || toNode.kind === "hazard") {
      return {
        ...state,
        status: toNode.kind === "goal" ? "won" : "lost",
        from,
        to: from,
        progress: 1,
        elapsedMs: state.elapsedMs + deltaMs,
      };
    }

    if (toNode.kind === "junction" && toNode.routes) {
      to = toNode.routes[state.routes[toNode.id] ?? 0];
    } else if (toNode.next) {
      to = toNode.next;
    } else {
      throw new Error(`Node ${toNode.id} has no onward route`);
    }
  }

  return {
    ...state,
    from,
    to,
    progress,
    elapsedMs: state.elapsedMs + deltaMs,
  };
}
