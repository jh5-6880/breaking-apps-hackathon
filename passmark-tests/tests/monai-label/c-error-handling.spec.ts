/**
 * MONAI Label — Type C: Error Handling (4 cases)
 * Tests what clinicians see when things go wrong.
 *
 * Reference: IEC 62304 §5.2.5 — software shall handle all known error conditions.
 * FDA AI/ML SaMD guidance 2021 — performance transparency requirement.
 */
import "../setup";
import { test, expect } from "@playwright/test";
import { runSteps } from "passmark";

const MONAI_URL = "http://localhost:8000";

test("Invalid image_id returns human-readable error, not raw Python traceback", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await runSteps({
    page,
    userFlow: "Submit an invalid image ID and check error message quality",
    steps: [
      { description: `Navigate to ${MONAI_URL}/docs` },
      { description: "Find the POST /infer endpoint and click 'Try it out'" },
      { description: "Set the model to 'segmentation'" },
      {
        description: "Set the image_id to a non-existent value",
        data: { value: "does_not_exist_xyz" },
      },
      { description: "Click Execute", waitUntil: "Response body is visible" },
    ],
    assertions: [
      {
        assertion:
          "The response shows an HTTP error status (400, 404, or 422), not 200",
      },
      {
        assertion:
          "The response body contains an error message that is human-readable, such as 'image not found' or 'invalid image ID'",
      },
      {
        assertion:
          "The error message does NOT contain a raw Python traceback with file paths like '/usr/lib/python' or 'Traceback (most recent call last)'",
      },
    ],
    test,
    expect,
  });
});

test("Invalid model name returns descriptive error, not 500 server crash", async ({ page }) => {
  test.setTimeout(60_000);
  await runSteps({
    page,
    userFlow: "Submit an invalid model name and verify graceful error handling",
    steps: [
      { description: `Navigate to ${MONAI_URL}/docs` },
      { description: "Find the POST /infer endpoint and click 'Try it out'" },
      {
        description: "Set the model to a non-existent model name",
        data: { value: "this_model_does_not_exist" },
      },
      { description: "Set image_id to 'spleen_10'" },
      { description: "Click Execute", waitUntil: "Response body is visible" },
    ],
    assertions: [
      {
        assertion:
          "The response shows an error status, not 200",
      },
      {
        assertion:
          "The error message explains that the model was not found or is not available, not a generic 'Internal Server Error'",
      },
    ],
    test,
    expect,
  });
});

test("Inference failure shows actionable error, not an unending spinner", async ({ page }) => {
  test.setTimeout(60_000);
  await runSteps({
    page,
    userFlow: "Simulate inference failure — verify UI does not freeze",
    steps: [
      { description: `Navigate to ${MONAI_URL}/ohif` },
      { description: "Open a CT study in the OHIF viewer" },
      { description: "In the MONAI Label plugin panel, attempt to run inference on an empty image or invalid case" },
    ],
    assertions: [
      {
        assertion:
          "If inference fails, the UI shows an error message or alert within 60 seconds",
      },
      {
        assertion:
          "The UI does not show an infinite loading spinner after 60 seconds with no feedback",
      },
      {
        assertion:
          "There is a way for the user to retry or cancel — a button or link is visible after failure",
      },
    ],
    test,
    expect,
  });
});

test("Accessing server with no models loaded shows guidance, not blank page", async ({ page }) => {
  test.setTimeout(60_000);
  await runSteps({
    page,
    userFlow: "Verify edge case when MONAI Label server has no loaded models",
    steps: [
      { description: `Navigate to ${MONAI_URL}/docs` },
      { description: "Find the GET /info endpoint and click 'Try it out'" },
      { description: "Click Execute", waitUntil: "Response body is visible" },
    ],
    assertions: [
      {
        assertion:
          "The response body contains structured JSON with an 'app' or 'name' field, not an empty object",
      },
      {
        assertion:
          "If no models are listed, the response still includes an explanatory field or an empty array rather than null",
      },
    ],
    test,
    expect,
  });
});
