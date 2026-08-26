const PUBLIC_VAPID_KEY = "BH6Na8LGJ5FPFDz2fZJrYpWCQA8ZAxAvat-ka4C1_9DfHcNhraOvmszXslbN9YmgQW6L7Z8gjPIK_TByuvrpdb4";

// Base URL de la API: en Android nativo usa Vercel directamente, en web usa URLs relativas (sin cambios)
const API_BASE = (window.Capacitor && window.Capacitor.isNativePlatform())
  ? 'https://alivio.pronosoftmx.com'
  : '';

// Helper: obtener FCM token en Android nativo usando Capacitor Firebase Messaging
async function getFcmToken() {
  try {
    if (window.Capacitor && window.Capacitor.isNativePlatform()) {
      const { FirebaseMessaging } = window.Capacitor.Plugins;
      await FirebaseMessaging.requestPermissions();
      const { token } = await FirebaseMessaging.getToken();
      return token;
    }
  } catch (e) {
    console.warn('⚠️ No se pudo obtener FCM token:', e);
  }
  return null;
}

// Guardar datos globales de la IA
window.afternoonMessage = "respira. el señor sostiene tus cargas hoy. estás a salvo.";

// Registro del Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('✅ Service Worker registrado con éxito:', reg.scope))
      .catch(err => console.error('❌ Error al registrar el Service Worker:', err));
  });
}

/**
 * ── REGISTRO DE PANTALLAS ──────────────────────────────────────────────────
 * Sustituye al array literal que había aquí. Toda pantalla nueva se declara en
 * este objeto y en ningún otro sitio: si no está, changeScreen() no la conoce y
 * las demás no se ocultan al mostrarla.
 *
 * chrome:
 *   'landing'   → marketing público, con la cabecera flotante y sin barra
 *   'app'       → módulo con barra de navegación inferior
 *   'immersive' → paso de un flujo; la barra se oculta (una barra invitando a
 *                 irse arruina una respiración guiada)
 * tab: qué pestaña de la barra queda marcada como activa
 */
const SCREENS = {
  'screen-landing':   { chrome: 'landing' },
  'screen-hub':       { chrome: 'app', headerSlot: 'hub-header' },
  'screen-evangelio': { chrome: 'app', tab: 'evangelio', headerSlot: 'evangelio-header' },
  'screen-desahogo':  { chrome: 'app', tab: 'desahogo' },
  'screen-oraciones': { chrome: 'app', tab: 'oraciones', headerSlot: 'oraciones-header' },
  'screen-oracion':   { chrome: 'app', tab: 'oraciones' },
  'screen-rosario':   { chrome: 'app', tab: 'oraciones' },
  'screen-suspiro':   { chrome: 'immersive' },
  // La respiración es lo único inmersivo: una barra invitando a irse arruina
  // medio minuto de recogimiento. El ancla sí es un destino y lleva barra.
  'screen-ancla':     { chrome: 'app', tab: 'desahogo' }
};

/**
 * ── MÓDULOS DEL HUB Y DE LA BARRA ──────────────────────────────────────────
 * `enabled: false` saca el módulo del hub y de la barra sin borrar nada.
 * `ready: false`   lo muestra con la etiqueta «muy pronto» y su pantalla vacía.
 *
 * Fase 2 pone `ready: true` en 'oraciones'. Fase 3, en 'evangelio'.
 * Si prefieres no publicar placeholders en web, pon `enabled: false` en ambos:
 * el hub y la barra se ocultan solos cuando queda un único destino.
 */
const MODULES = [
  { id: 'evangelio', screen: 'screen-evangelio', enabled: true, ready: false, icon: '📖', accent: 'bg-amber-50 text-amber-600' },
  { id: 'desahogo',  screen: 'screen-desahogo',  enabled: true, ready: true,  icon: '✍️', accent: 'bg-violet-50 text-violet-600', center: true },
  { id: 'oraciones', screen: 'screen-oraciones', enabled: true, ready: true,  icon: '📿', accent: 'bg-emerald-50 text-emerald-600' }
];

/**
 * Orden de las tarjetas del hub por vertiente. El CONTENIDO es idéntico para las
 * tres: lo único que cambia es la prominencia. Es la aplicación literal de
 * «adapta lo personal, no adaptes lo compartido» — ver el skill
 * alivio-contenido-liturgico. Nunca ramifiques el contenido aquí.
 */
const HUB_ORDER = {
  catholic:    ['evangelio', 'desahogo', 'oraciones'],
  evangelical: ['evangelio', 'desahogo', 'oraciones'],
  spiritual:   ['desahogo', 'oraciones', 'evangelio']
};

let currentScreen = 'screen-landing';

/** Módulos visibles hoy, en el orden que toca para la vertiente activa. */
function visibleModules() {
  const order = HUB_ORDER[currentDenomination] || HUB_ORDER.catholic;
  return order
    .map(id => MODULES.find(m => m.id === id))
    .filter(m => m && m.enabled);
}

/**
 * Función para cambiar de pantalla con efecto de fade
 */
function changeScreen(screenId) {
  const target = SCREENS[screenId];
  if (!target) {
    console.warn(`changeScreen: "${screenId}" no está en SCREENS. Añádela al registro.`);
    return;
  }
  // Salir de la lectura suelta el bloqueo de pantalla: solo se mantiene
  // encendida mientras se está rezando, no el resto de la sesión.
  const rezando = ['screen-oracion', 'screen-rosario'];
  if (rezando.includes(currentScreen) && !rezando.includes(screenId)) {
    releasePrayerWakeLock();
  }
  currentScreen = screenId;

  Object.keys(SCREENS).forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (id === screenId) {
      el.classList.remove('screen-hidden');
      el.style.opacity = '0';
      setTimeout(() => {
        el.style.opacity = '1';
      }, 50);
    } else {
      el.classList.add('screen-hidden');
      el.style.opacity = '0';
    }
  });

  // Ocultar cabecera flotante superior (corazón e idiomas de la landing) al entrar a la app
  const headerDonateBtn = document.getElementById('header-donate-btn');
  const globalHeaderLang = document.getElementById('global-header-lang-container');
  if (target.chrome === 'landing') {
    if (headerDonateBtn) headerDonateBtn.classList.remove('hidden');
    if (globalHeaderLang) globalHeaderLang.classList.remove('hidden');
  } else {
    if (headerDonateBtn) headerDonateBtn.classList.add('hidden');
    if (globalHeaderLang) globalHeaderLang.classList.add('hidden');
  }

  if (target.headerSlot) renderAppHeader(target.headerSlot);
  renderBottomNav();
}

/**
 * ── CABECERA DE APP, UNA SOLA ──────────────────────────────────────────────
 * Se renderiza en el slot que declare la pantalla en SCREENS.headerSlot, en vez
 * de copiar el mismo bloque de markup en cada <main>. Una pantalla nueva la
 * hereda añadiendo `headerSlot` y un <div> vacío: nada más.
 *
 * Logotipo → goHome(). Nunca a la landing de marketing: es el argumento previo
 * a instalar y el usuario recurrente no lo necesita.
 */
function renderAppHeader(slotId) {
  const slot = document.getElementById(slotId);
  if (!slot) return;
  const dict = TRANSLATIONS[currentLang];
  slot.textContent = '';

  const row = document.createElement('div');
  row.className = 'flex items-center justify-between gap-2';

  // ── Izquierda: logotipo, vuelve al hub ──
  const brand = document.createElement('button');
  brand.type = 'button';
  brand.className = 'flex items-center gap-2 shrink-0 bg-transparent border-0 p-0 cursor-pointer group';
  brand.title = dict.goHomeLabel;
  brand.setAttribute('aria-label', dict.goHomeLabel);
  brand.addEventListener('click', goHome);

  const logo = document.createElement('img');
  logo.src = '/icon-192.png';
  logo.alt = '';
  logo.setAttribute('aria-hidden', 'true');
  logo.width = 38; logo.height = 38;
  logo.className = 'w-[38px] h-[38px] rounded-full shadow-sm border border-white/20 group-hover:scale-105 transition-transform';

  const word = document.createElement('span');
  word.className = 'text-xs uppercase tracking-[0.25em] text-slate-400 font-semibold group-hover:text-slate-600 transition-colors';
  word.textContent = 'alivio';

  brand.appendChild(logo);
  brand.appendChild(word);

  // ── Derecha: idioma, favoritos, apoyar ──
  const tools = document.createElement('div');
  tools.className = 'flex items-center gap-2 shrink-0';

  const langBox = document.createElement('div');
  langBox.className = 'flex items-center gap-1 text-[10px] bg-white/45 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/60';
  const activo = 'font-bold text-indigo-600 transition-colors uppercase cursor-pointer bg-transparent border-0 p-0';
  const inerte = 'font-light text-slate-400 hover:text-indigo-600 transition-colors uppercase cursor-pointer bg-transparent border-0 p-0';
  ['es', 'en'].forEach((code, i) => {
    if (i === 1) {
      const sep = document.createElement('span');
      sep.className = 'text-slate-300';
      sep.textContent = '|';
      langBox.appendChild(sep);
    }
    const b = document.createElement('button');
    b.type = 'button';
    b.className = (currentLang === code) ? activo : inerte;
    b.textContent = code.toUpperCase();
    b.addEventListener('click', () => setLang(code));
    langBox.appendChild(b);
  });

  const chip = 'bg-white/45 backdrop-blur-md p-1 rounded-full border border-white/60 transition-all cursor-pointer shadow-sm flex items-center justify-center w-[26px] h-[26px] text-xs';

  const fav = document.createElement('button');
  fav.type = 'button';
  fav.className = chip + ' text-slate-400 hover:text-indigo-600';
  fav.title = dict.titleFavorites;
  fav.setAttribute('aria-label', dict.titleFavorites);
  fav.textContent = '🔖';
  fav.addEventListener('click', openFavorites);

  // Discreto a propósito: en una pantalla de rezo, un CTA de donación grande
  // desentona. Va como icono, no como llamada a la acción.
  const heart = document.createElement('button');
  heart.type = 'button';
  heart.className = chip + ' text-rose-500 hover:text-rose-600';
  heart.title = dict.supportLabel;
  heart.setAttribute('aria-label', dict.supportLabel);
  heart.textContent = '❤️';
  heart.addEventListener('click', openDonateModal);

  tools.appendChild(langBox);
  tools.appendChild(fav);
  tools.appendChild(heart);

  row.appendChild(brand);
  row.appendChild(tools);
  slot.appendChild(row);
}

/**
 * Vuelve al hub. Es lo que hace el logotipo dentro de la app.
 * Con un solo módulo activo el hub no aporta nada —sería una tarjeta suelta y un
 * toque de más—, así que se salta y se entra directo. Eso hace que apagar los
 * módulos con `enabled: false` devuelva exactamente el comportamiento anterior.
 */
function goHome() {
  const mods = visibleModules();
  if (mods.length <= 1) {
    changeScreen(mods.length === 1 ? mods[0].screen : 'screen-desahogo');
    return;
  }
  renderHub();
  changeScreen('screen-hub');
}

/**
 * Pinta las tarjetas del hub. Se reconstruyen al cambiar idioma o vertiente.
 * Todo con createElement: nada de innerHTML.
 */
function renderHub() {
  const host = document.getElementById('hub-cards');
  if (!host) return;
  const dict = TRANSLATIONS[currentLang];

  host.textContent = '';

  visibleModules().forEach(mod => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'hub-card';
    card.addEventListener('click', () => changeScreen(mod.screen));

    const icon = document.createElement('span');
    icon.className = `hub-card-icon ${mod.accent}`;
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = mod.icon;

    const body = document.createElement('span');
    body.className = 'flex flex-col gap-0.5 min-w-0';

    const title = document.createElement('span');
    title.className = 'text-sm font-medium text-slate-700';
    title.textContent = dict[`hubCard_${mod.id}_title`];

    const desc = document.createElement('span');
    desc.className = 'text-xs font-light text-slate-500 leading-relaxed';
    desc.textContent = dict[`hubCard_${mod.id}_desc`];

    body.appendChild(title);
    body.appendChild(desc);
    card.appendChild(icon);
    card.appendChild(body);

    if (!mod.ready) {
      const soon = document.createElement('span');
      soon.className = 'hub-card-soon';
      soon.textContent = dict.hubCardSoon;
      card.appendChild(soon);
    }

    host.appendChild(card);
  });
}

/**
 * Pinta la barra inferior y marca la pestaña activa.
 * Con un solo destino no hay nada que navegar: la barra no se muestra.
 */
function renderBottomNav() {
  const nav = document.getElementById('bottom-nav');
  if (!nav) return;

  const mods = visibleModules();
  const chrome = (SCREENS[currentScreen] || {}).chrome;
  const show = chrome === 'app' && mods.length > 1;

  nav.hidden = !show;
  document.body.classList.toggle('has-bottom-nav', show);
  if (!show) {
    nav.textContent = '';
    return;
  }

  const dict = TRANSLATIONS[currentLang];
  const activeTab = (SCREENS[currentScreen] || {}).tab;
  nav.textContent = '';

  mods.forEach(mod => {
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.className = 'nav-tab' + (mod.center ? ' nav-tab-center' : '') + (mod.id === activeTab ? ' nav-tab-active' : '');
    if (mod.id === activeTab) tab.setAttribute('aria-current', 'page');
    tab.addEventListener('click', () => changeScreen(mod.screen));

    const icon = document.createElement('span');
    icon.className = 'nav-tab-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = mod.icon;

    const label = document.createElement('span');
    label.textContent = dict[`nav_${mod.id}`];

    tab.appendChild(icon);
    tab.appendChild(label);
    nav.appendChild(tab);
  });
}

