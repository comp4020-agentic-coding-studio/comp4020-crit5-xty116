import { RotateCcw, Volume2, VolumeX, createIcons } from "lucide";
import {
  LEVELS,
  advanceRun,
  createRun,
  nodeById,
  toggleJunction,
  type SignalShape,
  type SignalState,
  type TrackNode,
} from "./game-model";

const canvas = requireElement<HTMLCanvasElement>("#track-canvas");
const context = requireCanvasContext(canvas);

const junctionLayer = requireElement<HTMLDivElement>("#junction-layer");
const lineReadout = requireElement<HTMLElement>("#line-readout");
const trafficReadout = requireElement<HTMLElement>("#traffic-readout");
const faultReadout = requireElement<HTMLElement>("#fault-readout");
const statusCopy = requireElement<HTMLElement>("#status-copy");
const statusIndex = requireElement<HTMLElement>(".status-index");
const liveStatus = requireElement<HTMLElement>("#live-status");
const dispatchStrip = requireElement<HTMLOListElement>("#dispatch-strip");
const progressList = requireElement<HTMLOListElement>("#line-progress");
const resultOverlay = requireElement<HTMLElement>("#result-overlay");
const resultKicker = requireElement<HTMLElement>("#result-kicker");
const resultTitle = requireElement<HTMLElement>("#result-title");
const resultDetail = requireElement<HTMLElement>("#result-detail");
const resultAction = requireElement<HTMLButtonElement>("#result-action");
const restartButton = requireElement<HTMLButtonElement>("#restart-button");
const soundButton = requireElement<HTMLButtonElement>("#sound-button");

createIcons({ icons: { RotateCcw, Volume2, VolumeX } });

const palette = {
  background: "#0a0b0b",
  ink: "#f4f0e8",
  muted: "#59605d",
  square: "#6ee7de",
  circle: "#9be564",
  diamond: "#f4f0e8",
  route: "#ffd147",
  danger: "#ff6c5f",
};

let levelIndex = 0;
let level = LEVELS[levelIndex];
let run = createRun(level);
let faults = 0;
let lastFrame = performance.now();
let transitionTimer = 0;
let activeFrame = 0;
let canvasReady = false;
let muted = false;
let audioContext: AudioContext | null = null;

interface BoardBounds {
  left: number;
  top: number;
  width: number;
  height: number;
}

