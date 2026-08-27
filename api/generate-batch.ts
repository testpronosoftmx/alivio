/**
 * Evangelio del Día — lote de imágenes atmosféricas.
 *
 * GET/POST /api/generate-batch?from=YYYY-MM-DD&to=YYYY-MM-DD&limit=12
 * Authorization: Bearer ${CRON_SECRET}
 *
 * Corre SIN NADIE MIRANDO (decisión del propietario, 26 ago 2026). Eso mueve la
 * garantía de la salida a la entrada, y por eso este archivo se parece más a una
 * cadena de montaje que a un generador:
 *
 *  · El prompt NO lo escribe un modelo. Sale del banco de plantillas de
 *    `_liturgy.ts`, sembrado con el día litúrgico y nunca con el texto del
 *    pasaje. El espacio de prompts posibles es finito y es nuestro.
 *  · Cuatro puertas de validación automáticas antes de guardar nada. Ninguna
 *    juzga si la imagen es bonita: juzgan si es una imagen válida. Lo apropiado
 *    ya quedó garantizado en el prompt.
 *  · Tres intentos con seed+1. Si los tres fallan NO se escribe fila, y el día
 *    cae solo al escalón 2 de la escalera de respaldo. Un fallo nunca deja
 *    pantalla rota.
 *  · Idempotente y reanudable: salta las fechas que ya tienen fila y respeta un
 *    presupuesto de tiempo. Relanzarlo nunca duplica ni regenera.
 *
 * Para retirar una imagen concreta no hace falta redeploy ni release de Android:
 * marca `blocked = true` en su fila de `alivio.daily_images`.
 */

import { createClient } from "@supabase/supabase-js";
import { VercelRequest, VercelResponse } from "@vercel/node";
import * as dotenv from "dotenv";
import * as jpeg from "jpeg-js";
import { buildPrompt, fetchLiturgicDay, fetchWithTimeout, seedFromDate } from "./_liturgy";

dotenv.config();

// Cada imagen tarda ~3-4 s. El tope de la función manda sobre el tamaño de la tanda.
export const config = { maxDuration: 60 };

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const CRON_SECRET = process.env.CRON_SECRET || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { db: { schema: "alivio" } });

const BUCKET = "daily-images";
const IMAGE_WIDTH = 768;
const IMAGE_HEIGHT = 512;
const POLLINATIONS_TIMEOUT_MS = 45000;
const MAX_ATTEMPTS = 3;
const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 40;
const TIME_BUDGET_MS = 50000;

// Las cuatro puertas, en números.
const MIN_BYTES = 5 * 1024;
const MAX_BYTES = 2 * 1024 * 1024;
const MIN_LUMA = 0.08;
const MAX_LUMA = 0.92;
const MIN_STDEV = 14; // Una imagen plana ronda 5; una buena, 35-50.

/**
 * Comparación en tiempo constante. Copia deliberada de la de `cron-push.ts`:
 * importarla desde allí arrastraría la inicialización de Firebase y de su cliente
 * de Supabase a este endpoint, que no los necesita.
 */
