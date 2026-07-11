import { createClient } from "@supabase/supabase-js";
import { VercelRequest, VercelResponse } from "@vercel/node";
import * as dotenv from "dotenv";

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || "https://tu-proyecto.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// Conectar especificando el esquema personalizado 'alivio'
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  db: {
    schema: "alivio"
  }
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Headers CORS — necesarios para Android nativo (Capacitor) y cualquier origen externo
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Preflight OPTIONS
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST" && req.method !== "DELETE") {
    return res.status(405).json({ error: "Method not allowed. Use POST or DELETE." });
  }


  const { subscription, alertTime, message, timezoneOffset, fcmToken } = req.body;

  // En Android nativo puede venir solo fcmToken sin subscription VAPID
  if (!subscription && !fcmToken) {
    return res.status(400).json({ error: "Faltan parámetros obligatorios: subscription o fcmToken." });
  }

  try {
    // Para DELETE: buscar por endpoint VAPID o por fcmToken
    if (req.method === "DELETE") {
      if (subscription && subscription.endpoint) {
        console.log(`🗑️ Eliminando suscripción VAPID para el endpoint: ${subscription.endpoint}`);
        await supabase
          .from("push_subscriptions")
          .delete()
          .eq("subscription->>endpoint", subscription.endpoint);
      }
      if (fcmToken) {
        console.log(`🗑️ Eliminando suscripción FCM para el token: ${fcmToken.substring(0, 20)}...`);
        await supabase
          .from("push_subscriptions")
          .delete()
          .eq("fcm_token", fcmToken);
      }
      return res.status(200).json({
        success: true,
        message: "Recordatorio cancelado con éxito en la base de datos."
      });
    }

    if (!alertTime || !message) {
      return res.status(400).json({ error: "Faltan parámetros obligatorios para registro (POST): alertTime o message." });
    }

    // Buscar registro existente por endpoint VAPID o por fcmToken
    let existing: any = null;
    if (subscription && subscription.endpoint) {
      const { data } = await supabase
        .from("push_subscriptions")
        .select("id")
        .eq("subscription->>endpoint", subscription.endpoint)
        .maybeSingle();
      existing = data;
    } else if (fcmToken) {
      const { data } = await supabase
        .from("push_subscriptions")
        .select("id")
        .eq("fcm_token", fcmToken)
        .maybeSingle();
      existing = data;
    }

    const payload: any = {
      alert_time: alertTime,
      timezone_offset: timezoneOffset || 0,
      message,
      created_at: new Date().toISOString()
    };
    // Guardar subscription VAPID si existe (web/PWA)
    if (subscription) payload.subscription = subscription;
    // Guardar FCM token si existe (Android nativo)
    if (fcmToken) payload.fcm_token = fcmToken;

    let result;
    if (existing) {
      console.log(`🔄 Actualizando suscripción existente (ID: ${existing.id})...`);
      const { data, error: updateError } = await supabase
        .from("push_subscriptions")
        .update(payload)
        .eq("id", existing.id)
        .select();
      if (updateError) throw updateError;
      result = data;
    } else {
      console.log("🆕 Insertando nueva suscripción...");
      // subscription es requerida por el schema; para FCM puede ser objeto vacío
      if (!payload.subscription) payload.subscription = {};
      const { data, error: insertError } = await supabase
        .from("push_subscriptions")
        .insert(payload)
        .select();
      if (insertError) throw insertError;
      result = data;
    }

    return res.status(200).json({
      success: true,
      message: "Alerta configurada correctamente.",
      data: result
    });

  } catch (error: any) {
    console.error("❌ Error en endpoint subscribe:", error.message || error);
    return res.status(500).json({
      error: "Error al guardar la suscripción en la base de datos.",
      details: error.message || error
    });
  }
}
