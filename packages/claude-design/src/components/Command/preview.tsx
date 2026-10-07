import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@workspace/ui/components/command"
import {
  MapPinIcon,
  PlusIcon,
  SkullIcon,
  GearIcon,
} from "@phosphor-icons/react"

export default function Demo() {
  return (
    <Command className="max-w-md shadow-lg ring-1 ring-foreground/5">
      <CommandInput placeholder="Search routes and actions" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Routes">
          <CommandItem>
            <MapPinIcon />
            Route 1
          </CommandItem>
          <CommandItem>
            <MapPinIcon />
            Viridian Forest
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Actions">
          <CommandItem>
            <PlusIcon />
            Add encounter
            <CommandShortcut>⌘E</CommandShortcut>
          </CommandItem>
          <CommandItem>
            <SkullIcon />
            Open graveyard
            <CommandShortcut>⌘G</CommandShortcut>
          </CommandItem>
          <CommandItem disabled>
            <GearIcon />
            Edit rules
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  )
}
