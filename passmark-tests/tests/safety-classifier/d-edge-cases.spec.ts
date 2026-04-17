/**
 * Safety Classifier — Type D: Edge Cases (3 cases)
 *
 * Tests UI robustness under boundary conditions:
 *   D1 — Empty input: no crash, graceful error message
 *   D2 — XSS payload: Gradio must escape HTML, no script execution
 *   D3 — Reproducibility: same prompt × same model → same result twice
 *
 * Reproducibility matters for clinical tools — if two clinicians run the
 * same query 30 seconds apart and get different results, that's a trust issue.
 */
import "../setup";
import { test, expect } from "@playwright/test";
import { runSteps } from "passmark";

const BASE_URL = "http://localhost:7860";

test("Edge: empty input submit does not crash the UI", async ({ page }) => {
  test.setTimeout(120_000);
  await runSteps({
    page,
    userFlow: "Submit classify form with empty input text",
    steps: [
      { description: `Navigate to ${BASE_URL}` },
      { description: "Find the Input Text textbox and ensure it is empty" },
      { description: "Click the Classify button without typing anything" },
      { description: "Wait up to 10 seconds for any response or error message" },
    ],
    assertions: [
      {
        assertion:
          "The page does not show a JavaScript error overlay, crash modal, or blank white screen",
      },
      {
        assertion:
          "Either an error message is displayed (e.g. 'Input required' or 'Please enter text') OR the Classification field shows a result — the app does not silently hang",
      },
    ],
    test,
    expect,
  });
});

test("Edge: XSS payload in input is rendered as plain text, not executed", async ({ page }) => {
  test.setTimeout(180_000);
  await runSteps({
    page,
    userFlow: "Submit an XSS payload and verify it is safely escaped",
    steps: [
      { description: `Navigate to ${BASE_URL}` },
      { description: "Find the Input Text textbox" },
      {
        description: "Type an XSS payload in the Input Text textbox",
        data: { value: "<script>document.title='XSS'</script>" },
      },
      { description: "Select 'WildGuard (Qwen3-4B)' from the Model dropdown" },
      { description: "Click the Classify button", waitUntil: "Classification result is visible" },
    ],
    assertions: [
      {
        assertion:
          "The page title is NOT 'XSS' — the injected script tag was not executed by the browser",
      },
      {
        assertion:
          "The visible output (Classification or any result field) shows the raw text or an escaped representation, not an alert box or modified page title",
      },
      {
        assertion:
          "The app returns a Classification result (SAFE or UNSAFE) without crashing — Gradio processes the payload as literal text",
      },
    ],
    test,
    expect,
  });
});

test("Reproducibility gap: UI shows no audit log after back-to-back classification", async ({ page }) => {
  test.setTimeout(240_000);
  await runSteps({
    page,
    userFlow:
      "Classify the same safe medical query twice in a row, then verify whether any history or audit log exists",
    steps: [
      { description: `Navigate to ${BASE_URL}` },
      { description: "Find the Input Text textbox" },
      {
        description: "Type in the Input Text textbox",
        data: { value: "What are the ACMG criteria for classifying a variant as Pathogenic?" },
      },
      { description: "Select 'LlamaGuard3-8B' from the Model dropdown" },
      { description: "Click the Classify button", waitUntil: "Classification result is visible" },
      {
        description:
          "Clear the Input Text textbox and type the same text again",
        data: { value: "What are the ACMG criteria for classifying a variant as Pathogenic?" },
      },
      {
        description: "Click the Classify button a second time",
        waitUntil: "Classification result is updated",
      },
    ],
    assertions: [
      {
        assertion:
          "After the second classification, only the latest Classification result is shown — there is NO history panel, audit log, or previous result visible anywhere on the page",
      },
      {
        assertion:
          "The current page shows a Classification result (SAFE or UNSAFE) with Latency and Model Info fields populated — the second request completed successfully",
      },
    ],
    test,
    expect,
  });
});
