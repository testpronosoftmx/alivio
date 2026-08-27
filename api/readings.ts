/**
 * Evangelio del Día — lecturas del día con ingesta perezosa.
 *
 * GET /api/readings?date=YYYY-MM-DD&lang=es|en
 *
 * La primera petición del día trae las lecturas de las fuentes, las guarda en
 * `alivio.daily_readings` y responde; las demás salen del CDN. Sin cron, sin
 * lock y sin llamadas de IA: el endpoint no gasta un céntimo.
 *
 * La imagen NO se genera aquí. Viene hecha del lote anual (/api/generate-batch)
 * y este endpoint solo resuelve la escalera de respaldo de tres escalones, que
 * es lo que garantiza que nunca falte imagen.
 */

import { createClient } from "@supabase/supabase-js";
import { VercelRequest, VercelResponse } from "@vercel/node";
import * as dotenv from "dotenv";
import { fetchLiturgicDay, seasonImageFor, LAST_RESORT_IMAGE } from "./_liturgy";
import { fetchDayReadings, fetchVatican, overlayVatican, DayReadings } from "./_sources";

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const hasSupabase = Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);

const supabase = hasSupabase
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { db: { schema: "alivio" } })
  : null;

// Evangelizo no sirve nada fuera de ±30 días. Pedir más es un error del cliente,
// no una degradación: se corta aquí y no se toca la red.
const MAX_DAYS_AWAY = 30;

// Días que se conservan en la caché de lecturas. Es una caché de texto ajeno con
// derechos, no un archivo: ver la nota en database_schema.sql.
const CACHE_RETENTION_DAYS = 45;

const ATTRIBUTION = {
  evangelizo: { name: "Evangelizo.org", url: "https://www.evangelizo.org" },
  vatican: { name: "Vatican News", url: "https://www.vaticannews.va/es/evangelio-de-hoy.html" }
};

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(a + "T00:00:00Z") - Date.parse(b + "T00:00:00Z")) / 86400000);
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(value + "T00:00:00Z");
  return !isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

/**
 * El gancho de la tarjeta. Orden fijado por el skill de contenido §4b:
 * comentario del Papa → título litúrgico → la cita sola.
 *
 * NUNCA un extracto automático del pasaje: el leccionario saca juicio, violencia
 * y muerte varias veces al mes, y esto se pinta bajo un saludo de bienvenida.
 */
function buildTeaser(day: DayReadings): { text: string; source: string } {
  const comment = (day.papalComment || "").trim();
  if (comment.length >= 60) {
    const firstStop = comment.search(/[.!?»]\s/);
    const sentence = firstStop > 60 ? comment.slice(0, firstStop + 1) : comment;
    return { text: sentence.length > 210 ? sentence.slice(0, 207).trimEnd() + "…" : sentence, source: "papal" };
  }
  if (day.liturgicTitle) return { text: day.liturgicTitle, source: "liturgic" };
  return { text: day.gospel ? day.gospel.ref : "", source: "citation" };
}

/**
 * La escalera de respaldo. Nunca devuelve vacío.
 *  1. Fila del día en daily_images, si no está bloqueada.
 *  2. Imagen fija del tiempo litúrgico, servida desde public/ (offline y en el APK).
 *  3. fallback-misericordia.
 */
async function resolveImage(date: string) {
  if (supabase) {
    try {
      const { data } = await supabase
        .from("daily_images")
        .select("public_url, season, colour, blocked")
        .eq("image_date", date)
        .maybeSingle();
      if (data && !data.blocked && data.public_url) {
        return { url: data.public_url, tier: 1, season: data.season || "", colour: data.colour || "", ai: true };
      }
    } catch (err: any) {
      console.warn("⚠️ No se pudo consultar daily_images: " + err.message);
    }
  }

  try {
    const liturgic = await fetchLiturgicDay(date);
    return { url: seasonImageFor(liturgic), tier: 2, season: liturgic.season, colour: liturgic.colour, ai: true };
  } catch (err: any) {
    console.warn("⚠️ No se pudo resolver el tiempo litúrgico: " + err.message);
    return { url: LAST_RESORT_IMAGE, tier: 3, season: "", colour: "", ai: true };
  }
}

// ── Caché en Supabase ───────────────────────────────────────────────────────

function rowToDay(row: any): DayReadings {
  return {
    liturgicTitle: row.liturgic_title || "",
    saint: row.saint || "",
    first: row.first_reading || null,
    psalm: row.psalm || null,
    second: row.second_reading || null,
    gospel: row.gospel || null,
    papalComment: row.papal_comment || "",
    source: row.text_source || "evangelizo",
    vnApplied: Boolean(row.vn_applied)
  };
}

