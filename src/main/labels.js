'use strict';

// The tray menu (and the one she opens when you right-click her), in every language she speaks.
// The order of this object is the order of the Language submenu.

const TRAY = {
  en: {
    name: 'English',
    online: (port) => `Capri — listening on ${port}`,
    teleport: 'Teleport', satellite: 'Look at the satellite', demo: 'Play demo', help: 'How does it work?',
    report: 'Mission report', talk: 'Talk to her', custom: 'Make her yours…', chatModel: 'AI model', aiSetup: 'Set it up with her…', apiKey: 'API key or address…', noOllama: 'Ollama not found',
    rest: 'When she rests', restCorner: 'In her corner', restTaskbar: 'Sitting on the taskbar', watch: 'Watch', watchNone: 'Nothing, just keep me company',
    theme: 'Her window style', themeClassic: 'Classic',
    motion: 'Animations', motionAuto: 'Like Windows', motionFull: 'Full', motionReduced: 'Reduced',
    display: 'Display', displayAuto: 'Normal', displayGl: 'OpenGL (if her background is black)', displaySoftware: 'Without the graphics card (if still black)',
    show: 'Bring her back', hide: 'Put her away',
    size: 'Size', small: 'Small', medium: 'Medium', large: 'Large', sound: 'Sound', mute: 'Mute',
    soundsDir: 'Open custom sounds folder', screen: 'Screen', wander: 'Wander around when idle',
    possess: 'Possess my windows', lang: 'Language', auto: 'Automatic (system)', startup: 'Start with Windows',
    hooksOn: 'Claude Code hooks: installed', hooksOff: 'Install Claude Code hooks',
    hooksRemove: 'Remove Claude Code hooks', forget: 'Forget our conversations', quit: 'Quit',
    sync: (percent, stage) => `You and her: ${percent}% · ${stage}`, stages: ['Faint signal', 'Contact', 'In sync', 'Linked', 'Fused'],
    reminders: 'Reminders', noReminders: 'No reminders (ask her in her chat)', cancelReminder: 'Cancel this reminder',
    follow: 'Follow me across screens', jealous: 'Jealous of other AIs', closePages: 'Close other AIs’ pages',
    lookNow: 'Look at my screen', lookAuto: 'Look at my screen now and then',
    pcReact: 'React to my PC',
    cloudFree: 'free, online', cloudSignin: 'Sign in to Ollama (free cloud models)…',
  },
  pt: {
    name: 'Português (Brasil)',
    online: (port) => `Capri — ouvindo na porta ${port}`,
    teleport: 'Teletransportar', satellite: 'Olhar o satélite', demo: 'Ver a demo', help: 'Como funciona?',
    report: 'Relatório de missão', talk: 'Falar com ela', custom: 'Personalizar…', chatModel: 'Modelo de IA', aiSetup: 'Escolher com ela…', apiKey: 'Chave de API ou endereço…', noOllama: 'Ollama não encontrado',
    rest: 'Quando ela descansa', restCorner: 'No canto dela', restTaskbar: 'Sentada na barra de tarefas', watch: 'Acompanhar', watchNone: 'Nada, só me fazer companhia',
    theme: 'Estilo das janelas dela', themeClassic: 'Clássico',
    motion: 'Animações', motionAuto: 'Como o Windows', motionFull: 'Completas', motionReduced: 'Reduzidas',
    display: 'Exibição', displayAuto: 'Normal', displayGl: 'OpenGL (se o fundo dela ficar preto)', displaySoftware: 'Sem a placa de vídeo (se continuar preto)',
    show: 'Trazer de volta', hide: 'Guardar',
    size: 'Tamanho', small: 'Pequena', medium: 'Média', large: 'Grande', sound: 'Som', mute: 'Sem som',
    soundsDir: 'Abrir a pasta de sons personalizados', screen: 'Tela', wander: 'Passear quando nada acontece',
    possess: 'Possuir minhas janelas', lang: 'Idioma', auto: 'Automático (sistema)', startup: 'Iniciar com o Windows',
    hooksOn: 'Hooks do Claude Code: instalados', hooksOff: 'Instalar os hooks do Claude Code',
    hooksRemove: 'Remover os hooks do Claude Code', forget: 'Esquecer nossas conversas', quit: 'Sair',
    sync: (percent, stage) => `Ela e você: ${percent} % · ${stage}`, stages: ['Sinal fraco', 'Contato', 'Sintonia', 'Vínculo', 'Fusão'],
    reminders: 'Lembretes', noReminders: 'Nenhum lembrete (peça no chat dela)', cancelReminder: 'Cancelar este lembrete',
    follow: 'Me seguir de uma tela pra outra', jealous: 'Com ciúmes de outras IAs', closePages: 'Fechar as páginas de outras IAs',
    lookNow: 'Olha minha tela', lookAuto: 'Olhar minha tela de vez em quando',
    pcReact: 'Reagir ao meu PC',
    cloudFree: 'grátis, online', cloudSignin: 'Entrar no Ollama (modelos na nuvem grátis)…',
  },
};

module.exports = { TRAY, LANGS: Object.keys(TRAY) };
