/**
 * Día litúrgico y banco de plantillas de imagen.
 *
 * Lo comparten /api/readings (escalón 2 de la escalera de respaldo) y
 * /api/generate-batch (siembra del lote anual). El prefijo `_` lo mantiene fuera
 * del enrutado de Vercel: es un módulo, no un endpoint.
 *
 * Regla que gobierna este archivo (skill alivio-contenido-liturgico §4):
 * el prompt de imagen se siembra con el DÍA LITÚRGICO, nunca con el texto del
 * pasaje, y lo arma un banco escrito a mano — ningún modelo participa. El espacio
 * de prompts posibles es finito y es nuestro; por eso el lote puede correr sin
 * revisión humana.
 */

export type Season = "advent" | "christmas" | "lent" | "easter" | "ordinary";
export type Colour = "white" | "red" | "green" | "violet" | "rose";

export interface LiturgicDay {
  date: string;          // YYYY-MM-DD
  season: Season;
  seasonWeek: number;
  celebration: string;   // Título de la celebración principal, vacío si es feria
  colour: Colour;
  rank: string;
  weekday: string;
  source: "calapi" | "local";
}

const CALAPI_TIMEOUT_MS = 6000;

/** fetch con tope de tiempo: una fuente lenta no puede colgar la función entera. */
export async function fetchWithTimeout(url: string, ms: number, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// ── Día litúrgico ───────────────────────────────────────────────────────────
// calapi responde para CUALQUIER fecha, sin API key y sin límite de ventana
// (verificado en 2026-12-25 y 2027-03-15). Solo habla http: se llama desde el
// servidor, nunca desde el navegador, para no meter contenido mixto.
const CALAPI_BASE = "http://calapi.inadiutorium.cz/api/v0/en/calendars/default";

function normalizeSeason(raw: string): Season {
  const s = (raw || "").toLowerCase();
  if (s === "advent" || s === "christmas" || s === "lent" || s === "easter") return s;
  // calapi devuelve 'triduum' en los tres días santos: pertenecen al registro de Pascua.
  if (s === "triduum") return "easter";
  return "ordinary";
}

function normalizeColour(raw: string): Colour {
  const c = (raw || "").toLowerCase();
  if (c === "white" || c === "red" || c === "green" || c === "violet" || c === "rose") return c;
  return "green";
}

export async function fetchLiturgicDay(date: string): Promise<LiturgicDay> {
  const [y, m, d] = date.split("-");
  try {
    const res = await fetchWithTimeout(CALAPI_BASE + "/" + y + "/" + m + "/" + d, CALAPI_TIMEOUT_MS);
    if (!res.ok) throw new Error("calapi respondió " + res.status);
    const data: any = await res.json();
    const first = Array.isArray(data.celebrations) && data.celebrations.length ? data.celebrations[0] : {};
    return {
      date,
      season: normalizeSeason(data.season),
      seasonWeek: Number(data.season_week) || 0,
      celebration: typeof first.title === "string" ? first.title : "",
      colour: normalizeColour(first.colour),
      rank: typeof first.rank === "string" ? first.rank : "",
      weekday: typeof data.weekday === "string" ? data.weekday : "",
      source: "calapi"
    };
  } catch (err: any) {
    console.warn("⚠️ calapi no respondió para " + date + " (" + err.message + "); se usa la tabla local.");
    return localLiturgicDay(date);
  }
}

/**
 * Tabla mínima local: el último recurso si calapi no responde.
 * Calcula la Pascua (algoritmo de Meeus/Jones/Butcher, rito gregoriano) y deriva
 * de ahí Cuaresma y Pascua; Adviento y Navidad salen del calendario civil.
 * No pretende ser un leccionario: solo tiene que acertar el TIEMPO para elegir
 * la imagen de respaldo.
 */
export function localLiturgicDay(date: string): LiturgicDay {
  const [y, m, d] = date.split("-").map(Number);
  const dayNum = Date.UTC(y, m - 1, d) / 86400000;

  const easter = easterSunday(y);
  const ashWednesday = easter - 46;
  const pentecost = easter + 49;
  const christmasEve = Date.UTC(y, 11, 24) / 86400000;
  const firstAdvent = adventStart(y);
  const epiphanyEnd = Date.UTC(y, 0, 13) / 86400000; // Bautismo del Señor, aproximado

  let season: Season = "ordinary";
  let colour: Colour = "green";
  if (dayNum <= epiphanyEnd) { season = "christmas"; colour = "white"; }
  else if (dayNum >= ashWednesday && dayNum < easter) { season = "lent"; colour = "violet"; }
  else if (dayNum >= easter && dayNum <= pentecost) { season = "easter"; colour = "white"; }
  else if (dayNum >= firstAdvent && dayNum < christmasEve) { season = "advent"; colour = "violet"; }
  else if (dayNum >= christmasEve) { season = "christmas"; colour = "white"; }

  return { date, season, seasonWeek: 0, celebration: "", colour, rank: "", weekday: "", source: "local" };
}

/** Domingo de Pascua del año dado, como número de día UTC. */
function easterSunday(year: number): number {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const dd = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - dd - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const mm = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * mm + 114) / 31);
  const day = ((h + l - 7 * mm + 114) % 31) + 1;
  return Date.UTC(year, month - 1, day) / 86400000;
}

