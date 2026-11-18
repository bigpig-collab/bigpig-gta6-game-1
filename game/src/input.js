// Keyboard + mouse input. Keys are tracked by code; the game reads a
// plain input snapshot each frame. Mouse position is in canvas pixels.
export function createInput(canvas) {
  const keys = new Set();
  const input = {
    up: false, down: false, left: false, right: false,
    run: false, interact: false, punch: false, shoot: false,
    brake: false, pause: false,
    mouseX: 0, mouseY: 0, mouseDown: false,
    // Edge-triggered presses, consumed by the game each frame.
    pressed: new Set(),
  };
  const codeMap = {
    KeyW: 'up', ArrowUp: 'up',
    KeyS: 'down', ArrowDown: 'down',
    KeyA: 'left', ArrowLeft: 'left',
    KeyD: 'right', ArrowRight: 'right',
    ShiftLeft: 'run', ShiftRight: 'run',
    KeyE: 'interact',
    KeyF: 'punch',
    Space: 'brake',
    KeyP: 'pause', Escape: 'pause',
  };
  function refresh() {
    input.up = keys.has('KeyW') || keys.has('ArrowUp');
    input.down = keys.has('KeyS') || keys.has('ArrowDown');
    input.left = keys.has('KeyA') || keys.has('ArrowLeft');
    input.right = keys.has('KeyD') || keys.has('ArrowRight');
    input.run = keys.has('ShiftLeft') || keys.has('ShiftRight');
    input.brake = keys.has('Space');
  }
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') e.preventDefault();
    if (!e.repeat) input.pressed.add(e.code);
    keys.add(e.code);
    refresh();
  });
  window.addEventListener('keyup', (e) => { keys.delete(e.code); refresh(); });
  window.addEventListener('blur', () => { keys.clear(); refresh(); });
  canvas.addEventListener('mousemove', (e) => {
    const r = canvas.getBoundingClientRect();
    input.mouseX = e.clientX - r.left;
    input.mouseY = e.clientY - r.top;
  });
  canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0) { input.mouseDown = true; input.pressed.add('Mouse0'); }
  });
  window.addEventListener('mouseup', () => { input.mouseDown = false; });
  input.consume = (code) => {
    if (input.pressed.has(code)) { input.pressed.delete(code); return true; }
    return false;
  };
  input.endFrame = () => { input.pressed.clear(); };
  return input;
}

// A scripted input object for the screenshot autopilot: same shape as the
// live input, but driven by shots.js.
export function scriptedInput() {
  return {
    up: false, down: false, left: false, right: false,
    run: false, interact: false, punch: false, shoot: false,
    brake: false, pause: false,
    mouseX: 0, mouseY: 0, mouseDown: false,
    pressed: new Set(),
    consume: () => false,
    endFrame: () => {},
  };
}
