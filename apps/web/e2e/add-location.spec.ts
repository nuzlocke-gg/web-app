import { expect, test, type Page } from "@playwright/test"

import { signInNamed, signInNamedPlayer } from "./players"
import { insertRunFor, recordFailedEncountersElsewhere } from "./runs"

/** Adds a location from the dock and records an Encounter there. */
async function addLocation(page: Page, place: string, species: string) {
  await page.getByRole("button", { name: "Add a location" }).click()

  const places = page.getByRole("dialog", { name: "Add a location" })

  await places.getByLabel("Search locations").fill(place)
  await places.getByRole("button", { name: place }).click()

  const record = page.getByRole("dialog", { name: "Record an encounter" })

  await expect(record).toContainText(place)
  await record.getByRole("button", { name: species }).click()
  await record.getByRole("button", { name: "Save encounter" }).click()
  await expect(record).toBeHidden()
}

/** The locations of the Encounters list, in order. */
function listedPlaces(page: Page) {
  return page
    .getByRole("tabpanel", { name: "Encounters" })
    .getByRole("heading", { level: 2 })
}

test("a player adds a location from the dock and it joins the end of the list", async ({
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

  await addLocation(page, "Route 101", "Zigzagoon")

  await expect(listedPlaces(page)).toHaveText(["Starter", "Route 101"])
  await expect(page.getByRole("region", { name: "Route 101" })).toContainText(
    "Just added"
  )
  await expect(page.getByText("2/85 encounters")).toBeVisible()
  await expect(page.getByText("83 remaining")).toBeVisible()

  // The order is computed from the saved Encounters: a reload keeps it.
  await page.reload()
  await expect(listedPlaces(page)).toHaveText(["Starter", "Route 101"])
  await expect(page.getByText("2/85 encounters")).toBeVisible()
})

test("a location added from the Pokémon tab shows in the Encounters list, scrolled into view", async ({
  page,
  context,
}) => {
  const player = await signInNamed(context, "Ash")
  const runId = await insertRunFor(player.id)

  await recordFailedEncountersElsewhere(runId, player.id, [
    "starter",
    "littleroot-town",
    "oldale-town",
    "route-103",
    "route-102",
    "petalburg-city",
    "route-104",
    "petalburg-woods",
    "rustboro-city",
    "route-116",
    "rusturf-tunnel",
    "dewford-town",
    "route-106",
    "granite-cave",
    "route-109",
  ])
  await page.goto(`/runs/${runId}`)

  // The screen opens on the end of the list.
  await expect(page.getByText("15/85 encounters")).toBeInViewport()
  await page.waitForLoadState("networkidle")

  await page.getByRole("tab", { name: "Pokémon" }).click()
  await addLocation(page, "Route 101", "Species unknown")

  await expect(page.getByRole("tab", { name: "Encounters" })).toHaveAttribute(
    "aria-selected",
    "true"
  )

  const route101 = page.getByRole("region", { name: "Route 101" })

  await expect(route101).toContainText("Just added")
  await expect(route101).toBeInViewport()
  await expect(listedPlaces(page).last()).toHaveText("Route 101")
})
