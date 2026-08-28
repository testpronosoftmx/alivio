---
name: alivio-contenido-liturgico
description: Guardarraíles doctrinales, editoriales y de derechos para todo contenido religioso de Alivio — lecturas del día, oraciones tradicionales, versículos, imágenes generadas por IA y tono por denominación. Cárgala ANTES de escribir prompts a modelos, integrar fuentes litúrgicas o mostrar texto sagrado en pantalla.
---

# Contenido litúrgico y guardarraíles doctrinales — Alivio

Alivio sirve contenido religioso a gente en momentos de dolor. Un versículo inventado, una oración mal citada o una imagen inapropiada no son un bug cosmético: rompen la confianza que es el producto entero.

## 1. Qué puede y qué NO puede generar la IA

**JAMÁS generado por IA (texto fijo, hardcodeado, revisado a mano):**
- Oraciones tradicionales: Padre Nuestro, Ave María, Gloria, Credo (Apostólico y Niceno), Salve, Acto de Contrición, Ángelus, Magníficat, Oración a San Miguel, misterios del Rosario.
- Texto de las lecturas litúrgicas del día (viene de la fuente, se muestra íntegro y sin retocar).
- Citas textuales de la Escritura que se presenten como cita.

Razón: son textos fijos de la tradición. Una alucinación aquí es un error doctrinal, y el usuario **no puede detectarlo**.

**SÍ puede generar la IA (y hoy lo hace en producción):**
- El mensaje de consuelo personalizado ante el desahogo del usuario.
- La oración/meditación personal generada para ese momento.
- Los prompts de imagen y las ilustraciones (Pollinations).
- La selección y contextualización de qué versículos ofrecer — pero el **texto** del versículo debe salir de un conjunto verificado, no del modelo.

## 2. Política de IA vigente (decidida el 25 ago 2026)

`docs/ethical_ai.md` era un borrador heredado de "Ecclesia OS" que prohibía justo lo que la app hace. **Queda reemplazado** por la política real de Alivio: *uso ético y asistido de IA para consuelo espiritual y arte sacro atmosférico*. Cinco principios:

1. **Primacía del texto canónico** — oraciones tradicionales y lecturas litúrgicas van hardcodeadas o vienen de la fuente; la IA nunca las redacta ni las retoca.
2. **Prompts no narrativos** — la imagen nace del consuelo del pasaje, nunca de su escena (ver §4).
3. **Lo generado no se disfraza de tradición** — ver §3.
4. **Asistencia, no sustitución** — la IA acompaña el consuelo personal; no dictamina doctrina ni responde preguntas del Magisterio.
5. **Salvaguarda de crisis humana** — ver §7.

`docs/ethical_ai.md` **ya fue reescrito** (26 ago 2026) y describe esta política. Los dos documentos deben decir lo mismo: si divergen, uno de los dos está mal y hay que arreglarlo, no ignorarlo.

## 3. Lo generado no se disfraza de tradición

Toda oración generada para el momento se presenta como reflexión personal, nunca como oración de la tradición ni como texto con aprobación eclesial. No mezcles en la misma tarjeta, sin distinción visual, un texto tradicional y uno generado.

**Las imágenes NO llevan etiqueta en pantalla** (decisión del propietario, 27 ago 2026; `docs/ethical_ai.md` §3 lo recoge). No la vuelvas a añadir «por si acaso»: se quitó a conciencia. La razón es que este principio protege que no se confunda una voz con otra, y una imagen atmosférica no puede pasar por texto de la tradición — es ornamento del tiempo litúrgico, no contenido. Lo que sí importaría (que pase por fotografía, por icono aprobado o por documento) lo impide el registro visual, no un pie de foto: sin rostros, sin figuras sagradas, sin fotorrealismo de personas y sin texto dentro de la imagen, todo fijado del lado del servidor (§4).

**Esto no se extiende al texto.** Un consuelo o una oración generados siguen presentándose como lo que son.

## 4. Prompts de imagen: guardarraíles

**Regla firme para el Evangelio del Día: una sola imagen al día, la del Evangelio.** Ni las lecturas ni el salmo llevan imagen.

**Se generan por LOTE ANUAL, no por cron diario** (decidido el 26 ago 2026, rev. 3 de la auditoría). Motivo verificado: **ninguna fuente sirve el texto del Evangelio a más de 30 días** (Evangelizo corta duro a 30 días; Vatican News llega a D+1; evangeli.net y Vatican News `.html` se renderizan por JS; USCCB `/es/` responde 403). Por tanto:

