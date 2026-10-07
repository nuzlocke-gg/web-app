import { Button } from "@workspace/ui/components/button"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@workspace/ui/components/drawer"

export default function Demo() {
  return (
    <Drawer defaultOpen showSwipeHandle>
      <DrawerTrigger render={<Button variant="outline" />}>
        View rules
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Run rules</DrawerTitle>
          <DrawerDescription>
            These apply to every route in this run.
          </DrawerDescription>
        </DrawerHeader>
        <ul className="flex flex-col gap-2 p-4 text-sm text-muted-foreground">
          <li>Catch only the first Pokémon on each route.</li>
          <li>A Pokémon that faints is dead and goes to the graveyard.</li>
          <li>Nickname every Pokémon you catch.</li>
        </ul>
        <DrawerFooter>
          <DrawerClose render={<Button />}>Got it</DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
