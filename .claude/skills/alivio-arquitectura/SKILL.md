---
name: alivio-arquitectura
description: Reglas de casa de la PWA Alivio (vanilla JS + Tailwind CDN + Vercel functions + Capacitor). Cárgala ANTES de tocar public/index.html, public/app.js, public/sw.js, api/*.ts, capacitor.config.ts o de añadir cualquier pantalla, string o assets a public/.
---

# Arquitectura y reglas de casa — Alivio PWA

App devocional (`alivio.pronosoftmx.com`) + envoltorio Android (Capacitor). **Sin build step, sin bundler, sin tests.** Lo que escribes en `public/` es literalmente lo que se sirve y lo que se empaqueta en el APK.

## 1. Mapa real del proyecto

| Ruta | Qué es |
|---|---|
| `public/index.html` | Todo el markup + `<style>` inline + JSON-LD + `openDonation()` inline. ~990 líneas. |
| `public/app.js` | Toda la lógica en **scope global**, sin módulos. ~2500 líneas. |
| `public/prayers.js` | Corpus de oraciones. **Texto fijo, nunca generado** — ver el skill de contenido. |
| `public/sw.js` | Service Worker. Network-first con fallback a cache. |
| `public/seasons/*.webp` | Seis imágenes de respaldo por tiempo litúrgico. 89 KB las seis; cacheadas en el SW a propósito. |
| `api/comfort.ts` | Claude Sonnet → JSON de consuelo + URL de imagen Pollinations. |
| `api/subscribe.ts` | Alta/baja de recordatorios (VAPID web + FCM nativo). |
| `api/cron-push.ts` | Envío programado. Autenticado con `CRON_SECRET`; **falla cerrado** (503 sin secreto). |
| `api/readings.ts` | Evangelio del Día. Ingesta perezosa + caché de CDN. **Cero IA, cero coste.** |
| `api/generate-batch.ts` | Lote anual de imágenes. `CRON_SECRET`, idempotente y reanudable. Se lanza con `scripts/run-batch.cjs`. |
| `api/_liturgy.ts`, `api/_sources.ts` | Módulos compartidos. El `_` los mantiene fuera del enrutado de Vercel. |
| Supabase | Esquema **`alivio`** (no `public`): `push_subscriptions`, `daily_readings`, `daily_images`; bucket `daily-images`. |
| `database_schema.sql` | Al día (`fcm_token`, `last_sent_at`, sin grants a `anon`). Actualízalo con cada cambio de tabla. |

## 2. Pantallas: el registro

Una sola página, pantallas ocultas con `.screen-hidden`, conmutadas por `changeScreen(id)`.
El array literal **ya no existe**: lo sustituyó un registro declarativo (fase 1).

```js
const SCREENS = {
  'screen-landing':   { chrome: 'landing' },              // marketing, sin barra
  'screen-hub':       { chrome: 'app' },
  'screen-evangelio': { chrome: 'app', tab: 'evangelio', onEnter: 'loadEvangelio' },
  'screen-desahogo':  { chrome: 'app', tab: 'desahogo' },
  'screen-oraciones': { chrome: 'app', tab: 'oraciones' },
  'screen-oracion':   { chrome: 'app', tab: 'oraciones' },
  'screen-rosario':   { chrome: 'app', tab: 'oraciones' },
  'screen-suspiro':   { chrome: 'immersive' },            // barra oculta
  'screen-ancla':     { chrome: 'app', tab: 'desahogo' }
};
```

**Toda pantalla nueva se declara ahí y en ningún otro sitio.** Si no está, `changeScreen()`
avisa por consola y no hace nada — no deja pantallas apiladas en silencio.

- `chrome: 'app'` → lleva barra inferior. `'immersive'` → sin barra.
- `onEnter` nombra la función que se llama al mostrar la pantalla: así un módulo pide
  sus datos sin que `changeScreen()` sepa de qué módulo se trata. Si la función no
  existe, la pantalla se muestra igual — nunca es motivo para no navegar.
- **Solo `screen-suspiro` es inmersiva**, y es deliberado: una barra invitando a irse
  arruina medio minuto de respiración guiada. No la conviertas en `'app'`.
- El logotipo dentro de la app llama a `goHome()` → hub. Nunca a la landing.

### Módulos del hub y de la barra

`MODULES` gobierna qué aparece en el hub y en la barra. Dos banderas:
`enabled` (existe) y `ready` (tiene contenido; si no, sale con etiqueta «muy pronto»).
Con un solo módulo activo, el hub se salta solo y se entra directo al desahogo.

`HUB_ORDER` fija el orden de las tarjetas por vertiente. **Solo el orden: el contenido
es idéntico para las tres.** Nunca ramifiques contenido ahí.

La tarjeta del Evangelio es **viva** (`hub-card-live`): lleva la imagen del día, su
etiqueta de IA y el gancho que devuelve `/api/readings` en `teaser`. El gancho lo
resuelve el servidor y **jamás sale del texto del pasaje** — ver el skill de contenido
§4b. `renderHub()` pinta primero la tarjeta normal y `hydrateHubCard()` la sustituye
cuando llegan los datos; si no llegan, se queda la normal. Pantalla y hub comparten la
misma petición en vuelo (`fetchEvangelio`), con freno de 60 s tras un fallo.

## 3. i18n — regla innegociable

`TRANSLATIONS` en `app.js` tiene `es` y `en`. **Cada string visible nuevo va en las dos, y se aplica dentro de `applyTranslations()`.** Nunca dejes texto en duro en el HTML si el usuario lo puede ver: `setLang()` no lo va a poder cambiar y queda congelado en español.

Patrón obligatorio para elementos que pueden no existir:
```js
const el = document.getElementById('mi-id');
if (el) el.innerText = dict.miClave;
```
`applyTranslations()` hace `document.getElementById(...).innerText` sin guarda en los ids viejos — no imites eso, un id faltante revienta la función completa y deja media UI sin traducir.

## 4. Seguridad al pintar en el DOM

Nunca metas texto que venga de la API, de localStorage o de otro usuario con `innerHTML`. Usa `textContent` / `innerText`, o escapa. `renderFavoritesList()` hoy interpola `fav.prayer` con `innerHTML` — es el antipatrón a no replicar y a corregir cuando lo toques.

## 5. `public/` es el `webDir` de Capacitor

`capacitor.config.ts` → `webDir: 'public'`. **Todo archivo en `public/` viaja dentro del APK.** Los ~50 MB de marketing que había **ya se movieron** a `marketing/`, fuera del webDir, y el vídeo
demo se sirve desde YouTube con una fachada que no carga nada hasta que el usuario pulsa.
`public/` está en ~3,2 MB. **No lo vuelvas a engordar.**

Reglas:
- Assets de marketing → fuera de `public/` (carpeta `marketing/` fuera del webDir, o un bucket).
- Imagen nueva en `public/` → optimizada y justificada. Presupuesto: **< 200 KB por imagen de UI**.
- Nada de vídeo en `public/`.

## 6. API: reglas para endpoints

- CORS `*` es intencional: el WebView nativo pega a `https://alivio.pronosoftmx.com` (ver `API_BASE` en `app.js`), no a rutas relativas.
- **Nunca devuelvas `error.stack` ni `details` crudos al cliente.** `api/comfort.ts` lo hace hoy; es una fuga a corregir, no un patrón.
- Todo endpoint que gaste dinero (Claude) o mande pushes **necesita rate limiting y/o secreto**. `cron-push` debe validar `Authorization: Bearer ${process.env.CRON_SECRET}` y responder 401 si no coincide.
- Todo endpoint que llame a un tercero (Evangelizo, Pollinations) **debe cachear en el CDN**: `Cache-Control: public, s-maxage=86400, stale-while-revalidate=86400` para contenido diario. Sin eso pegas al tercero una vez por usuario y te bloquean.
- Valida y acota longitudes de entrada en el servidor. El `maxlength="300"` del textarea es cosmético; el cliente no es frontera de confianza.

## 7. Web vs Android nativo — el error clásico

`activatePush()` ramifica correctamente entre FCM nativo y VAPID web. `cancelPush()` y `checkActiveSubscription()` **no**: llaman `navigator.serviceWorker.ready` / `pushManager` sin condicionar, así que en Android nativo fallan.

Al tocar cualquier flujo de push, notificaciones, compartir o navegador externo, **ramifica siempre**:
```js
if (window.Capacitor && window.Capacitor.isNativePlatform()) { /* plugin nativo */ }
else { /* API web */ }
```

## 8. Service Worker

- Al publicar cambios en `public/`, **sube `CACHE_NAME`** (`alivio-cache-vN`) en `sw.js` o los usuarios se quedan con la versión vieja.
- Añade a `ASSETS_TO_CACHE` cualquier asset nuevo que deba funcionar offline.
- Tailwind y Google Fonts vienen de CDN externo y **no** están cacheados: un arranque en frío sin red se ve sin estilos. Si trabajas offline-first, resuelve eso primero.
- Ya está resuelto no cachear respuestas 206 ni `/api/` — no lo revientes.

## 9. Estado del usuario

Todo en `localStorage`, sin cuentas ni backend de usuario: `alivio_lang`, `alivio_denom`,
`alivio_favorites` (máx 30), `alivio_fav_prayers` (ids del corpus tradicional),
`alivio_streak`, `alivio_streak_date`, `alivio_alert_time`, `alivio_audio`,
`alivio_visited`, `alivio_fcm_token`, `alivio_prayer_font`, `alivio_pwa_dismissed`,
`alivio_evangelio` (lecturas del día por idioma), `ultimo_confort`, `pwa_installed`.

`alivio_evangelio` guarda la respuesta de `/api/readings` **con su fecha**, para que la
tarjeta del hub nazca ya con la imagen del día en vez de esperar a la red. Se coteja
siempre contra la fecha local antes de usarla: un día viejo no se pinta jamás. Lo que sale
de ahí se revalida una vez por sesión, porque el comentario del Papa puede publicarse
después de la primera visita del día.

Prefija **siempre** con `alivio_`. Ojo: la racha usa `toISOString().slice(0,10)` (fecha **UTC**), lo que descuadra a usuarios al oeste de UTC de noche — usa fecha local para lógica de días nueva.

## 10. Checklist de release

1. Strings nuevos en `es` **y** `en`, aplicados en `applyTranslations()`.
2. Pantalla nueva registrada en el array de `changeScreen`.
3. `CACHE_NAME` incrementado en `sw.js`.
4. Sin assets pesados nuevos en `public/`.
5. `database_schema.sql` al día si cambió alguna tabla.
6. `node scripts/check-prayers.cjs` si tocaste el corpus de oraciones.
7. Android: `npx cap sync android` y verificar el flujo nativo (push y donación) en dispositivo, no solo en navegador.

## 11. Trampas ya pisadas (no las repitas)

- **`firebase-admin` v14 es modular.** `admin.apps`, `admin.credential` y `admin.messaging`
  son `undefined` en runtime. Importa por subpaths: `firebase-admin/app`, `firebase-admin/messaging`.
  El namespace roto tenía el push de Android muerto en silencio.
- **`.env.example` no lleva valores reales.** Tenía la `PRIVATE_VAPID_KEY` de producción.
  Nunca se commiteó, pero era una mina esperando un `git add -f`.
- **Los `onclick` viven en `index.html`, no en `app.js`.** Una sustitución sobre el archivo
  equivocado no falla: no hace nada. Verifica siempre que el reemplazo ocurrió.
- **`Capacitor.Plugins` SÍ funciona aquí, aunque no haya bundler.** El puente de Android
  genera e inyecta el JS de los plugins en tiempo de ejecución (`JSExport.java`:
  `var p = (a.Plugins = a.Plugins || {})`), así que `Capacitor.Plugins.Browser` y
  `Capacitor.Plugins.FirebaseMessaging` existen sin importar nada.
  Se anotó aquí lo contrario el 27 ago 2026 y era falso: la donación llevaba meses
  funcionando en el APK. **Antes de declarar rota una ruta nativa, pruébala en el
  teléfono** — leer el código no basta, y un `try/catch` silencioso invita a inventar
  causas que encajan pero no son.
- **`calapi` solo habla `http`.** No tiene certificado válido en `https`. Se llama desde el
  servidor y nunca desde el navegador; meterlo en el front sería contenido mixto.
- **El RSS de Vatican News miente sobre su codificación.** Se declara UTF-8 y mezcla bytes
  latin-1; dentro de los ítems, todo carácter que su pipeline no supo escribir es un `?`.
  Se decodifica en `latin1` (los ítems son ASCII con entidades) y la puntuación se repara
  por contexto en `_sources.ts`. **Las citas se toman siempre de Evangelizo**, porque la
  errata les cae justo en la línea de la referencia.
