import { RotateCcw, Volume2, VolumeX, createIcons } from "lucide";
import {
  LEVELS,
  advanceRun,
  createRun,
  nodeById,
  toggleJunction,
  type LevelDefinition,
  type RunState,
  type TrackNode,
} from "./game-model";

const canvas = requireElement<HTMLCanvasElement>("#track-canvas");
const context = requireCanvasContext(canvas);

const junctionLayer = requireElement<HTMLDivElement>("#junction-layer");
const lineReadout = requireElement<HTMLElement>("#line-readout");
const timeReadout = requireElement<HTMLElement>("#time-readout");
const faultReadout = requireElement<HTMLElement>("#fault-readout");
const statusCopy = requireElement<HTMLElement>("#status-copy");
const statusIndex = requireElement<HTMLElement>(".status-index");
const liveStatus = requireElement<HTMLElement>("#live-status");
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
  signal: "#6ee7de",
  route: "#ffd147",
  danger: "#ff6c5f",
  success: "#9be564",
};

let levelIndex = 0;
let level = LEVELS[levelIndex];
let run = createRun(level);
let faults = 0;
let lastFrame = performance.now();
let transitionTimer = 0;
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

function boardBounds(): BoardBounds {
  const compact = canvas.clientWidth <= 760;
  const left = compact ? 20 : Math.min(340, canvas.clientWidth * 0.25);
  const right = compact ? 20 : 44;
  const top = compact ? 190 : 112;
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
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  placeJunctions();
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
  for (let x = 0; x < width; x += 24) {
    context.beginPath();
    context.moveTo(x + 0.5, 0);
    context.lineTo(x + 0.5, height);
    context.stroke();
  }
  for (let y = 0; y < height; y += 24) {
    context.beginPath();
    context.moveTo(0, y + 0.5);
    context.lineTo(width, y + 0.5);
    context.stroke();
  }
  context.restore();
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
    context.strokeStyle = palette.signal;
    context.lineWidth = 3;
    context.beginPath();
    context.arc(0, 0, 10, 0, Math.PI * 2);
    context.stroke();
    context.fillStyle = palette.signal;
    context.fillRect(-3, -3, 6, 6);
  }

  if (node.kind === "goal") {
    context.strokeStyle = palette.success;
    context.lineWidth = 4;
    context.strokeRect(-13, -13, 26, 26);
    context.fillStyle = palette.success;
    context.fillRect(-5, -5, 10, 10);
    context.font = "700 10px ui-monospace, monospace";
    context.textAlign = "center";
    context.fillText("CLEAR", 0, -22);
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

function drawSignal(): void {
  const from = pointFor(nodeById(level, run.from));
  const to = pointFor(nodeById(level, run.to));
  const x = from.x + (to.x - from.x) * run.progress;
  const y = from.y + (to.y - from.y) * run.progress;
  const angle = Math.atan2(to.y - from.y, to.x - from.x);

  context.save();
  context.translate(x, y);
  context.rotate(angle);
  context.shadowColor = palette.signal;
  context.shadowBlur = 20;
  context.fillStyle = palette.signal;
  context.fillRect(-13, -8, 26, 16);
  context.shadowBlur = 0;
  context.fillStyle = palette.background;
  context.fillRect(3, -3, 5, 6);
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
  drawSignal();
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
  statusCopy.textContent = "Signal live";
  liveStatus.textContent = wasIdle ? "Signal moving" : "Junction switched";
  updateJunctionButtons();
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
  lineReadout.textContent = `${twoDigits(levelIndex + 1)} / ${twoDigits(LEVELS.length)}`;
  timeReadout.textContent = (run.elapsedMs / 1000).toFixed(1).padStart(4, "0");
  faultReadout.textContent = twoDigits(faults);
  statusIndex.textContent = twoDigits(levelIndex + 1);
}

function loadLevel(nextIndex: number): void {
  window.clearTimeout(transitionTimer);
  levelIndex = nextIndex;
  level = LEVELS[levelIndex];
  run = createRun(level);
  lastFrame = performance.now();
  resultOverlay.hidden = true;
  resultAction.hidden = false;
  statusCopy.textContent = "Signal held";
  liveStatus.textContent = `Line ${levelIndex + 1} ready`;
  renderJunctionButtons();
  buildProgress();
  updateReadouts();
  requestAnimationFrame(() => {
    junctionLayer.querySelector<HTMLButtonElement>(".junction")?.focus({ preventScroll: true });
  });
}

function showLoss(): void {
  faults += 1;
  failureTone();
  resultKicker.textContent = `Line ${twoDigits(levelIndex + 1)} / fault ${twoDigits(faults)}`;
  resultTitle.textContent = "MISROUTED";
  resultDetail.textContent = "The signal reached a broken line.";
  resultAction.hidden = false;
  resultAction.querySelector("span")!.textContent = "Run again";
  resultOverlay.hidden = false;
  liveStatus.textContent = "Route failed. Run the line again.";
  updateReadouts();
  resultAction.focus({ preventScroll: true });
}

function showWin(): void {
  successTone();
  statusCopy.textContent = "Line clear";
  resultKicker.textContent = `Line ${twoDigits(levelIndex + 1)}`;
  resultTitle.textContent = "CONNECTED";
  resultDetail.textContent = `${(run.elapsedMs / 1000).toFixed(1)} seconds / signal stable`;
  resultAction.hidden = true;
  resultOverlay.hidden = false;
  liveStatus.textContent = `Line ${levelIndex + 1} connected`;

  if (levelIndex < LEVELS.length - 1) {
    transitionTimer = window.setTimeout(() => loadLevel(levelIndex + 1), 1600);
    return;
  }

  resultKicker.textContent = "Network complete";
  resultTitle.textContent = "ALL LINES CLEAR";
  resultDetail.textContent = `05 connected / ${twoDigits(faults)} faults`;
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

function frame(now: number): void {
  const delta = Math.min(50, now - lastFrame);
  lastFrame = now;
  const previousStatus = run.status;
  run = advanceRun(level, run, delta);

  if (previousStatus !== run.status) {
    if (run.status === "lost") showLoss();
    if (run.status === "won") showWin();
  }

  updateReadouts();
  draw();
  requestAnimationFrame(frame);
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
loadLevel(0);
requestAnimationFrame(frame);
