"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"

// A return to a tab fires both `visibilitychange` and `focus`.
const REFRESH_GAP_MS = 1_000

/**
 * Refreshes the page's server data when the player comes back to it: the tab
 * becomes visible again, or its window regains focus (two windows side by side
 * never hide). A plain server-rendered list thus catches up with changes made
 * elsewhere.
 */
export function RefreshOnFocus() {
  const router = useRouter()

  useEffect(() => {
    let lastRefreshAt = 0

    function refresh() {
      const now = Date.now()

      if (now - lastRefreshAt < REFRESH_GAP_MS) return

      lastRefreshAt = now
      router.refresh()
    }

    function refreshWhenVisible() {
      if (document.visibilityState === "visible") refresh()
    }

    document.addEventListener("visibilitychange", refreshWhenVisible)
    window.addEventListener("focus", refresh)

    return () => {
      document.removeEventListener("visibilitychange", refreshWhenVisible)
      window.removeEventListener("focus", refresh)
    }
  }, [router])

  return null
}
