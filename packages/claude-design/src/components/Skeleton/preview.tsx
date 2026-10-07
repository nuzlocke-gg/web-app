import { Skeleton } from "@workspace/ui/components/skeleton"

export default function Demo() {
  return (
    <div className="grid grid-cols-2 gap-8">
      <div className="flex items-center gap-3">
        <Skeleton className="size-12 rounded-full" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  )
}
