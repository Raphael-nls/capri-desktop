// What she reads off your message in the chat (chat.js): the patterns for "open", "play", "close",
// "search", "volume"... in Portuguese and English, and the small helpers that go with them. Pure
// data and functions, no window needed.

import { parseWhen } from './reminders.js';

export const CLOSE_TAG = /\[\[\s*close\s*:?\s*([^\]]*)\]\]/i; // [[close: AM Music]] at the end of her answer
// "close", "shut down", "ferme", "quitte", "cierra", "fecha", "закрой"... in any of her languages
export const CLOSE_ASK = /\b(close|shut|quit|kill|exit)|ferm|quitt|coupe|arr[êe]t|cierr|cerra|fech|закр|выключ/i;
// her other tags: [[open: Spotify]], [[music: Bad Bunny]], [[media: next]], [[site: youtube.com]]
export const TAG = /\[\[\s*(open|music|media|site)\s*:\s*([^\]]*)\]\]/i;
// "open", "launch", "ouvre", "lance", "abre", "открой"... in any of her languages
export const OPEN_ASK = /\b(open|launch|start|run)\b|ouvr|lance|démarre|abre|abrir|inicia|ejecuta|executa|открой|запусти/i;
// what to do with the music playing, said plainly (only when it's about music, or said in a few words)
export const MEDIA_ASK = [
  ['pause', /\b(pause|pausa|pausar)\b|stop (the )?music|arrête la musique|пауз/i],
  ['next', /\b(next|skip|suivante?|siguiente|próxima|proxima)\b|passe (à )?la suivante|salta|pula|следующ/i],
  ['previous', /\b(previous|précédente?|anterior)\b|предыдущ/i],
  ['play', /\b(resume|reprends|reanuda|retoma)\b|relance la musique|remets la musique|продолж/i],
  ['volup', /\b(louder|plus fort)\b|monte le son|turn (it )?up|sube el volumen|aumenta o volume|громче/i],
  ['voldown', /\b(quieter|moins fort)\b|baisse le son|turn (it )?down|baja el volumen|abaixa o volume|тише/i],
  ['mute', /\bmute\b|coupe le son|silencia|sem som|выключи звук/i],
];
export const MUSIC_WORD = /musi|chanson|song|track|titre|morceau|spotify|canci|faixa|песн|музык|трек/i;
// "put X on Spotify", "mets X sur Spotify", "pon X en Spotify", "coloca X no Spotify", "включи X в Spotify"
export const SPOTIFY_ASK = /(?:play|put on|put|mets|joue|lance|écoute|pon|toca|reproduce|coloca|toque|включи|поставь)\s+(?:moi\s+|me\s+)?(.+?)\s+(?:on|sur|en|no|na|в)\s+spotify/i;
export const MEDIA_ACTIONS = new Set(MEDIA_ASK.map(([action]) => action));
// "mets Bohemian Rhapsody sur YouTube", "play Daft Punk on youtube"
export const YOUTUBE_ASK = /(?:play|put on|put|mets|met|joue|lance|écoute|pon|toca|reproduce|coloca|bota|toque|включи|поставь)(?:[- ]moi|[- ]me|me)?\s+(.+?)\s+(?:on|sur|en|no|na|в)\s+youtube/i;
// "mets Bohemian Rhapsody", "joue-moi du Daft Punk", "play some Queen": a song, or a game to play
export const PLAY_ASK = /^(?:capri,?\s+)?(?:mets|met|joue|play|put on|pon|toca|coloca|bota|toque|включи|поставь)(?:[- ]moi|[- ]me|me)?\s+(.{2,100})$/iu;
// "joue à Brawlhalla", "play the game…": a game, not a song
export const GAME_ASK = /^(?:capri,?\s+)?(?:joue|play)\s+(?:à|au|aux|a|the game)\s/i;
// "du Daft Punk", "some Queen": who to play, without the "some"
export const songOf = (s) => s
  .replace(/^(?:la |le |une? |the |some |a |o |as |os |uma? )?(?:musique|music|m[úu]sicas?|chanson|son|morceau|song|track|songs|faixa)\s+(?:de|d['’]|du |by |of |do |da |dos |das )?/i, '')
  .replace(/^(?:(?:du|de la|de l['’]|des|de|some|un peu de|del|un poco de|algo de|um pouco de|um pouco do|um pouco da|do|da|dos|das)\s+|d['’])/i, '')
  .replace(/\s+(?:on|sur|en|no|na|в)\s+youtube\s*$/i, '')
  .trim();
// "démarre YouTube et mets la musique de Daft Punk": the song asked for after an "and"
export const PLAY_AFTER = /\s(?:et|and|y|e|и)\s+(?:mets|met|joue|play|put on|pon|toca|coloca|bota|включи|поставь|démarre|demarre|lance|start|launch|écoute|ecoute)(?:[- ]moi|[- ]me)?\s+(.{2,100})$/i;
// "lance la musique de Daft Punk", "start the song X": an app verb, but music right after it
export const MUSIC_START = /^(?:capri,?\s+)?(?:lance|démarre|demarre|start|launch|écoute|ecoute|pon|toca)(?:[- ]moi|[- ]me)?\s+(?:la |le |une? |the |some )?(?:musique|music|chanson|son|morceau|song|track|canci[óo]n|m[úu]sica|песню|музыку)\s+(.{2,100})$/i;
// "mets ce que tu veux", "play whatever you want": she picks (her tag)
export const HER_PICK = /tu veux|ton choix|surprends|you want|whatever|your choice|surprise me|quieras|tu elecci[óo]n|quiser|sua escolha|хочешь|на твой выбор/i;
// what's left when it doesn't say which song ("mets de la musique", "play something")
export const VAGUE_SONG = /^(?:(?:de\s+la|du|des|la|le|les|une?|some|a|the|un|algo\s+de|alguma|um|uma|что-нибудь)\s+)?(?:musique|music|son|sons|chanson|morceau|truc|quelque\s+chose|something|song|tunes?|m[úu]sica|canci[óo]n|algo|coisa|музыку|песню)?\s*[.!?]*$/iu;
// "trouve mon CV", "où est le pdf du contrat", "find my report", "найди файл…": her search verbs, and
// what makes it a file on your PC or a search on the web
export const SEARCH_VERB = /(?:cherche|recherche|trouve|retrouve|où (?:est|sont)|search(?: for)?|find|look (?:for|up)|where(?:'s| is| are)|busca|encuentra|d[óo]nde est[áa]n?|procura|acha|onde est[áa]o?|найди|поищи|где)/i;
export const FILE_WORD = /fichier|dossier|document|photo|image|vid[ée]o|\bpdf\b|\bfiles?\b|folder|archivo|carpeta|arquivo|pasta|файл|папк|\.\w{2,4}\b|sur mon (?:pc|ordi)|dans mes fichiers|on my (?:pc|computer)|en mi (?:pc|ordenador)|no meu (?:pc|computador)|на (?:компьютере|пк)/i;
export const WEB_WORD = /google|internet|\ble web\b|the web|\bonline\b|en ligne|в интернете|в гугле/i;
// "fais une capture d'écran", "take a screenshot"
export const SHOT_ASK = /capture d['’][ée]cran|screenshot|screen ?shot|captura de (?:pantalla|tela)|скриншот|снимок экрана/i;

// Your PC itself (system.js). One of its settings pages: a settings word, or an open verb, before it.
export const SETTINGS_WORD = /param[eè]tres?|r[ée]glages?|settings|configuraci[oó]n|configura[çc][õo]es|ajustes|настройк/i;
export const SETTINGS_PAGES = [
  ['bluetooth', /bluetooth/i],
  ['wifi', /wi-?fi|wlan/i],
  ['update', /mises? [àa] jour|\bupdates?\b|actualizaci|atualiza[çc]|обновлени/i],
  ['notifications', /notifications?|notificaci|notifica[çc]|уведомлен/i],
  ['background', /fond d['’][ée]cran|wallpaper|background|fondo de pantalla|papel de parede|обо(?:и|ев)\b/i],
  ['storage', /stockage|storage|almacenamiento|armazenamento|хранилищ/i],
  ['mouse', /souris|\bmouse\b|rat[oó]n|мыш/i],
  ['battery', /batterie|battery|bater[ií]a|батаре/i],
  ['power', /alimentation|\bpower\b|energ[ií]a|питани/i],
  ['display', /[ée]cran|display|pantalla|\btela\b|экран|дисплей/i],
  ['network', /r[ée]seau|network|(?<![\p{L}])rede?(?![\p{L}])|сет[ьи]/iu],
  ['sound', /\bson\b|\bsound\b|audio|sonido|\bsom\b|звук/i],
];
// what's left of it: asked as a question
export const INFO_ASK = [
  ['battery', /batterie|battery|bater[ií]a|заряд|батаре/i],
  ['disk', /disque|\bdisk\b|\bdrive\b|stockage|storage|espace (?:libre|disque|restant)|de (?:la )?place|space left|free space|espacio|\bdisco\b|espa[çc]o|диск|места/i],
  ['ram', /\bram\b|m[ée]moire|memory|memoria|mem[óo]ria|памят|озу/i],
  ['ip', /\bip\b|айпи/i],
];
export const QUESTION = /\?|combien|\bquel(?:le)?\b|c['’]est quoi|\breste\b|how much|how many|what(?:'s| is)|\bleft\b|cu[aá]nt|\bqu[eé]\b|quanto|\bqual\b|сколько|как(?:ой|ая|ое)|осталось/i;
// its sound: "mets le son à 30 %", "volume 50"; off and back on
export const VOLUME_ASK = /(?:\bson\b|volume|\bsound\b|volumen|\bsom\b|звук|громкост\w*)\D{0,14}?(\d{1,3})\s*(?:%|pour ?cent|percent|por ?ciento|por ?cento|процент)?/i;
export const MUTE_ASK = /coupe le son|mets? (?:le son )?en muet|\bmute\b|silencia|tira o som|sem som|выключи звук/i;
export const UNMUTE_ASK = /remets? le son|r[ée]active le son|unmute|sound (?:back )?on|quita el silencio|activa el sonido|volta o som|liga o som|включи звук/i;
// a timer, counted down in her ticker
export const TIMER_ASK = /minuteur|\btimer\b|temporizador|cron[oó]metro|таймер/i;
// Windows' snip of an area (not her own screenshot of all of it)
export const SNIP_ASK = /capture (?:d['’])?une (?:zone|partie)|zone de l['’][ée]cran|\bsnip\b|(?:capture|screenshot|captura) (?:of |de )?(?:an? |una |uma |la |a )?(?:area|region|part|zona|[aá]rea|parte)|снимок области|область экрана/i;
// its windows: out of the way, back, or side by side
export const TIDY_ASK = /range (?:mes|les|toutes les) fen[êe]tres|cache (?:mes|les|toutes les) fen[êe]tres|montre(?:-moi)? (?:le|mon) bureau|r[ée]duis (?:tout|toutes les fen[êe]tres)|tidy (?:up )?(?:my |the )?windows|minimi[sz]e (?:all|everything|my windows|the windows)|show (?:me )?(?:the |my )?desktop|ordena (?:mis |las )?ventanas|minimiza (?:todo|todas)|muestra el escritorio|organiza (?:minhas |as )?janelas|minimiza tudo|mostra a [áa]rea de trabalho|сверни (?:все|окна)|убери окна|покажи рабочий стол/i;
export const UNTIDY_ASK = /(?:remets|ressors|rends-moi|rouvre) (?:mes|les) fen[êe]tres|(?:bring|put) (?:my |the )?windows back|restore (?:my |the )?windows|devu[ée]lve(?:me)? (?:mis |las )?ventanas|restaura (?:mis |las )?ventanas|volta (?:minhas |as )?janelas|traz (?:minhas |as )?janelas de volta|верни окна/i;
export const PLACE_VERB = /^\s*(?:mets?|place|bouge|d[ée]place|put|move|snap|pon|coloca|mueve|bota|поставь|перемести|сдвинь)\s+/i;
export const SIDE = [
  ['left', /\s*(?:[àa] |on the |to the |a la |na |[àa] la )?(?:gauche|left|izquierda|esquerda|слева|влево|налево)\b/i],
  ['right', /\s*(?:[àa] |on the |to the |a la |na |[àa] la )?(?:droite|right|derecha|direita|справа|вправо|направо)\b/i],
];
// dark or light
export const DARK_ASK = /mode sombre|th[eè]me sombre|mode nuit|dark mode|dark theme|modo oscuro|tema oscuro|modo escuro|tema escuro|т[её]мн(?:ая|ую) тем|т[её]мный режим/i;
export const LIGHT_ASK = /mode clair|th[eè]me clair|light mode|light theme|modo claro|tema claro|светл(?:ая|ую) тем|светлый режим/i;
// its power: always behind a button of hers but the cancel
export const PC_WORD = /(?<![\p{L}])(?:pc|ordi\p{L}*|computer|ordenador|computador|компьютер\p{L}*|пк)(?![\p{L}])/iu;
export const POWER_ASK = [
  ['cancel', /annule (?:l['’])?(?:extinction|arr[êe]t|red[ée]marrage)|cancel (?:the )?(?:shut ?down|restart)|cancela (?:el |o )?(?:apagado|desligamento|reinicio)|отмени (?:выключение|перезагрузку)/i],
  ['restart', /red[ée]marre|reboot|restart|reinicia|reinicie|перезагру/i],
  ['shutdown', /[ée]teins|shut ?down|turn off|power off|\bapaga\b|desliga|выключи/i],
  ['sleep', /\bveille\b|\bsleep\b|suspend|suspen[dc]|спящ/i],
  ['lock', /verrouill|\block\b|bloquea|bloqueia|заблокир/i],
];

// How long a timer is: "10 minutes", "1h30", "45 s" (else "dans une heure", as for a reminder).
export function duration(text) {
  const hm = /(\d+)\s*h\s*(\d{1,2})\b/i.exec(text);
  if (hm) return (Number(hm[1]) * 60 + Number(hm[2])) * 60000;
  let ms = 0;
  for (const m of text.matchAll(/(\d+(?:[.,]\d+)?)\s*(h|heures?|hours?|horas?|час\p{L}*|min\p{L}*|m|мин\p{L}*|s|sec\p{L}*|seg\p{L}*|сек\p{L}*)(?![\p{L}])/giu)) {
    const unit = m[2].toLowerCase();
    ms += Number(m[1].replace(',', '.')) * (/^(?:h|час)/.test(unit) ? 3600000 : /^(?:m|мин)/.test(unit) ? 60000 : 1000);
  }
  if (ms) return ms;
  const when = parseWhen(text);
  return when ? Math.max(0, when.at - Date.now()) : 0;
}

// 1 h 30, 10 min, 45 s
export function span(ms) {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s} s`;
  const m = Math.round(s / 60);
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h${m % 60 ? ` ${String(m % 60).padStart(2, '0')}` : ''}`;
}

// what's left, in her ticker: 9:59, 1:02:03
export function left(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const two = (n) => String(n).padStart(2, '0');
  return s >= 3600 ? `${Math.floor(s / 3600)}:${two(Math.floor(s / 60) % 60)}:${two(s % 60)}` : `${Math.floor(s / 60)}:${two(s % 60)}`;
}
// the words that aren't what to look for
export const NOT_SEARCHED = new Set(('stp svp please pls peux tu can you could would puedes pode можешь moi me le la les l mon ma mes '
  + 'un une des du de d the my a an for of el mi mis o meu minha meus мой мою мои sur dans on in en no na на в pc ordi ordinateur '
  + 'computer ordenador computador компьютере fichier fichiers dossier dossiers document documents photo photos image images '
  + 'vidéo vidéos video videos file files folder folders archivo archivos carpeta carpetas arquivo arquivos pasta pastas файл '
  + 'файлы папка папку appelé appelée nommé called named llamado chamado qui s appelle est sont is are where où cherche recherche '
  + 'trouve retrouve search find look up busca encuentra procura acha найди поищи где dónde onde google internet web online ligne').split(' '));
// the kind of file asked for: "mon projet after effect" is a .aep
export const FILE_TYPES = [
  [/after ?effects?/i, ['aep']], [/premi[eè]re/i, ['prproj']], [/photoshop|\bpsd\b/i, ['psd']], [/illustrator/i, ['ai']],
  [/blender/i, ['blend']], [/cinema ?4d|\bc4d\b/i, ['c4d']], [/fl ?studio/i, ['flp']], [/ableton/i, ['als']],
  [/\bword\b|\bdocx?\b/i, ['docx', 'doc']], [/excel|\bxlsx?\b|tableur|spreadsheet/i, ['xlsx', 'xls', 'csv']],
  [/powerpoint|\bpptx?\b|diapo|slides/i, ['pptx', 'ppt']], [/\bpdf\b/i, ['pdf']],
  [/vid[ée]os?\b|\bmp4\b|\bfilms?\b|v[íi]deo|видео/i, ['mp4', 'mov', 'mkv', 'avi', 'webm']],
  [/photos?\b|images?\b|\bpng\b|\bjpe?g\b|imagen|imagem|фото/i, ['png', 'jpg', 'jpeg', 'webp', 'heic']],
  [/musiques?\b|\bmp3\b|\baudio\b|\bsongs?\b|музык/i, ['mp3', 'wav', 'flac', 'm4a', 'ogg']],
  [/\bzip\b|\barchive|\brar\b|\b7z\b/i, ['zip', 'rar', '7z']],
];
export const fileTypes = (text) => [...new Set(FILE_TYPES.filter(([re]) => re.test(text)).flatMap(([, exts]) => exts))];
// words that only say what kind of file it is, or what to do with it once found
export const NOT_A_NAME = new Set(('and et y e и it ça ca lo la o open ouvre ouvrir ouvres abre abrir открой show montre affiche '
  + 'projet projets project projects proyecto projeto проект after effect effects premiere pro photoshop illustrator blender cinema '
  + '4d c4d fl studio ableton word excel powerpoint pdf mp4 mp3 png jpg jpeg zip rar 7z film films musique musiques music song songs '
  + 'audio présentation presentation diapo slides tableur spreadsheet dernier dernière derniers last latest récent récents recent '
  + 'nouveau new psd docx doc xlsx pptx').split(' '));
// "…and open the folder", "…et ouvre-le": what to do with what she found
export const THEN_FOLDER = /(?:ouvre|ouvrir|open|show|montre|abre|abrir|открой|покажи)\s+(?:moi\s+)?(?:le |la |the |its |son |el |a |o )?(?:dossier|folder|carpeta|pasta|папку)/i;
export const THEN_OPEN = /(?:et|and|y|e|и)\s+(?:l['’])?(?:ouvre|open|lance|abre|открой)(?:[- ](?:le|la|les)|\s+(?:it|them|lo|la|o|его|её))?\s*[.!?]*$/i;
export const searched = (text) => text.replace(/^\s*capri[,!:]?\s+/i, '').toLowerCase().split(/[^\p{L}\p{N}.]+/u).filter((w) => w && !NOT_SEARCHED.has(w)).join(' ');
// a Roblox game by its name: "in my roblox play steal a brain rot", "lance grow a garden sur roblox"
export const ROBLOX_VERB = /(?:^|\s)(?:play|joue(?:r)?(?: à| a)?|lance|launch|start|ouvre|open|mets|go to|va sur|juega(?: a)?|jogue|jogar|запусти|включи)\s+/gi;
export function robloxGame(text) {
  if (!/roblox/i.test(text)) return null;
  let rest = null;
  for (const m of text.matchAll(ROBLOX_VERB)) rest = text.slice(m.index + m[0].length); // after the last verb
  if (!rest) return null;
  const name = rest
    .replace(/\s+(?:on|in|sur|dans|en|no|na|в)\s+(?:my\s+|mon\s+|mi\s+|meu\s+)?roblox\b.*$/i, '')
    .replace(/\broblox\b/ig, '')
    .replace(/^(?:à|a|au|to|le jeu|the game|un jeu|el juego|o jogo)\s+/i, '')
    .replace(/\s+(?:stp|svp|please|pls|por favor)\b.*$/i, '')
    .replace(/[\s.!?,]+$/, '')
    .trim();
  return name.length >= 2 ? name : null;
}
// "regarde mon écran", "tu vois quoi ?", "what's on my screen?", "что ты видишь?"
export const LOOK_ASK = /regarde (?:mon|l['’]|ce que)|(?:jette|jeter) un (?:œil|oeil)|tu vois quoi|qu['’]est[- ]ce que tu vois|look at (?:my|the|this) screen|what(?:'s| is) on my screen|what do you see|take a look|mira (?:mi|la) pantalla|qu[ée] ves|olha (?:minha|a) tela|o que voc[êe] v[êe]|посмотри на (?:мой )?экран|что ты видишь/i;
// what her tag needs to find in your message before it does anything: a small model tags answers about
// anything ("[[music: synthwave]]" under a film tip), and music and the media keys act right away
export const LISTEN = /[ée]cout|listen|escuch|\bouv(ir|e)\b|слуша|playlist|album|\b(play|joue|mets|pon|toca|coloca)\b|включи|поставь/i;
export const SOUND = /\b(sound|volume|volumen)\b|\b(le|du|au) son\b|\bo som\b|звук|громк/i; // not "son": "his" in French
export const PLAY = /\bjou(er|e)\b|\bplay\b|jugar|juega|jogar|joga|играть|поигра/i;
export const SITE = /\b(site|web|page|lien|link|url|enlace|p[aá]gina)|сайт|ссылк|\.(com|fr|org|net|io|gg|tv|be|ch|ca|es|br|pt|ru)\b/i;
// "appelle-moi Max", "call me Max", "llámame Max", "me chama de Max", "зови меня Макс"
export const NAME_ASK = /(?:appelle[- ]moi|call me|my name is|je m['’]appelle|ll[aá]mame|me llamo|me cham[ae] de|meu nome [eé]|зови меня|меня зовут)\s+([\p{L}\p{N}'’-]{1,24})/iu;
// "souviens-toi que…", "remember that…", "recuerda que…", "lembra que…", "запомни, что…" (said first thing)
export const MEMO_ASK = /^\s*(?:capri,?\s+|stp,?\s+|please,?\s+)?(?:souviens[- ]toi(?: que| de)?|n['’]oublie pas(?: que| de)?|remember(?: that)?|recuerda(?: que)?|lembr[ae](?:-se)?(?: que| de)?|запомни,?(?: что)?)\s+(.{3,200})/iu;
export const MEMORIES_MAX = 30;
// sites asked for by name ("open youtube") when no app on the PC goes by it: the address is hers, not
// the model's, so it opens right away like an app you named
export const SITES = {
  youtube: 'https://www.youtube.com', google: 'https://www.google.com', gmail: 'https://mail.google.com',
  twitch: 'https://www.twitch.tv', netflix: 'https://www.netflix.com', reddit: 'https://www.reddit.com',
  twitter: 'https://x.com', instagram: 'https://www.instagram.com', tiktok: 'https://www.tiktok.com',
  facebook: 'https://www.facebook.com', github: 'https://github.com', chatgpt: 'https://chatgpt.com',
  wikipedia: 'https://www.wikipedia.org', linkedin: 'https://www.linkedin.com', pinterest: 'https://www.pinterest.com',
  crunchyroll: 'https://www.crunchyroll.com', outlook: 'https://outlook.live.com', whatsapp: 'https://web.whatsapp.com',
  discord: 'https://discord.com/app', soundcloud: 'https://soundcloud.com', deezer: 'https://www.deezer.com',
};
// a browser named with a site ("open youtube on chrome"): the site, in the browser you use
export const BROWSER = /chrome|edge|firefox|opera|brave|vivaldi|duckduckgo|browser/i;
// local models this small mostly talk nonsense ("llama3.2:1b", "qwen2.5:0.5b"…)
export const TINY = /[:-](0\.5b|1b|1\.5b|135m|270m|360m)\b/i;
// her face when she greets you in a mood (bond.js)
export const MOOD_FACE = { angry: 'many', sulk: 'aside', dizzy: 'wide', thrown: 'wide', jealous: 'look', fun: 'laugh', happy: 'laugh', forgiven: 'smug' };
