import Anthropic from "@anthropic-ai/sdk";
import { VercelRequest, VercelResponse } from "@vercel/node";
import * as dotenv from "dotenv";

// Cargar variables de entorno
dotenv.config();

// Inicializar Claude (Anthropic)
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "";
const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

// ── Límites de entrada ─────────────────────────────────────────────────────
// El maxlength="300" del textarea es cosmético: el cliente no es frontera de confianza.
const MAX_TEXT_LENGTH = 500;

// ── Rate limiting híbrido (dispositivo + IP) ────────────────────────────────
// En México los operadores móviles (Telcel, AT&T) usan CGNAT: cientos de usuarios
// comparten la misma IP pública. Por eso:
// 1. Límite fino por dispositivo (deviceId): 8 cada 15 min.
// 2. Límite grueso por IP (red de seguridad anti-bots masivos): 60 cada 15 min.
const RATE_LIMIT_DEVICE_MAX = 8;
const RATE_LIMIT_IP_MAX = 60;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const deviceHits = new Map<string, number[]>();
const ipHits = new Map<string, number[]>();

function clientIp(req: VercelRequest): string {
  const forwarded = req.headers["x-forwarded-for"];
  const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  return (raw || "").split(",")[0].trim() || "desconocida";
}

function checkLimit(map: Map<string, number[]>, key: string, max: number, now: number, cutoff: number): boolean {
  if (!key || key === "desconocida") return false;
  
  // Purga de marcas viejas
  const stamps = (map.get(key) || []).filter((t) => t > cutoff);
  if (stamps.length >= max) return true;

  stamps.push(now);
  map.set(key, stamps);
  return false;
}

/** Devuelve true si el dispositivo o la IP excedieron su cupo. */
export function isRateLimited(deviceId: string, ip: string): boolean {
  const now = Date.now();
  const cutoff = now - RATE_LIMIT_WINDOW_MS;

  // 1. Verificar límite por dispositivo si viene presente
  if (deviceId && checkLimit(deviceHits, `dev_${deviceId}`, RATE_LIMIT_DEVICE_MAX, now, cutoff)) {
    return true;
  }

  // 2. Verificar límite por IP como protección de segundo nivel
  if (checkLimit(ipHits, `ip_${ip}`, RATE_LIMIT_IP_MAX, now, cutoff)) {
    return true;
  }

  return false;
}

// ── Saneado del prompt de imagen ───────────────────────────────────────────
// El imagePrompt lo redacta el modelo a partir del texto del usuario, así que es
// una vía indirecta para inyectar contenido en una URL pública de Pollinations.
// El estilo y las restricciones se prefijan del lado del servidor: no se confía en
// que el modelo las repita.
const IMAGE_STYLE_PREFIX =
  "Serene sacred atmospheric artwork, painterly, reverent, calm. No people, no human figures, no faces, no text, no letters, no logos, no watermarks.";
const IMAGE_NEGATIVE_SUFFIX =
  "Avoid: nudity, gore, blood, violence, corpses, weapons, distorted anatomy, photorealistic depictions of sacred persons, any written words.";

const IMAGE_PROMPT_BLOCKLIST = [
  "nude", "naked", "nsfw", "erotic", "sexy", "lingerie",
  "blood", "bloody", "gore", "gory", "corpse", "dead body", "decay", "rotting",
  "violence", "violent", "torture", "wound", "mutilat", "weapon", "gun", "knife",
  "demon", "satan", "occult", "pentagram", "hell",
  "photorealistic portrait", "realistic face", "selfie",
  "child", "kid", "minor",
  "logo", "watermark", "signature", "caption", "subtitle"
];

