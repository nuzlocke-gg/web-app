import { expect, test } from "@playwright/test"

import { signInNamedPlayer } from "./players"

test("a player opens a Pokémon, renames it, evolves it, and reads its history", async ({
  page,
  context,
}) => {
  await signInNamedPlayer(context, "Ash")
  await page.goto("/runs/new")
  await page.getByRole("button", { name: "Make the run" }).click()
  await expect(page).toHaveURL(/\/runs\/[0-9a-f-]{36}$/)
  const runUrl = page.url()

  await page.getByRole("button", { name: "Record your starter" }).click()

  const record = page.getByRole("dialog", { name: "Record an encounter" })

  await record.getByRole("button", { name: "Treecko" }).click()
  await record.getByRole("button", { name: "Save encounter" }).click()
  await expect(record).toBeHidden()

  await page
    .getByRole("region", { name: "Starter" })
    .getByRole("link", { name: /Treecko/ })
    .click()
  await expect(page).toHaveURL(/\/pokemon\/[0-9a-f-]{36}$/)
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Treecko")
  await expect(page.getByText("Party", { exact: true })).toBeVisible()

  await page.getByRole("button", { name: "Rename Treecko" }).click()

  const rename = page.getByRole("dialog", { name: "Rename Treecko" })

  await rename.getByLabel("Nickname").fill("  Leafy ")
  await rename.getByRole("button", { name: "Save nickname" }).click()
  await expect(rename).toBeHidden()
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Leafy")

  await page.getByRole("button", { name: "Evolve Leafy, now Treecko" }).click()

  const evolve = page.getByRole("dialog", { name: "Evolve Leafy" })

  await evolve
    .getByRole("region", { name: "Next in its line" })
    .getByRole("radio", { name: "Grovyle", exact: true })
    .check()
  await evolve.getByRole("button", { name: "Evolve into Grovyle" }).click()
  await expect(evolve).toBeHidden()

  const history = page.getByRole("region", { name: "History" })

  await expect(history.getByRole("listitem")).toHaveText([
    /^Received as Treecko at Starter/,
    /^Evolved into Grovyle/,
  ])
  await expect(page.getByRole("region", { name: "Encounter" })).toContainText(
    "Starter · slot 1"
  )

  // Both changes committed: a reload reads them back from the server.
  await page.reload()
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Leafy")
  await expect(history.getByRole("listitem")).toHaveCount(2)

  await page.getByRole("link", { name: "Back to encounters" }).click()
  await expect(page).toHaveURL(runUrl)
  await page.getByRole("tab", { name: "Pokémon" }).click()

  const party = page.getByRole("region", { name: "Party" })

  await expect(party).toContainText("1 of 6")
  await party.getByRole("link", { name: /Leafy/ }).click()
  await page.getByRole("link", { name: "Back to Pokémon" }).click()
  await expect(page.getByRole("tab", { name: "Pokémon" })).toHaveAttribute(
    "aria-selected",
    "true"
  )
})
