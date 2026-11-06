// Her to-do list, for you alone: "anota comprar café", "minhas tarefas", "conclui a tarefa 2".
// Read straight off your message (like reminders.js, so it works the same on the smallest model),
// kept in her settings on your PC. Portuguese and English.

const ADD = /^\s*(?:capri,?\s+)?(?:(?:anota|anote|adiciona|adicione|coloca|ponha|põe|inclui|crie|cria)\s+(?:isso\s+)?(?:(?:nas?|às?|na minha|nas minhas|em minha|em minhas)\s+)?(?:minhas?\s+)?(?:tarefas?|lista(?: de tarefas)?|pendências?)\s*(?:que|de|:|-)?\s*|(?:nova tarefa|tarefa nova)\s*[:\-]?\s*|anota(?:r)?(?: aí| ai| pra mim| para mim)?(?: que| de|:)?\s+|(?:add|new)\s+(?:a\s+)?(?:task|todo)\s*[:\-]?\s*|todo\s*[:\-]\s*|note(?: that)?\s+)(.{2,200})$/iu;
const LIST = /^\s*(?:capri,?\s+)?(?:(?:quais|qual|mostra|mostre|lista|liste|me (?:mostra|diz|fala)|ver|abre)\s+(?:s[ãa]o\s+)?(?:as\s+|a\s+|minhas\s+)?(?:minhas\s+)?(?:tarefas?|pend[eê]ncias?|lista(?: de tarefas)?)|o que (?:eu )?(?:tenho|falta|ficou) (?:pra fazer|para fazer|pendente|a fazer)|minhas tarefas|my (?:tasks|to-?dos?)|(?:show|list) (?:me )?(?:my )?(?:tasks|to-?dos?)|what(?:'s| is) (?:pending|on my list)|what do i have to do)\b[\s?.!]*$/iu;
const DONE = /(?:(?:conclu[ií]|conclua|concluir|terminei|finalizei|finalize|fiz|feito|marca(?:r)?(?: como)? (?:feit[oa]|conclu[ií]d[oa])|risca|riscar|apaga|apague|remove|remova|tira|tirar|cancela)\s+(?:a\s+)?(?:tarefa\s+)?(?:n[º°o.]?\s*)?(\d{1,3})|tarefa\s+(?:n[º°o.]?\s*)?(\d{1,3})\s+(?:conclu[ií]da|feita|pronta|ok|done)|(?:done|finish(?:ed)?|complete(?:d)?|remove|delete|check off)\s+(?:with\s+)?(?:task\s+)?#?(\d{1,3})|mark\s+(?:task\s+)?#?(\d{1,3})\s+(?:as\s+)?done)/iu;
const CLEAR_DONE = /^\s*(?:capri,?\s+)?(?:limpa|limpe|apaga|apague|clear)\s+(?:as\s+|all\s+)?(?:tarefas\s+)?(?:conclu[ií]das|feitas|done)/iu;

// What your message asks about the list, or null: { kind: 'add', text } | { kind: 'list' } |
// { kind: 'done', n } (the number shown in the list) | { kind: 'clear' }
export function parseTask(text) {
  const s = String(text || '');
  if (CLEAR_DONE.test(s)) return { kind: 'clear' };
  const done = DONE.exec(s);
  if (done) {
    const n = Number(done[1] || done[2] || done[3] || done[4]);
    if (n > 0) return { kind: 'done', n };
  }
  if (LIST.test(s)) return { kind: 'list' };
  const add = ADD.exec(s);
  if (add) {
    const item = add[1].replace(/[\s.!]+$/, '').trim();
    if (item) return { kind: 'add', text: item.slice(0, 200) };
  }
  return null;
}

const SAY = {
  pt: {
    added: 'Anotado: "{text}" (tarefa {n}).', empty: 'Sua lista está vazia. Nada pendente.', head: 'Pendentes:',
    gone: 'Não achei a tarefa {n}.', done: 'Feito: "{text}".', cleared: 'Limpei {count} tarefa(s) concluída(s).', none: 'Não tem nenhuma concluída pra limpar.',
  },
  en: {
    added: 'Noted: "{text}" (task {n}).', empty: 'Your list is empty. Nothing pending.', head: 'Pending:',
    gone: 'I can\'t find task {n}.', done: 'Done: "{text}".', cleared: 'Cleared {count} finished task(s).', none: 'No finished tasks to clear.',
  },
};
const say = (lang, key, vars = {}) => (SAY[lang === 'pt' ? 'pt' : 'en'][key] || '').replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');

// The list: [{ id, text, made, done }], saved in her settings. Numbers shown are the open ones, 1 up.
export class Tasks {
  constructor({ host, list = [] }) {
    this.host = host;
    this.list = Array.isArray(list) ? list : [];
  }

  sync(list) {
    if (Array.isArray(list)) this.list = list;
  }

  get open() {
    return this.list.filter((t) => !t.done);
  }

  save() {
    this.host.setConfig({ tasks: this.list });
  }

  add(text) {
    const t = { id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`, text, made: Date.now(), done: false };
    this.list = [...this.list, t].slice(-200);
    this.save();
    return this.open.length;
  }

  finish(n) {
    const task = this.open[n - 1];
    if (!task) return null;
    this.list = this.list.map((t) => (t.id === task.id ? { ...t, done: Date.now() } : t));
    this.save();
    return task;
  }

  clearDone() {
    const count = this.list.filter((t) => t.done).length;
    this.list = this.list.filter((t) => !t.done);
    if (count) this.save();
    return count;
  }

  // Her line for a request from parseTask: { line }.
  run(req, lang) {
    if (req.kind === 'add') {
      const n = this.add(req.text);
      return say(lang, 'added', { text: req.text, n });
    }
    if (req.kind === 'done') {
      const task = this.finish(req.n);
      return task ? say(lang, 'done', { text: task.text }) : say(lang, 'gone', { n: req.n });
    }
    if (req.kind === 'clear') {
      const count = this.clearDone();
      return count ? say(lang, 'cleared', { count }) : say(lang, 'none');
    }
    const open = this.open;
    if (!open.length) return say(lang, 'empty');
    return `${say(lang, 'head')}\n${open.map((t, i) => `${i + 1}. ${t.text}`).join('\n')}`;
  }

  // For her chat's prompt: what's pending, so she can talk about it.
  summary(max = 8) {
    return this.open.slice(0, max).map((t, i) => `${i + 1}. ${t.text}`).join('; ');
  }
}
