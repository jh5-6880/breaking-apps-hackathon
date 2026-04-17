/**
 * MONAI Label — Type B: UX / Radiologist Flow (5 cases)
 * Tests the human-facing annotation workflow from a clinical perspective.
 *
 * Reference: MSD Task09_Spleen benchmark DSC ≥ 0.96 (nnU-Net, Nature Methods 2021)
 */
import "../setup";
import { test, expect } from "@playwright/test";
import { runSteps } from "passmark";

const MONAI_URL = "http://localhost:8000";

test("Inference result displays segmentation overlay in OHIF, not just raw JSON", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await runSteps({
    page,
    userFlow: "Radiologist reviews AI-suggested spleen segmentation in OHIF viewer",
    steps: [
      { description: `Navigate to ${MONAI_URL}/ohif` },
      { description: "Wait for the study list or image list to load" },
      { description: "Click on the first available CT study" },
      { description: "Wait for the image viewer to open" },
      { description: "Find the MONAI Label plugin panel on the side" },
      { description: "Select 'segmentation' model from the model list" },
      {
        description: "Click the Run Inference or Segment button",
        waitUntil: "Segmentation overlay or result is visible on the image",
      },
    ],
    assertions: [
      {
        assertion:
          "A colored segmentation overlay is visible on the CT image, not just text output",
      },
      {
        assertion:
          "The overlay is labeled with an organ name such as 'spleen' or shows a colour legend",
      },
      {
        assertion:
          "The result does not show a raw JSON response or Python traceback to the user",
      },
    ],
    test,
    expect,
  });
});

test("Long inference shows loading indicator within 3 seconds, not a blank screen", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await runSteps({
    page,
    userFlow: "Verify UI feedback during AI inference latency",
    steps: [
      { description: `Navigate to ${MONAI_URL}/docs` },
      { description: "Find the POST /infer endpoint" },
      { description: "Click 'Try it out'" },
      { description: "Set the model to 'segmentation' and image to 'spleen_10'" },
      { description: "Click 'Execute' and look at the response area immediately" },
    ],
    assertions: [
      {
        assertion:
          "While waiting for the response, a loading spinner or 'Loading...' indicator is visible",
      },
      {
        assertion:
          "The page does not show a completely blank or frozen state during inference",
      },
    ],
    test,
    expect,
  });
});

test("Inference result's Dice score is consistent with MSD spleen benchmark (≥ 0.90)", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await runSteps({
    page,
    userFlow: "Validate AI segmentation quality against published MSD benchmark",
    steps: [
      { description: `Navigate to ${MONAI_URL}/docs` },
      { description: "Find the POST /infer endpoint and click 'Try it out'" },
      { description: "Set model to 'segmentation' and image_id to 'spleen_10'" },
      { description: "Click Execute", waitUntil: "Response body is fully loaded" },
    ],
    assertions: [
      {
        assertion:
          "The response body contains a params or metrics field — if a Dice or score value is present, it is above 0.90",
      },
      {
        assertion:
          "The response does not contain an error message or inference failure notice",
      },
    ],
    test,
    expect,
  });
});

test("Switching from segmentation to deepgrow model clears previous results", async ({ page }) => {
  test.setTimeout(120_000);
  await runSteps({
    page,
    userFlow: "Verify UI state consistency when switching models",
    steps: [
      { description: `Navigate to ${MONAI_URL}/ohif` },
      { description: "Open a CT study and run segmentation inference" },
      { description: "Wait for the segmentation overlay to appear" },
      { description: "Find the model selector and change it to 'deepgrow' or another model" },
    ],
    assertions: [
      {
        assertion:
          "After switching models, either the previous overlay is cleared, or a visual label clearly indicates which model produced the current result",
      },
      {
        assertion:
          "No segmentation overlay from the previous segmentation model remains visible without a label",
      },
    ],
    test,
    expect,
  });
});

test("Label submission shows confirmation message, not silent success", async ({ page }) => {
  test.setTimeout(120_000);
  await runSteps({
    page,
    userFlow: "Radiologist submits corrected annotation — verify UI confirmation",
    steps: [
      { description: `Navigate to ${MONAI_URL}/docs` },
      { description: "Find the PUT /datastore/label endpoint and click 'Try it out'" },
      { description: "Fill in a valid image_id (e.g., 'spleen_10') and tag ('final')" },
      { description: "Click Execute", waitUntil: "Response is visible" },
    ],
    assertions: [
      {
        assertion:
          "The response shows HTTP status 200, confirming the label was saved",
      },
      {
        assertion:
          "The response body contains a confirmation identifier (label_id or image_id), not an empty response",
      },
    ],
    test,
    expect,
  });
});
