import { createClient } from "@supabase/supabase-js";
import { VercelRequest, VercelResponse } from "@vercel/node";
import * as dotenv from "dotenv";
import webpush from "web-push";
// firebase-admin v14 es modular: el namespace `admin.*` (admin.apps, admin.credential,
// admin.messaging) ya no existe ni en tipos ni en runtime. Importar por subpaths.
import { initializeApp, getApps, getApp, cert, type App } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || "https://tu-proyecto.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// Secreto compartido con el disparador del cron.
// Vercel Cron inyecta "Authorization: Bearer ${CRON_SECRET}" por su cuenta cuando la
// variable existe; cron-job.org lo manda a mano. El endpoint valida igual venga de donde venga.
const CRON_SECRET = process.env.CRON_SECRET || "";

/** Comparación en tiempo constante: no filtra el secreto por diferencia de tiempos. */
export function secretsMatch(received: string, expected: string): boolean {
  if (received.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < received.length; i++) {
    diff |= received.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

/** Fecha local del usuario (YYYY-MM-DD) aplicando su offset en minutos. */
export function localDateKey(instant: Date, offsetMinutes: number): string {
  return new Date(instant.getTime() - offsetMinutes * 60 * 1000).toISOString().slice(0, 10);
}

// Conectar especificando el esquema personalizado 'alivio'
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  db: {
    schema: "alivio"
  }
});

// Configurar llaves VAPID para notificaciones push (web/PWA)
const PUBLIC_VAPID_KEY = process.env.PUBLIC_VAPID_KEY || "";
const PRIVATE_VAPID_KEY = process.env.PRIVATE_VAPID_KEY || "";

if (PUBLIC_VAPID_KEY && PRIVATE_VAPID_KEY) {
  webpush.setVapidDetails(
    "mailto:soporte@alivio.app",
    PUBLIC_VAPID_KEY,
    PRIVATE_VAPID_KEY
  );
} else {
  console.warn("⚠️ Advertencia: No se han configurado las llaves VAPID (PUBLIC_VAPID_KEY / PRIVATE_VAPID_KEY).");
}

