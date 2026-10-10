import { describe, expect, test } from "vitest"

import { changeNotice, type RunChangeFailure } from "./change-notice"

const mutationId = "0199c4a0-0000-7000-8000-0000000000aa"

function undeliverable(
  code: "delivery-expired" | "delivery-from-future" | "mutation-id-reused",
  mayHaveCommitted = false
): RunChangeFailure {
  return {
    kind: "undeliverable",
    error: { code, mutationId },
    mayHaveCommitted,
  }
}

describe("changeNotice", () => {
  test("a refusal names the change and its reason", () => {
    expect(
      changeNotice(
        { kind: "domain", error: { kind: "slot-taken" } },
        "Encounter"
      )
    ).toEqual({
      title: "Encounter not saved",
      description: "You already have an encounter in this slot.",
      outOfDate: false,
    })
  })

  test("a withdrawn change reads as a refusal", () => {
    expect(
      changeNotice(
        { kind: "replay-refused", error: { kind: "run-not-active" } },
        "Encounter"
      )
    ).toMatchObject({
      title: "Encounter not saved",
      description: "This run is not active.",
    })
  })

  test("a Refusal kind from a newer build gives a generic reason", () => {
    expect(
      changeNotice(
        { kind: "domain", error: { kind: "from-a-newer-build" } },
        "Encounter"
      )
    ).toMatchObject({
      title: "Encounter not saved",
      description: "The change was refused.",
    })
  })

  test("a Refusal kind that is an Object property gives a generic reason", () => {
    expect(
      changeNotice({ kind: "domain", error: { kind: "toString" } }, "Encounter")
    ).toMatchObject({ description: "The change was refused." })
  })

  test("a denial does not say who did it", () => {
    expect(
      changeNotice({ kind: "denied", mayHaveCommitted: false }, "Encounter")
    ).toEqual({
      title: "Encounter not saved",
      description: "You cannot change this run.",
      outOfDate: false,
    })
  })

  test("a delivery from the future asks the player to check the device clock", () => {
    expect(
      changeNotice(undeliverable("delivery-from-future"), "Encounter")
    ).toMatchObject({
      title: "Encounter not saved",
      description:
        "Your device clock is ahead. Check its date and time, then try again.",
    })
  })

  test("an expired delivery could not be confirmed, never lost", () => {
    expect(
      changeNotice(undeliverable("delivery-expired"), "Encounter")
    ).toMatchObject({
      title: "Encounter could not be confirmed",
      description:
        "It was too old to send again. The run now shows what was saved.",
    })
  })

  test("another undeliverable change asks the player to try again", () => {
    expect(
      changeNotice(undeliverable("mutation-id-reused"), "Encounter")
    ).toMatchObject({
      title: "Encounter not saved",
      description: "Something went wrong. Try again.",
    })
  })

  test("a failure after an attempt that may have committed could not be confirmed", () => {
    expect(
      changeNotice({ kind: "denied", mayHaveCommitted: true }, "Encounter")
    ).toMatchObject({ title: "Encounter could not be confirmed" })
    expect(
      changeNotice(undeliverable("mutation-id-reused", true), "Encounter")
    ).toMatchObject({ title: "Encounter could not be confirmed" })
  })

  test("an out-of-date app could not confirm the change and shows the bar", () => {
    expect(
      changeNotice(
        { kind: "stale-client", mayHaveCommitted: false },
        "Encounter"
      )
    ).toEqual({
      title: "Encounter could not be confirmed",
      description: "Refresh to see what was saved.",
      outOfDate: true,
    })
  })

  test("a restored change that was refused was not saved", () => {
    expect(
      changeNotice({ kind: "domain", error: { kind: "run-not-active" } }, null)
    ).toEqual({
      title: "A change made before the page reloaded was not saved.",
      description: "This run is not active.",
      outOfDate: false,
    })
  })

  test("a restored change that may have committed could not be confirmed", () => {
    expect(
      changeNotice(undeliverable("delivery-expired", true), null)
    ).toMatchObject({
      title: "A change made before the page reloaded could not be confirmed.",
    })
  })

  test.each<RunChangeFailure>([
    { kind: "delivery-cancelled" },
    { kind: "root-unmounted", outcome: "unknown" },
  ])("$kind says nothing", (failure) => {
    expect(changeNotice(failure, "Encounter")).toBeNull()
  })
})
