import { expect, test, type Page } from "@playwright/test"

import { signInNamedPlayer } from "./players"

/** The locations of the Encounters list, in order. */
function listedPlaces(page: Page) {
  return page
    .getByRole("tabpanel", { name: "Encounters" })
    .getByRole("heading", { level: 2 })
}

async function makeRun(page: Page) {
  await page.goto("/runs/new")
  await page.getByRole("button", { name: "Make the run" }).click()
  await expect(page).toHaveURL(/\/runs\/[0-9a-f-]{36}$/)
}

function placesDrawer(page: Page) {
  return page.getByRole("dialog", { name: "Add a location" })
}

/** Opens a Custom location's "…" menu in the Add a location Drawer. */
async function customMenu(page: Page, name: string, item: string) {
  await page.getByRole("button", { name: "Add a location" }).click()
  await placesDrawer(page)
    .getByRole("button", { name: `More for ${name}` })
    .click()
  await page.getByRole("menuitem", { name: item }).click()
}

test("a player adds a Custom location, records there, renames it, and cannot remove it while it has Encounters", async ({
  page,
  context,
}) => {
  await signInNamedPlayer(context, "Ash")
  await makeRun(page)

  await page.getByRole("button", { name: "Add a location" }).click()
  await placesDrawer(page)
    .getByLabel("Not listed? Add a custom location")
    .fill("Link trade")
  await placesDrawer(page).getByRole("button", { name: "Add location" }).click()

  const record = page.getByRole("dialog", { name: "Record an encounter" })

  await expect(record).toContainText("Link trade")
  await expect(
    record.getByRole("region", { name: "All species" })
  ).toBeVisible()
  await record.getByLabel("Search species").fill("Abra")
  await record.getByRole("button", { name: /^Abra/ }).click()
  await record.getByRole("button", { name: "Trade" }).click()
  await record.getByLabel("Nickname").fill("Spoon")
  await record.getByRole("button", { name: "Save encounter" }).click()
  await expect(record).toBeHidden()

  // It joins the list at the end and counts on neither side of Progress.
  await expect(listedPlaces(page)).toHaveText(["Starter", "Link trade"])
  await expect(page.getByText("0/85 encounters")).toBeVisible()
  await page.reload()
  await expect(listedPlaces(page)).toHaveText(["Starter", "Link trade"])

  // A second Encounter there breaks the First Encounter Rule.
  await page.getByRole("button", { name: "Add a location" }).click()
  await placesDrawer(page).getByLabel("Search locations").fill("link")
  await placesDrawer(page)
    .getByRole("button", { name: /^Link trade/ })
    .click()
  await record.getByRole("button", { name: /Species unknown/ }).click()
  await record.getByRole("button", { name: "Save encounter" }).click()
  await expect(record).toBeHidden()

  await page.getByRole("button", { name: "1 warning" }).click()
  await expect(page.getByRole("status").getByRole("button")).toHaveText([
    /Link trade already has an encounter: Abra\./,
  ])
  await page.getByRole("button", { name: "1 warning" }).click()

  // Rename works while it has Encounters.
  await customMenu(page, "Link trade", "Rename")
  await page.getByRole("textbox", { name: "Name" }).fill("Trade from Ruby")
  await page.getByRole("button", { name: "Save name" }).click()
  await page.keyboard.press("Escape")
  await expect(listedPlaces(page)).toHaveText(["Starter", "Trade from Ruby"])

  // Remove is refused while it has Encounters.
  await customMenu(page, "Trade from Ruby", "Remove")
  await page.getByRole("button", { name: "Remove location" }).click()
  await expect(
    page.getByText("This location still has encounters.")
  ).toBeVisible()
  await page.keyboard.press("Escape")
  await expect(listedPlaces(page)).toHaveText(["Starter", "Trade from Ruby"])
})

test("a Custom location with no Encounter shows Record an encounter, and goes when removed", async ({
  page,
  context,
}) => {
  await signInNamedPlayer(context, "Ash")
  await makeRun(page)

  // A search with no exact match offers to add it.
  await page.getByRole("button", { name: "Add a location" }).click()
  await placesDrawer(page).getByLabel("Search locations").fill("Bonus disc")
  await placesDrawer(page)
    .getByRole("button", { name: /Add “Bonus disc”/ })
    .click()
  await page.keyboard.press("Escape")

  const bonusDisc = page.getByRole("region", { name: "Bonus disc" })

  await expect(
    bonusDisc.getByRole("button", { name: "Record an encounter" })
  ).toBeVisible()

  await customMenu(page, "Bonus disc", "Remove")
  await page.getByRole("button", { name: "Remove location" }).click()
  await page.keyboard.press("Escape")
  await expect(listedPlaces(page)).toHaveText(["Starter"])
  await page.reload()
  await expect(listedPlaces(page)).toHaveText(["Starter"])
})
