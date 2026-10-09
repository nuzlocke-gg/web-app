import { expect, test } from "@playwright/test"

import { signInNamedPlayer } from "./players"

test("a player renames themselves in Settings, picks a theme, and signs out", async ({
  page,
  context,
}) => {
  const email = await signInNamedPlayer(context, "Ash")
  await page.goto("/")

  await page.getByRole("link", { name: "Settings" }).click()
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible()
  await expect(page.getByText(email)).toBeVisible()
  await expect(
    page.getByText(
      "Only you see this. It tells you which account you are signed in with."
    )
  ).toBeVisible()
  await expect(
    page.getByText(
      "Pokémon and the sprites are © Nintendo, Creatures Inc., and GAME FREAK inc. nuzlocke.gg is a fan project and is not affiliated with them."
    )
  ).toBeVisible()

  const name = page.getByLabel("Display name")
  const save = page.getByRole("button", { name: "Save" })
  await expect(name).toHaveValue("Ash")

  await name.fill("a".repeat(31))
  await save.click()
  await expect(page.getByText("Use 30 characters or fewer.")).toBeVisible()

  await name.fill("  Misty  ")
  await save.click()
  await expect(page.getByRole("status")).toHaveText("Saved.")
  await page.reload()
  await expect(name).toHaveValue("Misty")

  await page.getByRole("button", { name: "Dark" }).click()
  await expect(page.locator("html")).toHaveClass(/\bdark\b/)
  await page.reload()
  await expect(page.locator("html")).toHaveClass(/\bdark\b/)
  await expect(page.getByRole("button", { name: "Dark" })).toHaveAttribute(
    "aria-pressed",
    "true"
  )

  await page.getByRole("link", { name: "Back to your runs" }).click()
  await expect(page.getByRole("heading", { name: "Your runs" })).toBeVisible()

  await page.getByRole("link", { name: "Settings" }).click()
  await page.getByRole("button", { name: "Sign out" }).click()
  await expect(page).toHaveURL(/\/sign-in$/)

  await page.goto("/settings")
  await expect(page).toHaveURL(/\/sign-in$/)
})

for (const width of [390, 820]) {
  test(`Settings inputs do not zoom and targets are 44 px at ${width} px`, async ({
    page,
    context,
  }) => {
    await page.setViewportSize({ width, height: 844 })
    await signInNamedPlayer(context, "Ash")

    await page.goto("/")
    const gear = page.getByRole("link", { name: "Settings" })
    expect((await gear.boundingBox())!.height).toBeGreaterThanOrEqual(44)

    await page.goto("/settings")
    await expect(page.getByLabel("Display name")).toHaveCSS("font-size", "16px")

    const targets = [
      page.getByRole("link", { name: "Back to your runs" }),
      page.getByLabel("Display name"),
      page.getByRole("button", { name: "Save" }),
      page.getByRole("button", { name: "System" }),
      page.getByRole("button", { name: "Light" }),
      page.getByRole("button", { name: "Dark" }),
      page.getByRole("button", { name: "Sign out" }),
      page.getByRole("link", { name: "contact@nuzlocke.gg" }),
    ]

    for (const target of targets) {
      const box = (await target.boundingBox())!

      expect(box.height).toBeGreaterThanOrEqual(44)
      expect(box.width).toBeGreaterThanOrEqual(44)
    }
  })
}
