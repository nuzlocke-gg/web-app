import { expect, test } from "@playwright/test"

import { signInNewPlayer, signInTombstone } from "./players"

test("a new player chooses a Display Name and lands on home", async ({
  page,
  context,
}) => {
  await signInNewPlayer(context, "Ash")
  await page.goto("/")

  await expect(
    page.getByRole("heading", { name: "Choose your display name" })
  ).toBeVisible()
  await expect(
    page.getByText(
      "The players in your runs see this name. If you stream, use your stream name. You can change it later in Settings."
    )
  ).toBeVisible()
  await expect(
    page.getByText("1 to 30 characters. It does not need to be unique.")
  ).toBeVisible()

  const name = page.getByLabel("Display name")
  await expect(name).toHaveValue("Ash")

  await name.fill("   ")
  await page.getByRole("button", { name: "Continue" }).click()
  await expect(page.getByText("Enter a name.")).toBeVisible()
  await expect(page).toHaveURL(/\/welcome$/)

  await name.fill("Ash")
  await page.getByRole("button", { name: "Continue" }).click()

  await expect(page.getByRole("heading", { name: "Your runs" })).toBeVisible()
  await expect(page).toHaveURL(/\/$/)

  await page.goto("/welcome")
  await expect(page.getByRole("heading", { name: "Your runs" })).toBeVisible()
})

test("a visitor without a session gets the sign-in page and the rights line", async ({
  page,
}) => {
  await page.goto("/")

  await expect(page).toHaveURL(/\/sign-in$/)
  await expect(
    page.getByRole("button", { name: "Sign in with Google" })
  ).toBeVisible()
  await expect(
    page.getByText(
      "Pokémon and the sprites are © Nintendo, Creatures Inc., and GAME FREAK inc. nuzlocke.gg is a fan project and is not affiliated with them."
    )
  ).toBeVisible()
  await expect(
    page.getByRole("link", { name: "contact@nuzlocke.gg" })
  ).toHaveAttribute("href", "mailto:contact@nuzlocke.gg")
})

test("a tombstoned account with a surviving session ends on the sign-in page", async ({
  page,
  context,
}) => {
  await signInTombstone(context)
  await page.goto("/")

  await expect(page).toHaveURL(/\/sign-in$/)
  await expect(
    page.getByRole("button", { name: "Sign in with Google" })
  ).toBeVisible()
})

for (const width of [390, 820]) {
  test(`inputs do not zoom and targets are 44 px at ${width} px`, async ({
    page,
    context,
  }) => {
    await page.setViewportSize({ width, height: 844 })

    await page.goto("/sign-in")
    const signIn = page.getByRole("button", { name: "Sign in with Google" })
    const contact = page.getByRole("link", { name: "contact@nuzlocke.gg" })
    expect((await signIn.boundingBox())!.height).toBeGreaterThanOrEqual(44)
    expect((await contact.boundingBox())!.height).toBeGreaterThanOrEqual(44)

    await signInNewPlayer(context, "Ash")
    await page.goto("/welcome")
    const name = page.getByLabel("Display name")
    const continueButton = page.getByRole("button", { name: "Continue" })
    await expect(name).toHaveCSS("font-size", "16px")
    expect((await name.boundingBox())!.height).toBeGreaterThanOrEqual(44)
    expect((await continueButton.boundingBox())!.height).toBeGreaterThanOrEqual(
      44
    )
  })
}