- El prompt **se siembra con el día litúrgico, no con el pasaje**: tiempo litúrgico, semana, día, celebración, color y rango, obtenidos de `calapi.inadiutorium.cz` (`/api/v0/en/calendars/default/AAAA/MM/DD`, gratis, sin key, **cualquier fecha** — verificado en 2026-12-25 y 2027-01-05). `romcal` calcula el calendario y los ciclos A/B/C y I/II, pero **no trae lecturas**.
- Esto no es una concesión: si la imagen tiene prohibido representar la escena, el texto del Evangelio nunca fue el insumo correcto. Lo que manda el registro visual es el día — Adviento, penumbra y violeta; Navidad, luz cálida; Cuaresma, desierto y ceniza; Pascua, amanecer y blanco; Ordinario, verde; mártir, rojo.
- **Ventaja de seguridad:** el texto del pasaje ya nunca llega a un modelo de imagen, así que el riesgo de imagen macabra desaparece en origen.
- **El lote es 100 % automático. NO hay revisión humana** (decisión del propietario, 26 ago 2026). Eso mueve la garantía de la salida a la entrada: el prompt tiene que ser *incapaz* de producir algo inapropiado, no meramente improbable. De ahí las dos reglas siguientes, que son obligatorias.
- **Claude NO participa en la generación de prompts del lote.** Los arma un **banco de plantillas escrito a mano** con ranuras combinatorias resueltas por un `seed` derivado de la fecha. Mismo principio que las oraciones tradicionales: lo que debe ser fijo se escribe, no se genera. Cuatro piezas, y sólo una varía:
  1. **Prefijo de estilo, fijo, del lado del servidor y no sobrescribible:** pintura sacra atmosférica, sin personas, sin figuras, sin rostros, sin texto, sin logos.
  2. **Arquetipo de escena** del banco de esa temporada (ventana con luz, sendero al amanecer, interior en silencio, agua en calma, campo abierto) — ~10 escritos a mano por tiempo litúrgico.
  3. **Cualidad de luz y paleta**, ancladas al color litúrgico del día.
  4. **Sufijo negativo, fijo:** nada de figuras humanas, rostros, texto, sangre ni símbolos ajenos.

  El espacio de prompts posibles es **finito y propio**. Ningún modelo puede sacarlo de ahí — eso es lo que hace innecesaria la revisión.
- **Cuatro puertas de validación automáticas** antes de guardar cualquier imagen: (1) HTTP 200 con `content-type` de imagen; (2) peso entre 5 KB y 2 MB; (3) cabecera PNG/JPEG válida y dimensiones exactamente las solicitadas; (4) luminancia media entre 8 % y 92 % con varianza sobre umbral, que descarta negros, blancos y planos — la forma que toman casi todas las generaciones fallidas. Ninguna juzga si la imagen es *bonita*; lo apropiado ya quedó garantizado en el prompt.
- **Tres reintentos con `seed+1`.** Si los tres fallan, **no se escribe fila**: el día cae solo al escalón 2 de la escalera. Un fallo nunca deja pantalla rota.
- **Interruptor por fecha:** `daily_images.blocked`. Marcar una fila la retira al instante y `/api/readings` cae al escalón 2, sin redeploy ni release de Android. Es la válvula que hace tolerable no revisar.
- **Reproducible:** el `seed` sale de la fecha, así que relanzar el lote devuelve exactamente la misma imagen. El lote es una función pura de la fecha.
- El endpoint del lote debe ser **idempotente y reanudable**: salta fechas que ya tienen imagen, procesa en tandas para no exceder el límite de la función. Relanzarlo nunca duplica ni regenera.

**Escalera de respaldo obligatoria — nunca debe faltar imagen:**
1. Fila del día en `daily_images` → imagen en Supabase Storage.
2. Sin fila → **imagen fija por tiempo litúrgico** (Adviento, Navidad, Cuaresma, Pascua, Ordinario, mártir/rojo) servida desde `public/`, para que funcione offline y dentro del APK. Cubre el hueco entre lotes (p. ej. enero antes de generar el año nuevo).
3. Sin nada → `public/fallback-misericordia.webp` (39 KB; el PNG de 891 KB se convirtió y se borró en la fase 3).

