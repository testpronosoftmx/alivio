const PUBLIC_VAPID_KEY = "BH6Na8LGJ5FPFDz2fZJrYpWCQA8ZAxAvat-ka4C1_9DfHcNhraOvmszXslbN9YmgQW6L7Z8gjPIK_TByuvrpdb4";

// Guardar datos globales de la IA
window.afternoonMessage = "respira. el señor sostiene tus cargas hoy. estás a salvo.";

// Registro del Service Worker
if ('serviceWorker' in navigator && 'PushManager' in window) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('✅ Service Worker registrado con éxito:', reg.scope))
      .catch(err => console.error('❌ Error al registrar el Service Worker:', err));
  });
}

/**
 * Función para cambiar de pantalla con efecto de fade
 */
function changeScreen(screenId) {
  const screens = ['screen-landing', 'screen-desahogo', 'screen-suspiro', 'screen-ancla'];
  screens.forEach(id => {
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
    landingTitle: "un refugio de paz en tu bolsillo",
    landingTagline: "suelta tus cargas cotidianas, respira hondo y reconéctate con el creador en un instante.",
    btnEnterApp: "comenzar a orar",
    titleHowWorks: "¿cómo funciona Alivio?",
    step1Title: "Desahoga tu corazón",
    step1Desc: "Escribe de forma 100% anónima y segura lo que te aflige hoy: deudas, cansancio, miedos...",
    step2Title: "Aquieta tu templo",
    step2Desc: "Sigue el ciclo de respiración mandatorio de 12 segundos para calmar tu pecho y relajar la mente.",
    step3Title: "Recibe consuelo y recordatorios",
    step3Desc: "Encuentra versículos personalizados, una plegaria íntima y programa un susurro de paz diario en tu teléfono a la hora que prefieras.",
    titleScreenshots: "capturas de la aplicación",
    titleInstall: "Lleva Alivio en tu teléfono",
    subInstall: "Nuestra app es una PWA ligera. No requiere App Store ni Google Play.",
    btnInstallPwa: "Instalar en este Dispositivo",
    iosGuideTitle: "Instrucciones para iPhone (Safari):",
    iosStep1: "Toca el icono de Compartir (el cuadro con una flecha hacia arriba) en la barra inferior de Safari.",
    iosStep2: "Desplázate hacia abajo y selecciona \"Agregar a Inicio\" (Add to Home Screen).",
    iosStep3: "Nombra la aplicación como Alivio y pulsa Agregar arriba a la derecha.",

    justBreathe: "solo respirar",
    greetingMorning: "buenos días. inicia con paz. entrega tu día al Señor.",
    greetingAfternoon: "buenas tardes. entrega lo que hoy te abruma.",
    greetingNight: "buenas noches. descansa en Él. suelta las cargas de este día.",
    greetingSub: "",
    flowGuide: "1. escribe tu pesar • 2. respira hondo • 3. recibe tu consuelo",
    placeholder: "cuéntale a Dios lo que pasa por tu mente y corazón... desahógate con total libertad y detalle...",
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
    toastJustBreathe: "¡Paz y bien! Gracias por regalarte este momento de respiración.",
    loadingText: "Elevando tu carga...",
    loadingSub: "Generando ilustración sagrada",
    waitingText: "Terminando de preparar tu refugio de paz..."
  },
  en: {
    landingTitle: "a refuge of peace in your pocket",
    landingTagline: "release your daily burdens, take a deep breath and reconnect with the creator in an instant.",
    btnEnterApp: "start praying",
    titleHowWorks: "how does Alivio work?",
    step1Title: "Vent your heart",
    step1Desc: "Write 100% anonymously and securely what afflicts you today: debts, fatigue, fears...",
    step2Title: "Quiet your temple",
    step2Desc: "Follow the mandatory 12-second breathing cycle to calm your chest and relax your mind.",
    step3Title: "Receive comfort & reminders",
    step3Desc: "Find personalized verses, a sincere prayer, and schedule a daily whisper of peace to your phone at the hour you prefer.",
    titleScreenshots: "application screenshots",
    titleInstall: "Carry Alivio on your phone",
    subInstall: "Our app is a lightweight PWA. No App Store or Google Play required.",
    btnInstallPwa: "Install on this Device",
    iosGuideTitle: "Instructions for iPhone (Safari):",
    iosStep1: "Tap the Share icon (the square with an upward arrow) in the bottom bar of Safari.",
    iosStep2: "Scroll down and select \"Add to Home Screen\".",
    iosStep3: "Name the application Alivio and tap Add in the upper right.",

    justBreathe: "just breathe",
    greetingMorning: "good morning. start with peace. surrender your day to the Lord.",
    greetingAfternoon: "good afternoon. surrender what overwhelms you today.",
    greetingNight: "good night. rest in Him. release the burdens of this day.",
    greetingSub: "",
    flowGuide: "1. write your concern • 2. breathe deeply • 3. receive your comfort",
    placeholder: "tell God what is on your mind and heart... vent with total freedom and detail...",
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
    stripeLegend: '"Your donation allows a person in crisis to receive a free word of comfort today."',
    btnStripe: "Support Alivio",
    alertActivated: "Alert activated",
    toastJustBreathe: "Peace and goodness! Thank you for giving yourself this breathing moment.",
    loadingText: "Raising your burden...",
    loadingSub: "Generating sacred illustration",
    waitingText: "Finishing preparing your refuge of peace..."
  }
};

// Datos descriptivos de las capturas de pantalla de marketing (SS1 a SS4)
const SCREENSHOTS_DATA = {
  es: [
    {
      title: "Paso 1: El Desahogo",
      desc: "La pantalla inicial donde escribes de forma 100% anónima todo lo que pesa en tu corazón y mente."
    },
    {
      title: "Paso 2: El Suspiro",
      desc: "Una respiración profunda y pausada de 12 segundos para relajar el sistema nervioso y enfocar la atención."
    },
    {
      title: "Paso 3: Versículos de Consuelo",
      desc: "Recibe tres versículos bíblicos de aliento seleccionados especialmente para tu aflicción y Arte Sacro clásico."
    },
    {
      title: "Paso 4: Oración y Recordatorio",
      desc: "Una plegaria íntima, la opción de programar tu recordatorio diario (susurro de paz) en tu teléfono, y nuestro canal de donación."
    }
  ],
  en: [
    {
      title: "Step 1: The Vent",
      desc: "The initial screen where you write 100% anonymously whatever is weighing down your heart and mind."
    },
    {
      title: "Step 2: The Sigh",
      desc: "A deep, paused 12-second breathing cycle to relax your nervous system and focus your attention."
    },
    {
      title: "Step 3: Verses of Comfort",
      desc: "Receive three encouraging biblical verses chosen especially for your affliction and classic Sacred Art."
    },
    {
      title: "Step 4: Prayer & Reminder",
      desc: "An intimate prayer, the option to schedule your daily reminder (whisper of peace) on your phone, and our support channel."
    }
  ]
};

// Estado global de idioma (por defecto español o lo guardado)
let currentLang = localStorage.getItem('alivio_lang') || 'es';

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

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  const installBtn = document.getElementById('pwa-install-btn');
  if (installBtn) {
    installBtn.classList.remove('hidden');
  }
});