// Datos estáticos de contingencia (Fallback) en Español
const FALLBACK_COMFORT_ES = {
  verses: [
    {
      bibleVerse: "Mateo 11, 28-30",
      verseText: "Vengan a mí todos los que están fatigados y agobiados, y yo los aliviaré. Carguen con mi yugo y aprendan de mí, que soy manso y humilde de corazón, y encontrarán descanso para sus almas."
    },
    {
      bibleVerse: "Salmo 23, 1-3",
      verseText: "El Señor es mi pastor, nada me falta. En verdes praderas me hace recostar, me conduce hacia fuentes tranquilas y recrea mis fuerzas."
    },
    {
      bibleVerse: "Filipenses 4, 6-7",
      verseText: "No se angustien por nada; en cambio, oren por todo. Presenten sus peticiones a Dios y denle gracias, y la paz de Dios custodiará sus corazones."
    }
  ],
  comfort: "Descansa. En momentos de incertidumbre, tu desahogo ha sido escuchado. Permítete soltar tus cargas y confiar en la providencia del Padre que nunca te abandona.",
  prayer: "Señor Jesús, en Ti confío. Te entrego mi cansancio y mis aflicciones en este día. Dame la paz que sobrepasa todo entendimiento, cubre mi corazón con Tu Divina Misericordia y acompáñame a cada paso. Amén.",
  afternoonMessage: "respira. el señor sostiene tus cargas hoy. estás a salvo.",
  image: "/fallback-misericordia.png"
};

// Datos estáticos de contingencia (Fallback) en Inglés
const FALLBACK_COMFORT_EN = {
  verses: [
    {
      bibleVerse: "Matthew 11:28-30",
      verseText: "Come to me, all you who are weary and burdened, and I will give you rest. Take my yoke upon you and learn from me, for I am gentle and humble in heart, and you will find rest for your souls."
    },
    {
      bibleVerse: "Psalm 23:1-3",
      verseText: "The Lord is my shepherd, I lack nothing. He makes me lie down in green pastures, he leads me beside quiet waters, he refreshes my soul."
    },
    {
      bibleVerse: "Philippians 4:6-7",
      verseText: "Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God. And the peace of God will guard your hearts."
    }
  ],
  comfort: "Rest. In moments of uncertainty, your plea has been heard. Allow yourself to let go of your burdens and trust in the providence of the Father who never abandons you.",
  prayer: "Lord Jesus, I trust in You. I surrender my fatigue and my afflictions to You today. Give me the peace that surpasses all understanding, cover my heart with Your Divine Mercy, and accompany me at every step. Amen.",
  afternoonMessage: "breathe. the lord carries your burdens today. you are safe.",
  image: "/fallback-misericordia.png"
};

// Diccionario de Traducciones (Landing Page y App)
const TRANSLATIONS = {
  es: {
    landingTitle: "Un refugio de paz en tu bolsillo",
    landingTagline: "Alivio es tu <strong>espacio seguro</strong> de <strong>meditación</strong> y <strong>oración católica</strong> en formato <strong>PWA</strong>. Un <strong>refugio de paz</strong> en tu <strong>bolsillo</strong> para aliviar el estrés y reconectarte con Dios.",
    btnEnterApp: "comenzar a orar",
    titleHowWorks: "¿cómo funciona Alivio?",
    step1Title: "Desahoga tu corazón",
    step1Desc: "Escribe lo que te aflige hoy de forma segura. Elige tu enfoque: Católico, Evangélico o Espiritual para recibir el consuelo idóneo.",
    step2Title: "Aquieta tu templo",
    step2Desc: "Sigue el ciclo de respiración guiado de 12 segundos para calmar tu pecho y relajar la mente.",
    step3Title: "Recibe consuelo y recordatorios",
    step3Desc: "Recibe versículos personalizados, tu plegaria íntima y haz un recordatorio. Además, guarda tus oraciones favoritas y mantén tu racha diaria.",
    titleScreenshots: "capturas de la aplicación",
    titleFavorites: "Mis oraciones guardadas",
    goHomeLabel: "Volver al inicio",
    supportLabel: "Apoyar a Alivio",
    hubGreeting: "«La paz les dejo, mi paz les doy»",
    hubCardSoon: "muy pronto",
    hubCard_evangelio_title: "Evangelio del Día",
    hubCard_evangelio_desc: "La Palabra de hoy, su salmo y el comentario del Papa.",
    hubCard_desahogo_title: "Desahogo y consuelo",
    hubCard_desahogo_desc: "Suelta tu carga en anónimo y respira en calma.",
    hubCard_oraciones_title: "Oraciones y Rosario",
    hubCard_oraciones_desc: "Padre Nuestro, el Rosario de hoy y los Salmos.",
    nav_evangelio: "Evangelio",
    nav_desahogo: "Desahogo",
    nav_oraciones: "Oraciones",
    evangelioTitle: "Evangelio del Día",
    evangelioSoon: "Muy pronto: la Palabra de hoy con su primera lectura, el salmo y el comentario del Papa.",
    oracionesTitle: "Oraciones",
    oracionesSubtitle: "Textos de siempre, sin conexión y sin prisa.",
    prayerSearchPlaceholder: "Buscar una oración…",
    prayerNoMatches: "No encontramos ninguna oración con esa palabra.",
    prayerNoneYet: "Todavía no hay oraciones publicadas para este modo.",
    prayerScreenAwake: "La pantalla se mantendrá encendida mientras rezas.",
    rosaryToday: "Rosario de hoy",
    fontSmaller: "Reducir el tamaño de la letra",
    fontBigger: "Aumentar el tamaño de la letra",
    prayerShare: "Compartir esta oración",
    prayerCopied: "Oración copiada",
    rosaryMysteryOf: "Misterio {n} de {total}",
    rosaryAnnounce: "Enunciado del misterio",
    rosaryAveCount: "Ave María {n} de {total}",
    rosaryNext: "Continuar",
    rosaryNextAve: "Siguiente Ave María",
    rosaryClosing: "Para terminar",
    rosaryDone: "Terminar",
    videoDemoTitle: "¿Cómo luce Alivio en mi celular?",
    videoDemoCta: "Ver el video de demostración de Alivio",
    videoDemoFrameTitle: "Video de demostración de Alivio",
    titleInstall: "Lleva Alivio en tu teléfono",
    subInstall: "Nuestra app es una PWA ligera. No requiere App Store ni Google Play.",
    btnInstallPwa: "Instalar en este Dispositivo",
    iosGuideTitle: "Instrucciones para iPhone (Safari):",
    iosStep1: "Toca el icono de Compartir (el cuadro con una flecha hacia arriba) en la barra inferior de Safari.",
    iosStep2: "Desplázate hacia abajo y selecciona \"Agregar a Inicio\" (Add to Home Screen).",
    iosStep3: "Nombra la aplicación como Alivio y pulsa Agregar arriba a la derecha.",

    justBreathe: "respirar",
    greetingMorning: "Buenos días. Inicia en paz.",
    greetingAfternoon: "Buenas tardes. Encuentra calma.",
    greetingNight: "Buenas noches. Descansa en Él.",
    greetingSub: "Suelta aquí lo que te pesa hoy.",
    flowGuide: "1. Escribe tu pesar • 2. Respira hondo • 3. Recibe tu consuelo",
    placeholder: "cuéntale a Dios lo que pasa por tu mente y corazón... desahógate con total libertad y detalle...",
    placeholderSpiritual: "escribe lo que pasa por tu mente y corazón... desahógate con total libertad y detalle...",
    btnRelease: "soltar carga",
    breathingTitle: "el suspiro",
    breathingSub: "libera la tensión de tu pecho",
    breathingPrepare: "Prepárate",
    breathingCycleText: "Iniciando respiración de 3 tiempos automáticamente...",
    breathingInhale: "Inhala",
    breathingHold: "Retén",
    breathingExhale: "Exhala",
    btnBreathingControl: "Terminar",
    anclaVerse: "Confort",
    anclaOtraVez: "otra vez",
    anclaPrayerTitle: "Oración silenciosa",
    pushTitle: "¿A qué hora deseas tu recordatorio esta tarde?",
    pushSub: "Te enviaremos un susurro de paz personalizado a tu teléfono.",
    btnPush: "activar",
    stripeLegend: '"Tu donación permite que una persona en crisis reciba una palabra de aliento gratis hoy."',
    btnStripe: "Apoyar a Alivio",
    alertActivated: "Alerta activada",
    alertDeactivated: "🔔 Recordatorio desactivado.",
    btnCancelPush: "desactivar",
    toastJustBreathe: "¡Paz y bien! Gracias por regalarte este momento de respiración.",
    loadingText: "Elevando tu carga...",
    loadingSub: "Generando ilustración sagrada",
    waitingText: "Terminando de preparar tu refugio de paz...",
    headerDonate: "Apoyar",
    donateModalTitle: "Apoyar a Alivio",
    btnStripeModal: "Apoyar con Donación",
    googlePlaySub: "Disponible en",
    googlePlayTitle: "Google Play",
    defaultVerseText: '"El Señor es mi pastor, nada me falta. En verdes praderas me hace recostar..."',
    defaultComfort: "Te escucho. Es completamente normal sentir que el espacio se reduce cuando las tareas se acumulan en la mente. No tienes que resolver el día entero en este segundo.",
    defaultPrayer: "Señor, te entrego esta prisa y este cansancio. Concédeme la calma de saber que Tú caminas a mi lado y sostienes mi día. Amén.",

    // Denominación
    denomLabel: "Enfoque",
    denomCatholic: "Católico",
    denomEvangelical: "Evangélico",
    denomSpiritual: "Espiritual",

    // Pasos sugeridos
    nextStepsTitle: "¿Qué deseas hacer ahora?",
    nextStepBreathe: "Otra respiración",
    nextStepReflect: "Guardar oracíón",
    nextStepReminder: "Mi recordatorio",

    // Feedback emocional
    feelingQuestion: "¿Cómo te sientes ahora?",
    feelingBetter: "Mejor 🙏",
    feelingSame: "Igual 💚",
    feelingOverwhelmed: "Aún abrumado 🙍",
    feelingThanks: "Gracias por compartir cómo te sientes. Recuerda: este momento fue un paso valiente.",
    feelingThanksOverwhelmed: "Sigue aquí. Respira de nuevo. No estás solo/a. Si necesitas más ayuda, no dudes en buscarla.",
    savedFavorite: "✔ Oración guardada en tus favoritos.",
    alreadySaved: "Ya guardaste esta oración anteriormente.",

    // Crisis
    crisisTitle: "Si estás en una situación de crisis",
    crisisDesc: "No estás solo/a. Hay personas capacitadas listas para escucharte ahora mismo.",
    crisisCall: "Llamar al *0311",
    crisisWeb: "Visitar recurso de apoyo",

    // Racha
    streakDays: (n) => n === 1 ? "1 día contigo" : `${n} días contigo`
  },
  en: {
    landingTitle: "A refuge of peace in your pocket",
    landingTagline: "Alivio is your <strong>safe space</strong> for <strong>meditation</strong> and <strong>Catholic prayer</strong> in <strong>PWA</strong> format. A <strong>refuge of peace</strong> in your <strong>pocket</strong> to relieve daily stress and reconnect with God.",
    btnEnterApp: "start praying",
    titleHowWorks: "how does Alivio work?",
    step1Title: "Vent your heart",
    step1Desc: "Write what troubles you today securely. Choose your focus: Catholic, Evangelical, or Spiritual to receive the ideal comfort.",
    step2Title: "Quiet your temple",
    step2Desc: "Follow the mandatory 12-second breathing cycle to calm your chest and relax your mind.",
    step3Title: "Receive comfort & reminders",
    step3Desc: "Receive personalized verses, your intimate prayer, and set a reminder. Plus, save your favorite prayers and keep your daily streak.",
    titleScreenshots: "application screenshots",
    titleFavorites: "My saved prayers",
    goHomeLabel: "Back to home",
    supportLabel: "Support Alivio",
    hubGreeting: "“Peace I leave with you; my peace I give you”",
    hubCardSoon: "coming soon",
    hubCard_evangelio_title: "Gospel of the Day",
    hubCard_evangelio_desc: "Today's Word, its psalm and the Pope's reflection.",
    hubCard_desahogo_title: "Unburden & comfort",
    hubCard_desahogo_desc: "Let your burden go anonymously and breathe calmly.",
    hubCard_oraciones_title: "Prayers & Rosary",
    hubCard_oraciones_desc: "The Lord's Prayer, today's Rosary and the Psalms.",
    nav_evangelio: "Gospel",
    nav_desahogo: "Unburden",
    nav_oraciones: "Prayers",
    evangelioTitle: "Gospel of the Day",
    evangelioSoon: "Coming soon: today's Word with its first reading, the psalm and the Pope's reflection.",
    oracionesTitle: "Prayers",
    oracionesSubtitle: "The prayers you know, offline and unhurried.",
    prayerSearchPlaceholder: "Search a prayer…",
    prayerNoMatches: "No prayer matches that word.",
    prayerNoneYet: "No prayers published for this mode yet.",
    prayerScreenAwake: "The screen will stay on while you pray.",
    rosaryToday: "Today's Rosary",
    fontSmaller: "Decrease text size",
    fontBigger: "Increase text size",
    prayerShare: "Share this prayer",
    prayerCopied: "Prayer copied",
    rosaryMysteryOf: "Mystery {n} of {total}",
    rosaryAnnounce: "Announcing the mystery",
    rosaryAveCount: "Hail Mary {n} of {total}",
    rosaryNext: "Continue",
    rosaryNextAve: "Next Hail Mary",
    rosaryClosing: "To close",
    rosaryDone: "Finish",
    videoDemoTitle: "What does Alivio look like on my phone?",
    videoDemoCta: "Watch the Alivio demo video",
    videoDemoFrameTitle: "Alivio demo video",
    titleInstall: "Carry Alivio on your phone",
    subInstall: "Our app is a lightweight PWA. No App Store or Google Play required.",
    btnInstallPwa: "Install on this Device",
    iosGuideTitle: "Instructions for iPhone (Safari):",
    iosStep1: "Tap the Share icon (the square with an upward arrow) in the bottom bar of Safari.",
    iosStep2: "Scroll down and select \"Add to Home Screen\".",
    iosStep3: "Name the application Alivio and tap Add in the upper right.",

    justBreathe: "breathe",
    greetingMorning: "Good morning. Start in peace.",
    greetingAfternoon: "Good afternoon. Find calm.",
    greetingNight: "Good night. Rest in Him.",
    greetingSub: "Release what weighs you down today.",
    flowGuide: "1. Write your concern • 2. Breathe deeply • 3. Receive your comfort",
    placeholder: "tell God what is on your mind and heart... vent with total freedom and detail...",
    placeholderSpiritual: "write what is on your mind and heart... vent with total freedom and detail...",
    btnRelease: "release burden",
    breathingTitle: "the sigh",
    breathingSub: "release the tension in your chest",
    breathingPrepare: "Get ready",
    breathingCycleText: "Starting 3-step breathing automatically...",
    breathingInhale: "Inhale",
    breathingHold: "Hold",
    breathingExhale: "Exhale",
    btnBreathingControl: "Finish",
    anclaVerse: "Comfort",
    anclaOtraVez: "again",
    anclaPrayerTitle: "Silent prayer",
    pushTitle: "What time do you want your reminder this afternoon?",
    pushSub: "We will send a personalized whisper of peace to your phone.",
    btnPush: "activate",
    btnCancelPush: "deactivate",
    stripeLegend: '"Your donation allows a person in crisis to receive a free word of comfort today."',
    btnStripe: "Support Alivio",
    alertActivated: "Alert activated",
    alertDeactivated: "🔔 Reminder deactivated.",
    toastJustBreathe: "Peace and goodness! Thank you for giving yourself this breathing moment.",
    loadingText: "Raising your burden...",
    loadingSub: "Generating sacred illustration",
    waitingText: "Finishing preparing your refuge of peace...",
    headerDonate: "Support",
    donateModalTitle: "Support Alivio",
    btnStripeModal: "Support with Donation",
    googlePlaySub: "Get it on",
    googlePlayTitle: "Google Play",
    defaultVerseText: '"The Lord is my shepherd, I lack nothing. He makes me lie down in green pastures..."',
    defaultComfort: "I hear you. It is completely normal to feel that space shrinks when tasks accumulate in the mind. You do not have to solve the whole day in this second.",
    defaultPrayer: "Lord, I hand over this rush and this weariness to You. Grant me the calm of knowing that You walk by my side and sustain my day. Amen.",

    // Denomination
    denomLabel: "Focus",
    denomCatholic: "Catholic",
    denomEvangelical: "Evangelical",
    denomSpiritual: "Spiritual",

    // Next steps
    nextStepsTitle: "What would you like to do now?",
    nextStepBreathe: "Another breath",
    nextStepReflect: "Save prayer",
    nextStepReminder: "My reminder",

    // Emotional feedback
    feelingQuestion: "How do you feel now?",
    feelingBetter: "Better 🙏",
    feelingSame: "The same 💚",
    feelingOverwhelmed: "Still overwhelmed 🙍",
    feelingThanks: "Thank you for sharing how you feel. Remember: this moment was a brave step.",
    feelingThanksOverwhelmed: "Stay here. Breathe again. You are not alone. If you need more help, don't hesitate to seek it.",
    savedFavorite: "✔ Prayer saved to your favorites.",
    alreadySaved: "You already saved this prayer.",

    // Crisis
    crisisTitle: "If you are in crisis",
    crisisDesc: "You are not alone. Trained people are ready to listen to you right now.",
    crisisCall: "Call *0311",
    crisisWeb: "Visit support resource",

    // Streak
    streakDays: (n) => n === 1 ? "1 day with you" : `${n} days with you`
  }
};

