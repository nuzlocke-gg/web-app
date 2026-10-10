import { expect, test, type Page } from "@playwright/test"
import { v7 as uuidv7 } from "uuid"

import {
  commitAndLoseResponse,
  failBeforeServer,
  hold,
  intercept,
  isRscFetch,
  isServerAction,
  mutationIdOf,
  sendToUnknownAction,
} from "./network"
import { setVisibility } from "./page"
import { signInNamed, startSession } from "./players"
import {
  deleteReceipt,
  insertRunFor,
  setRunStateElsewhere,
  startersOf,
} from "./runs"

// Recovery around the Run root, with the network intercepted: what the
// player sees when a change does not save, and that the persisted queue
// delivers each change once. Delivery itself is headcanon's and is tested
// there.

async function openRun(page: Page, runId: string) {
  await page.goto(`/runs/${runId}`)
  await expect(
    page.getByRole("button", { name: "Record your starter" })
  ).toBeVisible()
  // The root restores, delivers, and listens only once the page hydrated.
  await page.waitForLoadState("networkidle")
}

/** Records a Caught Mudkip at the Starter location through the Drawer. */
async function recordMudkip(page: Page) {
  await page.getByRole("button", { name: "Record your starter" }).click()

  const drawer = page.getByRole("dialog", { name: "Record an encounter" })

  await drawer.getByRole("button", { name: "Mudkip" }).click()
  await drawer.getByRole("button", { name: "Save encounter" }).click()
  await expect(drawer).toBeHidden()
}

function starterSprite(page: Page) {
  return page
    .getByRole("region", { name: "Starter" })
    .getByRole("img", { name: "Mudkip" })
}

const notSavedYet = "Not saved yet. Your changes are kept here."

/**
 * A stored Record an Encounter at the Starter location, as a Run root keeps
 * it in `sessionStorage`. `scope` null is the shape headcanon 0.3.0 stored.
 */
function storedEncounter(options: {
  runId: string
  scope: string | null
  slot: number
  species: string
}) {
  const { runId, scope, slot, species } = options

  return {
    protocol: "run.v1",
    ...(scope === null ? {} : { scope }),
    mutationId: crypto.randomUUID(),
    createdAt: Date.now(),
    invocation: {
      name: "run.record-encounter.v1",
      args: {
        runId,
        encounterId: uuidv7(),
        placeId: "starter",
        slot,
        origin: "gift",
        enteredAt: Date.now(),
        outcome: {
          kind: "caught",
          met: { species, form: "base" },
          pokemonId: uuidv7(),
          goesTo: "party",
        },
      },
    },
  }
}

/** Puts a queue in the tab's `sessionStorage`, as an earlier page left it. */
async function storeQueue(
  page: Page,
  key: string,
  envelopes: readonly object[]
) {
  await page.evaluate(
    ([storageKey, queue]) =>
      sessionStorage.setItem(storageKey, JSON.stringify(queue)),
    [key, envelopes] as const
  )
}

async function storedQueueKeys(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    Object.keys(sessionStorage).filter((key) => key.startsWith("run-queue:"))
  )
}

/** Accepts every "Leave site?" question the page asks. */
function leaveWithoutAsking(page: Page) {
  page.on("dialog", (dialog) => {
    if (dialog.type() === "beforeunload") void dialog.accept()
  })
}

test.describe("a change that does not save", () => {
  test("on a Run finished after the page loaded is refused with a public reason", async ({
    page,
    context,
  }) => {
    const ash = await signInNamed(context, "Ash")
    const runId = await insertRunFor(ash.id)

    await openRun(page, runId)
    await setRunStateElsewhere(runId, "failed")
    await recordMudkip(page)

    await expect(page.getByText("Encounter not saved")).toBeVisible()
    await expect(page.getByText("This run is not active.")).toBeVisible()
    await expect(starterSprite(page)).toBeHidden()
    expect(await startersOf(runId)).toEqual([])
  })

  test("refused at prediction over a Run reopened elsewhere refreshes, so the next save commits", async ({
    page,
    context,
  }) => {
    const ash = await signInNamed(context, "Ash")
    const runId = await insertRunFor(ash.id)

    await setRunStateElsewhere(runId, "failed")
    await openRun(page, runId)
    await setRunStateElsewhere(runId, "active")

    const refreshed = page.waitForResponse((response) =>
      isRscFetch(response.request())
    )

    await recordMudkip(page)
    await expect(page.getByText("Encounter not saved")).toBeVisible()
    await refreshed

    // The Drawer opens again on the choices the player made.
    await page.getByRole("button", { name: "Record your starter" }).click()
    await page.getByRole("button", { name: "Save encounter" }).click()
    await expect(starterSprite(page)).toBeVisible()
    await expect
      .poll(() => startersOf(runId))
      .toEqual([{ playerId: ash.id, slot: 1 }])
  })
})

