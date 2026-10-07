import { Kbd, KbdGroup } from "@workspace/ui/components/kbd"

export default function Demo() {
  return (
    <div className="flex flex-col gap-3 text-sm">
      <div className="flex items-center gap-4">
        <KbdGroup>
          <Kbd>⌘</Kbd>
          <Kbd>K</Kbd>
        </KbdGroup>
        <Kbd>Esc</Kbd>
        <Kbd>Enter</Kbd>
      </div>
      <p className="text-muted-foreground">
        Press <Kbd>⌘</Kbd> <Kbd>E</Kbd> to add an encounter on the current
        route.
      </p>
    </div>
  )
}
