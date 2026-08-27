/**
 * Fuentes del Evangelio del Día.
 *
 * Arquitectura decidida en la auditoría (rev. 3) y recogida en el skill
 * alivio-contenido-liturgico §6:
 *
 *   Evangelizo es la COLUMNA VERTEBRAL — estructura determinista, salmo (que
 *   Vatican News nunca trae), inglés, santo y título litúrgico.
 *
 *   Vatican News se SUPERPONE solo en español, y solo sobre el TEXTO: es la
 *   traducción del leccionario mexicano, la que la gente escucha en Misa, y
 *   trae el comentario del Papa. Si su parseo falla, se degrada a Evangelizo
 *   automáticamente y la pantalla no se entera.
 *
 * Las referencias («1 Co 1,1-9») salen SIEMPRE de Evangelizo, incluso cuando el
 * texto viene de Vatican News: su feed tiene erratas de codificación propias que
 * afectan justo a la línea de la cita (`Isa?as 22, 19-23`).
 */

import { fetchWithTimeout } from "./_liturgy";

export interface Reading {
  ref: string;    // Cita corta: "1 Co 1,1-9."
  label: string;  // Encabezado largo: "Carta I de San Pablo a los Corintios 1,1-9."
  text: string;   // Párrafos separados por \n
}

export interface DayReadings {
  liturgicTitle: string;
  saint: string;
  first: Reading | null;
  psalm: Reading | null;
  second: Reading | null;   // Solo domingos y solemnidades: null el 85 % de los días
  gospel: Reading | null;
  papalComment: string;
  source: "evangelizo" | "evangelizo+vaticannews";
  vnApplied: boolean;
}

const EVANGELIZO_TIMEOUT_MS = 8000;
const VATICAN_TIMEOUT_MS = 8000;

// ── Utilidades de texto ─────────────────────────────────────────────────────

const ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
  aacute: "á", eacute: "é", iacute: "í", oacute: "ó", uacute: "ú",
  Aacute: "Á", Eacute: "É", Iacute: "Í", Oacute: "Ó", Uacute: "Ú",
  ntilde: "ñ", Ntilde: "Ñ", uuml: "ü", Uuml: "Ü",
  iquest: "¿", iexcl: "¡", laquo: "«", raquo: "»",
  ldquo: "“", rdquo: "”", lsquo: "‘", rsquo: "’",
  hellip: "…", mdash: "—", ndash: "–", deg: "°", uml: "¨"
};

function decodeEntities(input: string): string {
  return input
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&([a-zA-Z]+);/g, (m, name) => (name in ENTITIES ? ENTITIES[name] : m));
}

function stripTags(input: string): string {
  return input.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "");
}

function tidy(input: string): string {
  return input
    .replace(/ /g, " ")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .split("\n").map((line) => line.trim()).join("\n")
    .trim();
}

/**
 * Repara los signos de interrogación que el feed de Vatican News dejó donde
 * había comillas angulares o puntos suspensivos.
 *
 * Su pipeline sustituye por `?` todo carácter que no supo codificar, así que un
 * `?` puede ser tres cosas distintas. Se distinguen por contexto, sin adivinar:
 *
 *  - Interrogación de verdad: el español SIEMPRE abre con `¿`. Si hay un `¿`
 *    pendiente, el `?` lo cierra y se respeta.
 *  - Vocal acentuada perdida (`Isa?as`): entre dos alfanuméricos. Irrecuperable,
 *    se deja tal cual antes que inventar.
 *  - Comilla angular o elipsis: todo lo demás. Abre `«` si le sigue texto,
 *    cierra `»` si había una abierta, y si no, era una elipsis.
 */
export function repairVaticanPunctuation(text: string): string {
  let out = "";
  let openQuestions = 0;
  let insideQuote = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === "¿") { openQuestions++; out += ch; continue; }
    if (ch !== "?") { out += ch; continue; }

    if (openQuestions > 0) { openQuestions--; out += "?"; continue; }

    const prev = i > 0 ? text[i - 1] : "";
    const next = i + 1 < text.length ? text[i + 1] : "";
    const isWordChar = (c: string) => /[0-9A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/.test(c);

    if (isWordChar(prev) && isWordChar(next)) { out += "?"; continue; }
    if (insideQuote) { out += "»"; insideQuote = false; continue; }
    if (isWordChar(next) || next === "¡" || next === "¿" || next === '"') { out += "«"; insideQuote = true; continue; }
    out += "…";
  }

  return out.replace(/…{2,}/g, "…").replace(/…\s*\./g, "…");
}

