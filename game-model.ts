export type RunStatus = "idle" | "running" | "won" | "lost";
export type SignalStatus = "queued" | "moving" | "arrived" | "failed";
export type SignalShape = "square" | "circle" | "diamond";
export type NodeKind = "start" | "junction" | "waypoint" | "goal" | "hazard";

export interface TrackNode {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly kind: NodeKind;
  readonly next?: string;
  readonly routes?: readonly [string, string];
  readonly accepts?: SignalShape;
}

export interface SignalDefinition {
  readonly id: string;
  readonly shape: SignalShape;
  readonly start: string;
  readonly delayMs: number;
}

export interface LevelDefinition {
  readonly id: string;
  readonly speed: number;
  readonly signals: readonly SignalDefinition[];
  readonly initialRoutes: Readonly<Record<string, 0 | 1>>;
  readonly nodes: readonly TrackNode[];
}

export interface SignalState {
  readonly id: string;
  readonly shape: SignalShape;
  readonly status: SignalStatus;
  readonly from: string;
  readonly to: string;
  readonly progress: number;
  readonly delayMs: number;
}

export interface RunState {
  readonly status: RunStatus;
  readonly elapsedMs: number;
  readonly routes: Readonly<Record<string, 0 | 1>>;
  readonly signals: readonly SignalState[];
}

