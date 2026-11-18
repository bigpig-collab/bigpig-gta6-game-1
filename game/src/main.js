// Solmar City — entry point: screens, fixed-step loop, input wiring,
// screenshot staging, and the error trap the verifier looks for.
import { STEP } from './config.js';
import { createWorld, stepWorld, loadIntoWorld } from './world.js';
import { createInput } from './input.js';
import { drawScreen, cameraFor, SCREEN_TITLE, SCREEN_PLAY, SCREEN_PAUSE, SCREEN_OVER } from './render.js';
import { createHud, updateHud } from './hud.js';
import { ensureAudio, toggleMute, startRadio, sfx } from './audio.js';
import { applyRespawn } from './police.js';
import { saveGame, loadGame, hasSave } from './save.js';
import { stageShot } from './shots.js';

// Any uncaught error is written into the title and a visible banner, so a
// headless check can see it without opening devtools.
window.addEventListener('error', (e) => {
  const msg = `ERROR: ${e.message}`;
  document.title = msg;
  const fatal = document.getElementById('fatal');
  if (fatal) { fatal.textContent = msg; fatal.style.display = 'block'; }
});
window.addEventListener('unhandledrejection', (e) => {
  document.title = `ERROR: ${e.reason}`;
  const fatal = document.getElementById('fatal');
  if (fatal) { fatal.textContent = `ERROR: ${e.reason}`; fatal.style.display = 'block'; }
});

const params = new URLSearchParams(location.search);
const seedParam = params.get('seed');
const seed = seedParam === null ? 1 : Number(seedParam) || 1;
const shotName = params.get('shot');

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const hud = createHud();
const input = createInput(canvas);

let state = createWorld(seed);
window.__solmar = state; // debug handle: lets a headless check read the live state
let screen = SCREEN_TITLE;
let shotMode = false;

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

if (shotName) {
  // Staged screenshot: play the real rules forward, then freeze the frame.
  const staged = stageShot(shotName, state);
  screen = staged.screen;
  shotMode = true;
  document.getElementById('hud').style.display = 'block';
  updateHud(hud, state);
  drawScreen(ctx, state, screen, canvas.width, canvas.height);
} else if (hasSave()) {
  // Offer the save silently: load it behind the title; starting resumes it.
  const data = loadGame();
  if (data) loadIntoWorld(state, data);
}

function startGame() {
  ensureAudio();
  startRadio();
  screen = SCREEN_PLAY;
  document.getElementById('hud').style.display = 'block';
  sfx.mission();
}

function aimPoint() {
  const cam = cameraFor(state, canvas.width, canvas.height);
  return { x: cam.x + input.mouseX, y: cam.y + input.mouseY };
}

let last = performance.now();
let acc = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;

  // One-frame edge inputs.
  const interactPressed = input.consume('KeyE');
  const punchPressed = input.consume('KeyF');
  const enterPressed = input.consume('Enter') || input.consume('NumpadEnter') || input.consume('Mouse0');
  const pausePressed = input.consume('KeyP') || input.consume('Escape');
  if (input.consume('KeyM')) toggleMute();

  if (!shotMode) {
    if (screen === SCREEN_TITLE && enterPressed) startGame();
    else if (screen === SCREEN_OVER && enterPressed && state.overTimer > 0.8) {
      applyRespawn(state);
      screen = SCREEN_PLAY;
    } else if (screen === SCREEN_PLAY && pausePressed) screen = SCREEN_PAUSE;
    else if (screen === SCREEN_PAUSE && pausePressed) screen = SCREEN_PLAY;
  }

  if (screen === SCREEN_PLAY && !shotMode) {
    acc += dt;
    let n = 0;
    while (acc >= STEP && n < 5) {
      const inp = {
        up: input.up, down: input.down, left: input.left, right: input.right,
        run: input.run, brake: input.brake,
        interact: interactPressed && n === 0,
        punch: punchPressed && n === 0,
        shoot: input.mouseDown,
        pause: false,
      };
      stepWorld(state, STEP, inp, aimPoint());
      acc -= STEP;
      n += 1;
      if (state.over) { screen = SCREEN_OVER; break; }
    }
    if (n === 5) acc = 0;
    // Auto-save flash at the safehouse.
    if (state.nearSafehouse && state.savedFlash > 0 && !state._savedShown) {
      state._savedShown = true;
      saveGame(state);
      state.message = 'Progress saved at the safehouse.';
      state.messageTimer = 2;
    }
    if (!state.nearSafehouse) state._savedShown = false;
  }

  input.endFrame();
  updateHud(hud, state);
  drawScreen(ctx, state, screen, canvas.width, canvas.height);
}
requestAnimationFrame(frame);
