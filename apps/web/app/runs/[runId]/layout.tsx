import { Skeleton } from "@workspace/ui/components/skeleton"
import { Suspense, type ReactNode } from "react"

import { loadRunCanon } from "@/lib/runs/canon"

import { PrivateRun } from "./private-run"
import { RunRoot } from "./run-root"
import { RunTabProvider } from "./run-tab"

type RunLayoutProps = {
  children: ReactNode
  params: Promise<{ runId: string }>
}

export default function RunLayout({ children, params }: RunLayoutProps) {
  return (
    <Suspense fallback={<RunSkeleton />}>
      <RunCanon params={params}>{children}</RunCanon>
    </Suspense>
  )
}

async function RunCanon({ children, params }: RunLayoutProps) {
  const { runId } = await params
  const canon = await loadRunCanon(runId)

  if (!canon) return <PrivateRun />

  return (
    <RunRoot key={`${canon.value.viewerId}:${runId}`} canon={canon}>
      <RunTabProvider>{children}</RunTabProvider>
    </RunRoot>
  )
}

function RunSkeleton() {
  return (
    <div
      className="mx-auto flex min-h-svh w-full max-w-md flex-col gap-4 px-4 pt-4"
      aria-busy
    >
      <Skeleton className="h-10 w-2/3" />
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-14 w-full" />
    </div>
  )
}