/** Primer domingo de Adviento: cuatro domingos antes de Navidad. */
function adventStart(year: number): number {
  const dow = new Date(Date.UTC(year, 11, 25)).getUTCDay(); // 0 = domingo
  const fourthSunday = Date.UTC(year, 11, 25) / 86400000 - (dow === 0 ? 7 : dow);
  return fourthSunday - 21;
}

/** ¿El día pide el registro rojo? Mártires, Cruz, Pentecostés, Ramos. */
export function isRedDay(day: LiturgicDay): boolean {
  return day.colour === "red";
}

// ── Escalón 2 de la escalera: imagen fija por tiempo litúrgico ──────────────
// Archivos locales dentro de public/, así que funcionan sin conexión y dentro del APK.
export const SEASON_IMAGE: Record<Season, string> = {
  advent: "/seasons/advent.webp",
  christmas: "/seasons/christmas.webp",
  lent: "/seasons/lent.webp",
  easter: "/seasons/easter.webp",
  ordinary: "/seasons/ordinary.webp"
};
export const MARTYR_IMAGE = "/seasons/martyr.webp";
export const LAST_RESORT_IMAGE = "/fallback-misericordia.webp";

/** El escalón 2 completo: el rojo manda sobre el tiempo, porque es lo que se ve ese día. */
export function seasonImageFor(day: LiturgicDay): string {
  return isRedDay(day) ? MARTYR_IMAGE : SEASON_IMAGE[day.season];
}

// ── Banco de plantillas ─────────────────────────────────────────────────────
// Cuatro piezas y solo dos varían: arquetipo y cualidad de luz. Prefijo y sufijo
// son fijos, del lado del servidor y no sobrescribibles por nada ni por nadie.

export const STYLE_PREFIX =
  "Serene sacred atmospheric painting, painterly, reverent, contemplative, soft brushwork. " +
  "Empty landscape or quiet interior only. No people, no human figures, no faces, no hands, " +
  "no saints, no angels, no text, no letters, no logos, no watermarks.";

export const NEGATIVE_SUFFIX =
  "Avoid entirely: human figures, faces, portraits, crowds, blood, gore, wounds, corpses, bones, " +
  "skulls, violence, weapons, nudity, distorted anatomy, photorealism of sacred persons, " +
  "written words, captions, signatures, modern objects, brand marks.";

/** Diez arquetipos por tiempo. Escritos a mano; ninguno narra una escena bíblica. */
const ARCHETYPES: Record<Season, string[]> = {
  advent: [
    "a narrow window at dusk with one distant lamp burning outside",
    "a quiet path through bare winter trees at blue hour",
    "an empty stone chapel interior lit by a single candle",
    "a wide plain under a deep evening sky, first star rising",
    "a doorway left ajar with faint light beyond it",
    "still water reflecting a darkening sky before dawn",
    "a hillside at twilight with mist gathering in the valley",
    "an empty wooden bench beside a shuttered window",
    "a long corridor of arches receding into soft shadow",
    "frost on a field with the horizon barely brightening"
  ],
  christmas: [
    "warm lamplight spilling across a plain wooden floor at night",
    "a small stable interior with clean straw and a warm golden glow",
    "a snowbound village seen from far away, windows lit",
    "an open doorway pouring golden light into the dark",
    "a hearth burning low in an empty stone room",
    "a starlit sky over quiet hills with a single bright star",
    "candles gathered on a simple table, flames steady",
    "a window frosted at the edges with warm light behind it",
    "a courtyard at night under gentle snowfall, lanterns lit",
    "a humble interior of rough stone bathed in soft amber light"
  ],
  lent: [
    "an open desert of pale sand under a wide bleached sky",
    "a bare stone cell with one high window and a shaft of light",
    "a dry riverbed winding between low hills",
    "a windswept plain with a lone bare tree in the distance",
    "ash-grey rocks under an overcast sky",
    "a narrow stone stair descending into cool shadow",
    "an empty cloister walk with long afternoon shadows",
    "a field of dry grass bending in the wind",
    "a still pool in a rocky hollow, water dark and clear",
    "a mountain ridge under thin clouds, austere and quiet"
  ],
  easter: [
    "sunrise breaking over a wide calm sea",
    "an empty garden at first light with dew on the leaves",
    "light flooding through a tall open doorway of pale stone",
    "a meadow at dawn with mist lifting off the grass",
    "a clear spring flowing over bright stones",
    "an orchard in full blossom under early morning light",
    "a stone terrace opening onto a valley filled with morning light",
    "clouds parting over quiet hills, light spreading across the land",
    "a white-walled interior filled with clean daylight",
    "a path of white stones leading toward the sunrise"
  ],
  ordinary: [
    "a green valley under a broad summer sky",
    "an open window looking onto a garden in the afternoon",
    "a country lane between hedgerows in gentle sunlight",
    "a still lake surrounded by low green hills",
    "a simple room with sunlight lying across a plain table",
    "a wheat field moving slowly in the wind",
    "an old olive grove with light filtering through the leaves",
    "a stone well in a quiet courtyard with climbing vines",
    "a forest clearing with light falling through the canopy",
    "a footpath climbing a grassy slope toward open sky"
  ]
};

