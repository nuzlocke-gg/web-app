import { Separator } from "@workspace/ui/components/separator"

export default function Demo() {
  return (
    <div className="flex max-w-sm flex-col gap-3 text-sm">
      <div className="flex flex-col gap-1">
        <p className="font-medium">Kanto run #4</p>
        <p className="text-muted-foreground">Fire Red, hardcore rules</p>
      </div>
      <Separator />
      <div className="flex h-5 items-center gap-4">
        <span>Routes</span>
        <Separator orientation="vertical" />
        <span>Team</span>
        <Separator orientation="vertical" />
        <span>Graveyard</span>
      </div>
    </div>
  )
}
