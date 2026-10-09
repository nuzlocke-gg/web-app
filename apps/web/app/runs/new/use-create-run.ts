"use client"

import { createNextOperationHook } from "headcanon/next/client"

import { createRun } from "@/lib/runs/operations"

import { createRunAction } from "../actions"

/**
 * Submits "Make the run". It keeps one envelope per submission, so a resend
 * after a lost response returns the first Run instead of making a second.
 */
export const useCreateRun = createNextOperationHook({
  operation: createRun,
  action: createRunAction,
})
