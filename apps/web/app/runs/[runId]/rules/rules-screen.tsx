"use client"

import { CaretLeftIcon, LockSimpleIcon } from "@phosphor-icons/react"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog"
import { buttonVariants } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { RulesSwitches } from "@/components/rules-switches"
import { useLeavePrompt } from "@/components/use-leave-prompt"
import { admitsChanges } from "@/lib/runs/can-change"
import { setRules } from "@/lib/runs/mutations"
import type { RunLifeState } from "@/lib/runs/state"

import { useRun, useRunChange } from "../run-root"
import { HouseRulesField, useHouseRules } from "./house-rules"

type LockedNotice = { title: string; description?: string }

const finishedNotice: LockedNotice = {
  title: "This run is finished",
  description:
    "Its rules are a record and do not change. Reopen the run to change them.",
}

/** Why the Rules of a Run in this state do not change, when they do not. */
const lockedNotices: Partial<Record<RunLifeState, LockedNotice>> = {
  waiting: { title: "The rules can change once the run starts." },
  failed: finishedNotice,
  complete: finishedNotice,
}

/**
 * The Rules screen of a Run: a switch per Rule that saves at once on an
 * Active Run, and the House rules, editable in every state.
 */
export function RulesScreen() {
  const { value: run } = useRun()
  const change = useRunChange()
  const router = useRouter()
  const houseRules = useHouseRules(run)
  const [discardOpen, setDiscardOpen] = useState(false)
  const editable = admitsChanges(run)
  const notice = run.state ? lockedNotices[run.state] : undefined
  const backHref = `/runs/${run.id}`

  // Text typed in the House rules field is lost if the page unloads.
  useLeavePrompt(houseRules.dirty)

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-md flex-col">
      <header className="flex items-center gap-1 px-2 pt-3 pb-2">
        <Link
          href={backHref}
          aria-label="Back to the run"
          className={cn(
            buttonVariants({ variant: "ghost", size: "icon" }),
            "size-11"
          )}
          onClick={(event) => {
            if (!houseRules.dirty) return

            event.preventDefault()
            setDiscardOpen(true)
          }}
        >
          <CaretLeftIcon />
        </Link>
        <div className="flex min-w-0 flex-1 flex-col pl-1">
          <h1 className="text-base font-medium">
            {editable ? "Set the rules" : "Rules"}
          </h1>
          <p className="truncate text-xs text-muted-foreground">{run.name}</p>
        </div>
      </header>

      <main className="flex flex-col gap-8 px-4 pt-2 pb-8">
        {notice ? (
          <Alert role="status">
            <LockSimpleIcon aria-hidden />
            <AlertTitle>{notice.title}</AlertTitle>
            {notice.description ? (
              <AlertDescription>{notice.description}</AlertDescription>
            ) : null}
          </Alert>
        ) : (
          <p className="text-sm text-muted-foreground">
            A change saves at once. Warnings follow the rules at once. A warning
            never blocks an entry.
          </p>
        )}

        <RulesSwitches
          kind={run.kind ?? "solo"}
          rules={run.rules}
          disabled={!editable}
          onChange={(patch) =>
            change(setRules({ runId: run.id, rules: patch }), "Rules")
          }
        />

        <HouseRulesField houseRules={houseRules} />
      </main>

      <AlertDialog open={discardOpen} onOpenChange={setDiscardOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Discard your changes to the house rules?
            </AlertDialogTitle>
            <AlertDialogDescription>
              The text you typed is not saved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel size="lg" className="h-11">
              Keep editing
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              size="lg"
              className="h-11"
              onClick={() => router.push(backHref)}
            >
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
