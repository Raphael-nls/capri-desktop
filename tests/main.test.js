'use strict';

// The main process' logic that opens things on the PC (launch.js, apps.js, system.js), with Electron,
// PowerShell and the network replaced by stand-ins: nothing here opens an app, touches Windows or goes online.

const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const childProcess = require('node:child_process');

const opened = [];     // shell.openExternal calls
const ran = [];        // execFile calls: [file, args]
let psOutput = '';     // what the fake PowerShell prints
let openError = null;  // makes shell.openExternal fail once, for a given url prefix

const electron = {
  shell: {
    openExternal: async (url) => {
      if (openError && url.startsWith(openError)) throw new Error('no handler');
      opened.push(url);
    },
    openPath: async () => '',
  },
  app: {
    getPath: () => 'C:\\nowhere',
    getApplicationNameForProtocol: () => '',
  },
  screen: { dipToScreenRect: (_w, r) => r },
  BrowserWindow: class {},
};
let answer = () => psOutput; // what the fake PowerShell prints for each call (replaceable per test)
const fakeChild = {
  ...childProcess,
  execFile: (file, args, opts, cb) => {
    ran.push([file, args]);
    (typeof opts === 'function' ? opts : cb)(null, answer());
  },
};

const load = Module._load;
Module._load = function mocked(request, ...rest) {
  if (request === 'electron') return electron;
  if (request === 'node:child_process') return fakeChild;
  return load.call(this, request, ...rest);
};

const launch = require('../src/main/launch');
const apps = require('../src/main/apps');
const system = require('../src/main/system');

const reset = () => { opened.length = 0; ran.length = 0; psOutput = ''; openError = null; answer = () => psOutput; };
const WIN = process.platform === 'win32';

// --- launch.js ---------------------------------------------------------------------------------

const ITEMS = [
  { name: 'Spotify', kind: 'app', id: 'Spotify.exe' },
  { name: 'Discord', kind: 'app', id: 'Discord' },
  { name: 'Roblox Player', kind: 'app', id: 'Roblox' },
  { name: 'AM Music', kind: 'app', id: 'AMMusic' },
  { name: 'Brawlhalla', kind: 'steam', id: '291550' },
];

test('launch.match: finds what was named, in a sentence', () => {
  assert.equal(launch.match(ITEMS, 'abre o spotify pra mim').name, 'Spotify');
  assert.equal(launch.match(ITEMS, 'open Discord').name, 'Discord');
  assert.equal(launch.match(ITEMS, 'launch brawlhalla').kind, 'steam');
});

test('launch.match: filler words do not tell apps apart, and no match is null', () => {
  assert.equal(launch.match(ITEMS, 'abre o roblox').name, 'Roblox Player');
  assert.equal(launch.match(ITEMS, 'open the player'), null); // "player" alone is filler
  assert.equal(launch.match(ITEMS, 'qual a capital da França?'), null);
  assert.equal(launch.match([], 'spotify'), null);
});

test('launch.match: accents do not matter', () => {
  const items = [{ name: 'Calculadora Científica', kind: 'app', id: 'calc' }];
  assert.equal(launch.match(items, 'abre a calculadora cientifica')?.id, 'calc');
});

test('launch.risky: only files that run something', () => {
  assert.equal(launch.risky({ kind: 'file', id: 'C:\\x\\setup.exe' }), true);
  assert.equal(launch.risky({ kind: 'file', id: 'C:\\x\\run.PS1' }), true);
  assert.equal(launch.risky({ kind: 'file', id: 'C:\\x\\notes.txt' }), false);
  assert.equal(launch.risky({ kind: 'folder', id: 'C:\\x\\setup.exe' }), false);
  assert.equal(launch.risky(null), false);
});

test('launch.siteUrl: only real http(s) sites', () => {
  assert.equal(launch.siteUrl('youtube.com').hostname, 'youtube.com');
  assert.equal(launch.siteUrl('https://example.com/a?b=1').pathname, '/a');
  assert.equal(launch.siteUrl('javascript:alert(1)'), null);
  assert.equal(launch.siteUrl('file:///C:/Windows/system32/cmd.exe'), null);
  assert.equal(launch.siteUrl('localhost'), null);
  assert.equal(launch.siteUrl('not a site'), null);
});

test('launch.site: opens a good address, refuses a bad one', async () => {
  reset();
  assert.equal(await launch.site('github.com'), true);
  assert.deepEqual(opened, ['https://github.com/']);
  reset();
  assert.equal(await launch.site('javascript:alert(1)'), false);
  assert.equal(await launch.site(''), false);
  assert.deepEqual(opened, []);
});

test('launch.music: Spotify search, encoded; falls back to the web; empty is false', async () => {
  reset();
  assert.equal(await launch.music('Daft Punk & co'), true);
  assert.deepEqual(opened, ['spotify:search:Daft%20Punk%20%26%20co']);
  reset();
  openError = 'spotify:';
  await launch.music('queen');
  assert.deepEqual(opened, ['https://open.spotify.com/search/queen']);
  reset();
  assert.equal(await launch.music('   '), false);
  assert.deepEqual(opened, []);
});

