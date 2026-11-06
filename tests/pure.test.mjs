// Pure logic of the renderer (no window needed): reminders parsing, text helpers, chat answer cleaning.
import { test } from 'node:test';
import assert from 'node:assert/strict';

// the renderer modules expect a browser: a minimal stand-in, set before they load
globalThis.matchMedia ??= () => ({ matches: false, addEventListener() {}, removeEventListener() {} });

const { parseWhen, parseReminder } = await import('../src/renderer/js/reminders.js');
const { fmt, duration, basename, clamp } = await import('../src/renderer/js/util.js');
const { clean, mood } = await import('../src/renderer/js/chat.js');

const NOW = new Date(2026, 10, 6, 10, 0, 0).getTime(); // Fri 6 Nov 2026, 10:00
const MIN = 60000;

test('reminders: relative times in Brazilian Portuguese', () => {
  assert.equal(parseWhen('me lembra daqui a 20 minutos', NOW).at, NOW + 20 * MIN);
  assert.equal(parseWhen('daqui a 2 horas', NOW).at, NOW + 120 * MIN);
  assert.equal(parseWhen('em 1h30', NOW).at, NOW + 90 * MIN);
  assert.equal(parseWhen('daqui a meia hora', NOW).at, NOW + 30 * MIN);
  assert.equal(parseWhen('dentro de dez minutos', NOW).at, NOW + 10 * MIN);
});

test('reminders: clock times, today or tomorrow', () => {
  const at = (iso) => new Date(iso).getTime();
  assert.equal(parseWhen('às 14h30', NOW).at, at('2026-11-06T14:30:00'));
  assert.equal(parseWhen('às 9h', NOW).at, at('2026-11-07T09:00:00')); // already past: tomorrow
  assert.equal(parseWhen('amanhã às 9h', NOW).at, at('2026-11-07T09:00:00'));
  assert.equal(parseWhen('às 6 da tarde', NOW).at, at('2026-11-06T18:00:00'));
  assert.equal(parseWhen('at 6pm', NOW).at, at('2026-11-06T18:00:00'));
});

test('reminders: numbers that are not times are ignored', () => {
  assert.equal(parseWhen('comprar 3 pães', NOW), null);
});

test('reminders: what to remember is split from when', () => {
  const r = parseReminder('me lembra daqui a 20 minutos de tirar a roupa da máquina', NOW);
  assert.equal(r.at, NOW + 20 * MIN);
  assert.equal(r.text, 'tirar a roupa da máquina');
  const en = parseReminder('remind me in 10 minutes to call mom', NOW);
  assert.equal(en.at, NOW + 10 * MIN);
  assert.equal(en.text, 'call mom');
});

test('reminders: no time given keeps the text and a null date; not a reminder gives null', () => {
  const r = parseReminder('me lembra de ligar para o banco', NOW);
  assert.equal(r.at, null);
  assert.equal(r.text, 'ligar para o banco');
  assert.equal(parseReminder('que horas são?', NOW), null);
});

test('reminders: refuses times too close or more than a week away', () => {
  assert.equal(parseReminder('me lembra daqui a 2 segundos de algo', NOW).at, null);
  assert.equal(parseReminder('me lembra daqui a 200 horas de algo', NOW).at, null);
});

test('util', () => {
  assert.equal(fmt('Oi, {name}!', { name: 'Raphael' }), 'Oi, Raphael!');
  assert.equal(fmt('Oi, {name}!'), 'Oi, !');
  assert.equal(basename('C:\\Users\\x\\file.txt'), 'file.txt');
  assert.equal(basename('/a/b/c/'), 'c');
  assert.equal(clamp(5, 0, 3), 3);
  assert.match(duration(134000, 'pt'), /2/);
});

test('chat: clean() strips reasoning, tags and markdown', () => {
  assert.equal(clean('<think>hmm</think>Oi **tudo** bem?'), 'Oi tudo bem?');
  assert.equal(clean('Abrindo [[open: Spotify]]'), 'Abrindo');
  assert.equal(clean('<think>nunca fecha'), '');
  assert.equal(clean('texto [[open: Spot'), 'texto');
});

test('chat: mood()', () => {
  assert.equal(mood('kkkk'), 'laugh');
  assert.equal(mood('Pronto!'), 'grin');
  assert.equal(mood('Quer ajuda?'), 'smug');
  assert.equal(mood('Ok.'), 'look');
});

const { parseTask, Tasks } = await import('../src/renderer/js/tasks.js');

