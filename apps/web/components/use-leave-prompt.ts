"use client"

import { useEffect } from "react"

/**
 * Asks the browser's "Leave site?" question when the page unloads while
 * `active`. A screen with a draft calls it with whether the draft is open.
 * @example
 * useLeavePrompt(open && draft !== null)
 */
export function useLeavePrompt(active: boolean): void {
  useEffect(() => {
    if (!active) return

    function askBeforeLeaving(event: BeforeUnloadEvent) {
      event.preventDefault()
    }

    window.addEventListener("beforeunload", askBeforeLeaving)

    return () => window.removeEventListener("beforeunload", askBeforeLeaving)
  }, [active])
}