test.describe("a change whose outcome is unknown", () => {
  test("shows Not saved yet with Retry, and Retry commits it once", async ({
    page,
    context,
  }) => {
    const ash = await signInNamed(context, "Ash")
    const runId = await insertRunFor(ash.id)
    await openRun(page, runId)
    const stop = await intercept(page, isServerAction, commitAndLoseResponse)

    await recordMudkip(page)
    await expect(page.getByText(notSavedYet)).toBeVisible()
    await stop()
    await page.getByRole("button", { name: "Retry" }).click()

    await expect(page.getByText(notSavedYet)).toBeHidden()
    await expect(starterSprite(page)).toBeVisible()
    expect(await startersOf(runId)).toEqual([{ playerId: ash.id, slot: 1 }])
  })

  test("is delivered once after a failed refresh reloads the page", async ({
    page,
    context,
  }) => {
    const ash = await signInNamed(context, "Ash")
    const runId = await insertRunFor(ash.id)
    await openRun(page, runId)
    leaveWithoutAsking(page)
    const stopActions = await intercept(
      page,
      isServerAction,
      commitAndLoseResponse
    )

    await recordMudkip(page)
    await expect(page.getByText(notSavedYet)).toBeVisible()
    await stopActions()

    // Next answers a refresh that fails with a full-page load.
    const stopRefresh = await intercept(page, isRscFetch, failBeforeServer)
    const reloaded = page.waitForEvent("load")

    await setVisibility(page, "visible")
    await reloaded
    await stopRefresh()

    await expect(starterSprite(page)).toBeVisible()
    await expect(page.getByText(notSavedYet)).toBeHidden()
    await expect
      .poll(() => startersOf(runId))
      .toEqual([{ playerId: ash.id, slot: 1 }])
  })

  test("is delivered once when the player leaves the Run and comes back", async ({
    page,
    context,
  }) => {
    const ash = await signInNamed(context, "Ash")
    const runId = await insertRunFor(ash.id)
    await openRun(page, runId)
    const stop = await intercept(page, isServerAction, commitAndLoseResponse)

    await recordMudkip(page)
    await expect(page.getByText(notSavedYet)).toBeVisible()
    await stop()
    await page.getByRole("link", { name: "Back to your runs" }).click()
    await expect(page).toHaveURL("/")
    await page.goBack()

    await expect(starterSprite(page)).toBeVisible()
    await expect(page.getByText(notSavedYet)).toBeHidden()
    expect(await startersOf(runId)).toEqual([{ playerId: ash.id, slot: 1 }])
  })

  test("restored after a reload and refused says it was not saved", async ({
    page,
    context,
  }) => {
    const ash = await signInNamed(context, "Ash")
    const runId = await insertRunFor(ash.id)
    await openRun(page, runId)
    leaveWithoutAsking(page)
    const stop = await intercept(page, isServerAction, failBeforeServer)

    await recordMudkip(page)
    await expect(page.getByText(notSavedYet)).toBeVisible()
    await stop()
    await setRunStateElsewhere(runId, "failed")
    await page.reload()

    await expect(
      page.getByText("A change made before the page reloaded was not saved.")
    ).toBeVisible()
    await expect(page.getByText("This run is not active.")).toBeVisible()
    expect(await startersOf(runId)).toEqual([])
  })
})

test.describe("the leave prompt", () => {
  test("asks while a change is unsent", async ({ page, context }) => {
    const ash = await signInNamed(context, "Ash")
    const runId = await insertRunFor(ash.id)
    await openRun(page, runId)
    await intercept(page, isServerAction, hold)

    await recordMudkip(page)

    const asked = page.waitForEvent("dialog")

    await page.close({ runBeforeUnload: true })
    expect((await asked).type()).toBe("beforeunload")
  })

  test("asks while the record Drawer holds a draft", async ({
    page,
    context,
  }) => {
    const ash = await signInNamed(context, "Ash")
    const runId = await insertRunFor(ash.id)
    await openRun(page, runId)

    await page.getByRole("button", { name: "Record your starter" }).click()
    await page
      .getByRole("dialog", { name: "Record an encounter" })
      .getByRole("button", { name: "Mudkip" })
      .click()

    const asked = page.waitForEvent("dialog")

    await page.close({ runBeforeUnload: true })
    expect((await asked).type()).toBe("beforeunload")
  })
})

