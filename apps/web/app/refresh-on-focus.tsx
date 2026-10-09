"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"

/**
 * Refreshes the page's server data when the tab becomes visible again, so a
 * plain server-rendered list catches up with changes made elsewhere.
 */
export function RefreshOnFocus() {
  const router = useRouter()

  useEffect(() => {
    function refreshWhenVisible() {
      if (document.visibilityState === "visible") router.refresh()
    }

    document.addEventListener("visibilitychange", refreshWhenVisible)

    return () =>
      document.removeEventListener("visibilitychange", refreshWhenVisible)
  }, [router])

  return null
}