test('launch.youtube: opens the first video found, else the search', async () => {
  const real = globalThis.fetch;
  try {
    reset();
    globalThis.fetch = async () => ({ text: async () => '..."videoRenderer":{"videoId":"dQw4w9WgXcQ","thumbnail":{},"title":{"runs":[{"text":"Never Gonna \\"Give\\" You Up"' });
    const hit = await launch.youtube('rick');
    assert.deepEqual(opened, ['https://www.youtube.com/watch?v=dQw4w9WgXcQ']);
    assert.equal(hit.title, 'Never Gonna "Give" You Up');

    reset();
    globalThis.fetch = async () => { throw new Error('offline'); };
    const miss = await launch.youtube('rick astley');
    assert.deepEqual(opened, ['https://www.youtube.com/results?search_query=rick%20astley']);
    assert.equal(miss.title, null);

    assert.equal(await launch.youtube(''), null);
  } finally {
    globalThis.fetch = real;
  }
});

test('launch.roblox: starts the first game found; nothing found or offline', async () => {
  const real = globalThis.fetch;
  try {
    reset();
    globalThis.fetch = async () => ({ json: async () => ({ searchResults: [{ contentGroupType: 'Game', contents: [{ rootPlaceId: 123, name: '[💀] Steal a Brainrot' }] }] }) });
    const hit = await launch.roblox('steal a brainrot');
    assert.deepEqual(opened, ['https://www.roblox.com/games/123']); // the app isn't installed in the stand-in
    assert.equal(hit.name, 'Steal a Brainrot');
    assert.equal(hit.app, false);

    reset();
    globalThis.fetch = async () => ({ json: async () => ({ searchResults: [] }) });
    assert.deepEqual(await launch.roblox('zzz'), { name: null });
    assert.deepEqual(opened, []);

    globalThis.fetch = async () => { throw new Error('offline'); };
    assert.equal(await launch.roblox('x'), null);
  } finally {
    globalThis.fetch = real;
  }
});

test('launch.media: unknown action does nothing', async () => {
  reset();
  assert.equal(await launch.media('explode'), false);
  assert.equal(ran.length, 0);
});

test('launch.launch: refuses something she never listed', async () => {
  await assert.rejects(() => launch.launch({ kind: 'known', id: 'system32' }), /not found/);
  await assert.rejects(() => launch.launch({ kind: 'file', id: 'C:\\Windows\\System32\\cmd.exe' }), /not found/);
});

// --- apps.js -----------------------------------------------------------------------------------

const PROCS = JSON.stringify([
  { id: 11, name: 'Discord', label: 'Discord' },
  { id: 12, name: 'Discord', label: 'Discord' },
  { id: 20, name: 'AMMusic', label: 'AM Music' },
  { id: 30, name: 'explorer', label: 'Windows Explorer' },
  { id: 31, name: 'Ollama', label: 'Ollama' },
  { id: 32, name: 'claude', label: 'Claude' },
  { id: process.pid, name: 'node', label: 'Node' },
]);

test('apps.list: one entry per program, never Windows, Claude, Ollama or herself', { skip: !WIN }, async () => {
  reset();
  psOutput = PROCS;
  const list = await apps.list();
  assert.deepEqual(list.map((a) => a.name).sort(), ['AMMusic', 'Discord']);
  assert.deepEqual(list.find((a) => a.name === 'Discord').ids, [11, 12]);
});

test('apps.find: by name or description, loosely', { skip: !WIN }, async () => {
  reset();
  psOutput = PROCS;
  assert.equal((await apps.find('am music')).name, 'AMMusic');
  assert.equal((await apps.find('Discord')).name, 'Discord');
  assert.equal(await apps.find('x'), null);      // too short
  assert.equal(await apps.find('photoshop'), null);
  assert.equal(await apps.find('explorer'), null); // never listed
});

test('apps.close: asks politely first, force only when told; an app not open is not running', { skip: !WIN }, async () => {
  reset();
  psOutput = PROCS;
  assert.deepEqual(await apps.close('Spotify'), { running: false });

  reset();
  // the stand-in PowerShell answers the process list first, then how many are left
  let call = 0;
  answer = () => (call++ === 0 ? PROCS : '0');
  assert.deepEqual(await apps.close('Discord'), { running: false });
  const script = ran[1][1].join(' ');
  assert.match(script, /CloseMainWindow/);
  assert.doesNotMatch(script, /Stop-Process/);

  reset();
  call = 0;
  answer = () => (call++ === 0 ? PROCS : '1');
  assert.deepEqual(await apps.close('Discord', { force: true }), { running: true }); // it came back, or hid
  assert.match(ran[1][1].join(' '), /Stop-Process -Id 11,12 -Force/);
});

