/**
 * Shared Passmark setup — import this at the top of every test file.
 *
 * Uses OpenRouter as gateway so Passmark can route:
 *   assertionPrimary   → anthropic/claude-4.5-haiku  (default)
 *   assertionSecondary → google/gemini-3-flash        (default)
 *   assertionArbiter   → google/gemini-3.1-pro-preview (default)
 *
 * Multi-model consensus only works when assertionPrimary and assertionSecondary
 * are DIFFERENT models. Do NOT override both to the same model.
 *
 * Requires OPENROUTER_API_KEY in .env (free credit from hackathon registration).
 */
import { configure } from "passmark";

configure({
  ai: {
    gateway: "openrouter",
    models: {
      // Override step execution for speed/cost; leave assertion models at defaults.
      stepExecution: "google/gemini-3-flash",
      utility:       "google/gemini-2.5-flash",
    },
  },
});
