/**
 * MONAI Label — Type D: Reproducibility (2 cases)
 * Same image + same model run twice should produce consistent results.
 *
 * Fix (2026-05-05 v5):
 *   D1/D2 → use request fixture for POST /infer (avoids Swagger UI timeout)
 *           Passmark verifies the /datastore JSON visually for D2
 *
 * Non-determinism in GPU inference is a clinical safety concern.
 * Reference: Roy et al., Nature Machine Intelligence 2019.
 */
import "../setup";
import { test, expect } from "@playwright/test";
import { runSteps } from "passmark";

const MONAI_URL = "http://localhost:8000";

// ── D1: Two inference runs → same response structure ─────────────────────────
test("Same image inferred twice produces consistent classification result", async ({
  request,
}) => {
  test.setTimeout(300_000); // inference can take up to 2 minutes each

  const call = () =>
    request.post(`${MONAI_URL}/infer/segmentation?image=spleen_10`);

  const [res1, res2] = await Promise.all([call(), call()]);

  // Both must succeed
  expect(res1.status()).toBe(200);
  expect(res2.status()).toBe(200);

  const body1 = await res1.json();
  const body2 = await res2.json();

  // Must have same top-level keys
  const keys1 = Object.keys(body1).sort();
  const keys2 = Object.keys(body2).sort();
  expect(keys1).toEqual(keys2);

  // If a score field is present, the two values must be within 5% of each other
  if (body1.params?.dice !== undefined && body2.params?.dice !== undefined) {
    const diff = Math.abs(body1.params.dice - body2.params.dice);
    expect(diff).toBeLessThan(0.05);
  }
});

// ── D2: Two inferences must not create duplicate labels in datastore ──────────
test("Repeated inference on same case does not accumulate errors or double labels", async ({
  request,
  page,
}) => {
  test.setTimeout(300_000);

  // Snapshot datastore BEFORE
  const before = await request.get(`${MONAI_URL}/datastore`);
  expect(before.status()).toBe(200);
  const beforeJson = await before.json();
  const initialTotal = beforeJson.total ?? beforeJson.count ?? 0;

  // Run inference twice sequentially
  for (let i = 0; i < 2; i++) {
    const r = await request.post(`${MONAI_URL}/infer/segmentation?image=spleen_10`);
    expect(r.status()).toBe(200);
  }

  // Snapshot datastore AFTER — total image count must not have changed
  await runSteps({
    page,
    userFlow: "Verify datastore image count is unchanged after two inference runs",
    steps: [
      { description: `Navigate to ${MONAI_URL}/datastore` },
    ],
    assertions: [
      {
        assertion: `The JSON shows a 'total' or 'count' value equal to ${initialTotal} — confirming that inference did not create duplicate image entries`,
      },
      {
        assertion:
          "There are no duplicate entries for spleen_10 visible in the image list",
      },
    ],
    test,
    expect,
  });
});
