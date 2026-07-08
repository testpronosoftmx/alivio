import Anthropic from "@anthropic-ai/sdk";
import { VercelRequest, VercelResponse } from "@vercel/node";
import * as dotenv from "dotenv";

// Cargar variables de entorno
dotenv.config();

// Inicializar Claude (Anthropic)
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "";
const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Solo permitir peticiones POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  const { text, lang } = req.body;

  if (!text || typeof text !== "string" || text.trim() === "") {
    return res.status(400).json({ error: "El campo 'text' es requerido y no puede estar vacío." });
  }

  const targetLang = (lang === "en") ? "en" : "es";
  const languageName = (targetLang === "en") ? "English" : "Spanish/Español";

  try {
    console.log(`🧠 Procesando desahogo del usuario con Claude 3.5 Sonnet en idioma: ${languageName}...`);

    // 1. Llamar a Claude 3.5 Sonnet para obtener el confort y el prompt para la imagen
    const systemInstruction = `Eres un consejero espiritual y teólogo católico compasivo. Tu misión es proveer confort basado en la Biblia. Debes responder estrictamente en formato JSON válido y redactado en el idioma: ${languageName}. No incluyas explicaciones ni etiquetas markdown de código (como \`\`\`json) en tu respuesta, solo el objeto JSON plano.`;

    const prompt = `Un usuario ha compartido el siguiente desahogo de su mente/corazón: "${text}".
    
    Analiza su dolor o angustia y genera un confort espiritual basado en las Sagradas Escrituras de la Iglesia Católica.
    Todos los campos de la respuesta JSON (bibleVerse, verseText, comfort, prayer, afternoonMessage) DEBEN estar escritos obligatoriamente en el idioma: ${languageName}.
    
    Retorna un objeto JSON con este formato exacto:
    {
      "verses": [
        {
          "bibleVerse": "Cita bíblica 1 (Ej en español: 'Salmo 23, 1-3' | Ej en inglés: 'Psalm 23:1-3')",
          "verseText": "El texto completo de la cita bíblica 1 en el idioma: ${languageName}"
        },
        {
          "bibleVerse": "Cita bíblica 2 (Ej en español: 'Mateo 11, 28' | Ej en inglés: 'Matthew 11:28')",
          "verseText": "El texto completo de la cita bíblica 2 en el idioma: ${languageName}"
        },
        {
          "bibleVerse": "Cita bíblica 3 (Ej en español: 'Filipenses 4, 6-7' | Ej en inglés: 'Philippians 4:6-7')",
          "verseText": "El texto completo de la cita bíblica 3 en el idioma: ${languageName}"
        }
      ],
      "comfort": "Un mensaje corto de consuelo, empatía y esperanza cristiana (máximo 100 palabras) en el idioma: ${languageName} que le hable directamente a su desahogo actual.",
      "prayer": "Una oración silenciosa hermosa, profunda y reposada (de entre 40 y 50 palabras) en el idioma: ${languageName} para entregar esta carga a Dios con devoción.",
      "imagePrompt": "An artistic and sacred text-to-image prompt in English. Must describe a beautiful, high-quality classic religious oil painting or stained glass window representing the spiritual essence of the main comforting bible verse. Focus on divine light, calm waters, gentle holy illumination, angel presence or serene atmospheres. Avoid modern objects, text, or digital art styles. (Must be in English regardless of the target language)",
      "afternoonMessage": "Un recordatorio cortísimo en minúsculas (máximo 12 palabras) en el idioma: ${languageName} para el recordatorio de la tarde (Ej en español: 'respira. el señor sostiene tus cargas hoy.' | Ej en inglés: 'breathe. the lord carries your burdens today.')"
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