/** Dígitos de una cita, para cotejar dos fuentes: "Mt 24,42-51." → "244251". */
function refDigits(ref: string): string {
  return (ref || "").replace(/[^0-9]/g, "");
}

// ── Evangelizo (columna vertebral) ──────────────────────────────────────────

const EVANGELIZO_URL = "https://feed.evangelizo.org/v2/reader.php";

function cdata(xml: string, tag: string): string {
  const match = new RegExp("<" + tag + ">\\s*(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?\\s*</" + tag + ">").exec(xml);
  if (!match) return "";
  return tidy(decodeEntities(stripTags(match[1])));
}

function evangelizoReading(xml: string, prefix: string): Reading | null {
  const text = cdata(xml, prefix);
  const ref = cdata(xml, prefix + "_st");
  const label = cdata(xml, prefix + "_lt");
  // Entre semana no hay segunda lectura: Evangelizo devuelve la etiqueta en blanco.
  if (!text || text.length < 20) return null;
  return { ref, label, text };
}

/**
 * Evangelizo tiene un límite duro de 30 días desde hoy en cualquier dirección.
 * Fuera de esa ventana responde un texto de error, no XML.
 */
export async function fetchEvangelizo(date: string, lang: "es" | "en"): Promise<DayReadings | null> {
  const feedLang = lang === "en" ? "AM" : "SP";
  const url = EVANGELIZO_URL + "?date=" + date + "&type=xml&lang=" + feedLang;

  const res = await fetchWithTimeout(url, EVANGELIZO_TIMEOUT_MS);
  if (!res.ok) throw new Error("Evangelizo respondió " + res.status);

  const xml = await res.text();
  if (!xml.includes("<evangelizo>")) {
    console.warn("⚠️ Evangelizo no devolvió XML para " + date + " (probablemente fuera de su ventana de 30 días).");
    return null;
  }

  const gospel = evangelizoReading(xml, "reading_gospel");
  if (!gospel) return null; // Sin Evangelio no hay pantalla: es la columna vertebral.

  return {
    liturgicTitle: cdata(xml, "litugic_t"), // La errata es del campo de origen, no nuestra.
    saint: cdata(xml, "saint"),
    first: evangelizoReading(xml, "reading_text1"),
    psalm: evangelizoReading(xml, "reading_text2"),
    second: evangelizoReading(xml, "reading_text3"),
    gospel,
    papalComment: "",
    source: "evangelizo",
    vnApplied: false
  };
}

// ── Vatican News (superposición en español) ─────────────────────────────────

const VATICAN_RSS = "https://www.vaticannews.va/es/evangelio-de-hoy.rss.xml";

interface VaticanDay {
  first: string;
  second: string;
  gospel: string;
  gospelRef: string;
  comment: string;
}

/** Una línea de cita: corta, con capítulo y versículo, y sin punto final de frase. */
function looksLikeCitation(line: string): boolean {
  return line.length <= 70 && /\d{1,3},\s?\d/.test(line) && !/[.;:]\s/.test(line);
}

/** Encabezado de lectura: "Lectura del santo evangelio según san Mateo". */
function isGospelHeading(line: string): boolean {
  return /evangelio\s+seg[uú]?[n?]/i.test(line);
}

/**
 * Parseo heurístico del blob CDATA. Es heurístico porque el feed lo es: los
 * domingos marca «Primera lectura» y «Segunda lectura», entre semana no marca
 * nada. Lo único estable es el encabezado del Evangelio, y de ahí cuelga todo.
 * Si ese ancla no aparece, se devuelve null y el llamador degrada a Evangelizo.
 */
