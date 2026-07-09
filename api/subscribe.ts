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
  if (req.method !== "POST" && req.method !== "DELETE") {
    return res.status(405).json({ error: "Method not allowed. Use POST or DELETE." });
  }

  const { subscription, alertTime, message, timezoneOffset } = req.body;

  if (!subscription) {
    return res.status(400).json({ error: "Faltan parámetros obligatorios: subscription." });
  }

  try {
    // Validar formato básico de la suscripción
    if (!subscription.endpoint) {
      return res.status(400).json({ error: "El objeto subscription es inválido o no tiene endpoint." });
    }

    if (req.method === "DELETE") {
      console.log(`🗑️ Eliminando suscripción push para el endpoint: ${subscription.endpoint}`);
      const { error: deleteError } = await supabase
        .from("push_subscriptions")
        .delete()
        .eq("subscription->>endpoint", subscription.endpoint);

      if (deleteError) throw deleteError;

      return res.status(200).json({
        success: true,
        message: "Recordatorio cancelado con éxito en la base de datos."
      });
    }

    if (!alertTime || !message) {
      return res.status(400).json({ error: "Faltan parámetros obligatorios para registro (POST): alertTime o message." });
    }

    // Buscar si ya existe una suscripción con el mismo endpoint en la tabla alivio.push_subscriptions
    const { data: existing, error: findError } = await supabase
      .from("push_subscriptions")
      .select("id")
      .eq("subscription->>endpoint", subscription.endpoint)
      .maybeSingle();

    if (findError) throw findError;

    let result;
    if (existing) {
      console.log(`🔄 Actualizando suscripción existente (ID: ${existing.id})...`);
      const { data, error: updateError } = await supabase
        .from("push_subscriptions")
        .update({
          subscription,
          alert_time: alertTime,
          timezone_offset: timezoneOffset || 0,
          message,
          created_at: new Date().toISOString()
        })
        .eq("id", existing.id)
        .select();

      if (updateError) throw updateError;
      result = data;
    } else {
      console.log("🆕 Insertando nueva suscripción...");
      const { data, error: insertError } = await supabase
        .from("push_subscriptions")
        .insert({
          subscription,
          alert_time: alertTime,
          timezone_offset: timezoneOffset || 0,
          message
        })
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
