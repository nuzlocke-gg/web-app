import { Badge } from "@workspace/ui/components/badge"
import { HeartIcon, SkullIcon, WarningIcon } from "@phosphor-icons/react"

export default function Demo() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge>Alive</Badge>
        <Badge variant="secondary">Boxed</Badge>
        <Badge variant="destructive">Fainted</Badge>
        <Badge variant="outline">Route 102</Badge>
        <Badge variant="ghost">Lv. 14</Badge>
        <Badge variant="link" render={<a href="#rules" />}>
          House rules
        </Badge>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Badge>
          <HeartIcon data-icon="inline-start" />
          In party
        </Badge>
        <Badge variant="destructive">
          <SkullIcon data-icon="inline-start" />
          Gym 3
        </Badge>
        <Badge className="bg-warning/10 text-warning dark:bg-warning/20">
          <WarningIcon data-icon="inline-start" />
          Over level cap
        </Badge>
      </div>
    </div>
  )
}
