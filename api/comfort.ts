import Anthropic from "@anthropic-ai/sdk";
import { VercelRequest, VercelResponse } from "@vercel/node";
import * as dotenv from "dotenv";

// Cargar variables de entorno
dotenv.config();

// Inicializar Claude (Anthropic)
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "";
const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

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

  const { text, lang, denomination } = req.body;

  if (!text || typeof text !== "string" || text.trim() === "") {
    return res.status(400).json({ error: "El campo 'text' es requerido y no puede estar vacío." });
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

    const prompt = `Un usuario ha compartido el siguiente desahogo de su mente/corazón: "${text}".
    
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

    // 2. Generar ilustración sacra usando Pollinations.ai (100% gratuito)
    console.log(`🎨 Generando URL de imagen de Pollinations.ai con prompt: "${comfortData.imagePrompt}"`);
    const randomSeed = Math.floor(Math.random() * 1000000);
    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(comfortData.imagePrompt)}?width=512&height=512&nologo=true&seed=${randomSeed}`;

    // 3. Responder al cliente
    return res.status(200).json({
      verses: comfortData.verses,
      comfort: comfortData.comfort,
      prayer: comfortData.prayer,
      afternoonMessage: comfortData.afternoonMessage,
      image: imageUrl
    });

  } catch (error: any) {
    console.error("❌ Error en endpoint comfort:", error.stack || error.message || error);
    return res.status(500).json({
      error: "Ocurrió un error al procesar el confort espiritual.",
      details: error.message || error,
      stack: error.stack
    });
  }
}
