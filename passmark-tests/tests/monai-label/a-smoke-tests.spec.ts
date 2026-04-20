/**
 * MONAI Label — Type A: Functional Smoke Tests (6 cases)
 * Targets: http://localhost:8000 (MONAI Label REST API)
 *
 * Fix (2026-04-20 v4):
 *   A2 → native waitForSelector on / (root Swagger UI; /docs is ReDoc via CDN)
 *   A3 → assertion updated: 'total' field (DICOMweb mode) not 'count' (local-file mode)
 *   A4 → POST /activelearning/random (strategy is path param, not 'next_sample')
 *   A5 → image ID fetched dynamically via /activelearning/random (storage-mode agnostic)
 *   A6 → real OHIF CT viewer test (Orthanc DICOMweb + spleen_10 DICOM series)
 * Uses Task09_Spleen dataset (MSD, CC-BY-SA 4.0).
 */
import "../setup";
import { test, expect } from "@playwright/test";
import { runSteps } from "passmark";

const MONAI_URL = "http://localhost:8000";

// ── A1: Direct /info endpoint (no Swagger) ────────────────────────────────────
test("Server info page loads and lists available models", async ({ page }) => {
  test.setTimeout(60_000);
  await runSteps({
    page,
    userFlow: "Verify MONAI Label server returns model list via /info endpoint",
    steps: [
      { description: `Navigate to ${MONAI_URL}/info` },
      { description: "Wait for the JSON response to fully load" },
    ],
    assertions: [
      { assertion: "The page shows JSON containing a 'name' field with 'MONAILabel' or similar" },
      { assertion: "The JSON contains a 'models' object with at least one model key such as 'segmentation'" },
      { assertion: "No error message or 'connection refused' text is visible" },
    ],
    test,
    expect,
  });
});

// ── A2: Swagger UI renders in browser (native Playwright — no AI round-trip) ──
// MONAI Label serves Swagger UI at GET / (root), not /docs (which is ReDoc).
// ReDoc loads its JS from CDN; root Swagger UI renders fully in headless Chrome.
// waitForSelector confirms the JS bundle executed and the UI actually rendered.
test("Swagger UI renders in browser and lists API endpoints", async ({ page }) => {
  test.setTimeout(30_000);
  await page.goto(`${MONAI_URL}/`);
  // swagger-ui injects .opblock elements once the OpenAPI spec is parsed
  await page.waitForSelector(".opblock", { timeout: 20_000 });
  // at least one operation block should be visible
  await expect(page.locator(".opblock").first()).toBeVisible();
  // confirm both /infer and /datastore appear in the rendered text
  const bodyText = await page.locator("#swagger-ui").innerText();
  expect(bodyText).toContain("infer");
  expect(bodyText).toContain("datastore");
});

// ── A2b: Swagger UI content is correct (Passmark visual — 1 step only) ───────
// After A2 confirms the DOM rendered (waitForSelector), A2b lets Passmark AI
// do what it's good at: checking whether the visible text is semantically correct.
// 1 step × ~7s + 2 assertions × ~5s = ~17s, well under the 30s timeout.
test("Swagger UI shows correct API title and endpoint categories", async ({ page }) => {
  test.setTimeout(30_000);
  await page.goto(`${MONAI_URL}/`);
  await page.waitForSelector(".opblock", { timeout: 20_000 }); // ensure rendered first

  await runSteps({
    page,
    userFlow: "Verify Swagger UI content is correct after it has rendered",
    steps: [
      { description: "Scroll to the top of the Swagger UI page" },
    ],
    assertions: [
      { assertion: "The API title shows 'MONAILabel' with a version number such as '0.1.0'" },
      { assertion: "At least one endpoint section for 'Infer' or 'infer' is visible in the list" },
    ],
    test,
    expect,
  });
});