test('tasks: parsing in Portuguese and English', () => {
  assert.deepEqual(parseTask('anota comprar café'), { kind: 'add', text: 'comprar café' });
  assert.deepEqual(parseTask('adiciona nas tarefas ligar pro banco'), { kind: 'add', text: 'ligar pro banco' });
  assert.deepEqual(parseTask('nova tarefa: revisar proposta'), { kind: 'add', text: 'revisar proposta' });
  assert.deepEqual(parseTask('add task buy milk'), { kind: 'add', text: 'buy milk' });
  assert.deepEqual(parseTask('minhas tarefas'), { kind: 'list' });
  assert.deepEqual(parseTask('o que eu tenho pendente?'), { kind: 'list' });
  assert.deepEqual(parseTask('my tasks'), { kind: 'list' });
  assert.deepEqual(parseTask('concluí a tarefa 2'), { kind: 'done', n: 2 });
  assert.deepEqual(parseTask('tarefa 3 concluída'), { kind: 'done', n: 3 });
  assert.deepEqual(parseTask('mark task 1 done'), { kind: 'done', n: 1 });
  assert.deepEqual(parseTask('limpa as tarefas concluídas'), { kind: 'clear' });
});

test('tasks: ordinary chat is not a task', () => {
  assert.equal(parseTask('oi, tudo bem?'), null);
  assert.equal(parseTask('qual a capital da França?'), null);
  assert.equal(parseTask('abre o spotify'), null);
});

test('tasks: the list adds, numbers the open ones, finishes and clears', () => {
  let saved = null;
  const tasks = new Tasks({ host: { setConfig: (p) => { saved = p.tasks; } } });
  assert.match(tasks.run({ kind: 'list' }, 'pt'), /vazia/);
  assert.match(tasks.run({ kind: 'add', text: 'a' }, 'pt'), /tarefa 1/);
  assert.match(tasks.run({ kind: 'add', text: 'b' }, 'pt'), /tarefa 2/);
  assert.match(tasks.run({ kind: 'done', n: 1 }, 'pt'), /Feito: "a"/);
  assert.equal(tasks.run({ kind: 'list' }, 'en'), 'Pending:\n1. b'); // b is now number 1
  assert.match(tasks.run({ kind: 'done', n: 9 }, 'pt'), /Não achei/);
  assert.match(tasks.run({ kind: 'clear' }, 'pt'), /1 tarefa/);
  assert.equal(saved.length, 1);
});

const P = await import('../src/renderer/js/chat-patterns.js');

test('chat patterns: timers and durations', () => {
  assert.equal(P.duration('timer 10 minutos'), 10 * 60000);
  assert.equal(P.duration('timer 1h30'), 90 * 60000);
  assert.equal(P.duration('timer 45 s'), 45000);
  assert.equal(P.duration('timer de meia hora') >= 0, true); // goes through the reminder reader
  assert.equal(P.span(90 * 60000), '1 h 30');
  assert.equal(P.left(62 * 1000), '1:02');
  assert.equal(P.left(3723 * 1000), '1:02:03');
});

test('chat patterns: what she reads off a message', () => {
  assert.ok(P.OPEN_ASK.test('abre o spotify'));
  assert.ok(P.CLOSE_ASK.test('fecha o discord'));
  assert.ok(P.SPOTIFY_ASK.exec('coloca Daft Punk no spotify')[1].includes('Daft Punk'));
  assert.equal(P.songOf('a música de Queen'), 'Queen');
  assert.ok(P.SHOT_ASK.test('tira um screenshot'));
  assert.ok(P.fileTypes('meu projeto do after effects').includes('aep'));
  assert.match(P.searched('capri, acha meu currículo'), /curr/);
  assert.deepEqual(P.MEDIA_ASK.find(([, re]) => re.test('pula essa música')).slice(0, 1), ['next']);
});

// A canvas context that accepts anything and records the calls: enough to run the drawing code.
const fakeCtx = () => {
  const calls = [];
  const target = { calls, measureText: () => ({ width: 10 }), createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }) };
  return new Proxy(target, {
    get: (t, k) => (k in t ? t[k] : (...args) => { calls.push(k); return args; }),
    set: () => true,
  });
};

test('fx: the drawing helpers still run after the split', async () => {
  const fx = await import('../src/renderer/js/fx.js');
  const shapes = await import('../src/renderer/js/fx-shapes.js');
  assert.equal(fx.COLORS, shapes.COLORS);
  assert.equal(fx.drawMask, shapes.drawMask);
  assert.equal(typeof fx.FxLayer, 'function');
  assert.ok(fx.GRAB_FRAMES.includes('grab'));
  const ctx = fakeCtx();
  shapes.drawMask(ctx, 100, 100, 1, { eyes: [1, 0.1], look: { x: 1, y: 0 } });
  shapes.drawMask(ctx, 100, 100, 1, { flat: '#fff', spike: false });
  shapes.drawEye(ctx, 50, 50, 20, 1, { x: 0.5, y: 0.5 });
  shapes.cutEdges(ctx, 0.2, 0.2, 3);
  shapes.cutBand(ctx, 0.5, 3);
  shapes.cutHead(ctx, 100, 3);
  assert.ok(ctx.calls.length > 20);
  assert.equal(shapes.hash(3, 7), shapes.hash(3, 7));
  assert.ok(shapes.hash(3, 7) >= 0 && shapes.hash(3, 7) < 1);
});

test('chip: loads with its shared drawing code', async () => {
  const chip = await import('../src/renderer/js/chip.js');
  assert.ok(Object.keys(chip).length > 0);
});