**Atmosférica, nunca narrativa.** El prompt se deriva del *consuelo*, no del relato. Ejemplo real: el Evangelio del 26 ago 2026 es "sepulcros blanqueados... llenos de huesos de muertos y de podredumbre" — la imagen correcta es luz entrando por una ventana, no la escena. La Escritura contiene violencia, cuerpos y juicio; ilustrarla literalmente, 365 veces al año sin supervisión, produce imágenes macabras en una app de consuelo.

El `imagePrompt` que devuelve el modelo se inyecta hoy **sin validar** en una URL pública de Pollinations. Antes de usarlo:

- Prefija siempre estilo y restricciones del lado del servidor; no confíes en que el modelo las repita.
- Filtra el prompt resultante contra una lista de bloqueo (desnudez, violencia gráfica, sangre, rostros de personas reales identificables, texto dentro de la imagen, logos, marcas).
- **Nunca representes rostros de Jesús, la Virgen o santos de forma que pueda leerse como una fotografía**; el registro es pintura clásica, vitral, paisaje o abstracción — nunca fotorrealismo de personas sagradas.
- Sin texto ni letras dentro de la imagen (los modelos los escriben mal y en un contexto sagrado se ve pésimo).
- Prompt en inglés (los modelos de imagen rinden mejor); todo lo visible para el usuario, en su idioma.

## 4a. El corpus de oraciones ya existe

`public/prayers.js` — 26 oraciones, texto fijo, offline, cero peticiones en producción.

- **Procedencia declarada por entrada** (`source`): `vaticano` (Apéndice «Oraciones comunes»
  del Compendio del CIC), `rv1909` (Reina-Valera 1909 / KJV, dominio público, descargadas
  verbatim y congeladas), `tradicional`, `original` (texto propio de Alivio).
- **Interruptor `verified`**: en `false` la oración NO se lista, no se busca y no se abre.
  Una oración nueva entra en `false` y solo pasa a `true` tras cotejarla contra fuente
  impresa u oficial. Nunca al revés. `node scripts/check-prayers.cjs` informa del estado.
- **El pie de la pantalla de rezo NO es un aviso legal.** Se muestra la referencia
  espiritual y nada más: «Salmo 23 · Reina-Valera 1909», «Compendio del Catecismo», o
  nada para las oraciones de la tradición. Prohibido el registro jurídico —«dominio
  público», «todos los derechos»— en medio del rezo: rompe la atmósfera. El detalle de
  derechos vive en `public/aviso-legal.html`.
  **La única excepción es `original`**: «Oración propia de Alivio» se muestra siempre,
  porque lo escrito por nosotros no puede pasar por texto de la tradición (principio 3).
- **`PRAYER_ART`** asigna el vitral de cabecera. **Las oraciones de la vertiente
  `spiritual` van SIEMPRE a `palabra`** (luz y amanecer, sin iconografía religiosa):
  una cruz sobre una meditación de autocompasión rompe la promesa del selector (§5).

## 4b. Teasers, extractos y tarjetas de portada

La regla de imagen atmosférica protege la **imagen**. Un teaser de texto tiene exactamente el mismo problema y durante un tiempo no estuvo cubierto por ninguna regla.

**PROHIBIDO: extraer automáticamente una frase del Evangelio del día para usarla como gancho** en el hub, en una tarjeta, en una notificación push o en un compartir. El leccionario saca juicio, violencia y muerte varias veces al mes; *«sepulcros blanqueados… llenos de huesos de muertos y de podredumbre»* bajo un saludo de bienvenida es el caso real que motivó esta regla.

**Lo que sí puede ir en un teaser, por orden de preferencia:**
1. **El comentario del Papa** de Vatican News — siempre pastoral por naturaleza, fuente autorizada, y ya lo estás trayendo. Es la opción por defecto.
2. **Título litúrgico y santo del día** (`litugic_t`, `saint` de Evangelizo).
3. **La cita sola** (`Mt 23, 27-32`). Una referencia no es una imagen mental; el pasaje completo se lee dentro de la pantalla, en su contexto y con su jerarquía.

Si el comentario papal falta ese día, degrada a (2), nunca a un extracto del pasaje.

## 5. Tono por denominación

`currentDenomination` ∈ `catholic` | `evangelical` | `spiritual`, guardado en `alivio_denom`. Gobierna **el desahogo**: el tono del consuelo, el estilo de la plegaria generada y las citas. **No gobierna el devocionario ni el Evangelio del Día**, que son idénticos para las tres (ver la regla al final de esta sección). Mostrar un Ave María a un usuario evangélico, o lenguaje explícitamente cristiano a uno "spiritual", rompe la promesa del selector.