/** Arquetipos del registro rojo: sobrescriben el tiempo cuando el día es de mártir. */
const RED_ARCHETYPES = [
  "a stone altar in an empty crypt lit by deep warm light",
  "a single flame in a red glass lamp in a dark chapel",
  "an empty stone courtyard at sunset, long shadows and warm walls",
  "embers glowing in a brazier in an empty hall",
  "a crimson sky over a bare ridge at last light",
  "an ancient stone arch with deep red light passing through it",
  "a quiet chapel interior with a red votive lamp burning",
  "an old stone floor washed in the last red light of day"
];

/**
 * Cualidad de luz, agrupada por temperatura.
 *
 * NO se sortea de la lista entera. Medido sobre las primeras 44 imágenes del
 * lote: cuando la luz y la paleta se contradicen —«luz azulada de hora azul» con
 * «paleta carmesí y ámbar»— gana la luz y el color litúrgico desaparece. El 21
 * de septiembre, memoria roja de San Mateo, salió un claustro gris azulado.
 *
 * Y el color es lo único que ata la imagen al día: sin él la imagen es papel
 * pintado. Así que la luz se elige de las compatibles con el color de ese día.
 */
const LIGHTS_WARM = [
  "low golden light raking across the surfaces",
  "a single warm shaft of light in deep shadow",
  "candlelit warmth fading into darkness"
];
const LIGHTS_COOL = [
  "cool blue hour light, calm and even",
  "overcast light, muted and soft-edged"
];
const LIGHTS_NEUTRAL = [
  "soft diffused light",
  "hazy backlight with gentle bloom",
  "clear morning light, crisp and quiet"
];

/**
 * Ninguna paleta se queda con menos de cuatro luces, así que el lote sigue sin
 * repetirse. Adviento y Cuaresma (violeta) admiten la vela y el haz cálido a
 * propósito: una luz pequeña en la penumbra es exactamente el registro de la
 * espera, no una contradicción.
 */
export const LIGHT_BY_COLOUR: Record<Colour, string[]> = {
  red: [...LIGHTS_WARM, "hazy backlight with gentle bloom"],
  white: [...LIGHTS_WARM, ...LIGHTS_NEUTRAL],
  green: [...LIGHTS_NEUTRAL, "low golden light raking across the surfaces", "a single warm shaft of light in deep shadow"],
  violet: [...LIGHTS_COOL, "candlelit warmth fading into darkness", "a single warm shaft of light in deep shadow", "soft diffused light"],
  rose: [...LIGHTS_WARM, "soft diffused light", "hazy backlight with gentle bloom"]
};

/** Paleta anclada al color litúrgico del día. */
const PALETTES: Record<Colour, string> = {
  violet: "muted violet, deep indigo and cool grey palette",
  white: "warm white, pale gold and soft ivory palette",
  green: "soft green, ochre and warm earth palette",
  red: "deep crimson, warm amber and dark stone palette",
  rose: "dusty rose, warm pink and pale grey palette"
};

/** El seed sale de la fecha: el lote es una función pura de la fecha. */
export function seedFromDate(date: string): number {
  return Number(date.replace(/-/g, "")); // 2026-08-27 → 20260827
}

/** Mezcla determinista y estable; no depende de Math.random ni del entorno. */
function pick<T>(items: T[], seed: number, salt: number): T {
  const mixed = Math.abs(Math.imul(seed ^ salt, 2654435761)) % items.length;
  return items[mixed];
}

/**
 * El prompt completo del día. Función pura de la fecha y del día litúrgico:
 * relanzar el lote devuelve exactamente el mismo prompt.
 */
export function buildPrompt(day: LiturgicDay): string {
  const seed = seedFromDate(day.date);
  const bank = isRedDay(day) ? RED_ARCHETYPES : ARCHETYPES[day.season];
  const scene = pick(bank, seed, 0x9e37);
  const light = pick(LIGHT_BY_COLOUR[day.colour] || LIGHT_BY_COLOUR.green, seed, 0x85eb);
  const palette = PALETTES[day.colour] || PALETTES.green;
  return STYLE_PREFIX + " Scene: " + scene + ". Light: " + light + ". Palette: " + palette + ". " + NEGATIVE_SUFFIX;
}