test.describe("the persisted queue", () => {
  test("keeps one queue per Run in a tab", async ({ page, context }) => {
    const ash = await signInNamed(context, "Ash")
    const firstRunId = await insertRunFor(ash.id)
    const secondRunId = await insertRunFor(ash.id)
    await openRun(page, firstRunId)
    leaveWithoutAsking(page)
    const stop = await intercept(page, isServerAction, failBeforeServer)

    await recordMudkip(page)
    await expect(page.getByText(notSavedYet)).toBeVisible()
    await stop()
    await openRun(page, secondRunId)

    await expect(page.getByText(notSavedYet)).toBeHidden()
    expect(await storedQueueKeys(page)).toEqual([
      `run-queue:${ash.id}:${firstRunId}`,
    ])

    await openRun(page, firstRunId).catch(() => undefined)
    await expect(starterSprite(page)).toBeVisible()
    await expect
      .poll(() => startersOf(firstRunId))
      .toEqual([{ playerId: ash.id, slot: 1 }])
    expect(await startersOf(secondRunId)).toEqual([])
  })

  test("restores a stored change whose arguments still parse", async ({
    page,
    context,
  }) => {
    const ash = await signInNamed(context, "Ash")
    const runId = await insertRunFor(ash.id)
    await openRun(page, runId)

    await storeQueue(page, `run-queue:${ash.id}:${runId}`, [
      storedEncounter({ runId, scope: ash.id, slot: 1, species: "mudkip" }),
    ])
    await page.reload()

    await expect(starterSprite(page)).toBeVisible()
    await expect
      .poll(() => startersOf(runId))
      .toEqual([{ playerId: ash.id, slot: 1 }])
  })

  test("drops a stored change with no Player scope, from headcanon 0.3.0", async ({
    page,
    context,
  }) => {
    const ash = await signInNamed(context, "Ash")
    const runId = await insertRunFor(ash.id)
    await openRun(page, runId)
    let sent = 0
    page.on("request", (request) => {
      if (isServerAction(request)) sent += 1
    })

    await storeQueue(page, `run-queue:${ash.id}:${runId}`, [
      storedEncounter({ runId, scope: null, slot: 1, species: "mudkip" }),
    ])
    await openRun(page, runId)

    await expect(starterSprite(page)).toBeHidden()
    expect(sent).toBe(0)
    expect(await startersOf(runId)).toEqual([])
  })
})

test.describe("a change held across a change of Player", () => {
  test("is denied, and never written to the next Player's Journey", async ({
    page,
    context,
  }) => {
    const ash = await signInNamed(context, "Ash")
    const misty = await signInNamed(
      await context.browser()!.newContext(),
      "Misty"
    )
    const runId = await insertRunFor(ash.id, misty.id)
    await startSession(context, ash.id)
    await openRun(page, runId)

    await context.setOffline(true)
    await recordMudkip(page)
    // Misty signs in to this browser in another tab.
    await startSession(context, misty.id)
    await context.setOffline(false)

    await expect(page.getByText("Encounter not saved")).toBeVisible()
    await expect(page.getByText("You cannot change this run.")).toBeVisible()
    expect(await startersOf(runId)).toEqual([])
  })
})