/**
 * Ejecutar la instalación nativa de la PWA
 */
document.addEventListener('DOMContentLoaded', () => {
  const installBtn = document.getElementById('pwa-install-btn');
  if (installBtn) {
    installBtn.addEventListener('click', async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response to install prompt: ${outcome}`);
      deferredPrompt = null;
      installBtn.classList.add('hidden');
    });
  }
});

/**
 * Navegar a la app de desahogo
 */
function enterApp() {
  localStorage.setItem('alivio_visited', 'true');
  changeScreen('screen-desahogo');
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
  
  // Resaltar visualmente el idioma activo en el selector doble
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

  // Textos de la Landing Page (Screen 0)
  document.getElementById('landing-title').innerText = dict.landingTitle;
  document.getElementById('landing-tagline').innerText = dict.landingTagline;
  document.getElementById('btn-enter-app').innerText = dict.btnEnterApp;
  document.getElementById('title-how-works').innerText = dict.titleHowWorks;
  document.getElementById('step-1-title').innerText = dict.step1Title;
  document.getElementById('step-1-desc').innerText = dict.step1Desc;
  document.getElementById('step-2-title').innerText = dict.step2Title;
  document.getElementById('step-2-desc').innerText = dict.step2Desc;
  document.getElementById('step-3-title').innerText = dict.step3Title;
  document.getElementById('step-3-desc').innerText = dict.step3Desc;
  
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

  // Textos de Notificaciones
  document.getElementById('txt-push-title').innerText = dict.pushTitle;
  document.getElementById('txt-push-sub').innerText = dict.pushSub;
  document.getElementById('btn-push-text').innerText = dict.btnPush;
  
  // Textos de Carga
  document.getElementById('loading-text').innerText = dict.loadingText;
  document.getElementById('loading-sub').innerText = dict.loadingSub;

  // Sincronizar idioma en el slider de capturas de marketing
  updateMarketingScreenshot();
}

/**
 * Enviar el desahogo a la API y procesar respuesta en segundo plano
 */
async function handleRelease() {
  const ventInput = document.getElementById('vent-input');
  const text = ventInput.value.trim();

  if (!text) {
    alert(currentLang === 'en' ? "Please write what is weighing you down to release the burden." : "Por favor, escribe lo que te abruma para poder soltar la carga.");
    return;
  }

  // Resetear estados
  comfortDataResolved = null;
  apiRequestFinished = false;
  apiRequestError = null;
  breathingFinishedAndWaiting = false;
  isJustBreathing = false;

  // 1. Disparar API en segundo plano pasando el idioma actual
  fetch('/api/comfort', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ text, lang: currentLang })
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
        alert(dict.toastJustBreathe);
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

const SCREENSHOT_FILES = ['SS1.png', 'SS4.png', 'SS2.png', 'SS3.png'];

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

/**
 * Control del Modal de Textos Legales
 */
function openLegal(type) {
  const modal = document.getElementById('modal-legal');
  const title = document.getElementById('legal-modal-title');
  const body = document.getElementById('legal-modal-body');
  
  if (!modal || !title || !body) return;

  // Cargar contenidos desde los contenedores indexables de index.html
  let contentId = '';
  let titleText = '';

  if (type === 'privacy') {
    contentId = (currentLang === 'en') ? 'seo-privacy-en' : 'seo-privacy-es';
    titleText = (currentLang === 'en') ? 'Privacy Policy' : 'Política de Privacidad';
  } else if (type === 'cookies') {
    contentId = (currentLang === 'en') ? 'seo-cookies-en' : 'seo-cookies-es';
    titleText = (currentLang === 'en') ? 'Cookies Policy' : 'Política de Cookies';
  } else if (type === 'terms') {
    contentId = (currentLang === 'en') ? 'seo-terms-en' : 'seo-terms-es';
    titleText = (currentLang === 'en') ? 'Legal Terms' : 'Aviso Legal';
  }

  const sourceContent = document.getElementById(contentId);
  if (sourceContent) {
    body.innerHTML = sourceContent.innerHTML;
    title.innerText = titleText;
    
    // Mostrar modal
    modal.classList.remove('pointer-events-none');
    modal.classList.remove('opacity-0');
    modal.classList.add('opacity-100');
  }
}

function closeLegal() {
  const modal = document.getElementById('modal-legal');
  if (modal) {
    modal.classList.add('pointer-events-none');
    modal.classList.remove('opacity-100');
    modal.classList.add('opacity-0');
  }
}

/**
 * Activar las notificaciones push en el navegador
 */
async function activatePush() {
  const statusEl = document.getElementById('push-status');
  statusEl.classList.remove('hidden', 'text-red-500', 'text-emerald-600');
  statusEl.classList.add('text-slate-400');
  statusEl.innerText = (currentLang === 'en') ? "Requesting permissions..." : "Solicitando permisos...";

  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    statusEl.classList.add('text-red-500');
    statusEl.innerText = (currentLang === 'en') ? "This browser does not support push notifications." : "Este navegador no soporta notificaciones push.";
    return;
  }

  try {
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
    const alertTime = document.getElementById('alert-time').value;

    const response = await fetch('/api/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
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
}

// Inicialización de la app
window.addEventListener('DOMContentLoaded', () => {
  // Aplicar traducciones
  applyTranslations();
  updateDynamicGreeting();

  // Escuchar entrada de caracteres para el contador
  const ventInput = document.getElementById('vent-input');
  const charCounter = document.getElementById('char-counter');
  if (ventInput && charCounter) {
    ventInput.addEventListener('input', () => {
      charCounter.innerText = `${ventInput.value.length} / 300`;
    });
  }

  // Si ya ha visitado la app antes, saltar landing page por comodidad del usuario
  const hasVisited = localStorage.getItem('alivio_visited');
  const urlParams = new URLSearchParams(window.location.search);
  const isRedirected = urlParams.get('action') === 'ancla' || urlParams.get('from_push') === 'true';

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
    changeScreen('screen-desahogo');
  } else {
    changeScreen('screen-landing');
  }
});