export const LEVELS: readonly LevelDefinition[] = [
  {
    id: "first-light",
    speed: 0.145,
    signals: [{ id: "q1", shape: "square", start: "s", delayMs: 0 }],
    initialRoutes: { a: 0 },
    nodes: [
      { id: "s", x: 0.08, y: 0.58, kind: "start", next: "a" },
      { id: "a", x: 0.45, y: 0.58, kind: "junction", routes: ["x", "gs"] },
      { id: "x", x: 0.82, y: 0.8, kind: "hazard" },
      { id: "gs", x: 0.88, y: 0.22, kind: "goal", accepts: "square" },
    ],
  },
  {
    id: "alternating-dispatch",
    speed: 0.165,
    signals: [
      { id: "q1", shape: "square", start: "ss", delayMs: 0 },
      { id: "q2", shape: "circle", start: "sc", delayMs: 3_000 },
    ],
    initialRoutes: { a: 1 },
    nodes: [
      { id: "ss", x: 0.06, y: 0.35, kind: "start", next: "a" },
      { id: "sc", x: 0.06, y: 0.72, kind: "start", next: "a" },
      { id: "a", x: 0.44, y: 0.53, kind: "junction", routes: ["gs", "gc"] },
      { id: "gs", x: 0.9, y: 0.22, kind: "goal", accepts: "square" },
      { id: "gc", x: 0.9, y: 0.82, kind: "goal", accepts: "circle" },
    ],
  },
  {
    id: "sorting-yard",
    speed: 0.18,
    signals: [
      { id: "q1", shape: "square", start: "ss", delayMs: 0 },
      { id: "q2", shape: "circle", start: "sc", delayMs: 2_600 },
    ],
    initialRoutes: { a: 1, b: 0, c: 1 },
    nodes: [
      { id: "ss", x: 0.05, y: 0.38, kind: "start", next: "a" },
      { id: "sc", x: 0.05, y: 0.72, kind: "start", next: "a" },
      { id: "a", x: 0.29, y: 0.53, kind: "junction", routes: ["b", "c"] },
      { id: "b", x: 0.56, y: 0.27, kind: "junction", routes: ["x", "gs"] },
      { id: "c", x: 0.56, y: 0.74, kind: "junction", routes: ["gc", "y"] },
      { id: "x", x: 0.82, y: 0.08, kind: "hazard" },
      { id: "gs", x: 0.92, y: 0.22, kind: "goal", accepts: "square" },
      { id: "gc", x: 0.92, y: 0.82, kind: "goal", accepts: "circle" },
      { id: "y", x: 0.82, y: 0.96, kind: "hazard" },
    ],
  },
  {
    id: "triple-pulse",
    speed: 0.19,
    signals: [
      { id: "q1", shape: "square", start: "s", delayMs: 0 },
      { id: "q2", shape: "circle", start: "s", delayMs: 1_800 },
      { id: "q3", shape: "square", start: "s", delayMs: 3_600 },
    ],
    initialRoutes: { a: 1 },
    nodes: [
      { id: "s", x: 0.06, y: 0.5, kind: "start", next: "a" },
      { id: "a", x: 0.38, y: 0.5, kind: "junction", routes: ["gs", "gc"] },
      { id: "gs", x: 0.91, y: 0.22, kind: "goal", accepts: "square" },
      { id: "gc", x: 0.91, y: 0.79, kind: "goal", accepts: "circle" },
    ],
  },
  {
    id: "three-way-relay",
    speed: 0.195,
    signals: [
      { id: "q1", shape: "square", start: "s", delayMs: 0 },
      { id: "q2", shape: "circle", start: "s", delayMs: 2_200 },
      { id: "q3", shape: "diamond", start: "s", delayMs: 4_400 },
    ],
    initialRoutes: { a: 1, b: 1 },
    nodes: [
      { id: "s", x: 0.05, y: 0.52, kind: "start", next: "a" },
      { id: "a", x: 0.35, y: 0.52, kind: "junction", routes: ["gs", "b"] },
      { id: "b", x: 0.62, y: 0.55, kind: "junction", routes: ["gc", "gd"] },
      { id: "gs", x: 0.88, y: 0.14, kind: "goal", accepts: "square" },
      { id: "gc", x: 0.9, y: 0.51, kind: "goal", accepts: "circle" },
      { id: "gd", x: 0.88, y: 0.86, kind: "goal", accepts: "diamond" },
    ],
  },
  {
    id: "relay-four",
    speed: 0.2,
    signals: [
      { id: "q1", shape: "square", start: "s", delayMs: 0 },
      { id: "q2", shape: "circle", start: "s", delayMs: 1_800 },
      { id: "q3", shape: "diamond", start: "s", delayMs: 3_600 },
      { id: "q4", shape: "circle", start: "s", delayMs: 5_400 },
    ],
    initialRoutes: { a: 1, b: 1 },
    nodes: [
      { id: "s", x: 0.05, y: 0.52, kind: "start", next: "a" },
      { id: "a", x: 0.31, y: 0.52, kind: "junction", routes: ["gs", "b"] },
      { id: "b", x: 0.59, y: 0.55, kind: "junction", routes: ["gc", "gd"] },
      { id: "gs", x: 0.9, y: 0.12, kind: "goal", accepts: "square" },
      { id: "gc", x: 0.9, y: 0.5, kind: "goal", accepts: "circle" },
      { id: "gd", x: 0.9, y: 0.87, kind: "goal", accepts: "diamond" },
    ],
  },
  {
    id: "switchyard-five",
    speed: 0.205,
    signals: [
      { id: "q1", shape: "square", start: "s", delayMs: 0 },
      { id: "q2", shape: "circle", start: "s", delayMs: 1_700 },
      { id: "q3", shape: "diamond", start: "s", delayMs: 3_400 },
      { id: "q4", shape: "square", start: "s", delayMs: 5_100 },
      { id: "q5", shape: "diamond", start: "s", delayMs: 6_800 },
    ],
    initialRoutes: { a: 1, b: 0, c: 1 },
    nodes: [
      { id: "s", x: 0.04, y: 0.5, kind: "start", next: "a" },
      { id: "a", x: 0.29, y: 0.5, kind: "junction", routes: ["b", "c"] },
      { id: "b", x: 0.55, y: 0.27, kind: "junction", routes: ["gs", "gd"] },
      { id: "c", x: 0.55, y: 0.74, kind: "junction", routes: ["gc", "gd"] },
      { id: "gs", x: 0.9, y: 0.1, kind: "goal", accepts: "square" },
      { id: "gc", x: 0.9, y: 0.5, kind: "goal", accepts: "circle" },
      { id: "gd", x: 0.9, y: 0.89, kind: "goal", accepts: "diamond" },
    ],
  },
  {
    id: "terminal-rush",
    speed: 0.21,
    signals: [
      { id: "q1", shape: "square", start: "s", delayMs: 0 },
      { id: "q2", shape: "circle", start: "s", delayMs: 1_500 },
      { id: "q3", shape: "diamond", start: "s", delayMs: 3_000 },
      { id: "q4", shape: "square", start: "s", delayMs: 4_500 },
      { id: "q5", shape: "diamond", start: "s", delayMs: 6_000 },
      { id: "q6", shape: "circle", start: "s", delayMs: 7_500 },
    ],
    initialRoutes: { a: 1, b: 0, c: 1 },
    nodes: [
      { id: "s", x: 0.04, y: 0.52, kind: "start", next: "a" },
      { id: "a", x: 0.28, y: 0.52, kind: "junction", routes: ["b", "c"] },
      { id: "b", x: 0.54, y: 0.28, kind: "junction", routes: ["gs", "gd"] },
      { id: "c", x: 0.54, y: 0.76, kind: "junction", routes: ["gc", "gd"] },
      { id: "gs", x: 0.9, y: 0.1, kind: "goal", accepts: "square" },
      { id: "gc", x: 0.9, y: 0.5, kind: "goal", accepts: "circle" },
      { id: "gd", x: 0.9, y: 0.9, kind: "goal", accepts: "diamond" },
    ],
  },
];