async function readCache(date: string, lang: string): Promise<DayReadings | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from("daily_readings")
      .select("*")
      .eq("reading_date", date)
      .eq("lang", lang)
      .maybeSingle();
    if (error) throw error;
    return data ? rowToDay(data) : null;
  } catch (err: any) {
    console.warn("⚠️ No se pudo leer la caché de lecturas: " + err.message);
    return null;
  }
}

async function writeCache(date: string, lang: string, day: DayReadings): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.from("daily_readings").upsert({
      reading_date: date,
      lang,
      liturgic_title: day.liturgicTitle,
      saint: day.saint,
      first_reading: day.first,
      psalm: day.psalm,
      second_reading: day.second,
      gospel: day.gospel,
      papal_comment: day.papalComment,
      text_source: day.source,
      vn_applied: day.vnApplied,
      fetched_at: new Date().toISOString()
    }, { onConflict: "reading_date,lang" });
  } catch (err: any) {
    // Que no se pueda guardar no impide responder: la caché es una optimización.
    console.warn("⚠️ No se pudo guardar la caché de lecturas: " + err.message);
  }
}

/** Purga lo viejo. Se llama solo tras una ingesta, no en cada lectura del CDN. */
async function purgeOldCache(): Promise<void> {
  if (!supabase) return;
  const cutoff = new Date(Date.now() - CACHE_RETENTION_DAYS * 86400000).toISOString().slice(0, 10);
  try {
    await supabase.from("daily_readings").delete().lt("reading_date", cutoff);
  } catch (err: any) {
    console.warn("⚠️ No se pudo purgar la caché de lecturas: " + err.message);
  }
}

// ── Handler ─────────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed. Use GET." });

  const rawDate = typeof req.query.date === "string" ? req.query.date : "";
  const date = rawDate ? rawDate : todayUTC();
  const lang: "es" | "en" = req.query.lang === "en" ? "en" : "es";

  if (!isValidDate(date)) {
    return res.status(400).json({ error: "El parámetro 'date' debe tener el formato YYYY-MM-DD." });
  }
  if (Math.abs(daysBetween(date, todayUTC())) > MAX_DAYS_AWAY) {
    return res.status(400).json({ error: "Las lecturas solo están disponibles dentro de los 30 días alrededor de hoy." });
  }

  try {
    let day = await readCache(date, lang);
    let ingested = false;

    // El comentario del Papa se publica el mismo día: si la primera petición llegó
    // antes que él, la fila quedó sin superponer y se reintenta mientras el día
    // siga dentro de la ventana de Vatican News (14 días atrás y mañana).
    const vnRetryWindow = daysBetween(todayUTC(), date) <= 14 && daysBetween(date, todayUTC()) <= 1;
    if (day && lang === "es" && !day.vnApplied && vnRetryWindow) {
      try {
        const vn = await fetchVatican(date);
        if (vn) {
          day = overlayVatican(day, vn);
          if (day.vnApplied) await writeCache(date, lang, day);
        }
      } catch (err: any) {
        console.warn("⚠️ Reintento de Vatican News fallido para " + date + ": " + err.message);
      }
    }

    if (!day) {
      day = await fetchDayReadings(date, lang);
      ingested = true;
    }

    if (!day || !day.gospel) {
      // Sin Evangelio no hay pantalla que pintar. 502, no 500: el fallo es de la fuente.
      return res.status(502).json({ error: "Las lecturas de ese día no están disponibles ahora mismo." });
    }

    if (ingested) {
      await writeCache(date, lang, day);
      await purgeOldCache();
    }

    const image = await resolveImage(date);
    const teaser = buildTeaser(day);

    const attribution = [ATTRIBUTION.evangelizo];
    if (day.vnApplied) attribution.push(ATTRIBUTION.vatican);

    // Un día incompleto (sin el comentario del Papa todavía) se cachea poco tiempo
    // para que la superposición entre en cuanto Vatican News publique.
    const complete = lang !== "es" || day.vnApplied;
    const sMaxAge = complete ? 21600 : 900;
    res.setHeader("Cache-Control", "public, s-maxage=" + sMaxAge + ", stale-while-revalidate=86400");

    return res.status(200).json({
      date,
      lang,
      liturgicTitle: day.liturgicTitle,
      saint: day.saint,
      readings: {
        first: day.first,
        psalm: day.psalm,
        second: day.second,
        gospel: day.gospel
      },
      papalComment: day.papalComment,
      teaser: teaser.text,
      teaserSource: teaser.source,
      image,
      attribution,
      textSource: day.source
    });
  } catch (error: any) {
    // El detalle va al log, nunca al cliente.
    console.error("❌ Error en endpoint readings:", error.stack || error.message || error);
    return res.status(500).json({ error: "Ocurrió un error al traer las lecturas del día." });
  }
}
