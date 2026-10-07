import { Button } from "@workspace/ui/components/button"
import {
  Item,
  ItemGroup,
  ItemMedia,
  ItemContent,
  ItemTitle,
  ItemDescription,
  ItemActions,
} from "@workspace/ui/components/item"
import {
  MapPinIcon,
  SkullIcon,
  DotsThreeIcon,
  LeafIcon,
  LightningIcon,
  SparkleIcon,
} from "@phosphor-icons/react"

export default function Demo() {
  return (
    <div className="grid grid-cols-2 gap-6">
      <ItemGroup>
        <Item variant="outline">
          <ItemMedia variant="icon">
            <MapPinIcon />
          </ItemMedia>
          <ItemContent>
            <ItemTitle>Route 104</ItemTitle>
            <ItemDescription>Caught Wingull, level 8.</ItemDescription>
          </ItemContent>
          <ItemActions>
            <Button variant="ghost" size="icon-sm" aria-label="More">
              <DotsThreeIcon />
            </Button>
          </ItemActions>
        </Item>
        <Item variant="muted" size="sm">
          <ItemMedia variant="icon">
            <SkullIcon />
          </ItemMedia>
          <ItemContent>
            <ItemTitle>Torchic fainted</ItemTitle>
            <ItemDescription>Lost to Roxanne's Nosepass.</ItemDescription>
          </ItemContent>
        </Item>
      </ItemGroup>
      <ItemGroup>
        <Item size="xs">
          <ItemMedia variant="icon">
            <LeafIcon />
          </ItemMedia>
          <ItemContent>
            <ItemTitle>Treecko</ItemTitle>
          </ItemContent>
          <ItemActions className="text-muted-foreground">Lv. 18</ItemActions>
        </Item>
        <Item size="xs">
          <ItemMedia variant="icon">
            <LightningIcon />
          </ItemMedia>
          <ItemContent>
            <ItemTitle>Electrike</ItemTitle>
          </ItemContent>
          <ItemActions className="text-muted-foreground">Lv. 16</ItemActions>
        </Item>
        <Item size="xs">
          <ItemMedia variant="icon">
            <SparkleIcon />
          </ItemMedia>
          <ItemContent>
            <ItemTitle>Ralts</ItemTitle>
          </ItemContent>
          <ItemActions className="text-muted-foreground">Lv. 14</ItemActions>
        </Item>
      </ItemGroup>
    </div>
  )
}
