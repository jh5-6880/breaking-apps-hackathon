/**
 * MONAI Label — Type D: Reproducibility (2 cases)
 * Same image + same model run twice should produce consistent results.
 *
 * Non-determinism in GPU inference is a clinical safety concern.
 * Reference: Roy et al., Nature Machine Intelligence 2019.
 */
import "../setup";
import { test, expect } from "@playwright/test";
import { runSteps } from "passmark";

const MONAI_URL = "http://localhost:8000";

test("Same image inferred twice produces consistent classification result", async ({ page }) => {
  test.setTimeout(120_000);
  await runSteps({
    page,
    userFlow: "Run inference on spleen_10 twice and compare result stability",
    steps: [
      { description: `Navigate to ${MONAI_URL}/docs` },
      { description: "Find the POST /infer endpoint and click 'Try it out'" },
      { description: "Set model to 'segmentation' and image_id to 'spleen_10'" },
      { description: "Click Execute and note the response", waitUntil: "First response is visible" },
      { description: "Click Execute again without changing any parameters", waitUntil: "Second response is visible" },
    ],
    assertions: [
      {
        assertion:
          "Both responses show HTTP status 200",
      },
      {
        assertion:
          "The structure of both responses is identical — both contain the same fields",
      },
      {
        assertion:
          "If a score or metric is present in the response, the values in both runs are close to each other (within a small margin)",
      },
    ],
    test,
    expect,
  });
});

test("Repeated inference on same case does not accumulate errors or double labels", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await runSteps({
    page,
    userFlow: "Verify that running inference twice does not create duplicate labels in datastore",
    steps: [
      { description: `Navigate to ${MONAI_URL}/docs` },
      { description: "Find the GET /datastore endpoint and note the initial label count for spleen_10" },
      { description: "Navigate to the POST /infer endpoint" },
      { description: "Run inference on spleen_10 twice" },
      { description: "Navigate back to GET /datastore", waitUntil: "Datastore response is visible" },
    ],
    assertions: [
      {
        assertion:
          "The datastore does not show duplicate label entries for spleen_10 after two inference runs",
      },
      {
        assertion:
          "The total image count in the datastore matches the expected number (41 training images for Task09_Spleen)",
      },
    ],
    test,
    expect,
  });
});