// Datos descriptivos de las capturas de pantalla de marketing (SS1 a SS4)
const SCREENSHOTS_DATA = {
  es: [
    {
      title: "Paso 1: El Desahogo",
      desc: "Escribe con total libertad todo lo que pesa en tu corazón y personaliza el enfoque de fe antes de empezar."
    },
    {
      title: "Paso 2: El Suspiro",
      desc: "Una respiración profunda y pausada de 12 segundos para relajar el sistema nervioso y enfocar la atención."
    },
    {
      title: "Paso 3: Versículos de Consuelo",
      desc: "Recibe versículos seleccionados especialmente, guarda la plegaria en tus favoritos y visualiza tu racha consecutiva en el ancla."
    },
    {
      title: "Paso 4: Oración y Recordatorio",
      desc: "Programa tu recordatorio diario para recibir un susurro de paz personalizado directamente en tu teléfono."
    }
  ],
  en: [
    {
      title: "Step 1: The Vent",
      desc: "Write freely whatever weighs down your heart and customize your faith focus before starting."
    },
    {
      title: "Step 2: The Sigh",
      desc: "A deep, paused 12-second breathing cycle to relax your nervous system and focus your attention."
    },
    {
      title: "Step 3: Verses of Comfort",
      desc: "Receive verses selected especially for you, save the prayer to your favorites, and track your daily streak."
    },
    {
      title: "Step 4: Prayer & Reminder",
      desc: "Schedule your daily reminder to receive a personalized whisper of peace directly on your phone."
    }
  ]
};

// Estado global de idioma (por defecto español o lo guardado)
let currentLang = localStorage.getItem('alivio_lang') || 'es';

// ── DENOMINACIÓN ──────────────────────────────────────────────────────────────
let currentDenomination = localStorage.getItem('alivio_denom') || 'catholic';

function setDenomination(denom) {
  currentDenomination = denom;
  localStorage.setItem('alivio_denom', denom);
  applyDenominationUI();
  // La vertiente reordena las tarjetas del hub. El contenido no cambia.
  renderHub();
  renderBottomNav();
  // Las oraciones SÍ se filtran por vertiente: son devoción personal, no
  // leccionario compartido. Ver «adapta lo personal, no adaptes lo compartido».
  renderPrayerList();
}

function applyDenominationUI() {
  const btns = ['catholic', 'evangelical', 'spiritual'];
  btns.forEach(d => {
    const btn = document.getElementById(`denom-btn-${d}`);
    if (!btn) return;
    if (d === currentDenomination) {
      btn.className = 'denom-btn denom-btn-active';
    } else {
      btn.className = 'denom-btn';
    }
  });
  const labelEl = document.getElementById('denom-label');
  const dict = TRANSLATIONS[currentLang];
  if (dict) {
    // Traducir los textos internos de los botones de enfoque
    const spanCatholic = document.getElementById('txt-denom-catholic');
    if (spanCatholic) spanCatholic.innerText = dict.denomCatholic;
    const spanEvangelical = document.getElementById('txt-denom-evangelical');
    if (spanEvangelical) spanEvangelical.innerText = dict.denomEvangelical;
    const spanSpiritual = document.getElementById('txt-denom-spiritual');
    if (spanSpiritual) spanSpiritual.innerText = dict.denomSpiritual;

    if (labelEl) {
      const map = { catholic: dict.denomCatholic, evangelical: dict.denomEvangelical, spiritual: dict.denomSpiritual };
      labelEl.innerText = map[currentDenomination] || '';
    }

    // Actualizar dinámicamente el placeholder de la caja de texto según denominación
    const ventInput = document.getElementById('vent-input');
    if (ventInput) {
      ventInput.placeholder = currentDenomination === 'spiritual' ? dict.placeholderSpiritual : dict.placeholder;
    }
  }
}

// ── RACHA DE DÍAS ─────────────────────────────────────────────────────────────
function updateStreak() {
  const today = new Date().toISOString().slice(0, 10);
  const lastDate = localStorage.getItem('alivio_streak_date');
  let streak = parseInt(localStorage.getItem('alivio_streak') || '0', 10);

  if (lastDate === today) return streak; // ya contado hoy

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yStr = yesterday.toISOString().slice(0, 10);

  if (lastDate === yStr) {
    streak += 1;
  } else {
    streak = 1; // racha rota o primer día
  }

  localStorage.setItem('alivio_streak', String(streak));
  localStorage.setItem('alivio_streak_date', today);
  return streak;
}

function renderStreak() {
  const streak = parseInt(localStorage.getItem('alivio_streak') || '0', 10);
  const el = document.getElementById('streak-display');
  if (!el || streak < 1) return;
  el.classList.remove('hidden');
  const dict = TRANSLATIONS[currentLang];
  const countSpan = el.querySelector('#streak-count');
  if (countSpan && dict && typeof dict.streakDays === 'function') {
    countSpan.innerText = dict.streakDays(streak);
  } else if (countSpan) {
    countSpan.innerText = streak;
  }
}

// ── FAVORITOS ──────────────────────────────────────────────────────────────────
function saveFavorite() {
  if (!comfortDataResolved) return;
  const dict = TRANSLATIONS[currentLang];
  const favorites = JSON.parse(localStorage.getItem('alivio_favorites') || '[]');
  const entry = {
    date: new Date().toISOString(),
    prayer: comfortDataResolved.prayer,
    verse: comfortDataResolved.verses?.[0]?.verseText || '',
    verseRef: comfortDataResolved.verses?.[0]?.bibleVerse || ''
  };
  // Evitar duplicados por prayer
  const exists = favorites.some(f => f.prayer === entry.prayer);
  if (exists) {
    showToast(dict.alreadySaved);
    return;
  }
  favorites.unshift(entry);
  if (favorites.length > 30) favorites.pop(); // máx 30
  localStorage.setItem('alivio_favorites', JSON.stringify(favorites));
  showToast(dict.savedFavorite);
  // Cambiar icono del botón a confirmado
  const btn = document.getElementById('btn-save-favorite');
  if (btn) {
    btn.innerHTML = '✔ ' + (currentLang === 'en' ? 'Saved' : 'Guardada');
    btn.classList.add('btn-saved');
  }
}

