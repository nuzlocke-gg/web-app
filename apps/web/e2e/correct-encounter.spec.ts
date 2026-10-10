import { expect, test, type Page } from "@playwright/test"

import { signInNamedPlayer } from "./players"

/** Adds a location from the dock and records an Encounter there. */
async function addLocation(page: Page, place: string, species: string) {
  await page.getByRole("button", { name: "Add a location" }).click()

  const places = page.getByRole("dialog", { name: "Add a location" })

  await places.getByLabel("Search locations").fill(place)
  await places.getByRole("button", { name: place }).click()

  const record = page.getByRole("dialog", { name: "Record an encounter" })

  await record.getByRole("button", { name: species }).click()
  await record.getByRole("button", { name: "Save encounter" }).click()
  await expect(record).toBeHidden()
}

test("a player corrects a Failed Encounter's Species, then removes it after a second thought", async ({
  page,
  context,
}) => {
  await signInNamedPlayer(context, "Ash")
  await page.goto("/runs/new")
  await page.getByRole("button", { name: "Make the run" }).click()
  await expect(page).toHaveURL(/\/runs\/[0-9a-f-]{36}$/)

  await page.getByRole("button", { name: "Record your starter" }).click()

  const starter = page.getByRole("dialog", { name: "Record an encounter" })

  await starter.getByRole("button", { name: "Mudkip" }).click()
  await starter.getByRole("button", { name: "Save encounter" }).click()
  await expect(starter).toBeHidden()

  await addLocation(page, "Route 101", "Species unknown")

  const route101 = page.getByRole("region", { name: "Route 101" })
  const correct = page.getByRole("dialog", { name: "Correct the encounter" })

  await route101.getByRole("button", { name: /Species unknown/ }).click()
  await expect(correct).toContainText("Route 101 · slot 1")
  await correct.getByRole("button", { name: "Change", exact: true }).click()
  await correct.getByRole("button", { name: "Zigzagoon" }).click()
  await correct.getByRole("button", { name: "Save changes" }).click()
  await expect(correct).toBeHidden()
  await expect(route101.getByRole("img", { name: "Zigzagoon" })).toBeVisible()
  await expect(route101).toContainText("Failed")

  await addLocation(page, "Route 101", "Wurmple")
  await expect(route101).toContainText("2 slots")

  await route101.getByRole("button", { name: /Zigzagoon/ }).click()
  await correct.getByRole("button", { name: "Trade" }).click()
  await correct.getByRole("button", { name: "Remove encounter" }).click()

  const confirm = page.getByRole("alertdialog")

  await expect(confirm).toContainText("The slot is empty again.")
  await confirm.getByRole("button", { name: "Keep encounter" }).click()
  await expect(confirm).toBeHidden()
  await expect(correct.getByRole("button", { name: "Trade" })).toHaveAttribute(
    "aria-pressed",
    "true"
  )

  await correct.getByRole("button", { name: "Remove encounter" }).click()
  await confirm.getByRole("button", { name: "Remove encounter" }).click()
  await expect(correct).toBeHidden()
  await expect(route101.getByRole("img", { name: "Zigzagoon" })).toHaveCount(0)
  await expect(route101).not.toContainText("2 slots")

  // The page is still usable after both modals closed.
  await page.getByRole("tab", { name: "Pokémon" }).click()
  await expect(page.getByRole("region", { name: "Party" })).toContainText(
    "2 of 6"
  )

  // Both changes committed: a reload reads them back from the server.
  await page.reload()
  await expect(
    page.getByRole("region", { name: "Route 101" }).getByRole("img", {
      name: "Wurmple",
    })
  ).toBeVisible()
  await expect(
    page.getByRole("region", { name: "Route 101" }).getByRole("img", {
      name: "Zigzagoon",
    })
  ).toHaveCount(0)
})
