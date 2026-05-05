/**
 * Shared Passmark setup — import this at the top of every test file.
 * Configures Google AI Studio (direct provider, free tier) — no OpenRouter needed.
 */
import { configure } from "passmark";

configure({
  ai: {
    gateway: "none",
    models: {
      // gemini-3-flash = gemini-3-flash-preview (free tier: 5 RPM, 20 req/day)
      // Override assertionPrimary (Claude Haiku) and pro models → gemini-3-flash
      stepExecution:      "google/gemini-3-flash",
      userFlowLow:        "google/gemini-3-flash",
      userFlowHigh:       "google/gemini-3-flash",
      assertionPrimary:   "google/gemini-3-flash",
      assertionSecondary: "google/gemini-3-flash",
      assertionArbiter:   "google/gemini-3-flash",
      utility:            "google/gemini-3-flash",
    },
  },
});
