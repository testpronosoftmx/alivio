// api/affinity.ts
// Simple REST endpoint that receives a user's profile data and calculates a doctrinal affinity score.
// Intended for use as a Supabase Edge Function or an Express route.

import { createClient } from "@supabase/supabase-js";
import type { Request, Response } from "express";

const supabaseUrl = process.env.SUPABASE_URL as string;
const supabaseKey = process.env.SUPABASE_ANON_KEY as string;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * POST /affinity/:userId
 * Body example:
 * {
 *   "sacraments": "weekly",
 *   "chastity_commitment": true,
 *   "doctrinal_questions": ["..."],
 *   "answers": ["..."]
 * }
 *
 * Returns a numeric score (0‑100) representing doctrinal affinity.
 */
export async function calculateAffinity(req: Request, res: Response) {
  const { userId } = req.params;
  const { sacraments, chastity_commitment, doctrinal_questions, answers } = req.body;

  // Simple placeholder algorithm: each affirmative answer adds points.
  let score = 0;
  if (sacraments === "daily") score += 30;
  else if (sacraments === "weekly") score += 20;
  else if (sacraments === "monthly") score += 10;

  if (chastity_commitment) score += 30;

  if (Array.isArray(doctrinal_questions) && Array.isArray(answers)) {
    const matched = answers.filter((a: string) => a.toLowerCase() === "yes").length;
    score += Math.min(matched * 5, 20);
  }

  // Clamp score 0‑100
  score = Math.max(0, Math.min(100, score));

  // Upsert the score into dating_profiles
  const { error } = await supabase
    .from("dating_profiles")
    .upsert({ user_id: userId, doctrinal_affinity_score: score }, { onConflict: "user_id" });

  if (error) {
    console.error("Supabase error (affinity upsert):", error);
    return res.status(500).json({ error: "Failed to store affinity score" });
  }

  return res.status(200).json({ userId, affinityScore: score });
}

// Express router convenience
import express from "express";
const router = express.Router();
router.post("/affinity/:userId", express.json(), calculateAffinity);
export default router;
