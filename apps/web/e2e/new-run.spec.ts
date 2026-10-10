import { expect, test, type Page } from "@playwright/test"

import { signInNamedPlayer } from "./players"
import { renameRunElsewhere } from "./runs"

// Headless Chromium keeps every page visible, so the flow switches the
// document's visibility by hand, as a return to the tab would.
async function setVisibility(page: Page, state: "hidden" | "visible") {
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

function runIdOf(page: Page) {
  return new URL(page.url()).pathname.split("/").at(-1)!
}

test("a player makes a solo Emerald run and lands on its Starter location", async ({
  page,
  context,
  browser,
}) => {
  await signInNamedPlayer(context, "Ash")
  await page.goto("/")

  await expect(page.getByRole("heading", { name: "No runs yet" })).toBeVisible()
  await page.getByRole("link", { name: "New run" }).click()

  await expect(page.getByRole("heading", { name: "New run" })).toBeVisible()
  await expect(
    page.getByRole("button", { name: /^Map: Emerald/ })
  ).toBeVisible()
  await expect(page.getByLabel("Name")).toHaveValue("Emerald Hardcore")
  await expect(page.getByText("2 of 4 rules on")).toBeVisible()

  await page.getByRole("button", { name: /^Map: Emerald/ }).click()
  await expect(page.getByRole("dialog", { name: "Choose a map" })).toBeVisible()
  await expect(page.getByRole("radio", { name: /Emerald/ })).toBeChecked()
  await page.getByRole("button", { name: "Use Emerald" }).click()

  await page.getByRole("button", { name: "Make the run" }).click()

  await expect(page).toHaveURL(/\/runs\/[0-9a-f-]{36}$/)
  await expect(
    page.getByRole("heading", { name: "Emerald Hardcore" })
  ).toBeVisible()
  await expect(page.getByText("Emerald · Solo")).toBeVisible()
  await expect(page.getByRole("tab", { name: "Encounters" })).toBeVisible()
  await expect(page.getByRole("tab", { name: "Pokémon" })).toBeVisible()
  await expect(
    page.getByRole("tabpanel").getByRole("heading", { level: 2 })
  ).toHaveText(["Starter"])

  const runId = runIdOf(page)

  await page.getByRole("link", { name: "Back to your runs" }).click()
  await expect(
    page.getByRole("link", { name: "Emerald Hardcore, Emerald" })
  ).toBeVisible()

  const stranger = await browser.newContext()
  const strangerPage = await stranger.newPage()
  await signInNamedPlayer(stranger, "Misty")
  await strangerPage.goto(`/runs/${runId}`)
  await expect(
    strangerPage.getByRole("heading", { name: "This run is private" })
  ).toBeVisible()
  await stranger.close()
})

test("the tracking screen refreshes on a return to the tab, and waits for the connection while offline", async ({
  page,
  context,
}) => {
  await signInNamedPlayer(context, "Ash")
  await page.goto("/runs/new")
  await page.getByRole("button", { name: "Make the run" }).click()
  await expect(page).toHaveURL(/\/runs\/[0-9a-f-]{36}$/)
  await expect(
    page.getByRole("heading", { name: "Emerald Hardcore" })
  ).toBeVisible()
  // The root listens for visibility only once the page has hydrated.
  await page.waitForLoadState("networkidle")
  const runId = runIdOf(page)

  await setVisibility(page, "hidden")
  await renameRunElsewhere(runId, "Renamed on my phone")
  await setVisibility(page, "visible")
  await expect(
    page.getByRole("heading", { name: "Renamed on my phone" })
  ).toBeVisible()

  await setVisibility(page, "hidden")
  await context.setOffline(true)
  await renameRunElsewhere(runId, "Renamed while offline")
  await setVisibility(page, "visible")
  await expect(
    page.getByRole("heading", { name: "Renamed on my phone" })
  ).toBeVisible()

  await context.setOffline(false)
  await expect(
    page.getByRole("heading", { name: "Renamed while offline" })
  ).toBeVisible()
})

for (const width of [390, 820]) {
  test(`New run and the tracking screen do not zoom and targets are 44 px at ${width} px`, async ({
    page,
    context,
  }) => {
    await page.setViewportSize({ width, height: 844 })
    await signInNamedPlayer(context, "Ash")

    await page.goto("/runs/new")
    await expect(page.getByLabel("Name")).toHaveCSS("font-size", "16px")

    const newRunTargets = [
      page.getByRole("link", { name: "Back to your runs" }),
      page.getByRole("button", { name: /^Map: Emerald/ }),
      page.getByLabel("Name"),
      page.getByRole("button", { name: "Make the run" }),
    ]

    for (const target of newRunTargets) {
      const box = (await target.boundingBox())!

      expect(box.height).toBeGreaterThanOrEqual(44)
      expect(box.width).toBeGreaterThanOrEqual(44)
    }

    await page.getByRole("button", { name: "Make the run" }).click()
    await expect(page).toHaveURL(/\/runs\/[0-9a-f-]{36}$/)

    const trackingTargets = [
      page.getByRole("link", { name: "Back to your runs" }),
      page.getByRole("tab", { name: "Encounters" }),
      page.getByRole("tab", { name: "Pokémon" }),
      page.getByRole("button", { name: "Record your starter" }),
    ]

    for (const target of trackingTargets) {
      const box = (await target.boundingBox())!

      expect(box.height).toBeGreaterThanOrEqual(44)
      expect(box.width).toBeGreaterThanOrEqual(44)
    }
  })
}
