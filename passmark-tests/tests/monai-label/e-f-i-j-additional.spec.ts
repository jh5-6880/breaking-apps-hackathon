/**
 * MONAI Label — Type E: Uncertainty Display (2 cases)
 * Type F: Label Persistence + Audit Trail (2 cases)
 * Type I: Clinical Unit Display (1 case)
 * Type J: Session Interrupt (1 case)
 */
import "../setup";
import { test, expect } from "@playwright/test";
import { runSteps } from "passmark";

const MONAI_URL = "http://localhost:8000";

// ── Type E: Uncertainty Display ───────────────────────────────────────────────

test("Inference result communicates model confidence, not just binary segmentation", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await runSteps({
    page,
    userFlow: "Verify uncertainty or confidence is surfaced to the radiologist",
    steps: [
      { description: `Navigate to ${MONAI_URL}/docs` },
      { description: "Run POST /infer with model 'segmentation' and image_id 'spleen_10'" },
      { description: "Click Execute", waitUntil: "Response body is visible" },
    ],
    assertions: [
      {
        assertion:
          "The response body contains a 'params' field or metrics that include confidence, probability, or quality score — not just the label mask",
      },
      {
        assertion:
          "If uncertainty information is absent from the API response, this is documented as a missing clinical safety feature",
      },
    ],
    test,
    expect,
  });
});

test("OHIF viewer shows confidence indicator alongside segmentation, not just the overlay", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await runSteps({
    page,
    userFlow: "Check that OHIF surfaces AI confidence to the clinician",
    steps: [
      { description: `Navigate to ${MONAI_URL}/ohif` },
      { description: "Open a CT study and run AI segmentation" },
      { description: "Wait for the segmentation overlay to appear on the image" },
    ],
    assertions: [
      {
        assertion:
          "A confidence score, probability percentage, or quality indicator is visible somewhere in the interface alongside the segmentation",
      },
      {
        assertion:
          "If no confidence indicator is visible, this is a UI gap — the test documents that the model result is shown without uncertainty context",
      },
    ],
    test,
    expect,
  });
});

// ── Type F: Label Persistence + Audit Trail ───────────────────────────────────

test("Human-corrected label persists after page reload", async ({ page }) => {
  test.setTimeout(120_000);
  await runSteps({
    page,
    userFlow: "Verify annotation persistence after saving a label",
    steps: [
      { description: `Navigate to ${MONAI_URL}/docs` },
      { description: "Use PUT /datastore/label to save a label for spleen_10 with tag 'final'" },
      { description: "Click Execute and confirm 200 response" },
      { description: `Navigate to ${MONAI_URL}/datastore?image=spleen_10`, waitUntil: "Response is visible" },
    ],
    assertions: [
      {
        assertion:
          "The datastore response shows that spleen_10 has a label with tag 'final'",
      },
      {
        assertion:
          "The label entry includes metadata such as a timestamp or client identifier",
      },
    ],
    test,
    expect,
  });
});

test("Datastore label info includes timestamp for clinical audit trail", async ({ page }) => {
  test.setTimeout(60_000);
  await runSteps({
    page,
    userFlow: "Verify audit trail metadata exists on saved labels",
    steps: [
      { description: `Navigate to ${MONAI_URL}/docs` },
      { description: "Find the GET /datastore/label/info endpoint and click 'Try it out'" },
      { description: "Enter a valid label_id or image_id" },
      { description: "Click Execute", waitUntil: "Response body is visible" },
    ],
    assertions: [
      {
        assertion:
          "The response body contains a timestamp or 'created' date field",
      },
      {
        assertion:
          "The response body contains information about who or what system created the label (client_id or tag)",
      },
    ],
    test,
    expect,
  });
});

// ── Type I: Clinical Unit Display ─────────────────────────────────────────────

test("Volume measurements show unit labels (mL or cm³), not just raw numbers", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await runSteps({
    page,
    userFlow: "Verify clinical measurements include proper unit labels",
    steps: [
      { description: `Navigate to ${MONAI_URL}/ohif` },
      { description: "Open a CT study and run segmentation inference" },
      { description: "Wait for segmentation results to appear" },
      { description: "Look for any volume, area, or distance measurement displayed in the UI" },
    ],
    assertions: [
      {
        assertion:
          "Any volume or size measurement displayed shows a unit label such as 'mL', 'cm³', or 'mm' — not just a bare number",
      },
      {
        assertion:
          "Distance measurements, if shown, display 'mm' not pixel counts",
      },
    ],
    test,
    expect,
  });
});

// ── Type J: Session Interrupt ─────────────────────────────────────────────────

test("Navigating away during inference and returning does not lose work silently", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await runSteps({
    page,
    userFlow: "Simulate radiologist navigating away during AI inference",
    steps: [
      { description: `Navigate to ${MONAI_URL}/ohif` },
      { description: "Open a CT study and start inference" },
      { description: `Navigate to ${MONAI_URL} (leave the viewer)` },
      { description: `Navigate back to ${MONAI_URL}/ohif` },
    ],
    assertions: [
      {
        assertion:
          "After returning to OHIF, either the inference result is available, or the user sees a clear message that inference was interrupted",
      },
      {
        assertion:
          "The viewer does not silently resume from a potentially corrupt state — there is some UI indication of what happened",
      },
    ],
    test,
    expect,
  });
});