// ── FEEDBACK EMOCIONAL ────────────────────────────────────────────────────────
function handleFeeling(type) {
  const dict = TRANSLATIONS[currentLang];
  const btns = document.querySelectorAll('.feeling-btn');
  btns.forEach(b => b.classList.remove('feeling-btn-active'));
  const activeBtn = document.getElementById(`feeling-${type}`);
  if (activeBtn) activeBtn.classList.add('feeling-btn-active');

  const msg = document.getElementById('feeling-response-msg');
  if (msg) {
    msg.innerText = (type === 'overwhelmed') ? dict.feelingThanksOverwhelmed : dict.feelingThanks;
    msg.classList.remove('hidden');
  }

  // Si aún abrumado, hacer scroll suave a la sección de crisis
  if (type === 'overwhelmed') {
    setTimeout(() => {
      const crisis = document.getElementById('crisis-section');
      if (crisis) crisis.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 500);
  }
}

// ── PASOS SUGERIDOS ───────────────────────────────────────────────────────────
function goToBreathing() {
  // Vuelve a respiración sin borrar el desahogo actual ni reiniciar la API
  isJustBreathing = true;
  changeScreen('screen-suspiro');
  setupBreathingFlow();
}

function scrollToPush() {
  const pushSection = document.getElementById('push-section');
  if (pushSection) {
    pushSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

// Variables para control de la API en segundo plano
let comfortDataResolved = null;
let apiRequestFinished = false;
let apiRequestError = null;
let breathingFinishedAndWaiting = false;
let isJustBreathing = false;

// Variables para el carrusel de versículos
let currentVerseIndex = 0;
let loadedVerses = [];

// Variables para el carrusel de capturas de marketing
let currentMarketingIndex = 1;
const totalMarketingScreenshots = 4;

// Captura del prompt nativo de instalación
let deferredPrompt = null;

// ── AUDIO AMBIENTE (Web Audio API — Sin archivos externos) ──────────────────
let audioCtx = null;
let ambientNodes = [];
let audioGain = null;
let audioActive = false;
let audioFadeInterval = null;

function initAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  
  // Nodo de ganancia maestro
  audioGain = audioCtx.createGain();
  audioGain.gain.setValueAtTime(0, audioCtx.currentTime);
  audioGain.connect(audioCtx.destination);

  // ─ Pink Noise (buf fer con ruido filtrado a frecuencias bajas) ─
  const bufferSize = audioCtx.sampleRate * 4; // 4 segundos de buffer
  const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  let b0=0, b1=0, b2=0, b3=0, b4=0, b5=0, b6=0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.96900 * b2 + white * 0.1538520;
    b3 = 0.86650 * b3 + white * 0.3104856;
    b4 = 0.55000 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.0168980;
    data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
    b6 = white * 0.115926;
  }
  const noiseSource = audioCtx.createBufferSource();
  noiseSource.buffer = noiseBuffer;
  noiseSource.loop = true;

  // Filtro paso-bajo para suavizar el ruido (suena a lluvia suave)
  const lpFilter = audioCtx.createBiquadFilter();
  lpFilter.type = 'lowpass';
  lpFilter.frequency.value = 500;
  lpFilter.Q.value = 0.5;

  noiseSource.connect(lpFilter);
  lpFilter.connect(audioGain);
  noiseSource.start();

  // ─ Pad Ambiental: dos osciladores detuneados (efecto de dron tranquilo) ─
  const freqs = [55, 82.41]; // A1 y E2 (armonia perfecta)
  freqs.forEach((freq, i) => {
    const osc = audioCtx.createOscillator();
    const oscGain = audioCtx.createGain();
    const oscFilter = audioCtx.createBiquadFilter();

    osc.type = 'sine';
    osc.frequency.value = freq;
    osc.detune.value = i === 0 ? -8 : 8; // ligero detune para efecto coral
    oscGain.gain.value = 0.04;
    oscFilter.type = 'lowpass';
    oscFilter.frequency.value = 300;

    osc.connect(oscFilter);
    oscFilter.connect(oscGain);
    oscGain.connect(audioGain);
    osc.start();
    ambientNodes.push(osc);
  });
}

function fadeAudio(targetVolume, durationMs) {
  if (!audioGain) return;
  clearInterval(audioFadeInterval);
  const startVol = audioGain.gain.value;
  const steps = 30;
  const stepTime = durationMs / steps;
  const delta = (targetVolume - startVol) / steps;
  let step = 0;
  audioFadeInterval = setInterval(() => {
    step++;
    const newVol = Math.max(0, Math.min(1, startVol + delta * step));
    audioGain.gain.setValueAtTime(newVol, audioCtx.currentTime);
    if (step >= steps) clearInterval(audioFadeInterval);
  }, stepTime);
}

function toggleAudio() {
  const btn = document.getElementById('audio-toggle-btn');
  const icon = document.getElementById('audio-icon');
  
  if (!audioCtx) initAudio();

  if (audioCtx.state === 'suspended') audioCtx.resume();

  if (!audioActive) {
    audioActive = true;
    fadeAudio(0.6, 2000);
    if (icon) icon.textContent = '🔊';
    if (btn) btn.title = 'Silenciar';
    localStorage.setItem('alivio_audio', 'on');
  } else {
    audioActive = false;
    fadeAudio(0, 1500);
    if (icon) icon.textContent = '🔇';
    if (btn) btn.title = 'Activar música ambient';
    localStorage.setItem('alivio_audio', 'off');
  }
}

function initAudioPreference() {
  // Audio desactivado por default — solo activar si el usuario lo hizo antes
  const pref = localStorage.getItem('alivio_audio');
  if (pref === 'on') {
    setTimeout(() => {
      if (!audioCtx) initAudio();
      audioActive = true;
      fadeAudio(0.6, 3000);
      const icon = document.getElementById('audio-icon');
      const btn = document.getElementById('audio-toggle-btn');
      if (icon) icon.textContent = '🔊';
      if (btn) btn.title = 'Silenciar';
    }, 1000);
  }
}

// ── MODAL DE FAVORITOS ─────────────────────────────────────────────────────────
function openFavorites() {
  const modal = document.getElementById('modal-favorites');
  if (modal) {
    renderFavoritesList();
    modal.classList.remove('opacity-0', 'pointer-events-none');
  }
}

function closeFavorites() {
  const modal = document.getElementById('modal-favorites');
  if (modal) modal.classList.add('opacity-0', 'pointer-events-none');
}

function renderFavoritesList() {
  const list = document.getElementById('favorites-list');
  if (!list) return;
  const favorites = JSON.parse(localStorage.getItem('alivio_favorites') || '[]');
  const dict = TRANSLATIONS[currentLang];

  if (favorites.length === 0) {
    list.innerHTML = `<p class="text-center text-slate-400 text-sm font-light py-8">${currentLang === 'en' ? 'No saved prayers yet.' : 'Aún no tienes oraciones guardadas.'}</p>`;
    return;
  }

  list.innerHTML = favorites.map((fav, i) => {
    const date = new Date(fav.date).toLocaleDateString(currentLang === 'en' ? 'en-US' : 'es-MX', { day: '2-digit', month: 'short' });
    return `
      <div class="border border-slate-100 rounded-2xl p-4 space-y-2 bg-white/70">
        <div class="flex items-center justify-between">
          <span class="text-[10px] uppercase tracking-wider text-indigo-400 font-semibold">${fav.verseRef || (currentLang === 'en' ? 'Verse' : 'Versículo')}</span>
          <span class="text-[10px] text-slate-400">${date}</span>
        </div>
        ${fav.verse ? `<p class="text-xs italic font-light text-slate-600 leading-relaxed border-l-2 border-indigo-200 pl-3">&ldquo;${fav.verse}&rdquo;</p>` : ''}
        <p class="text-xs font-light text-indigo-900 leading-relaxed">${fav.prayer}</p>
        <button onclick="deleteFavorite(${i})" class="text-[10px] text-rose-400 hover:text-rose-600 transition-colors">
          × ${currentLang === 'en' ? 'Remove' : 'Eliminar'}
        </button>
      </div>
    `;
  }).join('');
}

function deleteFavorite(index) {
  const favorites = JSON.parse(localStorage.getItem('alivio_favorites') || '[]');
  favorites.splice(index, 1);
  localStorage.setItem('alivio_favorites', JSON.stringify(favorites));
  renderFavoritesList();
}

// ── PWA INSTALL PROMPT (con detección de instalación previa) ──────────────────
window.addEventListener('beforeinstallprompt', async (e) => {
  e.preventDefault();
  deferredPrompt = e;

  // Capa 1: ¿Corriendo en modo standalone (ya instalado)?
  if (window.matchMedia('(display-mode: standalone)').matches) return;

  // Capa 2: getInstalledRelatedApps (Chrome/Edge)
  if ('getInstalledRelatedApps' in navigator) {
    try {
      const apps = await navigator.getInstalledRelatedApps();
      if (apps.length > 0) {
        // Ya está instalada — marcar en localStorage y no mostrar
        localStorage.setItem('pwa_installed', 'true');
        return;
      }
    } catch (_) { /* ignora errores de la API */ }
  }

  // Capa 3: localStorage (usuario ya lo marcó como instalado)
  if (localStorage.getItem('pwa_installed') === 'true') return;

  // Capa 4: banner rechazado en esta sesión
  if (localStorage.getItem('alivio_pwa_dismissed') === 'true') return;

  // Mostrar el banner flotante
  const installBanner = document.getElementById('pwa-install-banner');
  if (installBanner) installBanner.classList.remove('hidden');

  // Mostrar el botón del footer si existe
  const installBtn = document.getElementById('pwa-install-btn');
  if (installBtn) installBtn.classList.remove('hidden');
});

/**
 * Ejecutar la instalación nativa de la PWA
 */
document.addEventListener('DOMContentLoaded', () => {
  const installBanner = document.getElementById('pwa-install-banner');
  const installBannerBtn = document.getElementById('pwa-banner-install-btn');
  const installFooterBtn = document.getElementById('pwa-install-btn'); // Botón del footer
  const dismissBtn = document.getElementById('pwa-dismiss-btn');

  const triggerInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to install prompt: ${outcome}`);
    if (outcome === 'accepted') {
      if (installBanner) installBanner.classList.add('hidden');
      if (installFooterBtn) installFooterBtn.classList.add('hidden');
    }
    deferredPrompt = null;
  };

  // Asignar listeners de instalación a ambos botones
  if (installBannerBtn) {
    installBannerBtn.addEventListener('click', triggerInstall);
  }
  if (installFooterBtn) {
    installFooterBtn.addEventListener('click', triggerInstall);
  }

  // Acción: Presionar "Más tarde"
  if (dismissBtn) {
    dismissBtn.addEventListener('click', () => {
      // localStorage, no sessionStorage: «más tarde» significa más tarde, no
      // «hasta que cierres la pestaña». Prefijo alivio_ por las reglas de casa.
      localStorage.setItem('alivio_pwa_dismissed', 'true');
      if (installBanner) {
        installBanner.classList.add('hidden');
      }
    });
  }
});

// Escuchador global de instalación exitosa
window.addEventListener('appinstalled', () => {
  localStorage.setItem('pwa_installed', 'true');
  const installBanner = document.getElementById('pwa-install-banner');
  const installFooterBtn = document.getElementById('pwa-install-btn');
  if (installBanner) {
    installBanner.classList.add('hidden');
  }
  if (installFooterBtn) {
    installFooterBtn.classList.add('hidden');
  }
  deferredPrompt = null;
});

/**
 * Navegar a la app de desahogo
 */
function enterApp() {
  localStorage.setItem('alivio_visited', 'true');
  goHome();
}

/**
 * Alternar idioma
 */
function setLang(lang) {
  currentLang = lang;
  localStorage.setItem('alivio_lang', currentLang);
  applyTranslations();
  updateDynamicGreeting();
}

/**
 * Aplicar traducciones en el HTML
 */
function applyTranslations() {
  const dict = TRANSLATIONS[currentLang];
  
  // Resaltar visualmente el idioma activo en el selector doble (Landing)
  const btnEs = document.getElementById('lang-btn-es');
  const btnEn = document.getElementById('lang-btn-en');
  if (btnEs && btnEn) {
    if (currentLang === 'es') {
      btnEs.className = "font-bold text-indigo-600 border-b border-indigo-600 transition-colors uppercase";
      btnEn.className = "font-light text-slate-400 hover:text-indigo-600 transition-colors uppercase";
    } else {
      btnEs.className = "font-light text-slate-400 hover:text-indigo-600 transition-colors uppercase";
      btnEn.className = "font-bold text-indigo-600 border-b border-indigo-600 transition-colors uppercase";
    }
  }

  // Resaltar visualmente el idioma activo en el selector integrado (App)
  const appBtnEs = document.getElementById('app-lang-btn-es');
  const appBtnEn = document.getElementById('app-lang-btn-en');
  if (appBtnEs && appBtnEn) {
    if (currentLang === 'es') {
      appBtnEs.className = "font-bold text-indigo-600 transition-colors uppercase cursor-pointer";
      appBtnEn.className = "font-light text-slate-400 hover:text-indigo-600 transition-colors uppercase cursor-pointer";
    } else {
      appBtnEs.className = "font-light text-slate-400 hover:text-indigo-600 transition-colors uppercase cursor-pointer";
      appBtnEn.className = "font-bold text-indigo-600 transition-colors uppercase cursor-pointer";
    }
  }

  // Textos de la Landing Page (Screen 0)
  document.getElementById('landing-title').innerText = dict.landingTitle;
  document.getElementById('landing-tagline').innerHTML = dict.landingTagline;
  document.getElementById('btn-enter-app').innerText = dict.btnEnterApp;
  document.getElementById('title-how-works').innerText = dict.titleHowWorks;
  document.getElementById('step-1-title').innerText = dict.step1Title;
  document.getElementById('step-1-desc').innerText = dict.step1Desc;
  document.getElementById('step-2-title').innerText = dict.step2Title;
  document.getElementById('step-2-desc').innerText = dict.step2Desc;
  document.getElementById('step-3-title').innerText = dict.step3Title;
  document.getElementById('step-3-desc').innerText = dict.step3Desc;

  // Bloque del video demo. Guarda de id ausente: estos elementos son nuevos y no
  // deben poder tumbar el resto de applyTranslations() si faltan.
  // ── Hub, barra inferior y pantallas de los módulos nuevos ──────────────
  // La cabecera de la pantalla activa se repinta entera: sus textos y el idioma
  // resaltado salen del diccionario al construirla.
  const activeSlot = (SCREENS[currentScreen] || {}).headerSlot;
  if (activeSlot) renderAppHeader(activeSlot);

  const hubGreetingEl = document.getElementById('hub-greeting');
  if (hubGreetingEl) hubGreetingEl.innerText = dict.hubGreeting;
  const appFavBtn = document.getElementById('app-favorites-btn');
  if (appFavBtn) appFavBtn.title = dict.titleFavorites;

  const evangelioTitleEl = document.getElementById('evangelio-title');
  if (evangelioTitleEl) evangelioTitleEl.innerText = dict.evangelioTitle;
  const evangelioSoonEl = document.getElementById('evangelio-soon');
  if (evangelioSoonEl) evangelioSoonEl.innerText = dict.evangelioSoon;
  const oracionesTitleEl = document.getElementById('oraciones-title');
  if (oracionesTitleEl) oracionesTitleEl.innerText = dict.oracionesTitle;
  const oracionesSubEl = document.getElementById('oraciones-subtitle');
  if (oracionesSubEl) oracionesSubEl.innerText = dict.oracionesSubtitle;
  // El listado se repinta entero: sus textos salen del diccionario al construirlo.
  renderPrayerList();
  applyPrayerFont();

  // Hub y barra se repintan enteros: su texto sale del diccionario al construirlos.
  renderHub();
  renderBottomNav();

  const videoTitleEl = document.getElementById('video-demo-title');
  if (videoTitleEl) videoTitleEl.innerText = dict.videoDemoTitle;
  const videoCtaEl = document.getElementById('video-demo-cta');
  if (videoCtaEl) videoCtaEl.innerText = dict.videoDemoCta;
  const videoFrameEl = document.querySelector('#video-demo-facade + div iframe, iframe[src*="youtube-nocookie"]');
  if (videoFrameEl) videoFrameEl.title = dict.videoDemoFrameTitle;
  
  const titleScreenshots = document.getElementById('title-screenshots');
  if (titleScreenshots) titleScreenshots.innerText = dict.titleScreenshots;
  
  document.getElementById('title-install').innerText = dict.titleInstall;
  document.getElementById('sub-install').innerText = dict.subInstall;
  document.getElementById('btn-install-pwa').innerText = dict.btnInstallPwa;
  
  // Guía iOS
  const iosInstructions = document.getElementById('ios-instructions');
  if (iosInstructions) {
    iosInstructions.innerHTML = `
      <p class="text-xs font-medium text-center md:text-left text-indigo-100 flex items-center justify-center md:justify-start gap-1.5">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
        ${dict.iosGuideTitle}
      </p>
      <ol class="text-2xs space-y-2 list-decimal list-inside pl-1 text-indigo-200 font-light">
        <li>${dict.iosStep1}</li>
        <li>${dict.iosStep2}</li>
        <li>${dict.iosStep3}</li>
      </ol>
    `;
  }

  // Textos del Inicio (Screen 1)
  document.getElementById('txt-just-breathe').innerText = dict.justBreathe;
  document.getElementById('txt-flow-guide').innerText = dict.flowGuide;
  document.getElementById('vent-input').placeholder = dict.placeholder;
  document.getElementById('btn-release-text').innerText = dict.btnRelease;
  document.getElementById('stripe-legend-home').innerText = dict.stripeLegend;
  document.getElementById('stripe-btn-text-home').innerText = dict.btnStripe;

  // Textos de Respiración (Screen 2)
  document.getElementById('txt-breathing-title').innerText = dict.breathingTitle;
  document.getElementById('txt-breathing-sub').innerText = dict.breathingSub;
  document.getElementById('btn-breathing-control').innerText = dict.btnBreathingControl;
  
  if (breathingState === 'prepare') {
    document.getElementById('breathing-instruction').innerText = dict.breathingPrepare;
    document.getElementById('breathing-cycle-text').innerText = dict.breathingCycleText;
  }

  // Textos del Ancla (Screen 3)
  document.getElementById('txt-ancla-otra-vez').innerText = dict.anclaOtraVez;
  document.getElementById('txt-ancla-prayer-title').innerText = dict.anclaPrayerTitle;
  document.getElementById('stripe-legend-ancla').innerText = dict.stripeLegend;
  document.getElementById('stripe-btn-text-ancla').innerText = dict.btnStripe;

  // Nuevas secciones del Ancla
  const nextStepsTitle = document.getElementById('txt-next-steps-title');
  if (nextStepsTitle) nextStepsTitle.innerText = dict.nextStepsTitle;
  const btnBreathe = document.getElementById('txt-step-breathe');
  if (btnBreathe) btnBreathe.innerText = dict.nextStepBreathe;
  const btnReflect = document.getElementById('txt-step-reflect');
  if (btnReflect) btnReflect.innerText = dict.nextStepReflect;
  const btnReminder = document.getElementById('txt-step-reminder');
  if (btnReminder) btnReminder.innerText = dict.nextStepReminder;

  const feelingQ = document.getElementById('txt-feeling-question');
  if (feelingQ) feelingQ.innerText = dict.feelingQuestion;
  const feelingBetter = document.getElementById('txt-feeling-better');
  if (feelingBetter) feelingBetter.innerText = dict.feelingBetter;
  const feelingSame = document.getElementById('txt-feeling-same');
  if (feelingSame) feelingSame.innerText = dict.feelingSame;
  const feelingOver = document.getElementById('txt-feeling-overwhelmed');
  if (feelingOver) feelingOver.innerText = dict.feelingOverwhelmed;

  const crisisTitle = document.getElementById('txt-crisis-title');
  if (crisisTitle) crisisTitle.innerText = dict.crisisTitle;
  const crisisDesc = document.getElementById('txt-crisis-desc');
  if (crisisDesc) crisisDesc.innerText = dict.crisisDesc;
  const crisisCall = document.getElementById('txt-crisis-call');
  if (crisisCall) crisisCall.innerText = dict.crisisCall;
  const crisisWeb = document.getElementById('txt-crisis-web');
  if (crisisWeb) crisisWeb.innerText = dict.crisisWeb;

  // Denominación
  const denomLabelEl = document.getElementById('denom-label-text');
  if (denomLabelEl) denomLabelEl.innerText = dict.denomLabel;
  applyDenominationUI();

  // Textos de Notificaciones
  document.getElementById('txt-push-title').innerText = dict.pushTitle;
  document.getElementById('txt-push-sub').innerText = dict.pushSub;
  document.getElementById('btn-push-text').innerText = dict.btnPush;
  
  // Textos de Carga
  document.getElementById('loading-text').innerText = dict.loadingText;
  document.getElementById('loading-sub').innerText = dict.loadingSub;

  // Textos del Botón de Cabecera y del Modal de Donaciones
  const headerDonateText = document.getElementById('header-donate-text');
  if (headerDonateText) headerDonateText.innerText = dict.headerDonate;
  
  const donateModalTitle = document.getElementById('donate-modal-title');
  if (donateModalTitle) donateModalTitle.innerText = dict.donateModalTitle;
  
  const stripeLegendModal = document.getElementById('stripe-legend-modal');
  if (stripeLegendModal) stripeLegendModal.innerText = dict.stripeLegend;
  
  const stripeBtnTextModal = document.getElementById('stripe-btn-text-modal');
  if (stripeBtnTextModal) stripeBtnTextModal.innerText = dict.btnStripeModal;

  const googlePlaySub = document.getElementById('google-play-sub');
  if (googlePlaySub) googlePlaySub.innerText = dict.googlePlaySub;

  const googlePlayTitle = document.getElementById('google-play-title');
  if (googlePlayTitle) googlePlayTitle.innerText = dict.googlePlayTitle;

  // Si no se ha realizado un desahogo aún, traducir los textos por defecto del ancla
  const anclaVerseText = document.getElementById('ancla-verse-text');
  const anclaComfort = document.getElementById('ancla-comfort');
  const anclaPrayer = document.getElementById('ancla-prayer');
  if (anclaVerseText && anclaComfort && anclaPrayer) {
    if (!comfortDataResolved) {
      anclaVerseText.innerText = dict.defaultVerseText;
      anclaComfort.innerText = dict.defaultComfort;
      anclaPrayer.innerText = dict.defaultPrayer;
    }
  }

  // Sincronizar idioma en el slider de capturas de marketing
  updateMarketingScreenshot();
}

/**
 * Mostrar Toast Notification
 */
function showToast(message) {
  const toast = document.getElementById('toast-notification');
  const toastMsg = document.getElementById('toast-message');
  if (toast && toastMsg) {
    toastMsg.innerText = message;
    toast.classList.remove('opacity-0', '-translate-y-8', 'pointer-events-none');
    toast.classList.add('opacity-100', 'translate-y-0');
    
    setTimeout(() => {
      toast.classList.remove('opacity-100', 'translate-y-0');
      toast.classList.add('opacity-0', '-translate-y-8', 'pointer-events-none');
    }, 3500);
  }
}

/**
 * Enviar el desahogo a la API y procesar respuesta en segundo plano
 */
async function handleRelease() {
  const ventInput = document.getElementById('vent-input');
  const text = ventInput.value.trim();

  if (!text) {
    showToast(currentLang === 'en' ? "Please write what is weighing you down to release the burden." : "Por favor, escribe lo que te abruma para poder soltar la carga.");
    return;
  }

  // Resetear estados
  comfortDataResolved = null;
  apiRequestFinished = false;
  apiRequestError = null;
  breathingFinishedAndWaiting = false;
  isJustBreathing = false;

  // 1. Disparar API en segundo plano pasando el idioma y denominación actuales
  fetch(API_BASE + '/api/comfort', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ text, lang: currentLang, denomination: currentDenomination })
  })
  .then(async (response) => {
    if (!response.ok) {
      throw new Error("Error en la respuesta de la API.");
    }
    const data = await response.json();
    comfortDataResolved = data;
    apiRequestFinished = true;

    if (breathingFinishedAndWaiting) {
      displayComfortAndNavigate();
    }
  })
  .catch((error) => {
    console.warn("⚠️ Usando consuelo y oración de fallback debido a problemas de red:", error);
    comfortDataResolved = (currentLang === 'en') ? FALLBACK_COMFORT_EN : FALLBACK_COMFORT_ES;
    apiRequestFinished = true;
    
    if (breathingFinishedAndWaiting) {
      displayComfortAndNavigate();
    }
  });

  // Limpiar input y reiniciar contador
  ventInput.value = "";
  document.getElementById('char-counter').innerText = "0 / 300";

  // 2. Saltar de inmediato a la respiración guiada
  changeScreen('screen-suspiro');
  setupBreathingFlow();
}

/**
 * Iniciar flujo exclusivo de respiración (sin guardar desahogo)
 */
function startJustBreathing() {
  isJustBreathing = true;
  comfortDataResolved = null;
  apiRequestFinished = true;
  apiRequestError = null;
  breathingFinishedAndWaiting = false;

  changeScreen('screen-suspiro');
  setupBreathingFlow();
}

/**
 * Reiniciar la app al estado inicial
 */
function resetApp() {
  isJustBreathing = false;
  changeScreen('screen-desahogo');
  stopBreathingTimer();
  
  // Limpiar input y contador
  document.getElementById('vent-input').value = "";
  document.getElementById('char-counter').innerText = "0 / 300";
  
  const btn = document.getElementById('btn-breathing-control');
  btn.style.display = "block";
  btn.innerText = TRANSLATIONS[currentLang].btnBreathingControl;
}

// Variables para el flujo de respiración
let breathingInterval = null;
let breathingTimeout = null;
let breathingState = 'idle'; // inhale, hold, exhale, idle
let secondsRemaining = 0;
let currentCycle = 0;
const totalCycles = 1;

function setupBreathingFlow() {
  stopBreathingTimer();
  breathingState = 'prepare';
  currentCycle = 0;
  breathingFinishedAndWaiting = false;

  // Activar o resumir audio si está configurado en 'on'
  if (localStorage.getItem('alivio_audio') === 'on') {
    if (!audioCtx) initAudio();
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    audioActive = true;
    fadeAudio(0.6, 1000);
    const icon = document.getElementById('audio-icon');
    const btn = document.getElementById('audio-toggle-btn');
    if (icon) icon.textContent = '🔊';
    if (btn) btn.title = 'Silenciar';
  }

  
  const node = document.getElementById('breathing-node');
  node.className = "breathing-circle exhale w-24 h-24 rounded-full flex items-center justify-center text-white transition-all duration-1000";
  
  const dict = TRANSLATIONS[currentLang];
  document.getElementById('breathing-instruction').innerText = dict.breathingPrepare;
  document.getElementById('breathing-timer').innerText = "3";
  document.getElementById('breathing-cycle-text').innerText = dict.breathingCycleText;
  
  const btn = document.getElementById('btn-breathing-control');
  
  if (isJustBreathing) {
    btn.style.display = "block";
    btn.innerText = dict.btnBreathingControl;
  } else {
    btn.style.display = "none";
  }

  // Cuenta regresiva de preparación
  let prepSeconds = 3;
  breathingInterval = setInterval(() => {
    prepSeconds--;
    if (prepSeconds > 0) {
      document.getElementById('breathing-timer').innerText = prepSeconds;
    } else {
      clearInterval(breathingInterval);
      startBreathingCycle();
    }
  }, 1000);
}

function toggleBreathing() {
  stopBreathingTimer();
  resetApp();
}

function stopBreathingTimer() {
  if (breathingInterval) clearInterval(breathingInterval);
  if (breathingTimeout) clearTimeout(breathingTimeout);
  breathingState = 'idle';
}

function startBreathingCycle() {
  currentCycle++;
  const dict = TRANSLATIONS[currentLang];
  if (currentCycle > totalCycles) {
    stopBreathingTimer();
    
    if (isJustBreathing) {
      document.getElementById('breathing-instruction').innerText = (currentLang === 'en') ? "In peace" : "En paz";
      document.getElementById('breathing-timer').innerText = "";
      document.getElementById('breathing-cycle-text').innerText = (currentLang === 'en') ? "Thank you for taking care of your temple." : "Gracias por cuidar de tu templo.";
      setTimeout(() => {
        showToast(dict.toastJustBreathe);
        resetApp();
      }, 1200);
      return;
    }

    if (apiRequestFinished) {
      displayComfortAndNavigate();
    } else {
      breathingFinishedAndWaiting = true;
      document.getElementById('breathing-instruction').innerText = (currentLang === 'en') ? "Loading..." : "Cargando...";
      document.getElementById('breathing-timer').innerText = "";
      document.getElementById('breathing-cycle-text').innerText = dict.waitingText;
    }
    return;
  }

  document.getElementById('breathing-cycle-text').innerText = (currentLang === 'en') ? `Cycle ${currentCycle} of ${totalCycles}` : `Ciclo ${currentCycle} de ${totalCycles}`;
  inhalePhase();
}

function inhalePhase() {
  breathingState = 'inhale';
  secondsRemaining = 4;
  
  const node = document.getElementById('breathing-node');
  node.className = "breathing-circle inhale w-24 h-24 rounded-full flex items-center justify-center text-white transition-all duration-1000";
  
  document.getElementById('breathing-instruction').innerText = TRANSLATIONS[currentLang].breathingInhale;
  document.getElementById('breathing-timer').innerText = secondsRemaining;

  breathingInterval = setInterval(() => {
    secondsRemaining--;
    if (secondsRemaining > 0) {
      document.getElementById('breathing-timer').innerText = secondsRemaining;
    } else {
      clearInterval(breathingInterval);
      holdPhase();
    }
  }, 1000);
}

function holdPhase() {
  breathingState = 'hold';
  secondsRemaining = 4;
  
  const node = document.getElementById('breathing-node');
  node.className = "breathing-circle hold w-24 h-24 rounded-full flex items-center justify-center text-white transition-all duration-1000";
  
  document.getElementById('breathing-instruction').innerText = TRANSLATIONS[currentLang].breathingHold;
  document.getElementById('breathing-timer').innerText = secondsRemaining;

  breathingInterval = setInterval(() => {
    secondsRemaining--;
    if (secondsRemaining > 0) {
      document.getElementById('breathing-timer').innerText = secondsRemaining;
    } else {
      clearInterval(breathingInterval);
      exhalePhase();
    }
  }, 1000);
}

function exhalePhase() {
  breathingState = 'exhale';
  secondsRemaining = 4;
  
  const node = document.getElementById('breathing-node');
  node.className = "breathing-circle exhale w-24 h-24 rounded-full flex items-center justify-center text-white transition-all duration-1000";
  
  document.getElementById('breathing-instruction').innerText = TRANSLATIONS[currentLang].breathingExhale;
  document.getElementById('breathing-timer').innerText = secondsRemaining;

  breathingInterval = setInterval(() => {
    secondsRemaining--;
    if (secondsRemaining > 0) {
      document.getElementById('breathing-timer').innerText = secondsRemaining;
    } else {
      clearInterval(breathingInterval);
      startBreathingCycle();
    }
  }, 1000);
}

/**
 * Desplegar el confort de la IA en pantalla y navegar
 */
function displayComfortAndNavigate() {
  const data = comfortDataResolved;
  if (!data) return;

  loadedVerses = data.verses || [];
  currentVerseIndex = 0;
  
  renderActiveVerse();

  document.getElementById('ancla-comfort').innerText = data.comfort;
  document.getElementById('ancla-prayer').innerText = data.prayer;
  document.getElementById('ancla-image').src = data.image;

  if (data.afternoonMessage) {
    window.afternoonMessage = data.afternoonMessage;
  }

  localStorage.setItem('ultimo_confort', JSON.stringify(data));

  // Verificar suscripción activa para pintar los botones de push correctamente
  checkActiveSubscription();

  // Resetear estado de feedback emocional y botón de guardar
  const feelingMsg = document.getElementById('feeling-response-msg');
  if (feelingMsg) { feelingMsg.innerText = ''; feelingMsg.classList.add('hidden'); }
  document.querySelectorAll('.feeling-btn').forEach(b => b.classList.remove('feeling-btn-active'));
  const saveFavBtn = document.getElementById('btn-save-favorite');
  if (saveFavBtn) {
    saveFavBtn.classList.remove('btn-saved');
    saveFavBtn.innerHTML = `<span>🔖</span><span id="txt-step-reflect">${TRANSLATIONS[currentLang].nextStepReflect}</span>`;
  }

  // Actualizar racha al completar el flujo
  updateStreak();
  renderStreak();

  changeScreen('screen-ancla');
}

/**
 * Renderizar el versículo seleccionado en el carrusel
 */
function renderActiveVerse() {
  if (!loadedVerses || loadedVerses.length === 0) return;
  const verse = loadedVerses[currentVerseIndex];
  
  const blockquote = document.getElementById('ancla-verse-text');
  blockquote.style.opacity = '0';
  setTimeout(() => {
    document.getElementById('ancla-verse').innerText = verse.bibleVerse || "Confort";
    blockquote.innerText = `"${verse.verseText}"`;
    document.getElementById('verse-indicator').innerText = (currentLang === 'en') ? `Verse ${currentVerseIndex + 1} of ${loadedVerses.length}` : `Versículo ${currentVerseIndex + 1} de ${loadedVerses.length}`;
    blockquote.style.opacity = '1';
  }, 200);
}

function nextVerse() {
  if (loadedVerses.length === 0) return;
  currentVerseIndex = (currentVerseIndex + 1) % loadedVerses.length;
  renderActiveVerse();
}

function prevVerse() {
  if (loadedVerses.length === 0) return;
  currentVerseIndex = (currentVerseIndex - 1 + loadedVerses.length) % loadedVerses.length;
  renderActiveVerse();
}

const SCREENSHOT_FILES = ['SS11.png', 'SS22.png', 'SS33.png', 'SS44.png'];

function updateMarketingScreenshot() {
  const imgEl = document.getElementById('marketing-screenshot');
  const indEl = document.getElementById('marketing-indicator');
  const titleEl = document.getElementById('screenshot-title');
  const descEl = document.getElementById('screenshot-desc');
  
  if (imgEl && indEl) {
    imgEl.style.opacity = '0';
    if (titleEl) titleEl.style.opacity = '0';
    if (descEl) descEl.style.opacity = '0';
    
    setTimeout(() => {
      imgEl.src = '/' + SCREENSHOT_FILES[currentMarketingIndex - 1];
      indEl.innerText = `${currentMarketingIndex} / ${totalMarketingScreenshots}`;
      
      const langData = SCREENSHOTS_DATA[currentLang] || SCREENSHOTS_DATA['es'];
      const data = langData[currentMarketingIndex - 1];
      
      if (titleEl && data) titleEl.innerText = data.title;
      if (descEl && data) descEl.innerText = data.desc;
      
      imgEl.style.opacity = '1';
      if (titleEl) titleEl.style.opacity = '1';
      if (descEl) descEl.style.opacity = '1';
    }, 150);
  }
}

function nextMarketingScreenshot() {
  currentMarketingIndex = (currentMarketingIndex % totalMarketingScreenshots) + 1;
  updateMarketingScreenshot();
}

function prevMarketingScreenshot() {
  currentMarketingIndex = currentMarketingIndex - 1;
  if (currentMarketingIndex < 1) currentMarketingIndex = totalMarketingScreenshots;
  updateMarketingScreenshot();
}

// ══════════════════════════════════════════════════════════════════════════
//  ORACIONES
// ══════════════════════════════════════════════════════════════════════════
//
// El corpus vive en public/prayers.js: texto fijo, escrito a mano, nunca
// generado. Aquí solo se filtra, se busca y se muestra.
//
// REGLA: una oración con `verified: false` NO se muestra. Quien reza no puede
// detectar una palabra equivocada —está rezando, no revisando—, así que nada
// sin cotejar llega a la pantalla. Ver la cabecera de prayers.js.

const PRAYER_SEARCH_THRESHOLD = 12;
let currentPrayerId = null;
let prayerWakeLock = null;

/** Oraciones publicables para la vertiente activa. */
function availablePrayers() {
  if (typeof PRAYERS === 'undefined') return [];
  return PRAYERS.filter(p => p.verified && p.denominations.includes(currentDenomination));
}

/** Misterios que tocan hoy, según el día de la semana. */
function todaysRosary() {
  if (typeof ROSARY_MYSTERIES === 'undefined') return null;
  const key = ROSARY_MYSTERIES[new Date().getDay()];
  const set = ROSARY_SETS[key];
  return (set && set.verified) ? { key, set } : null;
}

/** Pinta el listado. Todo con createElement: nada de innerHTML. */
function renderPrayerList() {
  const host = document.getElementById('prayer-list');
  if (!host) return;
  const dict = TRANSLATIONS[currentLang];

  const all = availablePrayers();
  const searchWrap = document.getElementById('prayer-search-wrap');
  const searchInput = document.getElementById('prayer-search');

  // La búsqueda aparece sola cuando el listado se hace largo
  const searchVisible = all.length >= PRAYER_SEARCH_THRESHOLD;
  if (searchWrap) searchWrap.hidden = !searchVisible;
  if (searchInput) searchInput.placeholder = dict.prayerSearchPlaceholder;

  // Guarda deliberada: un id ausente o un elemento sin `value` no debe tumbar
  // el listado entero y dejar la pantalla en blanco.
  const raw = (searchVisible && searchInput) ? searchInput.value : '';
  const term = String(raw || '').trim().toLowerCase();
  const shown = term
    ? all.filter(p => p[currentLang].title.toLowerCase().includes(term) ||
                      p[currentLang].body.toLowerCase().includes(term))
    : all;

  host.textContent = '';
  shown.forEach(prayer => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'prayer-item';
    item.addEventListener('click', () => openPrayer(prayer.id));

    const body = document.createElement('span');
    body.className = 'flex flex-col gap-0.5 min-w-0';

    const title = document.createElement('span');
    title.className = 'text-sm font-medium text-slate-700';
    title.textContent = prayer[currentLang].title;
    body.appendChild(title);

    if (prayer.reference) {
      const ref = document.createElement('span');
      ref.className = 'text-[11px] font-light text-slate-400';
      ref.textContent = prayer.reference[currentLang];
      body.appendChild(ref);
    }

    item.appendChild(body);
    host.appendChild(item);
  });

  // Estado vacío: honesto sobre por qué está vacío, no un error genérico
  const empty = document.getElementById('prayer-empty');
  if (empty) {
    if (shown.length > 0) {
      empty.hidden = true;
    } else {
      empty.hidden = false;
      empty.innerText = term ? dict.prayerNoMatches : dict.prayerNoneYet;
    }
  }

  // Tarjeta del Rosario: solo si la vertiente es católica y los misterios están cotejados
  const rosaryCard = document.getElementById('rosary-card');
  const today = todaysRosary();
  if (rosaryCard) {
    const show = currentDenomination === 'catholic' && !!today && !term;
    rosaryCard.hidden = !show;
    if (show) {
      const t = document.getElementById('rosary-card-title');
      const d = document.getElementById('rosary-card-desc');
      if (t) t.innerText = dict.rosaryToday;
      if (d) d.innerText = today.set[currentLang].title;
    }
  }
}

/** Abre una oración en modo lectura. */
function openPrayer(id) {
  const prayer = availablePrayers().find(p => p.id === id);
  if (!prayer) return;
  currentPrayerId = id;

  const dict = TRANSLATIONS[currentLang];
  const titleEl = document.getElementById('prayer-title');
  const textEl = document.getElementById('prayer-text');
  const refEl = document.getElementById('prayer-reference');
  const srcEl = document.getElementById('prayer-source');

  if (titleEl) titleEl.innerText = prayer[currentLang].title;
  if (textEl) textEl.innerText = prayer[currentLang].body;

  // Pie discreto: referencia espiritual, no aviso legal. Para la Escritura se
  // funden cita y traducción en una línea («Salmo 23 · Reina-Valera 1909»); las
  // oraciones de la tradición no llevan nada, porque no hay nada que revelar.
  // El detalle de derechos vive en aviso-legal.html, no en medio del rezo.
  const sourceLabel = PRAYER_SOURCE_LABELS[prayer.source][currentLang];
  const refText = prayer.reference ? prayer.reference[currentLang] : '';

  if (refEl) {
    const linea = (refText && sourceLabel) ? (refText + ' · ' + sourceLabel) : refText;
    refEl.hidden = !linea;
    if (linea) refEl.innerText = linea;
  }
  if (srcEl) {
    // Lo propio de Alivio SÍ se declara: no puede pasar por oración de la tradición.
    const mostrar = !refText && !!sourceLabel;
    srcEl.hidden = !mostrar;
    if (mostrar) srcEl.innerText = sourceLabel;
  }

  renderStainedGlass('prayer-banner', prayerArtKey(prayer));
  updatePrayerFavIcon();
  applyPrayerFont();
  requestPrayerWakeLock();
  changeScreen('screen-oracion');
}

/** Abre los misterios del día como una oración más. */
// ── ROSARIO GUIADO ────────────────────────────────────────────────────────
// Estructura fija de cada misterio: enunciado → Padre Nuestro → 10 Ave Marías
// → Gloria → jaculatoria. Al terminar los cinco, la Salve.
// El día decide los misterios; ROSARY_MYSTERIES vive en prayers.js.

const ROSARY_FLOW = ['mystery', 'padre', 'ave', 'gloria', 'jaculatoria'];
let rosary = null;

/** Busca una oración del corpus por id, sin importar la vertiente activa. */
function prayerById(id) {
  if (typeof PRAYERS === 'undefined') return null;
  return PRAYERS.find(p => p.id === id && p.verified) || null;
}

function startRosary() {
  const today = todaysRosary();
  if (!today) return;
  rosary = { setKey: today.key, mystery: 0, step: 0, ave: 1, finished: false };
  renderStainedGlass('rosary-banner', 'mariano');   // el Rosario es rezo mariano
  applyPrayerFont();
  requestPrayerWakeLock();
  renderRosary();
  changeScreen('screen-rosario');
}

function rosaryNext() {
  if (!rosary) return;
  const step = ROSARY_FLOW[rosary.step];

  // Las diez Ave Marías se cuentan una a una
  if (step === 'ave' && rosary.ave < 10) {
    rosary.ave += 1;
    renderRosary();
    return;
  }
  if (rosary.step < ROSARY_FLOW.length - 1) {
    rosary.step += 1;
    rosary.ave = 1;
    renderRosary();
    return;
  }
  // Fin del misterio
  if (rosary.mystery < 4) {
    rosary.mystery += 1;
    rosary.step = 0;
    rosary.ave = 1;
    renderRosary();
    return;
  }
  // Fin de los cinco: la Salve cierra
  rosary.finished = true;
  renderRosary();
}

function rosaryPrev() {
  if (!rosary) return;
  if (rosary.finished) { rosary.finished = false; renderRosary(); return; }
  if (ROSARY_FLOW[rosary.step] === 'ave' && rosary.ave > 1) {
    rosary.ave -= 1;
  } else if (rosary.step > 0) {
    rosary.step -= 1;
    rosary.ave = (ROSARY_FLOW[rosary.step] === 'ave') ? 10 : 1;
  } else if (rosary.mystery > 0) {
    rosary.mystery -= 1;
    rosary.step = ROSARY_FLOW.length - 1;
    rosary.ave = 1;
  }
  renderRosary();
}

function renderRosary() {
  if (!rosary) return;
  const dict = TRANSLATIONS[currentLang];
  const set = ROSARY_SETS[rosary.setKey][currentLang];
  const item = set.items[rosary.mystery];

  const $ = id => document.getElementById(id);
  const setTitle = $('rosary-set-title');
  const progress = $('rosary-progress');
  const label = $('rosary-step-label');
  const mystery = $('rosary-mystery');
  const ref = $('rosary-ref');
  const text = $('rosary-text');
  const next = $('rosary-next');
  const prev = $('rosary-prev');
  const beads = $('rosary-beads');

  if (setTitle) setTitle.innerText = set.title;

  // ── Cierre: la Salve ────────────────────────────────────────────────────
  if (rosary.finished) {
    const salve = prayerById('salve');
    if (progress) progress.innerText = dict.rosaryClosing;
    if (label) label.innerText = dict.rosaryClosing;
    if (mystery) mystery.innerText = salve ? salve[currentLang].title : '';
    if (ref) ref.hidden = true;
    if (text) text.innerText = salve ? salve[currentLang].body : '';
    if (next) { next.innerText = dict.rosaryDone; next.disabled = false; }
    if (prev) prev.disabled = false;
    if (beads) beads.textContent = '';
    return;
  }

  if (progress) {
    progress.innerText = dict.rosaryMysteryOf
      .replace('{n}', String(rosary.mystery + 1))
      .replace('{total}', '5');
  }

  const step = ROSARY_FLOW[rosary.step];
  let bodyPrayer = null;
  let labelText = '';

  if (step === 'mystery') {
    labelText = dict.rosaryAnnounce;
  } else if (step === 'padre') {
    bodyPrayer = prayerById('padre-nuestro-catolico');
    labelText = bodyPrayer ? bodyPrayer[currentLang].title : '';
  } else if (step === 'ave') {
    bodyPrayer = prayerById('ave-maria');
    labelText = dict.rosaryAveCount
      .replace('{n}', String(rosary.ave))
      .replace('{total}', '10');
  } else if (step === 'gloria') {
    bodyPrayer = prayerById('gloria');
    labelText = bodyPrayer ? bodyPrayer[currentLang].title : '';
  } else if (step === 'jaculatoria') {
    bodyPrayer = prayerById('jaculatoria-fatima');
    labelText = bodyPrayer ? bodyPrayer[currentLang].title : '';
  }

  if (label) label.innerText = labelText;
  if (mystery) mystery.innerText = item.name;
  if (ref) {
    ref.hidden = !item.ref;
    if (item.ref) ref.innerText = item.ref;
  }
  if (text) text.innerText = bodyPrayer ? bodyPrayer[currentLang].body : '';
  if (next) {
    next.disabled = false;
    next.innerText = (step === 'ave' && rosary.ave < 10) ? dict.rosaryNextAve : dict.rosaryNext;
  }
  if (prev) prev.disabled = (rosary.mystery === 0 && rosary.step === 0 && rosary.ave === 1);

  // Rosario visual: una cuenta grande por Padre Nuestro y diez pequeñas
  if (beads) {
    beads.textContent = '';
    const big = document.createElement('span');
    big.className = 'bead bead-big' + (rosary.step > 1 ? ' bead-done' : (step === 'padre' ? ' bead-now' : ''));
    beads.appendChild(big);
    for (let i = 1; i <= 10; i++) {
      const b = document.createElement('span');
      let cls = 'bead';
      if (rosary.step > 2) cls += ' bead-done';
      else if (step === 'ave') cls += (i < rosary.ave) ? ' bead-done' : (i === rosary.ave ? ' bead-now' : '');
      b.className = cls;
      beads.appendChild(b);
    }
  }
}

// ── VITRAL DE CABECERA ────────────────────────────────────────────────────
// Cuatro familias, en SVG inline. Abstracto y no figurativo a propósito: sin
// rostros de Jesús, de la Virgen ni de santos (principio 2 de la política de IA).

const STAINED_GLASS = {
  mariano:  { a: '#c9b8ec', b: '#efd9ec', c: '#a78bd8', lead: '#6b5a9e' },
  cruz:     { a: '#a9bce8', b: '#d9e2f7', c: '#7f93cf', lead: '#4a5a92' },
  angeles:  { a: '#a9dbcf', b: '#dcf0e8', c: '#7cc0ae', lead: '#417a6c' },
  palabra:  { a: '#f0cf9a', b: '#fbeeda', c: '#e0ae66', lead: '#9a7434' }
};

/** Qué familia de vitral le toca a una oración. */
function prayerArtKey(prayer) {
  if (!prayer) return 'palabra';
  // Las oraciones de la vertiente espiritual nunca llevan iconografía religiosa.
  if (prayer.denominations && prayer.denominations.length === 1 &&
      prayer.denominations[0] === 'spiritual') return 'palabra';
  if (typeof PRAYER_ART === 'undefined') return 'palabra';
  for (const key of Object.keys(PRAYER_ART)) {
    if (PRAYER_ART[key].includes(prayer.id)) return key;
  }
  return 'palabra';
}

/** Pinta el vitral en el slot indicado. Se construye con SVG, no con innerHTML de terceros. */
function renderStainedGlass(slotId, key) {
  const slot = document.getElementById(slotId);
  if (!slot) return;
  const c = STAINED_GLASS[key] || STAINED_GLASS.palabra;
  const uid = 'sg-' + key;

  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 320 86');
  svg.setAttribute('preserveAspectRatio', 'none');

  const defs = document.createElementNS(NS, 'defs');
  const grad = document.createElementNS(NS, 'linearGradient');
  grad.setAttribute('id', uid);
  grad.setAttribute('x1', '0'); grad.setAttribute('y1', '0');
  grad.setAttribute('x2', '0'); grad.setAttribute('y2', '1');
  [[0, c.a], [0.55, c.b], [1, c.c]].forEach(([off, col]) => {
    const st = document.createElementNS(NS, 'stop');
    st.setAttribute('offset', String(off));
    st.setAttribute('stop-color', col);
    grad.appendChild(st);
  });
  defs.appendChild(grad);
  svg.appendChild(defs);

  const bg = document.createElementNS(NS, 'rect');
  bg.setAttribute('width', '320'); bg.setAttribute('height', '86');
  bg.setAttribute('fill', 'url(#' + uid + ')');
  svg.appendChild(bg);

  // Arcos ojivales: el motivo común a las cuatro familias
  for (let i = 0; i < 8; i++) {
    const x = i * 40;
    const arc = document.createElementNS(NS, 'path');
    arc.setAttribute('d', `M${x} 86 L${x} 44 Q${x + 20} 8 ${x + 40} 44 L${x + 40} 86`);
    arc.setAttribute('fill', 'none');
    arc.setAttribute('stroke', c.lead);
    arc.setAttribute('stroke-width', '1.1');
    arc.setAttribute('opacity', '0.34');
    svg.appendChild(arc);
  }

  // Roseta central, distinta por familia
  const cx = 160, cy = 42;
  if (key === 'mariano') {
    for (let i = 0; i < 8; i++) {
      const p = document.createElementNS(NS, 'ellipse');
      p.setAttribute('cx', String(cx)); p.setAttribute('cy', String(cy - 9));
      p.setAttribute('rx', '4.5'); p.setAttribute('ry', '10');
      p.setAttribute('fill', '#fff'); p.setAttribute('opacity', '0.42');
      p.setAttribute('transform', `rotate(${i * 45} ${cx} ${cy})`);
      svg.appendChild(p);
    }
  } else if (key === 'cruz') {
    const cr = document.createElementNS(NS, 'path');
    cr.setAttribute('d', `M${cx} ${cy - 15}v30M${cx - 10} ${cy - 5}h20`);
    cr.setAttribute('stroke', '#fff'); cr.setAttribute('stroke-width', '3');
    cr.setAttribute('stroke-linecap', 'round'); cr.setAttribute('opacity', '0.62');
    svg.appendChild(cr);
  } else if (key === 'angeles') {
    for (const dir of [-1, 1]) {
      const w = document.createElementNS(NS, 'path');
      w.setAttribute('d', `M${cx} ${cy + 4} q${dir * 16} -14 ${dir * 26} -2 q${dir * -10} 10 ${dir * -26} 2 Z`);
      w.setAttribute('fill', '#fff'); w.setAttribute('opacity', '0.42');
      svg.appendChild(w);
    }
  } else {
    for (let i = 0; i < 7; i++) {
      const ray = document.createElementNS(NS, 'path');
      const ang = -90 + (i - 3) * 17;
      const r = (ang * Math.PI) / 180;
      ray.setAttribute('d', `M${cx} ${cy + 12} L${cx + Math.cos(r) * 34} ${cy + 12 + Math.sin(r) * 34}`);
      ray.setAttribute('stroke', '#fff'); ray.setAttribute('stroke-width', '2.4');
      ray.setAttribute('stroke-linecap', 'round'); ray.setAttribute('opacity', '0.4');
      svg.appendChild(ray);
    }
  }

  slot.textContent = '';
  slot.appendChild(svg);
}

/** Comparte el texto de la oración abierta con la hoja nativa del sistema. */
async function sharePrayer() {
  const dict = TRANSLATIONS[currentLang];
  const titleEl = document.getElementById('prayer-title');
  const textEl = document.getElementById('prayer-text');
  if (!titleEl || !textEl || !textEl.innerText) return;

  const payload = titleEl.innerText + '\n\n' + textEl.innerText + '\n\n— Alivio · alivio.pronosoftmx.com';
  try {
    if (navigator.share) {
      await navigator.share({ title: titleEl.innerText, text: payload });
      return;
    }
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(payload);
      showToast(dict.prayerCopied);
    }
  } catch (e) {
    // El usuario canceló la hoja de compartir: no es un error que reportar.
  }
}

// ── TAMAÑO DE LECTURA ─────────────────────────────────────────────────────
// Persiste: quien necesita letra grande la necesita SIEMPRE, no una vez.
const PRAYER_FONT_SCALES = [0.85, 1, 1.15, 1.35, 1.6];
const PRAYER_FONT_DEFAULT = 1;

function currentPrayerFontStep() {
  const raw = parseInt(localStorage.getItem('alivio_prayer_font'), 10);
  return Number.isInteger(raw) && raw >= 0 && raw < PRAYER_FONT_SCALES.length
    ? raw
    : PRAYER_FONT_DEFAULT;
}

function applyPrayerFont() {
  const step = currentPrayerFontStep();
  document.documentElement.style.setProperty('--prayer-scale', String(PRAYER_FONT_SCALES[step]));

  const down = document.getElementById('prayer-font-down');
  const up = document.getElementById('prayer-font-up');
  const dict = TRANSLATIONS[currentLang];
  if (down) {
    down.disabled = (step === 0);
    down.title = dict.fontSmaller;
    down.setAttribute('aria-label', dict.fontSmaller);
  }
  if (up) {
    up.disabled = (step === PRAYER_FONT_SCALES.length - 1);
    up.title = dict.fontBigger;
    up.setAttribute('aria-label', dict.fontBigger);
  }
  const share = document.getElementById('prayer-share');
  if (share) {
    share.title = dict.prayerShare;
    share.setAttribute('aria-label', dict.prayerShare);
  }
}

function changePrayerFont(delta) {
  const step = Math.min(PRAYER_FONT_SCALES.length - 1, Math.max(0, currentPrayerFontStep() + delta));
  localStorage.setItem('alivio_prayer_font', String(step));
  applyPrayerFont();
}

/**
 * Mantener la pantalla encendida mientras se reza.
 * Nadie quiere que se apague el teléfono a mitad del Credo. La API no existe en
 * todos los navegadores, así que todo va guardado: si falla, no pasa nada.
 */
async function requestPrayerWakeLock() {
  const note = document.getElementById('prayer-awake');
  try {
    if (!('wakeLock' in navigator)) return;
    prayerWakeLock = await navigator.wakeLock.request('screen');
    if (note) {
      note.hidden = false;
      note.innerText = TRANSLATIONS[currentLang].prayerScreenAwake;
    }
    prayerWakeLock.addEventListener('release', () => { prayerWakeLock = null; });
  } catch (e) {
    // Permiso denegado, pestaña oculta o navegador sin soporte: se reza igual.
    if (note) note.hidden = true;
  }
}

function releasePrayerWakeLock() {
  if (prayerWakeLock) {
    try { prayerWakeLock.release(); } catch (e) {}
    prayerWakeLock = null;
  }
  const note = document.getElementById('prayer-awake');
  if (note) note.hidden = true;
}

/** Guarda la oración abierta en el mismo almacén que los favoritos del desahogo. */
function savePrayerFavorite() {
  const dict = TRANSLATIONS[currentLang];
  const titleEl = document.getElementById('prayer-title');
  const textEl = document.getElementById('prayer-text');
  if (!titleEl || !textEl || !textEl.innerText) return;

  const favorites = JSON.parse(localStorage.getItem('alivio_favorites') || '[]');
  const body = textEl.innerText;

  if (favorites.some(f => f.prayer === body)) {
    showToast(dict.alreadySaved);
    return;
  }
  favorites.unshift({
    date: new Date().toISOString(),
    prayer: body,
    verse: '',
    verseRef: '',
    title: titleEl.innerText,
    kind: 'prayer'
  });
  if (favorites.length > 30) favorites.pop();
  localStorage.setItem('alivio_favorites', JSON.stringify(favorites));
  showToast(dict.savedFavorite);
  updatePrayerFavIcon();
}

function updatePrayerFavIcon() {
  const btn = document.getElementById('prayer-fav');
  const textEl = document.getElementById('prayer-text');
  if (!btn || !textEl) return;
  const favorites = JSON.parse(localStorage.getItem('alivio_favorites') || '[]');
  const saved = favorites.some(f => f.prayer === textEl.innerText);
  btn.className = saved
    ? 'shrink-0 text-lg text-indigo-500 transition-colors cursor-pointer'
    : 'shrink-0 text-lg text-slate-300 hover:text-indigo-500 transition-colors cursor-pointer';
  btn.title = saved ? TRANSLATIONS[currentLang].alreadySaved : TRANSLATIONS[currentLang].titleFavorites;
}

/**
 * Sustituye la fachada del video demo por el reproductor real de YouTube.
 * Se llama solo al pulsar: así la landing no carga el JS de YouTube en cada visita.
 * Dominio nocookie para no plantar cookies de seguimiento antes de que el usuario decida.
 */
const DEMO_VIDEO_ID = 'eoMOhortt_4';

function loadDemoVideo() {
  const facade = document.getElementById('video-demo-facade');
  if (!facade) return;

  const frame = document.createElement('iframe');
  frame.src = `https://www.youtube-nocookie.com/embed/${DEMO_VIDEO_ID}?autoplay=1&rel=0&modestbranding=1`;
  frame.title = TRANSLATIONS[currentLang].videoDemoFrameTitle;
  frame.allow = 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture';
  frame.referrerPolicy = 'strict-origin-when-cross-origin';
  frame.allowFullscreen = true;
  frame.className = 'w-full h-full border-0';

  const holder = document.createElement('div');
  holder.className = 'relative w-full max-w-[420px] aspect-video rounded-2xl overflow-hidden border border-slate-300 bg-black shadow-lg';
  holder.appendChild(frame);

  facade.replaceWith(holder);
}



/**
 * Activar las notificaciones push
 * - En Android nativo (Capacitor): usa Firebase Cloud Messaging (FCM)
 * - En web/PWA: usa Web Push (VAPID) como siempre
 */
async function activatePush() {
  const statusEl = document.getElementById('push-status');
  statusEl.classList.remove('hidden', 'text-red-500', 'text-emerald-600');
  statusEl.classList.add('text-slate-400');
  statusEl.innerText = (currentLang === 'en') ? "Requesting permissions..." : "Solicitando permisos...";

  try {
    const alertTime = document.getElementById('alert-time').value;

    // ── ANDROID NATIVO: usar FCM ─────────────────────────────────────────────
    if (window.Capacitor && window.Capacitor.isNativePlatform()) {
      statusEl.innerText = (currentLang === 'en') ? "Configuring push notifications..." : "Configurando notificaciones...";
      const fcmToken = await getFcmToken();

      if (!fcmToken) {
        statusEl.classList.add('text-red-500');
        statusEl.innerText = (currentLang === 'en') ? "Could not get notification token. Try again." : "No se pudo obtener el token. Intenta nuevamente.";
        return;
      }

      statusEl.innerText = (currentLang === 'en') ? "Saving alert in the cloud..." : "Guardando alerta...";
      const response = await fetch(API_BASE + '/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fcmToken,
          alertTime,
          timezoneOffset: new Date().getTimezoneOffset(),
          message: window.afternoonMessage
        })
      });

      if (!response.ok) throw new Error("No se pudo guardar la suscripción en el servidor.");

      localStorage.setItem('alivio_alert_time', alertTime);
      localStorage.setItem('alivio_fcm_token', fcmToken);
      document.getElementById('btn-activate-push').classList.add('hidden');
      document.getElementById('btn-cancel-push').classList.remove('hidden');
      statusEl.classList.remove('text-slate-400');
      statusEl.classList.add('text-emerald-600');
      statusEl.innerText = (currentLang === 'en') ? `🔔 Alert activated for ${alertTime}!` : `🔔 ¡Alerta activada para las ${alertTime}!`;
      return;
    }

    // ── WEB / PWA: usar VAPID (comportamiento original) ──────────────────────
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      statusEl.classList.add('text-red-500');
      statusEl.innerText = (currentLang === 'en') ? "This browser does not support push notifications." : "Este navegador no soporta notificaciones push.";
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      statusEl.classList.add('text-red-500');
      statusEl.innerText = (currentLang === 'en') ? "Notification permission denied." : "Permiso de notificaciones denegado.";
      return;
    }

    const reg = await navigator.serviceWorker.ready;
    statusEl.innerText = (currentLang === 'en') ? "Configuring secure channel..." : "Configurando canal seguro...";
    let subscription = await reg.pushManager.getSubscription();

    if (!subscription) {
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY)
      });
    }

    statusEl.innerText = (currentLang === 'en') ? "Saving alert in the cloud..." : "Saving alert...";

    const response = await fetch(API_BASE + '/api/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription,
        alertTime,
        timezoneOffset: new Date().getTimezoneOffset(),
        message: window.afternoonMessage
      })
    });

    if (!response.ok) {
      throw new Error("No se pudo guardar la suscripción en el servidor.");
    }

    localStorage.setItem('alivio_alert_time', alertTime);

    // Cambiar la visualización de los botones
    document.getElementById('btn-activate-push').classList.add('hidden');
    document.getElementById('btn-cancel-push').classList.remove('hidden');

    statusEl.classList.remove('text-slate-400');
    statusEl.classList.add('text-emerald-600');
    statusEl.innerText = (currentLang === 'en') ? `🔔 Alert activated for ${alertTime}!` : `🔔 ¡Alerta activada para las ${alertTime}!`;

  } catch (error) {
    console.error("Error al activar push:", error);
    statusEl.classList.remove('text-slate-400');
    statusEl.classList.add('text-red-500');
    statusEl.innerText = (currentLang === 'en') ? "Configuration error. Try again." : "Error de configuración. Intenta nuevamente.";
  }
}

