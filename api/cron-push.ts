import { createClient } from "@supabase/supabase-js";
import { VercelRequest, VercelResponse } from "@vercel/node";
import * as dotenv from "dotenv";
import webpush from "web-push";

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || "https://tu-proyecto.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// Conectar especificando el esquema personalizado 'alivio'
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  db: {
    schema: "alivio"
  }
});

// Configurar llaves VAPID para notificaciones push
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Opcional: Proteger el endpoint con un token de autorización si se desea
  // const authHeader = req.headers.authorization;
  // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) { ... }

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
    const sentList = [];
    const deleteList = [];

    // 2. Filtrar cuáles deben recibir notificación en este momento
    for (const sub of subscriptions) {
      // Calcular hora local del usuario aplicando su offset de minutos
      const userLocalTime = new Date(now.getTime() - sub.timezone_offset * 60 * 1000);
      const userLocalHour = userLocalTime.getUTCHours();

      // Extraer hora de la suscripción (ej: "17:00" -> 17)
      const alertHour = parseInt(sub.alert_time.split(":")[0], 10);

      // Si la hora coincide, le enviamos el push
      if (userLocalHour === alertHour) {
        console.log(`✉️ Enviando push a la suscripción ID: ${sub.id} (Hora Local Usuario: ${userLocalHour}:00, Alerta: ${sub.alert_time})`);

        try {
          const payload = JSON.stringify({
            title: "Alivio",
            body: sub.message || "Es hora de flotar y soltar tus cargas."
          });

          await webpush.sendNotification(sub.subscription, payload);
          sentList.push(sub.id);
        } catch (pushError: any) {
          console.error(`❌ Error al enviar push a la suscripción ID ${sub.id}:`, pushError.message || pushError);
          // Si el endpoint ya no existe (404) o la suscripción expiró (410), la agregamos para borrarla
          if (pushError.statusCode === 404 || pushError.statusCode === 410) {
            deleteList.push(sub.id);
          }
        }
      }
    }

    // 3. Limpiar suscripciones inválidas de la base de datos
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
      suscripciones_depuradas: deleteList
    });

  } catch (error: any) {
    console.error("❌ Error en cron-push:", error.message || error);
    return res.status(500).json({
      error: "Ocurrió un error en el envío de notificaciones.",
      details: error.message || error
    });
  }
}