export function nodeById(level: LevelDefinition, id: string): TrackNode {
  const node = level.nodes.find((candidate) => candidate.id === id);
  if (!node) throw new Error(`Unknown node ${id} in ${level.id}`);
  return node;
}

export function createRun(level: LevelDefinition): RunState {
  const signals = level.signals.map<SignalState>((definition) => {
    const start = nodeById(level, definition.start);
    if (start.kind !== "start" || !start.next) {
      throw new Error(`${level.id} needs a connected start for ${definition.id}`);
    }
    nodeById(level, start.next);
    return {
      id: definition.id,
      shape: definition.shape,
      status: "queued",
      from: start.id,
      to: start.next,
      progress: 0,
      delayMs: definition.delayMs,
    };
  });

  return {
    status: "idle",
    elapsedMs: 0,
    routes: { ...level.initialRoutes },
    signals,
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

function moveSignal(
  level: LevelDefinition,
  signal: SignalState,
  routes: Readonly<Record<string, 0 | 1>>,
  deltaMs: number,
): SignalState {
  if (signal.status !== "moving" || deltaMs <= 0) return signal;

  let from = signal.from;
  let to = signal.to;
  let progress = signal.progress;
  let remainingSeconds = deltaMs / 1_000;
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

    if (toNode.kind === "hazard") {
      return { ...signal, status: "failed", from, to: from, progress: 1 };
    }

    if (toNode.kind === "goal") {
      const status: SignalStatus = toNode.accepts === signal.shape ? "arrived" : "failed";
      return { ...signal, status, from, to: from, progress: 1 };
    }

    if (toNode.kind === "junction" && toNode.routes) {
      to = toNode.routes[routes[toNode.id] ?? 0];
    } else if (toNode.next) {
      to = toNode.next;
    } else {
      throw new Error(`Node ${toNode.id} has no onward route`);
    }
  }

  return { ...signal, from, to, progress };
}

export function advanceRun(
  level: LevelDefinition,
  state: RunState,
  deltaMs: number,
): RunState {
  if (state.status !== "running" || deltaMs <= 0) return state;

  const safeDelta = Math.min(deltaMs, 1_000);
  const elapsedMs = state.elapsedMs + safeDelta;
  const signals = state.signals.map((current) => {
    if (current.status === "arrived" || current.status === "failed") return current;

    const activeDelta =
      current.status === "queued"
        ? Math.max(0, elapsedMs - Math.max(state.elapsedMs, current.delayMs))
        : safeDelta;

    if (current.status === "queued" && elapsedMs < current.delayMs) return current;
    const moving: SignalState =
      current.status === "queued" ? { ...current, status: "moving" } : current;
    return moveSignal(level, moving, state.routes, activeDelta);
  });

  const status: RunStatus = signals.some((signal) => signal.status === "failed")
    ? "lost"
    : signals.every((signal) => signal.status === "arrived")
      ? "won"
      : "running";

  return {
    ...state,
    status,
    elapsedMs,
    signals,
  };
}
