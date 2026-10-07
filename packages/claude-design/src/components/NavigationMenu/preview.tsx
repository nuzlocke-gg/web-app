import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuTrigger,
  NavigationMenuContent,
  NavigationMenuLink,
  navigationMenuTriggerStyle,
} from "@workspace/ui/components/navigation-menu"

const runLinks = [
  { title: "Active runs", description: "Runs you are playing now." },
  { title: "Graveyard", description: "Every Pokémon that fainted." },
  { title: "Start new run", description: "Pick a game and set rules." },
  { title: "Archive", description: "Finished and failed runs." },
]

export default function Demo() {
  return (
    <NavigationMenu defaultValue="runs">
      <NavigationMenuList>
        <NavigationMenuItem value="runs">
          <NavigationMenuTrigger>Runs</NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid w-[420px] grid-cols-2 gap-1">
              {runLinks.map((link) => (
                <li key={link.title}>
                  <NavigationMenuLink
                    href="#"
                    className="flex-col items-start gap-0.5"
                  >
                    <span className="font-medium">{link.title}</span>
                    <span className="text-muted-foreground">
                      {link.description}
                    </span>
                  </NavigationMenuLink>
                </li>
              ))}
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem value="pokedex">
          <NavigationMenuTrigger>Pokédex</NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid w-[260px] gap-1">
              <li>
                <NavigationMenuLink href="#">By route</NavigationMenuLink>
              </li>
              <li>
                <NavigationMenuLink href="#">By type</NavigationMenuLink>
              </li>
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuLink href="#" className={navigationMenuTriggerStyle()}>
            Rules
          </NavigationMenuLink>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  )
}
