/**
 * Shared Passmark setup — import this at the top of every test file.
 * Configures OpenRouter gateway once per process.
 */
import { configure } from "passmark";

configure({
  ai: {
    gateway: "openrouter",
    // Uses OPENROUTER_API_KEY from .env automatically
  },
});
