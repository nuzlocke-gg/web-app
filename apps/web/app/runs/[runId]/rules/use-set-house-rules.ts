"use client"

import { createNextOperationHook } from "headcanon/next/client"

import { setHouseRules } from "@/lib/runs/operations"

import { setHouseRulesAction } from "../../actions"

/**
 * Saves a Run's House rules. It keeps one envelope per save, so a resend after
 * a lost response returns the first answer instead of a second write.
 */
export const useSetHouseRules = createNextOperationHook({
  operation: setHouseRules,
  action: setHouseRulesAction,
})