export function parseVaticanItem(description: string): VaticanDay | null {
  const paragraphs = (description.match(/<p>[\s\S]*?<\/p>/gi) || [])
    .map((p) => tidy(repairVaticanPunctuation(decodeEntities(stripTags(p)))))
    .filter((p) => p.length > 0);

  if (paragraphs.length < 4) return null;

  const gospelHeading = paragraphs.findIndex(isGospelHeading);
  if (gospelHeading === -1) return null;

  // El comentario del Papa es siempre el último párrafo, ya fuera del pasaje.
  // Se exige cuerpo suficiente entre la cita y él para no confundirlo con
  // el final del Evangelio en un día de pasaje corto.
  const afterGospel = paragraphs.slice(gospelHeading + 1);
  const gospelRefIdx = afterGospel.findIndex(looksLikeCitation);
  if (gospelRefIdx === -1) return null;

  const gospelBody = afterGospel.slice(gospelRefIdx + 1);
  if (gospelBody.length < 2) return null; // Sin cuerpo + comentario, no se separa con seguridad.

  const comment = gospelBody[gospelBody.length - 1];
  const gospel = gospelBody.slice(0, -1).join("\n\n");

  // Antes del Evangelio: primera lectura y, los domingos, la segunda.
  const before = paragraphs.slice(0, gospelHeading);
  const secondMarker = before.findIndex((p) => /^segunda\s+lectura$/i.test(p));
  const firstBlock = secondMarker === -1 ? before : before.slice(0, secondMarker);
  const secondBlock = secondMarker === -1 ? [] : before.slice(secondMarker + 1);

  const bodyOf = (block: string[]): string => {
    const refIdx = block.findIndex(looksLikeCitation);
    if (refIdx === -1) return "";
    return block.slice(refIdx + 1).join("\n\n");
  };

  return {
    first: bodyOf(firstBlock),
    second: bodyOf(secondBlock),
    gospel,
    gospelRef: afterGospel[gospelRefIdx],
    comment: comment.length >= 120 ? comment : ""
  };
}

/** Busca el ítem de la fecha pedida. El guid trae la fecha: /2026/08/27.html */
export async function fetchVatican(date: string): Promise<VaticanDay | null> {
  const res = await fetchWithTimeout(VATICAN_RSS, VATICAN_TIMEOUT_MS, {
    redirect: "follow",
    headers: { "User-Agent": "Alivio/1.0 (+https://alivio.pronosoftmx.com)" }
  });
  if (!res.ok) throw new Error("Vatican News respondió " + res.status);

  // El feed se declara UTF-8 pero mezcla bytes latin-1 en la cabecera del canal.
  // Los ítems son ASCII puro con entidades HTML (verificado sobre 14 ítems), así
  // que decodificar en latin1 es exacto para lo que consumimos y no rompe nada.
  const xml = Buffer.from(await res.arrayBuffer()).toString("latin1");

  const wanted = date.split("-");
  const guidPath = "/" + wanted[0] + "/" + wanted[1] + "/" + wanted[2] + ".html";

  for (const raw of xml.match(/<item>[\s\S]*?<\/item>/gi) || []) {
    if (!raw.includes(guidPath)) continue;
    const description = /<description>\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*<\/description>/i.exec(raw);
    if (!description) return null;
    return parseVaticanItem(description[1]);
  }
  return null; // Su ventana es de 14 días atrás y mañana; fuera de ahí no hay ítem.
}

// ── Composición ─────────────────────────────────────────────────────────────

/**
 * Superpone Vatican News sobre Evangelizo. Solo sustituye el texto cuando la
 * cita del Evangelio de las dos fuentes coincide en sus números: si los feeds
 * están desincronizados, se queda con Evangelizo entero antes que mezclar dos
 * días distintos en la misma pantalla.
 */
export function overlayVatican(base: DayReadings, vn: VaticanDay): DayReadings {
  const baseDigits = refDigits(base.gospel ? base.gospel.ref : "");
  const vnDigits = refDigits(vn.gospelRef);
  if (!baseDigits || !vnDigits || baseDigits !== vnDigits) {
    console.warn("⚠️ Vatican News y Evangelizo no coinciden en la cita del Evangelio; no se superpone.");
    return base;
  }

  const merged: DayReadings = { ...base, source: "evangelizo+vaticannews", vnApplied: true };
  if (vn.gospel && base.gospel) merged.gospel = { ...base.gospel, text: vn.gospel };
  if (vn.first && base.first) merged.first = { ...base.first, text: vn.first };
  if (vn.second && base.second) merged.second = { ...base.second, text: vn.second };
  merged.papalComment = vn.comment;
  return merged;
}

/**
 * Un día completo. Evangelizo manda; Vatican News mejora el español si puede.
 * Ninguna caída de VN puede tumbar la respuesta: se registra y se sigue.
 */
export async function fetchDayReadings(date: string, lang: "es" | "en"): Promise<DayReadings | null> {
  const base = await fetchEvangelizo(date, lang);
  if (!base) return null;
  if (lang !== "es") return base;

  try {
    const vn = await fetchVatican(date);
    if (vn) return overlayVatican(base, vn);
    console.warn("⚠️ Vatican News no tiene ítem para " + date + "; se sirve Evangelizo.");
  } catch (err: any) {
    console.warn("⚠️ Vatican News falló para " + date + " (" + err.message + "); se sirve Evangelizo.");
  }
  return base;
}
