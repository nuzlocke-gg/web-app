import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuBadge,
  SidebarInset,
} from "@workspace/ui/components/sidebar"
import {
  MapTrifoldIcon,
  UsersThreeIcon,
  SkullIcon,
  ScrollIcon,
  GearIcon,
  TrophyIcon,
  CaretUpDownIcon,
} from "@phosphor-icons/react"

const nav = [
  { label: "Routes", icon: MapTrifoldIcon, active: true },
  { label: "Team", icon: UsersThreeIcon, badge: "6" },
  { label: "Graveyard", icon: SkullIcon, badge: "3" },
  { label: "Rules", icon: ScrollIcon },
]

export default function Demo() {
  return (
    <SidebarProvider className="h-full min-h-0 overflow-hidden rounded-2xl border">
      <Sidebar collapsible="none" className="border-r">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg">
                <TrophyIcon />
                <div className="flex flex-1 flex-col">
                  <span className="font-medium">Emerald run</span>
                  <span className="text-xs text-muted-foreground">
                    Hard mode
                  </span>
                </div>
                <CaretUpDownIcon />
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Run</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {nav.map((item) => (
                  <SidebarMenuItem key={item.label}>
                    <SidebarMenuButton isActive={item.active}>
                      <item.icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                    {item.badge && (
                      <SidebarMenuBadge>{item.badge}</SidebarMenuBadge>
                    )}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton>
                <GearIcon />
                <span>Settings</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="gap-4 p-6">
        <div className="flex flex-col gap-1">
          <span className="font-heading text-base font-medium">Routes</span>
          <span className="text-sm text-muted-foreground">
            4 of 34 routes done
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="h-20 rounded-2xl bg-muted" />
          <div className="h-20 rounded-2xl bg-muted" />
          <div className="h-20 rounded-2xl bg-muted" />
          <div className="h-20 rounded-2xl bg-muted" />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
