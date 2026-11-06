'use strict';

// Only in --dev: lets scripts drive the overlay and grab frames of it (no desktop content, just our window).
// The bridge hands its /debug/* routes here (bridge.js).

const path = require('node:path');
const fs = require('node:fs');
const { app, BrowserWindow } = require('electron');

function create({ dev: DEV, root: ROOT, overlay: getOverlay, trayMenu: getTrayMenu, sendCommand }) {
  const testWins = new Map(); // name -> test window

  return async function debugHandler(route, body) {
    const overlay = getOverlay();
    const trayMenu = getTrayMenu();
    if (!DEV) throw new Error('debug routes need --dev');
    if (route === 'command') {
      sendCommand(body.name, body);
      return { ok: true };
    }
    if (route === 'reload') {
      overlay.webContents.reloadIgnoringCache();
      return { ok: true };
    }
    if (route === 'unhook') {
      // the pointer no longer passed on to her, as when Windows drops the mouse hook
      overlay.setIgnoreMouseEvents(true);
      return { ok: true };
    }
    if (route === 'testwin') {
      // plain windows to sit on, opened without stealing focus, by name (`id`, default "main");
      // each one opened goes in front of the others. { open: false } without an id closes them all.
      const id = body.id ?? 'main';
      if (!body.open && body.id === undefined) {
        for (const win of testWins.values()) win.destroy();
        testWins.clear();
        return { ok: true };
      }
      testWins.get(id)?.destroy();
      testWins.delete(id);
      if (body.open) {
        const b = overlay.getBounds();
        const win = new BrowserWindow({
          x: b.x + (body.x ?? 300), y: b.y + (body.y ?? 380), width: body.w ?? 720, height: body.h ?? 380,
          show: false, alwaysOnTop: true, title: `Capri test window ${id}`, backgroundColor: '#1b1726',
        });
        win.loadURL('data:text/html,<body style="background:%231b1726"></body>');
        win.showInactive();
        testWins.set(id, win);
      }
      return { ok: true };
    }
    if (route === 'movewin' && testWins.has(body.id ?? 'main')) {
      const win = testWins.get(body.id ?? 'main');
      const [x, y] = win.getPosition();
      win.setPosition(x + (body.dx || 0), y + (body.dy || 0));
      return { ok: true };
    }
    if (route === 'mouse') {
      // the pointer moving over the overlay (css px), and clicking if asked, without touching the real one
      const at = { x: Math.round(body.x), y: Math.round(body.y) };
      overlay.webContents.sendInputEvent({ type: 'mouseMove', ...at });
      if (body.click) {
        overlay.webContents.sendInputEvent({ type: 'mouseDown', button: 'left', clickCount: 1, ...at });
        overlay.webContents.sendInputEvent({ type: 'mouseUp', button: 'left', clickCount: 1, ...at });
      }
      return { ok: true };
    }
    if (route === 'menu') {
      // her menu as labels, and a click on one of them if asked ({ click: 'beam:cloud · ...' })
      const items = (menu) => menu.items.filter((i) => i.label).map((i) => (i.submenu ? { [i.label]: items(i.submenu) } : i.label));
      const find = (menu) => menu.items.reduce((hit, i) => hit || (i.label === body.click ? i : i.submenu && find(i.submenu)), null);
      if (body.click) find(trayMenu)?.click();
      return { ok: true, value: items(trayMenu) };
    }
    if (route === 'eval') {
      // a look inside the overlay (app.js puts what's there on window.dev in --dev)
      return { ok: true, value: await overlay.webContents.executeJavaScript(String(body.js || 'null')) };
    }
    if (route === 'drag') {
      // a drag over the overlay with a stand-in pointer, the real one untouched: the button goes down
      // at the first point, follows the others (each `ms` after the one before), and comes up at the last
      const points = Array.isArray(body.points) ? body.points : [];
      if (!points.length) throw new Error('drag needs points');
      const at = (p) => ({ x: Math.round(p.x), y: Math.round(p.y) });
      overlay.webContents.sendInputEvent({ type: 'mouseMove', ...at(points[0]) });
      overlay.webContents.sendInputEvent({ type: 'mouseDown', button: 'left', clickCount: 1, ...at(points[0]) });
      for (const p of points.slice(1)) {
        await new Promise((r) => setTimeout(r, p.ms ?? 16));
        overlay.webContents.sendInputEvent({ type: 'mouseMove', modifiers: ['leftButtonDown'], ...at(p) });
      }
      if (body.up !== false) overlay.webContents.sendInputEvent({ type: 'mouseUp', button: 'left', clickCount: 1, ...at(points.at(-1)) });
      return { ok: true };
    }
    if (route === 'type') {
      // typing into the overlay (her chat), and Enter if asked
      if (body.text) await overlay.webContents.insertText(body.text);
      if (body.enter) {
        overlay.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Return' });
        overlay.webContents.sendInputEvent({ type: 'char', keyCode: 'Return' });
        overlay.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'Return' });
      }
      return { ok: true };
    }
    if (route === 'capture') {
      const image = await overlay.webContents.capturePage();
      // installed, the app's own folder is read-only: its data folder instead
      const dir = path.join(app.isPackaged ? app.getPath('userData') : ROOT, 'captures');
      fs.mkdirSync(dir, { recursive: true });
      const file = path.join(dir, `${(body.name || 'frame').replace(/[^\w-]/g, '')}.png`);
      fs.writeFileSync(file, image.toPNG());
      return { ok: true, file };
    }
    throw new Error('unknown debug route');
  };
}

module.exports = { create };
