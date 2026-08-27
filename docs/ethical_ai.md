# Política de IA y privacidad — Alivio

> **Reemplaza por completo la versión anterior de este documento.** Aquella era un borrador
> heredado de «Ecclesia OS», otro producto: describía un asistente doctrinal, cifrado E2E de
> diarios de confesión y un modelo B2B con parroquias, nada de lo cual existe en Alivio.
> Además prohibía la generación de imágenes sagradas y de oraciones por IA, que es
> precisamente lo que Alivio hace — y hacía imposible construir encima sin contradecirlo.
>
> Vigente desde el 26 de agosto de 2026. El principio 3 se revisó el 27 de agosto: las
> imágenes dejaron de llevar etiqueta en pantalla; el resto sigue igual.

Alivio es una PWA devocional que acompaña a alguien en un momento de dolor: escribe su
desahogo, respira, y recibe consuelo. No hay cuentas, no hay chatbot doctrinal, no hay
dirección espiritual. La postura es **uso ético y asistido de IA para consuelo espiritual y
arte sacro atmosférico.**

---

## Los cinco principios

### 1. Primacía del texto canónico

Las oraciones tradicionales y las lecturas litúrgicas **van hardcodeadas o vienen de la
fuente. La IA nunca las redacta ni las retoca.**

El Padre Nuestro tiene una forma fija. Si un modelo alucina una palabra, quien reza no puede
detectarlo —está rezando, no revisando— y eso es un error doctrinal, no un fallo cosmético.
Lo mismo vale para el Evangelio del día: se muestra íntegro, tal como lo entrega la fuente.

### 2. Prompts no narrativos

La imagen nace del **consuelo**, nunca de la escena del pasaje. Sin rostros de Jesús, de la
Virgen ni de santos; sin fotorrealismo de figuras sagradas; sin texto dentro de la imagen.

La Escritura contiene violencia, cuerpos, juicio y muerte. Ilustrar literalmente la escena
del día, cientos de veces al año, produce imágenes macabras en una app de consuelo. El
registro visual es atmosférico: luz, paisaje, un interior en silencio.

Esto se hace cumplir en el código, no por convención:

- El estilo y las restricciones se **prefijan del lado del servidor**. No se confía en que
  el modelo las repita.
- El prompt que devuelve el modelo pasa por una **lista de bloqueo** antes de construir la
  URL de generación. Si no pasa, se cae a un prompt fijo nuestro.
- Las imágenes del Evangelio del Día se generan **por lote y sin intervención humana**, con
  el prompt sembrado en el **día litúrgico** (tiempo, color, celebración), nunca en el texto
  del pasaje. Así el material sensible jamás llega a un modelo de imagen.
- Toda imagen validada automáticamente antes de publicarse; si falla, hay imagen de respaldo.

### 3. Lo generado no se disfraza de tradición

Lo generado **nunca se presenta como texto de la tradición ni con aprobación eclesial**. Una
oración creada para ese momento se presenta como reflexión personal. En una misma tarjeta no
se mezclan, sin distinción visual, un texto tradicional y uno generado.

**Las imágenes no llevan etiqueta en pantalla** (decisión del propietario, 27 de agosto de
2026). La versión anterior de este principio la exigía; se retiró porque en la práctica no
protegía nada. Lo que este principio protege es que nadie confunda una voz con otra, y una
imagen atmosférica no puede confundirse con un texto de la tradición: es ornamento del tiempo
litúrgico, no contenido. La confusión que sí importaría —tomar una imagen por una fotografía,
por un icono aprobado o por un documento— la impide el registro visual, no un pie de foto: el
prompt tiene prohibidos los rostros, las figuras sagradas, el fotorrealismo de personas y el
texto dentro de la imagen, y esas prohibiciones van fijas del lado del servidor (§2).

Esto vale para la imagen atmosférica del Evangelio del Día y para la del desahogo. **No se
extiende al texto:** una oración o un consuelo generados siguen presentándose como lo que
son, y ahí la distinción se mantiene íntegra.

**Los teasers y tarjetas de portada no llevan extractos automáticos de la Escritura.** El
gancho sale del comentario papal o del título litúrgico del día. Un extracto automático saca
juicio y muerte varias veces al mes en la pantalla de bienvenida.

### 4. Asistencia, no sustitución

La IA acompaña el consuelo **personal** — el desahogo, la reflexión del día. **No dictamina
doctrina ni responde preguntas del Magisterio.** Alivio no tiene ni tendrá un asistente
doctrinal: para eso está el párroco, el pastor o el director espiritual de cada quien.

Las tres vertientes (`catholic`, `evangelical`, `spiritual`) modulan el **tono** del consuelo
personal, porque el dolor es de una persona. Lo compartido —el leccionario del día— no se
adapta: es de toda la Iglesia ese día, idéntico para todos por diseño. La regla que lo
gobierna: **adapta lo personal, no adaptes lo compartido.**

### 5. Salvaguarda de crisis humana

Ante señales de ideación suicida, autolesión, violencia o abuso, **la respuesta espiritual no
sustituye a la ayuda profesional.** Los recursos de crisis se muestran de forma prominente y
nunca se responde solo con un versículo.

Cualquier módulo nuevo donde el usuario escriba debe poder derivar a esos recursos. Esta
prioridad está por encima de todas las demás de este documento.

---

## Privacidad de datos

Descripción de lo que el sistema hace hoy, no de lo que nos gustaría que hiciera.

### Lo que se queda en el dispositivo

Todo el estado del usuario vive en `localStorage`, sin cuentas ni backend de usuario: idioma,
denominación, favoritos, racha, hora de recordatorio, preferencia de audio. **Alivio no tiene
registro, login ni perfil.** Nadie puede correlacionar el uso de la app con una persona.

### Lo que sale del dispositivo

| Dato | A dónde va | Se guarda |
|---|---|---|
| Texto del desahogo | API de Anthropic, para generar el consuelo | **No.** No se persiste en ninguna base de datos nuestra. |
| Prompt de imagen | Servicio de generación de imágenes | No |
| Suscripción a recordatorio | Supabase (esquema `alivio`) | Sí: endpoint push o token FCM, hora, zona horaria y el mensaje del recordatorio |

La tabla de suscripciones es accesible **únicamente por el rol de servicio** de la API. Los
roles anónimo y autenticado no tienen ningún permiso sobre ella.

### Terceros

El dato religioso combinado con el emocional es **categoría especial** bajo el RGPD.
Prohibición absoluta de vender, ceder o compartir perfiles de usuario con data brokers o
anunciantes. No hay analítica de terceros sobre el contenido de los desahogos.

### Contenido litúrgico de terceros

Las lecturas provienen de fuentes externas y se muestran **con atribución visible y enlace a
la fuente**, que es lo mínimo que esperan y lo que corresponde. Casi ninguna traducción
bíblica moderna es de dominio público: monetizar la app alrededor de ese contenido, o
empaquetarlo offline dentro del APK, requiere licencia previa. No se introduce ninguna
traducción con derechos sin contrato firmado.

---

## Qué NO es este documento

No es una declaración de intenciones. Cada principio de arriba corresponde a una regla
verificable en el código, recogida en el skill `alivio-contenido-liturgico`. Si el código y
este documento se contradicen, **uno de los dos está mal y hay que arreglarlo** — que es
exactamente lo que pasó con la versión anterior y por lo que se reescribió.