function secretsMatch(received: string, expected: string): boolean {
  if (received.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < received.length; i++) {
    diff |= received.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(value + "T00:00:00Z");
  return !isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function addDays(date: string, days: number): string {
  return new Date(Date.parse(date + "T00:00:00Z") + days * 86400000).toISOString().slice(0, 10);
}

function listDates(from: string, to: string): string[] {
  const dates: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) {
    dates.push(d);
    if (dates.length > 800) break; // Cinturón: dos años es más que cualquier lote legítimo.
  }
  return dates;
}

// ── Las cuatro puertas ──────────────────────────────────────────────────────

export interface GateResult { ok: boolean; reason: string; luma?: number; stdev?: number; }

/** Puertas 2, 3 y 4. La 1 (estado y content-type) se comprueba al descargar. */
export function inspectImage(buffer: Buffer): GateResult {
  // Puerta 2 — peso. Por debajo suele ser un placeholder de error; por encima,
  // algo que no es lo que pedimos.
  if (buffer.length < MIN_BYTES) return { ok: false, reason: "pesa " + buffer.length + " B, por debajo del mínimo" };
  if (buffer.length > MAX_BYTES) return { ok: false, reason: "pesa " + buffer.length + " B, por encima del máximo" };

  // Puerta 3 — decodificación. Cabecera JPEG válida y dimensiones exactas.
  if (buffer[0] !== 0xff || buffer[1] !== 0xd8) return { ok: false, reason: "no tiene cabecera JPEG" };

  let decoded: { width: number; height: number; data: Uint8Array };
  try {
    decoded = jpeg.decode(buffer, { useTArray: true }) as any;
  } catch (err: any) {
    return { ok: false, reason: "no se pudo decodificar (" + err.message + ")" };
  }
  if (decoded.width !== IMAGE_WIDTH || decoded.height !== IMAGE_HEIGHT) {
    return { ok: false, reason: "mide " + decoded.width + "x" + decoded.height + ", no lo pedido" };
  }

  // Puerta 4 — contenido mínimo. Descarta negros, blancos y planos, que es la
  // forma que toma casi toda generación fallida.
  let sum = 0;
  let sumSq = 0;
  let count = 0;
  for (let i = 0; i < decoded.data.length; i += 4 * 7) { // 1 de cada 7 píxeles: sobra para la estadística
    const luma = 0.2126 * decoded.data[i] + 0.7152 * decoded.data[i + 1] + 0.0722 * decoded.data[i + 2];
    sum += luma;
    sumSq += luma * luma;
    count++;
  }
  const mean = sum / count;
  const stdev = Math.sqrt(Math.max(0, sumSq / count - mean * mean));
  const normalized = mean / 255;

  if (normalized < MIN_LUMA) return { ok: false, reason: "casi negra", luma: normalized, stdev };
  if (normalized > MAX_LUMA) return { ok: false, reason: "casi blanca", luma: normalized, stdev };
  if (stdev < MIN_STDEV) return { ok: false, reason: "plana, sin contenido", luma: normalized, stdev };

  return { ok: true, reason: "válida", luma: normalized, stdev };
}

// ── Generación ──────────────────────────────────────────────────────────────

function pollinationsUrl(prompt: string, seed: number): string {
  return "https://image.pollinations.ai/prompt/" + encodeURIComponent(prompt) +
    "?width=" + IMAGE_WIDTH + "&height=" + IMAGE_HEIGHT + "&nologo=true&seed=" + seed;
}

/**
 * Un intento. Devuelve null en CUALQUIER fallo y nunca lanza: un intento fallido
 * es un intento fallido, no el final de la tanda.
 *
 * Esto no era así y costó una tanda entera: `fetchWithTimeout` lanza cuando la
 * red parpadea o cuando vence su propio tope, y esa excepción se saltaba el bucle
 * de reintentos, subía hasta el handler y devolvía 500 con todas las fechas
 * pendientes de esa invocación sin tocar. El modo de fallo más común de
 * Pollinations —tardar demasiado— era justo el que no reintentaba.
 */
export async function generateOne(prompt: string, seed: number): Promise<{ buffer: Buffer; gate: GateResult } | null> {
  try {
    // Puerta 1 — respuesta. Pollinations a veces devuelve un error con cuerpo de texto.
    const res = await fetchWithTimeout(pollinationsUrl(prompt, seed), POLLINATIONS_TIMEOUT_MS);
    if (!res.ok) {
      console.warn("   ✗ seed " + seed + ": HTTP " + res.status);
      return null;
    }
    const contentType = res.headers.get("content-type") || "";
    if (!contentType.startsWith("image/")) {
      console.warn("   ✗ seed " + seed + ": content-type " + contentType);
      return null;
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    const gate = inspectImage(buffer);
    if (!gate.ok) {
      console.warn("   ✗ seed " + seed + ": " + gate.reason);
      return null;
    }
    return { buffer, gate };
  } catch (err: any) {
    // Red caída, socket colgado o el tope de 45 s: se reintenta con seed+1.
    console.warn("   ✗ seed " + seed + ": " + (err.name === "AbortError" ? "sin respuesta en 45 s" : err.message));
    return null;
  }
}

async function ensureBucket(): Promise<void> {
  const { error } = await supabase.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: MAX_BYTES,
    allowedMimeTypes: ["image/jpeg"]
  });
  // "already exists" es el caso normal a partir de la segunda invocación.
  if (error && !/exist/i.test(error.message)) {
    throw new Error("No se pudo preparar el bucket: " + error.message);
  }
}