// --- system.js ---------------------------------------------------------------------------------

test('system.act: unknown actions and bad arguments do nothing', async () => {
  reset();
  assert.equal(await system.act({ action: 'format-c' }), null);
  assert.equal(await system.act({}), null);
  assert.equal(await system.act(undefined), null);
  assert.equal(await system.act({ action: 'settings', page: 'nope' }), false);
  assert.equal(await system.act({ action: 'power', what: 'bogus' }), false);
  assert.equal(await system.act({ action: 'arrange', name: 'x', side: 'up' }), null);
  assert.deepEqual(opened, []);
  assert.equal(ran.length, 0);
});

test('system.act: a settings page is opened through ms-settings', { skip: !WIN }, async () => {
  reset();
  assert.equal(await system.act({ action: 'settings', page: 'bluetooth' }), true);
  assert.deepEqual(opened, ['ms-settings:bluetooth']);
  assert.ok(Object.keys(system.SETTINGS).length >= 10);
});

test('system.act: power commands run exactly the Windows tools, with a clamped delay', { skip: !WIN }, async () => {
  reset();
  await system.act({ action: 'power', what: 'shutdown', seconds: 3600 });
  assert.deepEqual(ran.at(-1), ['shutdown.exe', ['/s', '/t', '3600']]);
  await system.act({ action: 'power', what: 'restart', seconds: -50 });
  assert.deepEqual(ran.at(-1), ['shutdown.exe', ['/r', '/t', '0']]);
  await system.act({ action: 'power', what: 'shutdown', seconds: 1e12 });
  assert.deepEqual(ran.at(-1), ['shutdown.exe', ['/s', '/t', '315360000']]);
  await system.act({ action: 'power', what: 'cancel' });
  assert.deepEqual(ran.at(-1), ['shutdown.exe', ['/a']]);
  await system.act({ action: 'power', what: 'lock' });
  assert.deepEqual(ran.at(-1), ['rundll32.exe', ['user32.dll,LockWorkStation']]);
});

test('system.act: volume level is clamped to 0-100 in the script', { skip: !WIN }, async () => {
  reset();
  psOutput = '40';
  const res = await system.act({ action: 'volume', level: 250 });
  assert.deepEqual(res, { level: 40 });
  assert.match(ran.at(-1)[1].join(' '), /\[CapriAudio\]::Set\(100\)/);
  await system.act({ action: 'volume', level: -5 });
  assert.match(ran.at(-1)[1].join(' '), /\[CapriAudio\]::Set\(0\)/);
});

test('system.act: info about the PC', async () => {
  const ram = await system.act({ action: 'info', what: 'ram' });
  assert.ok(ram.total > 0 && ram.used > 0 && ram.used <= ram.total);
  const disk = await system.act({ action: 'info', what: 'disk' });
  if (disk) assert.ok(disk.free <= disk.total);
  const ip = await system.act({ action: 'info', what: 'ip' });
  assert.ok(ip.ip === null || /^\d+\.\d+\.\d+\.\d+$/.test(ip.ip));
  assert.equal(await system.act({ action: 'info', what: 'secrets' }), null);
});

test('system.act: battery reads the charge and the charger', { skip: !WIN }, async () => {
  reset();
  psOutput = JSON.stringify({ EstimatedChargeRemaining: 55, BatteryStatus: 2 });
  assert.deepEqual(await system.act({ action: 'info', what: 'battery' }), { percent: 55, charging: true });
  psOutput = JSON.stringify({ EstimatedChargeRemaining: 10, BatteryStatus: 1 });
  assert.deepEqual(await system.act({ action: 'info', what: 'battery' }), { percent: 10, charging: false });
  psOutput = '';
  assert.deepEqual(await system.act({ action: 'info', what: 'battery' }), { none: true });
});

// --- debug.js ----------------------------------------------------------------------------------

test('debug routes: only in --dev, and the ones that exist', async () => {
  const { create } = require('../src/main/debug');
  const sent = [];
  const trayMenu = { items: [{ label: 'Talk' }, { label: 'Language', submenu: { items: [{ label: 'English' }, { label: 'Português' }] } }, { type: 'separator' }] };
  const handler = (dev) => create({ dev, root: 'C:\nowhere', overlay: () => null, trayMenu: () => trayMenu, sendCommand: (name) => sent.push(name) });

  await assert.rejects(() => handler(false)('command', { name: 'x' }), /need --dev/);
  assert.deepEqual(sent, []);

  const dev = handler(true);
  assert.deepEqual(await dev('command', { name: 'sit' }), { ok: true });
  assert.deepEqual(sent, ['sit']);
  assert.deepEqual((await dev('menu', {})).value, ['Talk', { Language: ['English', 'Português'] }]);
  await assert.rejects(() => dev('nope', {}), /unknown debug route/);
});
