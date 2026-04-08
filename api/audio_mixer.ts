// api/audio_mixer.ts
// REST API (Node/Express style) for managing audio mixer preferences per user.
// This file is intended to be used with a serverless function platform (e.g., Supabase Edge Functions) or a simple Express server.

import { createClient } from "@supabase/supabase-js";
import type { Request, Response } from "express";

// Initialize Supabase client – replace with your actual URL and anon key (environment variables recommended)
const supabaseUrl = process.env.SUPABASE_URL as string;
const supabaseKey = process.env.SUPABASE_ANON_KEY as string;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * GET /mixer/:userId
 * Returns the saved mixer configuration for the given user.
 */
export async function getMixer(req: Request, res: Response) {
  const { userId } = req.params;
  const { data, error } = await supabase
    .from("audio_mixer_preferences")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error) {
    console.error("Supabase error (GET mixer):", error);
    return res.status(404).json({ error: "Preferences not found" });
  }
  return res.status(200).json(data);
}

/**
 * POST /mixer/:userId
 * Body: { playback_speed, voice_volume, background_volume, background_type }
 * Updates (or creates) the mixer preferences for the user.
 */
export async function setMixer(req: Request, res: Response) {
  const { userId } = req.params;
  const payload = req.body;

  // Upsert – will insert if not exists, otherwise update.
  const { data, error } = await supabase
    .from("audio_mixer_preferences")
    .upsert({ user_id: userId, ...payload }, { onConflict: "user_id" })
    .single();

  if (error) {
    console.error("Supabase error (POST mixer):", error);
    return res.status(500).json({ error: "Failed to save preferences" });
  }
  return res.status(200).json(data);
}

// Export a simple router for convenience (if using Express)
import express from "express";
const router = express.Router();
router.get("/mixer/:userId", getMixer);
router.post("/mixer/:userId", express.json(), setMixer);
export default router;
