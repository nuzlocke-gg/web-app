import { Button } from "@workspace/ui/components/button"
import { Spinner } from "@workspace/ui/components/spinner"

export default function Demo() {
  return (
    <div className="flex flex-wrap items-center gap-6">
      <Spinner />
      <Spinner className="size-6 text-muted-foreground" />
      <Button disabled>
        <Spinner data-icon="inline-start" />
        Saving run
      </Button>
      <span className="flex items-center gap-2 text-sm text-muted-foreground">
        <Spinner />
        Loading routes
      </span>
    </div>
  )
}
