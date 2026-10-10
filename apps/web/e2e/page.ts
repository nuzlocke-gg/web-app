import type { Page } from "@playwright/test"

/**
 * Hides or shows the page, as a switch away from the tab and back would.
 * Headless Chromium keeps every page visible, so the document's visibility is
 * set by hand.
 */
export async function setVisibility(page: Page, state: "hidden" | "visible") {
  await page.evaluate((visibility) => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => visibility,
    })
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => visibility === "hidden",
    })
    document.dispatchEvent(new Event("visibilitychange"))
  }, state)
}