/**
 * Cancelar / Desactivar el recordatorio push activo
 */
async function cancelPush() {
  const statusEl = document.getElementById('push-status');
  statusEl.classList.remove('hidden', 'text-emerald-600', 'text-red-500');
  statusEl.classList.add('text-slate-400');
  statusEl.innerText = (currentLang === 'en') ? "Deactivating..." : "Desactivando recordatorio...";

  try {
    // ── ANDROID NATIVO: dar de baja por token FCM ───────────────────────────
    // En la app nativa no existe suscripción push del navegador, así que la rama
    // web de abajo entraba siempre por error y el recordatorio quedaba activo para
    // siempre. El token guardado al activarlo es lo que identifica la suscripción.
    if (window.Capacitor && window.Capacitor.isNativePlatform()) {
      const fcmToken = localStorage.getItem('alivio_fcm_token');

      if (fcmToken) {
        const response = await fetch(API_BASE + '/api/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fcmToken })
        });
        if (!response.ok) throw new Error("No se pudo cancelar el recordatorio en el servidor.");
      }

      localStorage.removeItem('alivio_alert_time');
      localStorage.removeItem('alivio_fcm_token');

      const actBtn = document.getElementById('btn-activate-push');
      const cancelBtn = document.getElementById('btn-cancel-push');
      if (actBtn) actBtn.classList.remove('hidden');
      if (cancelBtn) cancelBtn.classList.add('hidden');

      statusEl.classList.remove('text-slate-400');
      statusEl.classList.add('text-emerald-600');
      statusEl.innerText = TRANSLATIONS[currentLang].alertDeactivated;
      return;
    }

    // ── WEB / PWA: dar de baja por suscripción VAPID ────────────────────────
    const reg = await navigator.serviceWorker.ready;
    const subscription = await reg.pushManager.getSubscription();

    if (!subscription) {
      statusEl.classList.add('text-red-500');
      statusEl.innerText = (currentLang === 'en') ? "No active reminder found." : "No se encontró ningún recordatorio activo.";
      // Si no hay suscripción en el navegador, limpiar UI de todos modos
      document.getElementById('btn-activate-push').classList.remove('hidden');
      document.getElementById('btn-cancel-push').classList.add('hidden');
      localStorage.removeItem('alivio_alert_time');
      return;
    }

    const response = await fetch(API_BASE + '/api/subscribe', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ subscription })
    });

    if (!response.ok) {
      throw new Error("No se pudo cancelar el recordatorio en el servidor.");
    }

    // Desactivar nativamente en el navegador también
    await subscription.unsubscribe();

    // Limpiar localStorage
    localStorage.removeItem('alivio_alert_time');

    // Cambiar la visualización de los botones
    document.getElementById('btn-activate-push').classList.remove('hidden');
    document.getElementById('btn-cancel-push').classList.add('hidden');

    statusEl.classList.remove('text-slate-400');
    statusEl.classList.add('text-emerald-600');
    statusEl.innerText = TRANSLATIONS[currentLang].alertDeactivated;

  } catch (error) {
    console.error("Error al desactivar push:", error);
    statusEl.classList.remove('text-slate-400');
    statusEl.classList.add('text-red-500');
    statusEl.innerText = (currentLang === 'en') ? "Error deactivating alert." : "Error al desactivar la alerta.";
  }
}

