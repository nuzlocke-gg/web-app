import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@workspace/ui/components/tabs"
import {
  UsersThreeIcon,
  MapTrifoldIcon,
  SkullIcon,
} from "@phosphor-icons/react"

export default function Demo() {
  return (
    <div className="grid grid-cols-2 gap-8">
      <Tabs defaultValue="team">
        <TabsList>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="box">Box</TabsTrigger>
          <TabsTrigger value="graveyard">Graveyard</TabsTrigger>
        </TabsList>
        <TabsContent value="team" className="text-muted-foreground">
          Six Pokémon in your party. Drag one to the box to swap it out.
        </TabsContent>
        <TabsContent value="box" className="text-muted-foreground">
          14 Pokémon caught and stored.
        </TabsContent>
        <TabsContent value="graveyard" className="text-muted-foreground">
          3 Pokémon fainted on this run.
        </TabsContent>
      </Tabs>
      <Tabs defaultValue="routes">
        <TabsList variant="line">
          <TabsTrigger value="routes">
            <MapTrifoldIcon data-icon="inline-start" />
            Routes
          </TabsTrigger>
          <TabsTrigger value="encounters">
            <UsersThreeIcon data-icon="inline-start" />
            Encounters
          </TabsTrigger>
          <TabsTrigger value="deaths" disabled>
            <SkullIcon data-icon="inline-start" />
            Deaths
          </TabsTrigger>
        </TabsList>
        <TabsContent value="routes" className="text-muted-foreground">
          Route 101 to Route 104 done. Petalburg Woods is next.
        </TabsContent>
        <TabsContent value="encounters" className="text-muted-foreground">
          9 encounters logged.
        </TabsContent>
      </Tabs>
    </div>
  )
}