| | catholic | evangelical | spiritual |
|---|---|---|---|
| Escritura | traducción católica, incluye deuterocanónicos | Reina Valera 1960 / NIV | sabiduría universal, no necesariamente bíblica |
| Oración | tradicional, puede invocar a María y santos | conversacional y directa al Padre y a Jesucristo, **sin** intermediarios ni santos | intención de paz o meditación de autocompasión, **sin** lenguaje religioso explícito |
| Imagen | pintura sacra clásica, luz divina, interior de iglesia | paisaje majestuoso, cruz vacía, Biblia abierta | naturaleza minimalista, acuarela, geometría sagrada |

### La regla que decide qué se adapta y qué no

**Adapta lo personal, no adaptes lo compartido.**

El desahogo es de una persona: el tono del consuelo y el estilo de la plegaria **sí** se ajustan a su vertiente. El leccionario es de toda la Iglesia ese día, idéntico para todos por diseño: adaptarlo lo destruye.

**El devocionario tampoco se bifurca** (decisión del propietario, 27 ago 2026). `availablePrayers()` sirve el mismo catálogo a las tres vertientes: oraciones católicas más los textos bíblicos de dominio público (`rv1909`), que le sirven a cualquier cristiano. El Rosario está siempre visible. Lo que queda fuera son las meditaciones sin lenguaje religioso (`source: 'original'` de la vertiente espiritual), porque no son devocionario católico.

Alivio se presenta como app devocional católica —así lo dicen su landing y sus capturas—, y el selector de vertiente **gobierna el desahogo, no el catálogo**: ahí sí cambia el tono del consuelo, el estilo de la plegaria generada y las citas. La tabla de arriba describe eso, el consuelo personal, no el devocionario.

Por eso **el Evangelio del Día NO se bifurca por denominación**. Se presenta con su identidad real (1ª lectura, salmo, Evangelio, tiempo litúrgico, santo) y es **accesible desde los tres modos**, con contenido idéntico. Dos errores a evitar, ambos condescendientes:

- **No lo maquilles** — vestir el misal con otra traducción y quitarle los santos no lo vuelve evangélico; renombrar un salmo como "poema de sabiduría" es camuflaje.
- **No lo escondas** — ocultarlo en los modos no católicos es decidir por el usuario que la Palabra de Dios no es suya.

Lo único que puede variar por vertiente en lo compartido es la **prominencia en el hub de inicio**, nunca el contenido. Dentro de la pantalla, el santo va como contexto secundario: se abre con la Escritura y se corona con el Evangelio.

## 6. Fuentes externas y derechos

- **Evangelizo / dailygospel.org** (`https://feed.evangelizo.org/v2/reader.php`) — lecturas diarias. Gratis, sin API key. `type=xml`, `lang=SP` (español) / `AM` (inglés). Límite duro: **la fecha no puede exceder 30 días desde hoy** (ni archivo histórico ni futuro lejano).
  - Mapeo de campos: `reading_text1` = 1ª lectura · `reading_text2` = **Salmo responsorial** · `reading_text3` = 2ª lectura (**solo domingos y solemnidades**, vacío entre semana) · `reading_gospel` = Evangelio · `litugic_t` (sí, con la errata en su campo) = título litúrgico · `saint` = santo del día.
  - **Atribución visible y enlace a evangelizo.org obligatorios** en toda pantalla que muestre su contenido. No quites su crédito.
- **Vatican News RSS** (`https://www.vaticannews.va/es/evangelio-de-hoy.rss.xml`) — **fuente primaria en español**. Traducción del **leccionario mexicano** (lo que la gente escucha en Misa) y trae un **comentario del Papa** cada día, que resuelve la reflexión diaria sin IA. Ojo: la página `.html` NO sirve (se renderiza por JS); usa el `.rss.xml` y sigue el redirect.
  - Estructura: un único blob CDATA de `<p>`. Parseo heurístico: los domingos marca "Primera lectura"/"Segunda lectura", entre semana no. **Nunca trae el salmo responsorial** (0 de 15 días verificados). Rango: 14 días atrás + mañana. Su feed tiene erratas de codificación propias (`Isa?as`, comillas convertidas en `?`) — normaliza al parsear.