/**
 * Verificar si el navegador ya cuenta con una suscripción push activa y actualizar la UI
 */
async function checkActiveSubscription() {
  // ── ANDROID NATIVO: el estado lo marca el token FCM guardado ──────────────
  // Va antes del guard de PushManager: en la app nativa ese guard salía sin más
  // y la UI se quedaba mostrando "activar" aunque el recordatorio estuviera puesto.
  if (window.Capacitor && window.Capacitor.isNativePlatform()) {
    const actBtn = document.getElementById('btn-activate-push');
    const cancelBtn = document.getElementById('btn-cancel-push');
    const timeInput = document.getElementById('alert-time');
    const fcmToken = localStorage.getItem('alivio_fcm_token');

    if (fcmToken) {
      if (actBtn) actBtn.classList.add('hidden');
      if (cancelBtn) cancelBtn.classList.remove('hidden');
      const savedTime = localStorage.getItem('alivio_alert_time');
      if (savedTime && timeInput) timeInput.value = savedTime;
    } else {
      if (actBtn) actBtn.classList.remove('hidden');
      if (cancelBtn) cancelBtn.classList.add('hidden');
    }
    return;
  }

  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

  try {
    const reg = await navigator.serviceWorker.ready;
    const subscription = await reg.pushManager.getSubscription();

    const actBtn = document.getElementById('btn-activate-push');
    const cancelBtn = document.getElementById('btn-cancel-push');
    const timeInput = document.getElementById('alert-time');

    if (subscription) {
      // Si hay una suscripción activa, mostrar botón de desactivar
      if (actBtn) actBtn.classList.add('hidden');
      if (cancelBtn) cancelBtn.classList.remove('hidden');

      // Intentar restaurar la hora configurada guardada en LocalStorage
      const savedTime = localStorage.getItem('alivio_alert_time');
      if (savedTime && timeInput) {
        timeInput.value = savedTime;
      }
    } else {
      if (actBtn) actBtn.classList.remove('hidden');
      if (cancelBtn) cancelBtn.classList.add('hidden');
    }
  } catch (e) {
    console.warn("Error verificando suscripción activa:", e);
  }
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Cambiar el saludo dinámicamente
function updateDynamicGreeting() {
  const greetingEl = document.getElementById('welcome-greeting');
  const subGreetingEl = document.getElementById('welcome-sub');
  if (!greetingEl) return;
  const hour = new Date().getHours();
  const dict = TRANSLATIONS[currentLang];
  
  if (hour >= 6 && hour < 12) {
    greetingEl.innerText = dict.greetingMorning;
  } else if (hour >= 12 && hour < 19) {
    greetingEl.innerText = dict.greetingAfternoon;
  } else {
    greetingEl.innerText = dict.greetingNight;
  }

  if (subGreetingEl) {
    subGreetingEl.innerText = dict.greetingSub;
  }
}

// Inicialización de la app
window.addEventListener('DOMContentLoaded', () => {
  // Aplicar traducciones
  applyTranslations();
  updateDynamicGreeting();

  // Denominación y racha
  applyDenominationUI();
  updateStreak();
  renderStreak();

  // Audio ambiente (restaurar preferencia del usuario)
  initAudioPreference();

  // Escuchar entrada de caracteres para el contador
  const ventInput = document.getElementById('vent-input');
  const charCounter = document.getElementById('char-counter');
  if (ventInput && charCounter) {
    ventInput.addEventListener('input', () => {
      charCounter.innerText = `${ventInput.value.length} / 300`;
    });
  }

  // Si estamos en la App Nativa (Capacitor Android/iOS), ocultar botón de descarga de Google Play
  if (window.Capacitor && window.Capacitor.isNativePlatform()) {
    const gpBtn = document.getElementById('google-play-btn-container');
    if (gpBtn) gpBtn.classList.add('hidden');
  }

  // Si ya ha visitado la app antes, saltar landing page por comodidad del usuario
  const hasVisited = localStorage.getItem('alivio_visited');
  const urlParams = new URLSearchParams(window.location.search);
  const isRedirected = urlParams.get('action') === 'ancla' || urlParams.get('from_push') === 'true';

  const prayerSearchEl = document.getElementById('prayer-search');
  if (prayerSearchEl) prayerSearchEl.addEventListener('input', renderPrayerList);
  renderPrayerList();

  // Verificar la existencia de notificaciones activas para pintar la UI
  checkActiveSubscription();

  if (isRedirected) {
    const saved = localStorage.getItem('ultimo_confort');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        comfortDataResolved = data;
        displayComfortAndNavigate();
      } catch (e) {
        console.error("Error al cargar confort guardado:", e);
      }
    }
  } else if (hasVisited) {
    goHome();
  } else {
    changeScreen('screen-landing');
  }
});