// ── Handler ─────────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();

  // Falla cerrado, igual que cron-push: sin secreto configurado no se genera nada.
  if (!CRON_SECRET) {
    console.error("❌ CRON_SECRET no configurado. Endpoint deshabilitado.");
    return res.status(503).json({ error: "Service unavailable." });
  }
  if (!secretsMatch(req.headers.authorization || "", "Bearer " + CRON_SECRET)) {
    console.warn("🚫 Intento no autorizado a generate-batch.");
    return res.status(401).json({ error: "Unauthorized." });
  }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("❌ Supabase no configurado. El lote no tiene dónde guardar.");
    return res.status(503).json({ error: "Service unavailable." });
  }

  const query: any = { ...(req.query || {}), ...(req.body || {}) };
  const today = new Date().toISOString().slice(0, 10);
  const from = typeof query.from === "string" && isValidDate(query.from) ? query.from : today;
  const to = typeof query.to === "string" && isValidDate(query.to) ? query.to : from.slice(0, 4) + "-12-31";
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(query.limit) || DEFAULT_LIMIT));

  if (to < from) return res.status(400).json({ error: "El rango es inválido: 'to' es anterior a 'from'." });

  const startedAt = Date.now();
  const generated: string[] = [];
  const failed: string[] = [];
  let skipped = 0;
  let nextDate: string | null = null;

  try {
    await ensureBucket();

    // Las fechas ya resueltas se saltan sin tocar la red: el lote es reanudable.
    const dates = listDates(from, to);
    const { data: existing, error: existingError } = await supabase
      .from("daily_images")
      .select("image_date")
      .gte("image_date", from)
      .lte("image_date", to);
    if (existingError) throw new Error("No se pudo leer daily_images: " + existingError.message);
    const done = new Set((existing || []).map((row: any) => String(row.image_date).slice(0, 10)));

    for (const date of dates) {
      if (done.has(date)) { skipped++; continue; }

      if (generated.length + failed.length >= limit || Date.now() - startedAt > TIME_BUDGET_MS) {
        nextDate = date;
        break;
      }

      const day = await fetchLiturgicDay(date);
      const prompt = buildPrompt(day);
      const baseSeed = seedFromDate(date);
      console.log("🎨 " + date + " · " + day.season + " · " + day.colour + (day.celebration ? " · " + day.celebration : ""));

      let stored = false;
      for (let attempt = 0; attempt < MAX_ATTEMPTS && !stored; attempt++) {
        const result = await generateOne(prompt, baseSeed + attempt);
        if (!result) continue;

        const path = date + ".jpg";
        const { error: uploadError } = await supabase.storage
          .from(BUCKET)
          .upload(path, result.buffer, { contentType: "image/jpeg", upsert: true });
        if (uploadError) {
          console.warn("   ✗ no se pudo subir " + path + ": " + uploadError.message);
          continue;
        }

        const publicUrl = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
        const { error: insertError } = await supabase.from("daily_images").upsert({
          image_date: date,
          storage_path: path,
          public_url: publicUrl,
          prompt,
          seed: baseSeed + attempt,
          season: day.season,
          colour: day.colour,
          blocked: false
        }, { onConflict: "image_date" });
        if (insertError) {
          console.warn("   ✗ no se pudo guardar la fila de " + date + ": " + insertError.message);
          continue;
        }

        console.log("   ✓ " + path + " · " + Math.round(result.buffer.length / 1024) + " KB · luma " +
          (result.gate.luma || 0).toFixed(2));
        generated.push(date);
        stored = true;
      }

      if (!stored) {
        // Sin fila: el día cae al escalón 2 y la pantalla sigue entera.
        console.warn("   ⚠️ " + date + " no superó las puertas en " + MAX_ATTEMPTS + " intentos; queda sin fila.");
        failed.push(date);
      }
    }

    return res.status(200).json({
      from,
      to,
      generated: generated.length,
      failed: failed.length,
      skipped,
      failedDates: failed,
      nextDate,
      complete: nextDate === null,
      elapsedMs: Date.now() - startedAt
    });
  } catch (error: any) {
    console.error("❌ Error en generate-batch:", error.stack || error.message || error);
    return res.status(500).json({ error: "Ocurrió un error al generar el lote de imágenes." });
  }
}
