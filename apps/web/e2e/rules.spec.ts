import { expect, test, type Page } from "@playwright/test"

import { signInNamedPlayer } from "./players"

/** Adds a location from the dock and records a Caught Species there, named. */
async function catchAt(
  page: Page,
  place: string,
  species: string,
  nickname: string
) {
  await page.getByRole("button", { name: "Add a location" }).click()

  const places = page.getByRole("dialog", { name: "Add a location" })

  await places.getByLabel("Search locations").fill(place)
  // A location with Encounters names their Species after its own name.
  await places.getByRole("button", { name: new RegExp(`^${place}`) }).click()

  const record = page.getByRole("dialog", { name: "Record an encounter" })

  await record.getByLabel("Search species").fill(species)
  await record.getByRole("button", { name: new RegExp(`^${species}`) }).click()
  await record.getByLabel("Nickname").fill(nickname)
  await record.getByRole("button", { name: "Save encounter" }).click()
  await expect(record).toBeHidden()
}

test("a player chooses the Rules, sees the Warnings follow them, and writes House rules", async ({
  page,
  context,
}) => {
  await signInNamedPlayer(context, "Ash")
  await page.goto("/runs/new")

  await page.getByRole("button", { name: /2 of 4 rules on/ }).click()
  await expect(
    page.getByRole("heading", { name: "Set the rules" })
  ).toBeVisible()
  await page.getByRole("switch", { name: "Duplicate Clause" }).click()
  await page.getByRole("button", { name: "Back to new run" }).click()
  await expect(page.getByText("3 of 4 rules on")).toBeVisible()

  await page.getByRole("button", { name: "Make the run" }).click()
  await expect(page).toHaveURL(/\/runs\/[0-9a-f-]{36}$/)
  const runUrl = page.url()

  await page.getByRole("button", { name: "Record your starter" }).click()

  const starter = page.getByRole("dialog", { name: "Record an encounter" })

  await starter.getByRole("button", { name: "Treecko" }).click()
  await starter.getByLabel("Nickname").fill("Leafy")
  await starter.getByRole("button", { name: "Save encounter" }).click()
  await expect(starter).toBeHidden()
  await expect(page.getByRole("button", { name: /warning/ })).toHaveCount(0)

  // A second Treecko line catch: the Drawer warns before the save.
  await page.getByRole("button", { name: "Add a location" }).click()
  await page
    .getByRole("dialog", { name: "Add a location" })
    .getByLabel("Search locations")
    .fill("Route 101")
  await page
    .getByRole("dialog", { name: "Add a location" })
    .getByRole("button", { name: "Route 101", exact: true })
    .click()

  const record = page.getByRole("dialog", { name: "Record an encounter" })

  await record.getByLabel("Search species").fill("Grovyle")
  await expect(record.getByRole("button", { name: /^Grovyle/ })).toContainText(
    "Same line as Leafy"
  )
  await record.getByRole("button", { name: /^Grovyle/ }).click()
  await expect(record.getByRole("status")).toHaveText([
    /It has no nickname yet\./,
    /Grovyle is in the same evolution line as Leafy \(Starter\)\./,
  ])
  await record.getByLabel("Nickname").fill("Grove")
  await expect(record.getByRole("status")).toHaveCount(1)
  await record.getByRole("button", { name: "Save encounter" }).click()
  await expect(record).toBeHidden()

  // A second Encounter at Route 101 breaks the First Encounter Rule.
  await catchAt(page, "Route 101", "Zigzagoon", "Zig")

  const warnings = page.getByRole("button", { name: "2 warnings" })

  await expect(warnings).toBeVisible()
  await expect(
    page.getByRole("img", { name: "Warning: First Encounter Rule" })
  ).toBeVisible()

  await warnings.click()
  await expect(page.getByRole("status")).toHaveText([
    /Route 101 already has an encounter: Grovyle\./,
    /Grovyle is in the same evolution line as Leafy \(Starter\)\./,
  ])

  // From the Pokémon tab, a Warning goes to its row on the Encounters tab.
  await warnings.click()
  await page.getByRole("tab", { name: "Pokémon" }).click()
  await page.getByRole("button", { name: "2 warnings" }).click()
  await page.getByRole("button", { name: "Show Route 101" }).first().click()
  await expect(page.getByRole("tab", { name: "Encounters" })).toHaveAttribute(
    "aria-selected",
    "true"
  )
  await expect(page.getByRole("link", { name: /^Zigzagoon/ })).toBeFocused()

  // Turning a Rule off takes its Warning away at once.
  await page.getByRole("button", { name: "Run menu" }).click()
  await page.getByRole("link", { name: /Set the rules/ }).click()
  await expect(page).toHaveURL(`${runUrl}/rules`)
  await page.getByRole("switch", { name: "First Encounter Rule" }).click()
  await expect(
    page.getByRole("switch", { name: "First Encounter Rule" })
  ).not.toBeChecked()

  await page
    .getByRole("textbox", { name: "House rules" })
    .fill("Level caps:\n  Roxanne 15")
  await page.getByRole("button", { name: "Save" }).click()
  // Saved: the field is unlocked again, with nothing left to save.
  await expect(page.getByRole("textbox", { name: "House rules" })).toBeEnabled()
  await expect(page.getByRole("button", { name: "Save" })).toBeDisabled()

  await page.getByRole("link", { name: "Back to the run" }).click()
  await expect(page.getByRole("button", { name: "1 warning" })).toBeVisible()

  // Both saved: a reload reads them back from the server.
  await page.goto(`${runUrl}/rules`)
  await expect(
    page.getByRole("switch", { name: "First Encounter Rule" })
  ).not.toBeChecked()
  await expect(page.getByRole("textbox", { name: "House rules" })).toHaveValue(
    "Level caps:\n  Roxanne 15"
  )
})