test.describe("a change outside the delivery window", () => {
  test("that committed and lost its receipt could not be confirmed, never lost", async ({
    page,
    context,
  }) => {
    const ash = await signInNamed(context, "Ash")
    const runId = await insertRunFor(ash.id)
    await openRun(page, runId)
    let mutationId = ""
    const stopLosing = await intercept(page, isServerAction, async (route) => {
      mutationId = mutationIdOf(route.request())
      await commitAndLoseResponse(route)
    })

    await recordMudkip(page)
    await expect(page.getByText(notSavedYet)).toBeVisible()
    await stopLosing()
    // Eight days later: cleanup deleted the receipt, and the resend is past
    // the 7-day delivery window.
    await deleteReceipt(mutationId)
    const eightDaysAgo = Date.now() - 8 * 24 * 60 * 60 * 1000
    await intercept(page, isServerAction, (route) =>
      route.continue({
        postData: route
          .request()
          .postData()!
          .replace(/"createdAt":\d+/, `"createdAt":${eightDaysAgo}`),
      })
    )
    await page.getByRole("button", { name: "Retry" }).click()

    await expect(
      page.getByText("Encounter could not be confirmed")
    ).toBeVisible()
    await expect(
      page.getByText(
        "It was too old to send again. The run now shows what was saved."
      )
    ).toBeVisible()
    await expect(starterSprite(page)).toBeVisible()
    expect(await startersOf(runId)).toEqual([{ playerId: ash.id, slot: 1 }])
  })

  test("from a device clock that is ahead asks the player to check it", async ({
    page,
    context,
  }) => {
    const ash = await signInNamed(context, "Ash")
    const runId = await insertRunFor(ash.id)
    await page.clock.install({ time: Date.now() + 2 * 60 * 60 * 1000 })
    await openRun(page, runId)

    await recordMudkip(page)

    await expect(page.getByText("Encounter not saved")).toBeVisible()
    await expect(
      page.getByText(
        "Your device clock is ahead. Check its date and time, then try again."
      )
    ).toBeVisible()
    expect(await startersOf(runId)).toEqual([])
  })
})

test.describe("offline", () => {
  test("a save and a refresh keep the page mounted and complete once back online", async ({
    page,
    context,
  }) => {
    test.setTimeout(60_000)
    const ash = await signInNamed(context, "Ash")
    const runId = await insertRunFor(ash.id)
    await openRun(page, runId)
    await page.evaluate(() => {
      Object.assign(window, { sameDocument: true })
    })

    await context.setOffline(true)
    await recordMudkip(page)
    await setVisibility(page, "visible")
    // headcanon calls a delivery uncertain after 10 s without an answer.
    await expect(page.getByText(notSavedYet)).toBeVisible({ timeout: 15_000 })
    await context.setOffline(false)

    await expect(page.getByText(notSavedYet)).toBeHidden()
    await expect(starterSprite(page)).toBeVisible()
    expect(await page.evaluate(() => "sameDocument" in window)).toBe(true)
    await expect
      .poll(() => startersOf(runId))
      .toEqual([{ playerId: ash.id, slot: 1 }])
  })
})

test.describe("an app that is out of date", () => {
  test("a save to an action the server does not know shows the out-of-date bar", async ({
    page,
    context,
  }) => {
    const ash = await signInNamed(context, "Ash")
    const runId = await insertRunFor(ash.id)
    await openRun(page, runId)
    await intercept(page, isServerAction, sendToUnknownAction)

    await recordMudkip(page)

    await expect(
      page.getByText("Encounter could not be confirmed")
    ).toBeVisible()
    await expect(
      page.getByText("Your app is out of date. Refresh?")
    ).toBeVisible()
    expect(await startersOf(runId)).toEqual([])
  })

  test("a save to an action the server knows commits once with no bar", async ({
    page,
    context,
  }) => {
    const ash = await signInNamed(context, "Ash")
    const runId = await insertRunFor(ash.id)
    await openRun(page, runId)

    await recordMudkip(page)

    await expect(starterSprite(page)).toBeVisible()
    await expect
      .poll(() => startersOf(runId))
      .toEqual([{ playerId: ash.id, slot: 1 }])
    await expect(
      page.getByText("Your app is out of date. Refresh?")
    ).toBeHidden()
  })

  test("Refresh restores the changes queued behind the out-of-date one", async ({
    page,
    context,
  }) => {
    const ash = await signInNamed(context, "Ash")
    const runId = await insertRunFor(ash.id)
    await openRun(page, runId)
    leaveWithoutAsking(page)
    const first = storedEncounter({
      runId,
      scope: ash.id,
      slot: 1,
      species: "mudkip",
    })
    const second = storedEncounter({
      runId,
      scope: ash.id,
      slot: 2,
      species: "torchic",
    })
    await storeQueue(page, `run-queue:${ash.id}:${runId}`, [first, second])
    const stop = await intercept(page, isServerAction, (route) =>
      mutationIdOf(route.request()) === first.mutationId
        ? sendToUnknownAction(route)
        : hold()
    )

    await page.reload()
    await expect(
      page.getByText("Your app is out of date. Refresh?")
    ).toBeVisible()
    await stop()
    await page.getByRole("button", { name: "Refresh" }).click()

    await expect
      .poll(() => startersOf(runId))
      .toEqual([{ playerId: ash.id, slot: 2 }])
  })
})
