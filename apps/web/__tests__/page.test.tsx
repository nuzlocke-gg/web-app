import { render, screen } from "@testing-library/react"
import { expect, test } from "vitest"

import Page from "../app/page"

// Temporary smoke test that proves the Vitest setup works. Replace it with real tests.
test("Page renders its heading", () => {
  render(<Page />)
  expect(
    screen.getByRole("heading", { level: 1, name: "Project ready!" })
  ).toBeDefined()
})
