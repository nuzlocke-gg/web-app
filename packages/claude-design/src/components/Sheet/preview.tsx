import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@workspace/ui/components/sheet"

export default function Demo() {
  return (
    <Sheet defaultOpen>
      <SheetTrigger render={<Button variant="outline" />}>
        Log encounter
      </SheetTrigger>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Log encounter</SheetTitle>
          <SheetDescription>Route 3, first encounter.</SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-4 px-6">
          <div className="flex flex-col gap-2">
            <Label htmlFor="species">Pokémon</Label>
            <Input id="species" defaultValue="Jigglypuff" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="level">Level</Label>
            <Input id="level" type="number" defaultValue="11" />
          </div>
        </div>
        <SheetFooter>
          <Button>Save encounter</Button>
          <SheetClose render={<Button variant="ghost" />}>Cancel</SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
