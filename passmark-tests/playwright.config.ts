import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, ".env") });

export default defineConfig({
  testDir: "./tests",
  testIgnore: ["**/monai-label/**"],  // Route A: safety-classifier only
  timeout: 360_000,          // AI classification: ~5-8s/step × 5-8 steps + OpenRouter latency + Ollama SSH tunnel
  expect: { timeout: 30_000 },
  fullyParallel: false,      // keep serial — tests share local Gradio server state
  retries: 0,
  reporter: [["html"], ["list"]],
  use: {
    headless: true,
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