// Configurar Firebase Admin SDK para FCM (Android nativo)
// Requiere variable de entorno FIREBASE_SERVICE_ACCOUNT con el JSON del service account
let firebaseApp: App | null = null;
try {
  const serviceAccountStr = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (getApps().length > 0) {
    firebaseApp = getApp();
  } else if (serviceAccountStr) {
    firebaseApp = initializeApp({ credential: cert(JSON.parse(serviceAccountStr)) });
    console.log("✅ Firebase Admin SDK inicializado correctamente.");
  } else {
    console.warn("⚠️ FIREBASE_SERVICE_ACCOUNT no configurado. Las notificaciones FCM (Android) no funcionarán.");
  }
} catch (e: any) {
  console.error("❌ Error al inicializar Firebase Admin:", e.message);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // ── Autenticación ────────────────────────────────────────────────────────
  // Falla cerrado: sin secreto configurado el endpoint no envía nada. Es preferible
  // que los recordatorios no salgan a que cualquiera pueda bombardear a los suscriptores.
  if (!CRON_SECRET) {
    console.error("❌ CRON_SECRET no configurado. Endpoint deshabilitado.");
    return res.status(503).json({ error: "Service unavailable." });
  }
  if (!secretsMatch(req.headers.authorization || "", `Bearer ${CRON_SECRET}`)) {
    console.warn("🚫 Intento no autorizado a cron-push.");
    return res.status(401).json({ error: "Unauthorized." });
  }

  try {
    console.log("⏰ Iniciando envío programado de notificaciones...");

    // 1. Traer todas las suscripciones activas de la tabla alivio.push_subscriptions
    const { data: subscriptions, error: fetchError } = await supabase
      .from("push_subscriptions")
      .select("*");

    if (fetchError) throw fetchError;

    if (!subscriptions || subscriptions.length === 0) {
      return res.status(200).json({ message: "No hay suscripciones registradas." });
    }

    const now = new Date();
    const sentList: number[] = [];
    const deleteList: number[] = [];
    const skippedList: number[] = [];

    // 2. Filtrar cuáles deben recibir notificación en este momento
    for (const sub of subscriptions) {
      // Calcular hora local del usuario aplicando su offset de minutos
      const userLocalTime = new Date(now.getTime() - sub.timezone_offset * 60 * 1000);
      const userLocalHour = userLocalTime.getUTCHours();

      // Extraer hora de la suscripción (ej: "17:00" -> 17)
      const alertHour = parseInt(sub.alert_time.split(":")[0], 10);

      // Si la hora coincide, le enviamos el push
      if (userLocalHour === alertHour) {
        // Deduplicación: una sola notificación por día local del usuario.
        // Vercel puede invocar el mismo cron más de una vez y no reintenta los fallos,
        // así que la idempotencia tiene que estar aquí, no en el disparador.
        const todayKey = localDateKey(now, sub.timezone_offset);
        if (sub.last_sent_at && localDateKey(new Date(sub.last_sent_at), sub.timezone_offset) === todayKey) {
          console.log(`⏭️ ID ${sub.id} ya notificado hoy (${todayKey}). Se omite.`);
          skippedList.push(sub.id);
          continue;
        }

        console.log(`✉️ Enviando push a la suscripción ID: ${sub.id} (Hora Local: ${userLocalHour}:00, Alerta: ${sub.alert_time})`);

        // ── A) FCM (Android nativo) ──────────────────────────────────────────
        if (sub.fcm_token && firebaseApp) {
          try {
            await getMessaging(firebaseApp).send({
              token: sub.fcm_token,
              notification: {
                title: "Alivio",
                body: sub.message || "Es hora de soltar tus cargas y encontrar paz."
              },
              android: {
                notification: {
                  icon: "ic_launcher",
                  color: "#4f46e5",
                  sound: "default",
                  clickAction: "FLUTTER_NOTIFICATION_CLICK"
                }
              }
            });
            console.log(`✅ FCM enviado a la suscripción ID: ${sub.id}`);
            sentList.push(sub.id);
          } catch (fcmError: any) {
            console.error(`❌ Error FCM para ID ${sub.id}:`, fcmError.message);
            // Token inválido o expirado → eliminar
            if (fcmError.code === "messaging/registration-token-not-registered" ||
                fcmError.code === "messaging/invalid-registration-token") {
              deleteList.push(sub.id);
            }
          }

        // ── B) VAPID Web Push (PWA / navegador) ─────────────────────────────
        } else if (sub.subscription && sub.subscription.endpoint) {
          try {
            const payload = JSON.stringify({
              title: "Alivio",
              body: sub.message || "Es hora de flotar y soltar tus cargas."
            });
            await webpush.sendNotification(sub.subscription, payload);
            console.log(`✅ VAPID enviado a la suscripción ID: ${sub.id}`);
            sentList.push(sub.id);
          } catch (pushError: any) {
            console.error(`❌ Error VAPID para ID ${sub.id}:`, pushError.message);
            if (pushError.statusCode === 404 || pushError.statusCode === 410) {
              deleteList.push(sub.id);
            }
          }
        }
      }
    }

    // 3. Marcar como notificadas las que salieron bien, para que una segunda
    //    invocación dentro de la misma hora no las vuelva a alcanzar.
    if (sentList.length > 0) {
      const { error: stampError } = await supabase
        .from("push_subscriptions")
        .update({ last_sent_at: now.toISOString() })
        .in("id", sentList);
      if (stampError) {
        console.error("❌ No se pudo registrar last_sent_at:", stampError.message);
      }
    }

    // 4. Limpiar suscripciones inválidas de la base de datos
    if (deleteList.length > 0) {
      console.log(`🗑️ Eliminando ${deleteList.length} suscripciones inválidas o vencidas...`);
      await supabase
        .from("push_subscriptions")
        .delete()
        .in("id", deleteList);
    }

    return res.status(200).json({
      message: "Proceso de notificaciones completado.",
      suscripciones_enviadas: sentList,
      suscripciones_omitidas: skippedList,
      suscripciones_depuradas: deleteList
    });

  } catch (error: any) {
    // El detalle va al log del servidor, nunca al cliente.
    console.error("❌ Error en cron-push:", error.stack || error.message || error);
    return res.status(500).json({ error: "Ocurrió un error en el envío de notificaciones." });
  }
}