- **calapi** (`http://calapi.inadiutorium.cz/api/v0/en/calendars/default/AAAA/MM/DD`) — calendario litúrgico romano para **cualquier fecha**, sin límite de ventana y sin API key. Devuelve `season`, `season_week`, `celebrations[].title|colour|rank`, `weekday`. **No trae lecturas.** Es la fuente que siembra los prompts de imagen del lote anual (ver §4).
- **Lo que NINGUNA fuente gratuita da:** la cita bíblica del día para fechas lejanas. El ciclo (A/B/C dominical, I/II ferial) sí es calculable, pero pasar del día litúrgico a la pericopa requiere la tabla del leccionario, que no es una fórmula. No intentes construir el lote de imágenes a partir del pasaje: no vas a poder.
- **Arquitectura decidida:** Evangelizo es la columna vertebral (estructura determinista, salmo, inglés, santo, título litúrgico); Vatican News se superpone solo en español para el texto y el comentario papal. Si el parseo de VN falla, **degrada automáticamente a Evangelizo**.
- **PROHIBIDO: Reina-Valera 1960.** Texto propiedad de Sociedades Bíblicas Unidas (derechos renovados 1988) y **marca registrada** licenciable solo por contrato (`licensing@americanbible.org`). Servir salmo y evangelio a diario es redistribución sistemática, no cita. Ninguna fuente gratuita la sirve. No la introduzcas sin una licencia firmada. De dominio público en español: Reina-Valera 1909, Torres Amat, Scío de San Miguel.
- **Los textos bíblicos casi nunca son de dominio público.** Reina-Valera 1960, Biblia de Jerusalén, Nácar-Colunga y El Libro del Pueblo de Dios están **con derechos**. Redistribuirlos íntegros a escala —y sobre todo monetizar la app alrededor de ellos— requiere licencia. De dominio público en español: Reina-Valera 1909, Torres Amat, Scío de San Miguel.
- Antes de cachear texto litúrgico de terceros en tu propia base de datos o de empaquetarlo en el APK, plantéalo como decisión con derechos de por medio, no como decisión de rendimiento.

## 7. Crisis: prioridad sobre todo lo demás

La app ya tiene `#crisis-section`. Cualquier módulo nuevo donde el usuario escriba **debe** poder derivar a esos recursos. Ante señales de ideación suicida, autolesión, violencia o abuso: la respuesta espiritual **no** sustituye a la ayuda profesional; muestra los recursos de crisis de forma prominente y nunca respondas solo con un versículo. Si el módulo es público (peticiones), ese contenido **nunca se publica**: se atiende en privado.

### Recursos de crisis: por país, y solo verificados

`CRISIS_POR_PAIS` en `app.js` sirve el teléfono que corresponde al país del dispositivo,
detectado por zona horaria (y por la región del idioma como respaldo) — **sin pedir
ubicación ni permisos**, que el anonimato es la promesa de la app.

**Ningún número entra ahí sin fuente oficial de gobierno.** Hoy solo hay uno: México
(Línea de la Vida, 800 911 2000, `gob.mx/conasama`). Argentina llegó a estar, con su
línea verificada, y el propietario decidió retirarla el 27 ago 2026; el número queda
anotado en el código por si vuelve. República Dominicana y Guatemala nunca entraron:
los números que circulan en prensa y redes se contradicen y no hay fuente oficial.

Quien no tiene número verificado ve el **directorio internacional**, no un hueco. Un
teléfono equivocado en esta pantalla es peor que no tener teléfono: quien llama y no
obtiene respuesta no vuelve a intentarlo.

Hasta el 27 ago 2026 la app mostraba el `*0311` de la Ciudad de México a todo el mundo,
con dos tercios de los usuarios fuera de México.

## 8. Checklist antes de enviar contenido religioso nuevo

1. ¿Es texto fijo de la tradición? → hardcodeado y revisado a mano, nunca generado.
2. ¿Es un teaser, extracto o tarjeta de portada? → **jamás un extracto automático de la Escritura** (ver §4b).
3. ¿Lo generó IA y es TEXTO? → se presenta como reflexión personal, nunca como tradición. Si es imagen, va sin etiqueta (§3).
4. ¿Viene de un tercero? → atribución visible + revisión de derechos.
5. ¿Es contenido personal (se adapta a la vertiente) o compartido (identidad única, accesible a los tres)?
6. ¿Está en `es` y `en`?
7. ¿Hay ruta a los recursos de crisis si el usuario escribe algo?
