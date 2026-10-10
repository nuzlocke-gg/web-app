import { expect, test } from "@playwright/test"

import { signInNamed, signInNamedPlayer } from "./players"
import {
  insertRunFor,
  recordCatchesElsewhere,
  type CatchElsewhere,
} from "./runs"

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
  await expect(
    page
      .getByRole("region", { name: "Where" })
      .getByRole("button", { name: "Party" })
  ).toHaveAttribute("aria-pressed", "true")

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

const fullPartyAndShade: CatchElsewhere[] = [
  ["route-101", "poochyena", "Fang"],
  ["route-102", "zigzagoon", "Zig"],
  ["route-103", "wingull", "Gull"],
  ["route-104", "taillow", "Swoop"],
  ["petalburg-city", "marill", "Bubbles"],
  ["littleroot-town", "ralts", "Mimi"],
].map(([placeId, species, nickname]) => ({
  placeId: placeId!,
  species: species!,
  nickname: nickname!,
  inParty: true,
}))

test("a player moves a Pokémon into a full Party with a swap, then to the Box", async ({
  page,
  context,
}) => {
  const player = await signInNamed(context, "Ash")
  const runId = await insertRunFor(player.id)

  await recordCatchesElsewhere(runId, player.id, [
    ...fullPartyAndShade,
    {
      placeId: "route-116",
      species: "poochyena",
      nickname: "Shade",
      inParty: false,
    },
  ])
  await page.goto(`/runs/${runId}`)
  await page.getByRole("tab", { name: "Pokémon" }).click()
  await page
    .getByRole("region", { name: "Box" })
    .getByRole("link", { name: /Shade/ })
    .click()

  const where = page.getByRole("region", { name: "Where" })

  await expect(where).toContainText("Your party, 6 of 6")
  await where.getByRole("button", { name: "Party" }).click()

  const swap = page.getByRole("dialog", { name: "Your party is full" })

  await swap.getByRole("radio", { name: /Fang/ }).check()
  await swap.getByRole("button", { name: "Send Fang to the box" }).click()
  await expect(swap).toBeHidden()
  await expect(
    page
      .getByRole("region", { name: "Where" })
      .getByRole("button", { name: "Party" })
  ).toHaveAttribute("aria-pressed", "true")

  // The swap committed: a reload reads it back from the server.
  await page.reload()
  await expect(where).toContainText("Your party, 6 of 6")
  await expect(where.getByRole("button", { name: "Party" })).toHaveAttribute(
    "aria-pressed",
    "true"
  )

  await where.getByRole("button", { name: "Box" }).click()
  await expect(where).toContainText("Your party, 5 of 6")

  // The reload opened the Run on its Encounters tab.
  await page.getByRole("link", { name: "Back to encounters" }).click()
  await page.getByRole("tab", { name: "Pokémon" }).click()
  await expect(page.getByRole("region", { name: "Box" })).toContainText("Fang")
  await expect(page.getByRole("region", { name: "Box" })).toContainText("Shade")
})

test("a player records, edits, and undoes a death, then removes the Pokémon", async ({
  page,
  context,
}) => {
  const player = await signInNamed(context, "Ash")
  const runId = await insertRunFor(player.id)

  await recordCatchesElsewhere(runId, player.id, [
    {
      placeId: "petalburg-woods",
      species: "shroomish",
      nickname: "Spore",
      inParty: true,
    },
  ])
  await page.goto(`/runs/${runId}`)
  await page
    .getByRole("region", { name: "Petalburg Woods" })
    .getByRole("link", { name: /Shroomish/ })
    .click()

  await page.getByRole("button", { name: "Record death" }).click()

  const death = page.getByRole("dialog", { name: "Record a death" })

  await death.getByLabel("Level (optional)").fill("24")
  await death.getByRole("button", { name: "Record death" }).click()
  await expect(death).toBeHidden()

  const graveyard = page.getByRole("region", { name: "Graveyard" })

  await expect(graveyard).toContainText("Died at level 24")
  await expect(graveyard).toContainText("No cause recorded")
  await expect(page.getByText("Dead", { exact: true })).toBeVisible()

  await page.getByRole("button", { name: "Edit the death of Spore" }).click()

  const edit = page.getByRole("dialog", { name: "Edit the death of Spore" })

  await expect(edit.getByLabel("Level (optional)")).toHaveValue("24")
  await edit.getByLabel("Cause (optional)").fill("Roxanne's Nosepass")
  await edit.getByRole("button", { name: "Save death" }).click()
  await expect(edit).toBeHidden()

  const history = page.getByRole("region", { name: "History" })

  await expect(history.getByRole("listitem")).toHaveText([
    /^Met at Petalburg Woods/,
    /^Died at level 24 to Roxanne's Nosepass/,
  ])

  // The death committed: a reload reads it back, and the fate line has it.
  await page.reload()
  await expect(graveyard).toContainText("Cause: Roxanne's Nosepass")
  await page.getByRole("link", { name: "Back to encounters" }).click()
  await expect(
    page.getByRole("region", { name: "Petalburg Woods" })
  ).toContainText("Spore · died at Lv 24")
  await page
    .getByRole("region", { name: "Petalburg Woods" })
    .getByRole("link", { name: /Shroomish/ })
    .click()

  await page.getByRole("button", { name: "Undo death" }).click()

  const undo = page.getByRole("alertdialog", {
    name: "Undo the death of Spore?",
  })

  await undo.getByRole("button", { name: "Undo death" }).click()
  await expect(undo).toBeHidden()
  await expect(graveyard).toBeHidden()
  await expect(
    page
      .getByRole("region", { name: "Where" })
      .getByRole("button", { name: "Party" })
  ).toHaveAttribute("aria-pressed", "true")

  await page.getByRole("button", { name: "Remove Pokémon" }).click()

  const confirm = page.getByRole("alertdialog", { name: "Remove Spore?" })

  await expect(confirm).toContainText(
    "Its encounter at Petalburg Woods and its history stay."
  )
  await confirm.getByRole("button", { name: "Remove Spore" }).click()
  await expect(confirm).toBeHidden()
  await expect(page.getByText("Removed", { exact: true })).toBeVisible()
  await expect(page.getByRole("button", { name: "Record death" })).toBeHidden()

  await page.reload()
  await expect(page.getByText("Removed", { exact: true })).toBeVisible()
  await expect(history.getByRole("listitem")).toHaveCount(1)
  await page.getByRole("link", { name: "Back to encounters" }).click()
  await page.getByRole("tab", { name: "Pokémon" }).click()
  await expect(page.getByRole("region", { name: "Party" })).toContainText(
    "0 of 6"
  )
  await expect(page.getByRole("link", { name: /Spore/ })).toHaveCount(0)
})
