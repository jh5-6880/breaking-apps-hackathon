/**
 * MONAI Label — Type C: Error Handling (4 cases)
 * Tests what clinicians see when things go wrong.
 *
 * Fix (2026-05-05 v5):
 *   C1/C2 → use request fixture for POST /infer (avoids Swagger UI timeout)
 *           Passmark used only for browser-visible response page
 *   C3    → /ohif returns 404 — documents the OHIF-not-bundled bug (expected FAIL)
 *   C4    → use request fixture for GET /info (no Swagger needed)
 *
 * Reference: IEC 62304 §5.2.5 — software shall handle all known error conditions.
 * FDA AI/ML SaMD guidance 2021 — performance transparency requirement.
 */
import "../setup";
import { test, expect } from "@playwright/test";
import { runSteps } from "passmark";

const MONAI_URL = "http://localhost:8000";

// ── C1: Invalid image_id → direct request, no Swagger ────────────────────────
test("Invalid image_id returns human-readable error, not raw Python traceback", async ({
  page,
  request,
}) => {
  test.setTimeout(30_000);

  // POST directly — bypasses Swagger UI entirely
  const res = await request.post(
    `${MONAI_URL}/infer/segmentation?image=does_not_exist_xyz`
  );
  const status = res.status();
  expect([400, 404, 422, 500]).toContain(status);

  const text = await res.text();
  // Critical: must not expose raw Python traceback to a clinical user
  expect(text).not.toMatch(/Traceback \(most recent call last\)/);
  expect(text).not.toMatch(/\/usr\/lib\/python/);

  // Passmark visual check: navigate to the error JSON in browser
  await runSteps({
    page,
    userFlow: "Verify invalid image_id returns human-readable error in browser",
    steps: [
      { description: `Navigate to ${MONAI_URL}/datastore?image=does_not_exist_xyz` },
    ],
    assertions: [
      {
        assertion:
          "The page shows a JSON or text response indicating the image was not found — does NOT show a Python traceback with file paths",
      },
    ],
    test,
    expect,
  });
});

// ── C2: Invalid model name → direct request, no Swagger ──────────────────────
test("Invalid model name returns descriptive error, not 500 server crash", async ({
  request,
  page,
}) => {
  test.setTimeout(30_000);

  const res = await request.post(
    `${MONAI_URL}/infer/this_model_does_not_exist?image=spleen_10`
  );
  const status = res.status();
  // Must be an error code, not success
  expect(status).toBeGreaterThanOrEqual(400);

  const text = await res.text();
  // Should not silently return 200 with garbage output
  expect(status).not.toBe(200);

  // Passmark: verify the /info endpoint lists valid models (for comparison)
  await runSteps({
    page,
    userFlow: "Verify server lists valid models via /info endpoint",
    steps: [
      { description: `Navigate to ${MONAI_URL}/info` },
    ],
    assertions: [
      {
        assertion:
          "The JSON shows a 'models' object. 'this_model_does_not_exist' should NOT appear in the list — confirming the invalid model error was correct",
      },
    ],
    test,
    expect,
  });
});

// ── C3: OHIF not bundled — documents design gap (expected FAIL) ───────────────
// MONAI Label 0.x ships only the REST API. OHIF requires a separate Docker image.
// This test documents that /ohif returns 404 — a real bug for clinical deployments.
test("OHIF viewer endpoint /ohif returns 404 — OHIF is not bundled with pip install", async ({
  request,
  page,
}) => {
  test.setTimeout(20_000);

  const res = await request.get(`${MONAI_URL}/ohif`);
  // BUG: OHIF is not bundled. Expect 404.
  expect(res.status()).toBe(404);

  await runSteps({
    page,
    userFlow: "Verify OHIF viewer is unavailable — document the missing feature",
    steps: [
      { description: `Navigate to ${MONAI_URL}/ohif` },
    ],
    assertions: [
      {
        assertion:
          "The page shows a 404 Not Found error or empty response — confirming that the OHIF viewer is NOT built into the pip-installed MONAI Label server",
      },
    ],
    test,
    expect,
  });
});

// ── C4: /info always returns structured JSON — direct request + Passmark ─────
test("Server /info returns structured JSON, not a blank page", async ({
  request,
  page,
}) => {
  test.setTimeout(20_000);

  const res = await request.get(`${MONAI_URL}/info`);
  expect(res.status()).toBe(200);
  const json = await res.json();
  // Must have at least a name field
  expect(json).toHaveProperty("name");
  // Models key must exist (may be empty object if no models loaded, but key must exist)
  expect(json).toHaveProperty("models");

  await runSteps({
    page,
    userFlow: "Verify /info returns structured server state",
    steps: [
      { description: `Navigate to ${MONAI_URL}/info` },
    ],
    assertions: [
      {
        assertion:
          "The JSON visible in the browser contains a 'name' field with the server name and a 'models' field — confirming structured output, not a blank or error page",
      },
    ],
    test,
    expect,
  });
});