/** Limpia el prompt del modelo o devuelve null si no es utilizable. */
export function sanitizeImagePrompt(raw: unknown): string | null {
  if (typeof raw !== "string") return null;

  // Una sola línea, sin caracteres de control ni longitud absurda.
  const cleaned = raw.replace(/[\r\n\t]+/g, " ").replace(/\s{2,}/g, " ").trim().slice(0, 300);
  if (cleaned.length < 10) return null;

  const lowered = cleaned.toLowerCase();
  const hit = IMAGE_PROMPT_BLOCKLIST.find((term) => lowered.includes(term));
  if (hit) {
    console.warn(`🚫 imagePrompt rechazado por la lista de bloqueo (término: "${hit}").`);
    return null;
  }
  return cleaned;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Headers CORS — necesarios para Android nativo (Capacitor) y cualquier origen externo
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Preflight OPTIONS
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Solo permitir peticiones POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  const { text, lang, denomination, deviceId } = req.body || {};

  // Rate limit antes de tocar nada: cada llamada que pasa de aquí cuesta dinero.
  const ip = clientIp(req);
  const cleanDeviceId = typeof deviceId === "string" ? deviceId.trim().slice(0, 64) : "";
  if (isRateLimited(cleanDeviceId, ip)) {
    console.warn(`🚫 Rate limit alcanzado para dev:${cleanDeviceId || "none"} ip:${ip}.`);
    res.setHeader("Retry-After", String(Math.ceil(RATE_LIMIT_WINDOW_MS / 1000)));
    return res.status(429).json({
      error: "Has hecho demasiadas peticiones seguidas. Respira un momento y vuelve a intentarlo."
    });
  }

  if (!text || typeof text !== "string" || text.trim() === "") {
    return res.status(400).json({ error: "El campo 'text' es requerido y no puede estar vacío." });
  }

  // Tope duro de longitud en el servidor.
  const userText = text.trim().slice(0, MAX_TEXT_LENGTH);
  if (text.trim().length > MAX_TEXT_LENGTH) {
    console.warn(`✂️ Entrada recortada de ${text.trim().length} a ${MAX_TEXT_LENGTH} caracteres.`);
  }

  const targetLang = (lang === "en") ? "en" : "es";
  const languageName = (targetLang === "en") ? "English" : "Spanish/Español";
  const denom = (denomination === "evangelical" || denomination === "spiritual") ? denomination : "catholic";

  // Configuración por denominación
  const denomConfig: Record<string, { role: string; bibleStyle: string; prayerStyle: string; imageStyle: string; }> = {
    catholic: {
      role: "consejero espiritual y teólogo católico compasivo",
      bibleStyle: "traducciones católicas (Biblia de Jerusalén o Nacar-Colunga), incluyendo libros deuterocanónicos cuando sea apropiado",
      prayerStyle: "oración tradicional católica, que puede incluir invocaciones a la Virgen María o santos si es contextualmente apropiado",
      imageStyle: "a beautiful classic Catholic religious oil painting with divine light, the Virgin Mary, Sacred Heart of Jesus, angels, or a serene church interior"
    },
    evangelical: {
      role: "consejero espiritual cristiano evangélico compasivo",
      bibleStyle: "versiones protestantes comunes (Reina Valera 1960 en español o NIV/NLT en inglés)",
      prayerStyle: "oración conversacional directa al Dios Padre y Jesucristo, sin intermediarios ni invocaciones a santos",
      imageStyle: "majestic nature landscape with divine light breaking through clouds, an empty cross, open Bible, or serene pastoral scenery"
    },
    spiritual: {
      role: "guía espiritual compasivo y humanista, no religioso pero profundamente empático",
      bibleStyle: "citas de sabiduría universal, reflexiones de autores humanistas, poetas o filósofos (no necesariamente bíblicas)",
      prayerStyle: "intención de paz o meditación guiada de auto-compasión, sin lenguaje religioso explícito",
      imageStyle: "minimalist peaceful nature landscape, gentle watercolor abstract, sacred geometry, or soft sunset over calm waters"
    }
  };

  const cfg = denomConfig[denom];

  try {
    console.log(`🧠 Procesando desahogo [${denom}] con Claude Sonnet en idioma: ${languageName}...`);

    // 1. Llamar a Claude Sonnet para obtener el confort y el prompt para la imagen
    const systemInstruction = `Eres un ${cfg.role}. Tu misión es proveer confort espiritual y emocional. Debes responder estrictamente en formato JSON válido y redactado en el idioma: ${languageName}. No incluyas explicaciones ni etiquetas markdown de código (como \`\`\`json) en tu respuesta, solo el objeto JSON plano.`;

    const prompt = `Un usuario ha compartido el siguiente desahogo de su mente/corazón: "${userText}".
    
    Analiza su dolor o angustia y genera un confort espiritual adaptado al enfoque: ${denom}.
    Usa ${cfg.bibleStyle} para las citas de sabiduría o versículos.
    Para la oración/reflexión, sigue este estilo: ${cfg.prayerStyle}.
    Todos los campos de la respuesta JSON (bibleVerse, verseText, comfort, prayer, afternoonMessage) DEBEN estar escritos obligatoriamente en el idioma: ${languageName}.
    
    Retorna un objeto JSON con este formato exacto:
    {
      "verses": [
        {
          "bibleVerse": "Cita o referencia 1",
          "verseText": "El texto completo de la cita 1 en el idioma: ${languageName}"
        },
        {
          "bibleVerse": "Cita o referencia 2",
          "verseText": "El texto completo de la cita 2 en el idioma: ${languageName}"
        },
        {
          "bibleVerse": "Cita o referencia 3",
          "verseText": "El texto completo de la cita 3 en el idioma: ${languageName}"
        }
      ],
      "comfort": "Un mensaje corto de consuelo, empatía y esperanza (máximo 100 palabras) en el idioma: ${languageName} que le hable directamente a su desahogo actual.",
      "prayer": "Una ${denom === 'spiritual' ? 'intención de paz o meditación guiada de auto-compasión' : 'oración silenciosa hermosa y profunda'} (de entre 40 y 50 palabras) en el idioma: ${languageName}.",
      "imagePrompt": "An artistic text-to-image prompt in English. ${cfg.imageStyle}. Avoid modern objects, text, or digital art styles. High quality, serene atmosphere. (Always in English)",
      "afternoonMessage": "Un recordatorio cortísimo en minúsculas (máximo 12 palabras) en el idioma: ${languageName} para el recordatorio de la tarde."
    }`;

    const claudeResponse = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: systemInstruction,
      messages: [{ role: "user", content: prompt }]
    });

    const firstContentBlock = claudeResponse.content[0];
    if (!firstContentBlock || firstContentBlock.type !== "text") {
      throw new Error("No se obtuvo respuesta de texto por parte de Claude.");
    }

    const responseText = firstContentBlock.text.trim();
    const comfortData = JSON.parse(responseText);

    // 2. Generar ilustración sacra usando Pollinations.ai (100% gratuito).
    //    El prompt del modelo se sanea; si no pasa el filtro, se cae al estilo fijo
    //    de la denominación, que es texto nuestro y siempre es seguro.
    const safeBody = sanitizeImagePrompt(comfortData.imagePrompt) || cfg.imageStyle;
    const finalImagePrompt = `${IMAGE_STYLE_PREFIX} ${safeBody}. ${IMAGE_NEGATIVE_SUFFIX}`;

    console.log(`🎨 Generando URL de imagen de Pollinations.ai con prompt: "${finalImagePrompt}"`);
    const randomSeed = Math.floor(Math.random() * 1000000);
    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(finalImagePrompt)}?width=512&height=512&nologo=true&seed=${randomSeed}`;

    // 3. Responder al cliente
    return res.status(200).json({
      verses: comfortData.verses,
      comfort: comfortData.comfort,
      prayer: comfortData.prayer,
      afternoonMessage: comfortData.afternoonMessage,
      image: imageUrl
    });

  } catch (error: any) {
    // El detalle va al log del servidor, nunca al cliente: devolverlo expone rutas
    // internas, versiones de dependencias y forma del código.
    console.error("❌ Error en endpoint comfort:", error.stack || error.message || error);
    return res.status(500).json({ error: "Ocurrió un error al procesar el confort espiritual." });
  }
}