// ── A3: Direct /datastore endpoint (no Swagger) ──────────────────────────────
test("Datastore lists available images", async ({ page }) => {
  test.setTimeout(60_000);
  await runSteps({
    page,
    userFlow: "Verify datastore has images available via direct API endpoint",
    steps: [
      { description: `Navigate to ${MONAI_URL}/datastore` },
      { description: "Wait for the JSON response to fully load" },
    ],
    assertions: [
      { assertion: "The page shows JSON and does not show an error or empty response" },
      { assertion: "The JSON contains a 'total' or 'count' field greater than zero, confirming at least one image is available in the datastore" },
    ],
    test,
    expect,
  });
});

// ── A4: POST /activelearning/random (strategy is the path param) ────────────
// Note: /activelearning/{strategy} — 'random', 'first', 'last' are valid.
// /activelearning/next_sample was wrong: 'next_sample' is not a strategy name.
test("Active learning random strategy returns an image ID", async ({ request }) => {
  test.setTimeout(60_000);
  const response = await request.post(`${MONAI_URL}/activelearning/random`);
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body).toHaveProperty("id");
  expect(typeof body.id).toBe("string");
  expect(body.id.length).toBeGreaterThan(0);
});

// ── A5: POST /infer — pure request assertions, no runSteps ──────────────────
// Passmark AI cannot see HTTP response bodies/status — using native assertions.
// Inference on RTX 3090 takes ~60s; timeout set to 150s.
// Image ID is fetched via /activelearning/first (idempotent; 'random' returns
// 500 when called twice in the same session with a single-study datastore).
test("Infer segmentation endpoint returns 200 with multipart response", async ({ request }) => {
  test.setTimeout(180_000);
  // Fetch image ID via 'first' strategy (idempotent, works on repeated calls)
  const alRes = await request.post(`${MONAI_URL}/activelearning/first`);
  expect(alRes.status()).toBe(200);
  const { id: imageId } = await alRes.json();

  const response = await request.post(
    `${MONAI_URL}/infer/segmentation?image=${encodeURIComponent(imageId)}`,
    { timeout: 150_000 }
  );
  expect(response.status()).toBe(200);
  const contentType = response.headers()["content-type"] ?? "";
  expect(contentType).toContain("multipart");
});

// ── A6: OHIF viewer renders CT scan (Basic Viewer mode) ──────────────────────
// MONAI Label 0.8.5 bundles OHIF; with Orthanc DICOMweb configured the viewer
// renders a real CT scan. Flow: Study List → expand row → click 'Basic Viewer'.
// 'Basic Viewer' is the only CT-only-compatible mode; PET/CT and Microscopy
// modes reject a CT-only series and redirect back to the Study List.
test("OHIF viewer opens and renders CT scan for spleen study", async ({ page }) => {
  test.setTimeout(60_000);

  await page.goto(`${MONAI_URL}/ohif/`);

  // Dismiss the usage disclaimer if it appears on first load
  try {
    await page.waitForSelector("text=Confirm and Hide", { timeout: 8_000 });
    await page.click("text=Confirm and Hide");
  } catch (_) {}

  // Wait for study list to populate (QIDO query to Orthanc via /proxy/dicom/qido)
  await page.waitForSelector("text=Spleen, 010", { timeout: 20_000 });

  // Click the study row to expand mode selection buttons
  await page.click("text=Spleen, 010");
  await page.waitForTimeout(1000);

  // Click 'Basic Viewer' — CT-compatible mode in the MONAI Label OHIF bundle
  await page.click("text=Basic Viewer");

  // Wait for the OHIF viewport canvas to initialise and first slice to render
  await page.waitForSelector("canvas", { timeout: 20_000 });
  await page.waitForTimeout(3000);

  await runSteps({
    page,
    userFlow: "Verify OHIF CT viewer has loaded a medical imaging scan",
    steps: [
      { description: "Look at the main viewport area showing the CT scan" },
    ],
    assertions: [
      { assertion: "A CT scan image showing a cross-sectional body slice is visible in the main viewport, not a blank screen or error" },
      { assertion: "Windowing values (W and L numbers) or a slice counter such as 'I: 1 (1/55)' are shown, confirming a DICOM image has loaded" },
    ],
    test,
    expect,
  });
});
