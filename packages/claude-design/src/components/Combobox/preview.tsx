import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@workspace/ui/components/combobox"

const route102 = [
  "Zigzagoon",
  "Wurmple",
  "Poochyena",
  "Lotad",
  "Seedot",
  "Ralts",
]

export default function Demo() {
  return (
    <Combobox items={route102} defaultOpen>
      <ComboboxInput
        placeholder="Search Pokémon on Route 102"
        className="w-72"
        showClear
      />
      <ComboboxContent>
        <ComboboxEmpty>No Pokémon found.</ComboboxEmpty>
        <ComboboxList>
          {(item: string) => (
            <ComboboxItem key={item} value={item}>
              {item}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}
