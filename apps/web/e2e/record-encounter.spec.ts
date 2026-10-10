import { expect, test } from "@playwright/test"

import { signInNamedPlayer } from "./players"

test("a player makes a Run and records the starter", async ({
  page,
  context,
}) => {
  await signInNamedPlayer(context, "Ash")
  await page.goto("/runs/new")
  await page.getByRole("button", { name: "Make the run" }).click()
  await expect(page).toHaveURL(/\/runs\/[0-9a-f-]{36}$/)

  await page.getByRole("button", { name: "Record your starter" }).click()

  const drawer = page.getByRole("dialog", { name: "Record an encounter" })

  await expect(drawer.getByRole("region", { name: "Gift" })).toBeVisible()
  await drawer.getByRole("button", { name: "Mudkip" }).click()

  await expect(drawer.getByRole("button", { name: "Caught" })).toHaveAttribute(
    "aria-pressed",
    "true"
  )
  await expect(drawer.getByRole("button", { name: "Gift" })).toHaveAttribute(
    "aria-pressed",
    "true"
  )
  await drawer.getByLabel("Nickname").fill("Muddy")
  await drawer.getByRole("button", { name: "Party" }).click()
  await drawer.getByRole("button", { name: "Save encounter" }).click()

  await expect(drawer).toBeHidden()

  const starter = page.getByRole("region", { name: "Starter" })

  await expect(starter.getByRole("img", { name: "Mudkip" })).toBeVisible()
  await expect(
    starter.getByRole("button", { name: "Record your starter" })
  ).toHaveCount(0)

  await page.getByRole("tab", { name: "Pokémon" }).click()

  const party = page.getByRole("region", { name: "Party" })

  await expect(party).toContainText("1 of 6")
  await expect(party).toContainText("Muddy")

  // The save committed: a reload reads it back from the server.
  await page.reload()
  await page.getByRole("tab", { name: "Pokémon" }).click()
  await expect(page.getByRole("region", { name: "Party" })).toContainText(
    "Muddy"
  )
})
