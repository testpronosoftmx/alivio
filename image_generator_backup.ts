import { GoogleGenAI } from "@google/genai";

// Configuración inicial de Gemini / Imagen 3
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyDe5tgleTBJmNSyKfjldb9mLqBFHmKekps";
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

/**
 * Genera una imagen utilizando el modelo Imagen 3 de Google.
 * Retorna un Buffer con los bytes de la imagen (PNG).
 * 
 * @param imagePrompt El prompt descriptivo en inglés optimizado para generación de imágenes.
 */
export async function generateImage(imagePrompt: string): Promise<Buffer> {
  console.log(`🎨 Llamando a Imagen 3 con el prompt: "${imagePrompt}"`);
  
  const response = await ai.models.generateImages({
    model: "imagen-4.0-generate-001", // Modelo utilizado para el arte sacro
    prompt: imagePrompt,
    config: {
      numberOfImages: 1,
      outputMimeType: "image/png",
      aspectRatio: "1:1"
    }
  });

  if (!response.generatedImages || response.generatedImages.length === 0) {
    throw new Error("No se generó ninguna imagen en la respuesta de Imagen 3.");
  }

  const generatedImage = response.generatedImages[0];
  if (!generatedImage || !generatedImage.image || !generatedImage.image.imageBytes) {
    throw new Error("No se encontraron bytes de imagen en la respuesta de Imagen 3.");
  }

  const base64ImageBytes = generatedImage.image.imageBytes;
  return Buffer.from(base64ImageBytes, "base64");
}