function requireElement<T extends HTMLElement>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Missing element: ${selector}`);
  return element;
}

function requireCanvasContext(element: HTMLCanvasElement): CanvasRenderingContext2D {
  const value = element.getContext("2d");
  if (!value) throw new Error("Canvas 2D is unavailable");
  return value;
}

function twoDigits(value: number): string {
  return String(value).padStart(2, "0");
}

function shapeColor(shape: SignalShape): string {
  return palette[shape];
}

function shapeName(shape: SignalShape): string {
  return shape.charAt(0).toUpperCase() + shape.slice(1);
}

function boardBounds(): BoardBounds {
  const compact = canvas.clientWidth <= 760;
  const left = compact ? 20 : Math.min(340, canvas.clientWidth * 0.25);
  const right = compact ? 20 : 44;
  const top = compact ? 215 : 112;
  const bottom = compact ? 104 : 86;
  return {
    left,
    top,
    width: Math.max(1, canvas.clientWidth - left - right),
    height: Math.max(1, canvas.clientHeight - top - bottom),
  };
}

function pointFor(node: TrackNode, bounds = boardBounds()): { x: number; y: number } {
  return {
    x: bounds.left + node.x * bounds.width,
    y: bounds.top + node.y * bounds.height,
  };
}

function resizeCanvas(): void {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(1, canvas.clientWidth);
  const height = Math.max(1, canvas.clientHeight);
  const pixelWidth = Math.round(width * ratio);
  const pixelHeight = Math.round(height * ratio);
  const sizeChanged = canvas.width !== pixelWidth || canvas.height !== pixelHeight;
  if (sizeChanged) {
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  }
  placeJunctions();
  if (canvasReady && sizeChanged) draw();
}

function tone(frequency: number, duration: number, volume = 0.045, delay = 0): void {
  if (muted) return;
  audioContext ??= new AudioContext();
  if (audioContext.state === "suspended") void audioContext.resume();

  const start = audioContext.currentTime + delay;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = "triangle";
  oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.03);
}

function shapeFrequency(shape: SignalShape): number {
  if (shape === "square") return 523.25;
  if (shape === "circle") return 659.25;
  return 783.99;
}

function arrivalTone(shape: SignalShape): void {
  const frequency = shapeFrequency(shape);
  tone(frequency, 0.18, 0.035);
  tone(frequency * 1.25, 0.24, 0.03, 0.08);
}

function successTone(): void {
  tone(392, 0.28, 0.04);
  tone(523.25, 0.32, 0.04, 0.11);
  tone(659.25, 0.42, 0.045, 0.22);
}

function failureTone(): void {
  tone(196, 0.32, 0.05);
  tone(138.59, 0.48, 0.045, 0.12);
}

function drawGrid(width: number, height: number): void {
  context.save();
  context.strokeStyle = "#1b1f1d";
  context.lineWidth = 1;
  context.beginPath();
  for (let x = 0; x < width; x += 24) {
    context.moveTo(x + 0.5, 0);
    context.lineTo(x + 0.5, height);
  }
  for (let y = 0; y < height; y += 24) {
    context.moveTo(0, y + 0.5);
    context.lineTo(width, y + 0.5);
  }
  context.stroke();
  context.restore();
}

function traceShape(shape: SignalShape, size: number): void {
  context.beginPath();
  if (shape === "square") {
    context.rect(-size, -size, size * 2, size * 2);
    return;
  }
  if (shape === "circle") {
    context.arc(0, 0, size, 0, Math.PI * 2);
    return;
  }
  context.moveTo(0, -size * 1.25);
  context.lineTo(size * 1.25, 0);
  context.lineTo(0, size * 1.25);
  context.lineTo(-size * 1.25, 0);
  context.closePath();
}

function drawShape(shape: SignalShape, size: number, color: string, filled: boolean): void {
  traceShape(shape, size);
  context.strokeStyle = color;
  context.lineWidth = 3;
  if (filled) {
    context.fillStyle = color;
    context.fill();
  }
  context.stroke();
}

function drawRail(from: TrackNode, to: TrackNode, active: boolean): void {
  const start = pointFor(from);
  const end = pointFor(to);
  context.save();
  context.beginPath();
  context.moveTo(start.x, start.y);
  context.lineTo(end.x, end.y);
  context.strokeStyle = active ? palette.ink : palette.muted;
  context.lineWidth = active ? 5 : 2;
  context.setLineDash(active ? [] : [8, 11]);
  context.stroke();

  if (active) {
    const angle = Math.atan2(end.y - start.y, end.x - start.x);
    const x = start.x + (end.x - start.x) * 0.54;
    const y = start.y + (end.y - start.y) * 0.54;
    context.translate(x, y);
    context.rotate(angle);
    context.fillStyle = palette.route;
    context.beginPath();
    context.moveTo(8, 0);
    context.lineTo(-5, -5);
    context.lineTo(-5, 5);
    context.closePath();
    context.fill();
  }
  context.restore();
}

function drawNetwork(): void {
  for (const node of level.nodes) {
    if (node.next) drawRail(node, nodeById(level, node.next), true);
    if (!node.routes) continue;
    node.routes.forEach((targetId, routeIndex) => {
      drawRail(node, nodeById(level, targetId), run.routes[node.id] === routeIndex);
    });
  }
}

function drawTerminal(node: TrackNode): void {
  const point = pointFor(node);
  context.save();
  context.translate(point.x, point.y);

  if (node.kind === "start") {
    context.strokeStyle = palette.muted;
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(-13, -17);
    context.lineTo(-18, -17);
    context.lineTo(-18, 17);
    context.lineTo(-13, 17);
    context.stroke();
  }

  if (node.kind === "goal" && node.accepts) {
    const color = shapeColor(node.accepts);
    const arrived = run.signals.some(
      (signal) =>
        signal.status === "arrived" && signal.shape === node.accepts && signal.from === node.id,
    );
    context.globalAlpha = arrived ? 1 : 0.9;
    drawShape(node.accepts, 15, color, false);
    drawShape(node.accepts, 6, color, arrived);
    context.strokeStyle = color;
    context.lineWidth = 1;
    context.beginPath();
    context.arc(0, 0, 24, 0, Math.PI * 2);
    context.stroke();
  }

  if (node.kind === "hazard") {
    context.strokeStyle = palette.danger;
    context.lineWidth = 4;
    context.beginPath();
    context.moveTo(-11, -11);
    context.lineTo(11, 11);
    context.moveTo(11, -11);
    context.lineTo(-11, 11);
    context.stroke();
  }
  context.restore();
}

function drawJunction(node: TrackNode): void {
  const point = pointFor(node);
  const selected = run.routes[node.id] ?? 0;
  const target = node.routes ? pointFor(nodeById(level, node.routes[selected])) : point;
  const angle = Math.atan2(target.y - point.y, target.x - point.x);

  context.save();
  context.translate(point.x, point.y);
  context.rotate(angle);
  context.fillStyle = palette.background;
  context.strokeStyle = palette.route;
  context.lineWidth = 2;
  context.beginPath();
  context.rect(-11, -11, 22, 22);
  context.fill();
  context.stroke();
  context.fillStyle = palette.route;
  context.beginPath();
  context.moveTo(14, 0);
  context.lineTo(4, -4);
  context.lineTo(4, 4);
  context.closePath();
  context.fill();
  context.restore();
}

function queuedPoint(signal: SignalState): { x: number; y: number } {
  const start = pointFor(nodeById(level, signal.from));
  const siblings = run.signals.filter(
    (candidate) => candidate.status === "queued" && candidate.from === signal.from,
  );
  const index = siblings.findIndex((candidate) => candidate.id === signal.id);
  return {
    x: start.x,
    y: start.y + (index - (siblings.length - 1) / 2) * 26,
  };
}

function drawSignal(signal: SignalState): void {
  if (signal.status === "arrived" || signal.status === "failed") return;
  const color = shapeColor(signal.shape);
  let point: { x: number; y: number };
  let angle = 0;

  if (signal.status === "queued") {
    point = queuedPoint(signal);
  } else {
    const from = pointFor(nodeById(level, signal.from));
    const to = pointFor(nodeById(level, signal.to));
    point = {
      x: from.x + (to.x - from.x) * signal.progress,
      y: from.y + (to.y - from.y) * signal.progress,
    };
    angle = Math.atan2(to.y - from.y, to.x - from.x);
  }

  context.save();
  context.translate(point.x, point.y);
  context.rotate(angle);
  context.globalAlpha = signal.status === "queued" ? 0.76 : 1;
  context.shadowColor = color;
  context.shadowBlur = signal.status === "moving" ? 20 : 8;
  drawShape(signal.shape, 11, color, signal.status === "moving");
  context.shadowBlur = 0;
  if (signal.status === "moving") {
    drawShape(signal.shape, 4, palette.background, true);
  }

  if (signal.status === "queued" && run.status === "running" && signal.delayMs > 0) {
    const readiness = Math.min(1, run.elapsedMs / signal.delayMs);
    context.strokeStyle = color;
    context.lineWidth = 2;
    context.beginPath();
    context.arc(0, 0, 18, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * readiness);
    context.stroke();
  }
  context.restore();
}

function draw(): void {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  context.clearRect(0, 0, width, height);
  drawGrid(width, height);
  drawNetwork();
  level.nodes.forEach((node) => {
    if (node.kind === "junction") drawJunction(node);
    else drawTerminal(node);
  });
  run.signals.forEach(drawSignal);
}

function placeJunctions(): void {
  const buttons = junctionLayer.querySelectorAll<HTMLButtonElement>(".junction");
  buttons.forEach((button) => {
    const node = nodeById(level, button.dataset.junction ?? "");
    const point = pointFor(node);
    button.style.left = `${point.x}px`;
    button.style.top = `${point.y}px`;
  });
}

function renderJunctionButtons(): void {
  junctionLayer.replaceChildren();
  const junctions = level.nodes.filter((node) => node.kind === "junction");
  junctions.forEach((node, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "junction";
    if (index === 0) button.classList.add("is-primary");
    button.dataset.junction = node.id;
    button.addEventListener("click", () => switchRoute(node.id));
    junctionLayer.append(button);
  });
  placeJunctions();
  updateJunctionButtons();
}

function updateJunctionButtons(): void {
  junctionLayer.querySelectorAll<HTMLButtonElement>(".junction").forEach((button, index) => {
    const id = button.dataset.junction ?? "";
    const selected = run.routes[id] ?? 0;
    button.dataset.selected = String(selected);
    button.classList.toggle("is-running", run.status !== "idle");
    button.setAttribute(
      "aria-label",
      `Junction ${index + 1}, route ${selected + 1} of 2 selected`,
    );
    button.title = `Junction ${index + 1}: route ${selected + 1}`;
  });
}

function switchRoute(id: string): void {
  if (run.status === "won" || run.status === "lost") return;
  const wasIdle = run.status === "idle";
  run = toggleJunction(level, run, id);
  tone(wasIdle ? 329.63 : 440, 0.12);
  liveStatus.textContent = wasIdle ? "Traffic dispatched" : "Junction switched";
  updateJunctionButtons();
  updateReadouts();
  animateRun();
}

function buildDispatchStrip(): void {
  dispatchStrip.replaceChildren();
  run.signals.forEach((signal, index) => {
    const item = document.createElement("li");
    const symbol = document.createElement("span");
    symbol.className = "signal-token";
    symbol.setAttribute("aria-hidden", "true");
    item.dataset.signal = signal.id;
    item.dataset.shape = signal.shape;
    item.append(symbol);
    item.setAttribute("aria-label", `Signal ${index + 1}: ${signal.shape}, queued`);
    dispatchStrip.append(item);
  });
  updateDispatchStrip();
}

function updateDispatchStrip(): void {
  dispatchStrip.querySelectorAll<HTMLLIElement>("li").forEach((item, index) => {
    const signal = run.signals[index];
    item.classList.toggle("is-moving", signal.status === "moving");
    item.classList.toggle("is-arrived", signal.status === "arrived");
    item.classList.toggle("is-failed", signal.status === "failed");
    item.setAttribute(
      "aria-label",
      `Signal ${index + 1}: ${signal.shape}, ${signal.status}`,
    );
  });
}

function buildProgress(): void {
  progressList.replaceChildren();
  LEVELS.forEach((_, index) => {
    const item = document.createElement("li");
    item.classList.toggle("is-complete", index < levelIndex);
    item.classList.toggle("is-current", index === levelIndex);
    item.setAttribute(
      "aria-label",
      `Line ${index + 1}: ${index < levelIndex ? "complete" : index === levelIndex ? "current" : "pending"}`,
    );
    progressList.append(item);
  });
}

function updateReadouts(): void {
  const arrived = run.signals.filter((signal) => signal.status === "arrived").length;
  const moving = run.signals.filter((signal) => signal.status === "moving").length;
  const queued = run.signals.filter((signal) => signal.status === "queued").length;
  lineReadout.textContent = `${twoDigits(levelIndex + 1)} / ${twoDigits(LEVELS.length)}`;
  trafficReadout.textContent = `${twoDigits(arrived)} / ${twoDigits(run.signals.length)}`;
  faultReadout.textContent = twoDigits(faults);
  statusIndex.textContent = twoDigits(levelIndex + 1);

  if (run.status === "idle") statusCopy.textContent = "Traffic held";
  if (run.status === "running") {
    statusCopy.textContent =
      queued > 0 ? `${moving} live / ${queued} queued` : `${moving} live`;
  }
  if (run.status === "won") statusCopy.textContent = "Line clear";
  if (run.status === "lost") statusCopy.textContent = "Traffic fault";
  updateDispatchStrip();
}

function loadLevel(nextIndex: number): void {
  window.clearTimeout(transitionTimer);
  levelIndex = nextIndex;
  level = LEVELS[levelIndex];
  run = createRun(level);
  lastFrame = performance.now();
  resultOverlay.hidden = true;
  resultAction.hidden = false;
  liveStatus.textContent = `Line ${levelIndex + 1} ready`;
  renderJunctionButtons();
  buildDispatchStrip();
  buildProgress();
  updateReadouts();
  draw();
  requestAnimationFrame(() => {
    junctionLayer.querySelector<HTMLButtonElement>(".junction")?.focus({ preventScroll: true });
  });
}

function showLoss(): void {
  faults += 1;
  failureTone();
  const failed = run.signals.find((signal) => signal.status === "failed");
  const terminal = failed ? nodeById(level, failed.from) : undefined;
  resultKicker.textContent = `Line ${twoDigits(levelIndex + 1)} / fault ${twoDigits(faults)}`;
  resultTitle.textContent = "MISROUTED";
  resultDetail.textContent =
    failed && terminal?.kind === "goal" && terminal.accepts
      ? `${shapeName(failed.shape)} traffic reached the ${terminal.accepts} terminal.`
      : "Traffic reached a broken line.";
  resultAction.hidden = false;
  resultAction.querySelector("span")!.textContent = "Run again";
  resultOverlay.hidden = false;
  liveStatus.textContent = "Route failed. Run the line again.";
  updateReadouts();
  resultAction.focus({ preventScroll: true });
}

function showWin(): void {
  successTone();
  resultKicker.textContent = `Line ${twoDigits(levelIndex + 1)}`;
  resultTitle.textContent = "SORTED";
  resultDetail.textContent = `${twoDigits(run.signals.length)} signals / ${(run.elapsedMs / 1000).toFixed(1)} seconds`;
  resultAction.hidden = true;
  resultOverlay.hidden = false;
  liveStatus.textContent = `Line ${levelIndex + 1} sorted`;
  updateReadouts();

  if (levelIndex < LEVELS.length - 1) {
    transitionTimer = window.setTimeout(() => loadLevel(levelIndex + 1), 1600);
    return;
  }

  resultKicker.textContent = "Network complete";
  resultTitle.textContent = "ALL TRAFFIC CLEAR";
  resultDetail.textContent = `${twoDigits(LEVELS.length)} lines / ${twoDigits(faults)} faults`;
  resultAction.hidden = false;
  resultAction.querySelector("span")!.textContent = "Replay network";
  resultAction.focus({ preventScroll: true });
}

function resetCurrentLine(): void {
  loadLevel(levelIndex);
  tone(261.63, 0.1);
}

function handleResultAction(): void {
  if (run.status === "won" && levelIndex === LEVELS.length - 1) {
    faults = 0;
    loadLevel(0);
    return;
  }
  resetCurrentLine();
}

function animateRun(): void {
  if (activeFrame !== 0 || run.status !== "running") return;
  lastFrame = performance.now();
  activeFrame = requestAnimationFrame(frame);
}

function frame(now: number): void {
  activeFrame = 0;
  const delta = Math.min(50, now - lastFrame);
  lastFrame = now;
  const previous = run;
  run = advanceRun(level, run, delta);

  run.signals.forEach((signal, index) => {
    const previousStatus = previous.signals[index].status;
    if (previousStatus === "queued" && signal.status === "moving") {
      tone(shapeFrequency(signal.shape) / 2, 0.1, 0.025);
    }
    if (previousStatus !== "arrived" && signal.status === "arrived" && run.status !== "won") {
      arrivalTone(signal.shape);
      liveStatus.textContent = `${shapeName(signal.shape)} signal sorted`;
    }
  });

  if (previous.status !== run.status) {
    if (run.status === "lost") showLoss();
    if (run.status === "won") showWin();
  }

  updateReadouts();
  draw();
  animateRun();
}

restartButton.addEventListener("click", resetCurrentLine);
resultAction.addEventListener("click", handleResultAction);
soundButton.addEventListener("click", () => {
  muted = !muted;
  soundButton.replaceChildren();
  const icon = document.createElement("i");
  icon.dataset.lucide = muted ? "volume-x" : "volume-2";
  icon.setAttribute("aria-hidden", "true");
  const label = document.createElement("span");
  label.className = "sr-only";
  label.textContent = muted ? "Unmute sound" : "Mute sound";
  soundButton.append(icon, label);
  soundButton.title = label.textContent;
  createIcons({ icons: { Volume2, VolumeX } });
  if (!muted) tone(523.25, 0.12);
});

window.addEventListener("resize", resizeCanvas);
new ResizeObserver(resizeCanvas).observe(canvas);

resizeCanvas();
canvasReady = true;
loadLevel(0);
