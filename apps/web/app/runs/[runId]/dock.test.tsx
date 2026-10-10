import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react"
import { afterEach, describe, expect, test, vi } from "vitest"

import { Dock, type DockWarning } from "./dock"

const onAdd = vi.fn()
const onGoTo = vi.fn<(encounterId: string) => void>()

afterEach(() => {
  cleanup()
  onAdd.mockClear()
  onGoTo.mockClear()
})

const warnings: DockWarning[] = [
  {
    key: "first-encounter:marill",
    encounterId: "marill",
    rule: "First Encounter Rule",
    text: "Route 104 already has an encounter: Taillow.",
    where: "Route 104",
  },
  {
    key: "nickname-clause:shedinja",
    encounterId: "shedinja",
    rule: "Nickname Clause",
    text: "Shedinja has no nickname.",
    where: "Route 116",
  },
]

async function renderDock(props: Partial<Parameters<typeof Dock>[0]> = {}) {
  await act(async () =>
    render(
      <Dock
        remaining={53}
        onAdd={onAdd}
        warnings={warnings}
        onGoTo={onGoTo}
        {...props}
      />
    )
  )
}

describe("the dock", () => {
  test("shows Add a location, what remains, and the count of Warnings", async () => {
    await renderDock()

    expect(screen.getByRole("button", { name: "Add a location" })).toBeTruthy()
    expect(screen.getByText("53 remaining")).toBeTruthy()

    const button = screen.getByRole("button", { name: "2 warnings" })

    expect(button.getAttribute("aria-expanded")).toBe("false")
    expect(screen.queryByRole("status")).toBeNull()
  })

  test("has no Warnings button with no Warnings", async () => {
    await renderDock({ warnings: [] })

    expect(screen.queryByRole("button", { name: /warning/ })).toBeNull()
  })

  test("a tap opens the list of Warnings as status Alerts, and a second tap minimizes it", async () => {
    await renderDock()

    const button = screen.getByRole("button", { name: "2 warnings" })

    fireEvent.click(button)

    const alerts = screen.getAllByRole("status")

    expect(button.getAttribute("aria-expanded")).toBe("true")
    expect(alerts.map((alert) => alert.textContent)).toEqual([
      expect.stringContaining("Route 104 already has an encounter: Taillow."),
      expect.stringContaining("Shedinja has no nickname."),
    ])

    fireEvent.click(button)

    expect(button.getAttribute("aria-expanded")).toBe("false")
  })

  test("a Warning goes to its row and minimizes the list", async () => {
    await renderDock()

    fireEvent.click(screen.getByRole("button", { name: "2 warnings" }))
    fireEvent.click(
      within(screen.getAllByRole("status")[1]!).getByRole("button", {
        name: "Show Route 116",
      })
    )

    expect(onGoTo).toHaveBeenCalledWith("shedinja")
    expect(
      screen
        .getByRole("button", { name: "2 warnings" })
        .getAttribute("aria-expanded")
    ).toBe("false")
  })

  test("is the Warnings bar alone on a Run that admits no change", async () => {
    await renderDock({ onAdd: undefined })

    expect(screen.queryByRole("button", { name: "Add a location" })).toBeNull()

    const bar = screen.getByRole("button", { name: /2 warnings/ })

    expect(bar.textContent).toContain("Tap to see")

    fireEvent.click(bar)

    expect(bar.textContent).toContain("Hide")
  })

  test("is absent on a Run that admits no change and has no Warnings", async () => {
    const { container } = render(
      <Dock remaining={3} warnings={[]} onGoTo={onGoTo} />
    )

    expect(container.childElementCount).toBe(0)
  })
})