/**
 * Funciones de Control del Modal de Donaciones
 */
function openDonateModal() {
  const modal = document.getElementById('modal-donate');
  if (modal) {
    modal.classList.remove('opacity-0', 'pointer-events-none');
  }
}

function closeDonateModal() {
  const modal = document.getElementById('modal-donate');
  if (modal) {
    modal.classList.add('opacity-0', 'pointer-events-none');
  }
}

/**
 * Compartir la aplicación (Web Share API con fallback a Clipboard)
 */
async function shareApp() {
  const shareData = {
    title: 'Alivio PWA',
    text: currentLang === 'en' 
      ? 'Alivio: A safe space for meditation and Catholic prayer in your pocket.' 
      : 'Alivio: Un espacio seguro de meditación y oración católica en tu bolsillo.',
    url: 'https://alivio.pronosoftmx.com'
  };

  if (navigator.share) {
    try {
      await navigator.share(shareData);
    } catch (e) {
      console.warn('Share cancelled or failed:', e);
    }
  } else {
    // Fallback: copiar al portapapeles
    try {
      await navigator.clipboard.writeText(shareData.url);
      showToast(currentLang === 'en' 
        ? 'Link copied to clipboard. Share it with your loved ones!' 
        : 'Enlace copiado al portapapeles. ¡Compártelo con tus seres queridos!');
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  }
}

