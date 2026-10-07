import { Checkbox } from "@workspace/ui/components/checkbox"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"

export default function Demo() {
  return (
    <div className="grid grid-cols-2 gap-10">
      <FieldGroup className="gap-6">
        <Field>
          <FieldLabel htmlFor="field-run">Run name</FieldLabel>
          <Input id="field-run" defaultValue="Emerald Kaizo" />
          <FieldDescription>Shown on your public profile.</FieldDescription>
        </Field>
        <Field data-invalid="true">
          <FieldLabel htmlFor="field-cap">Level cap</FieldLabel>
          <Input id="field-cap" defaultValue="120" aria-invalid />
          <FieldError>Level cap must be 100 or less.</FieldError>
        </Field>
      </FieldGroup>
      <FieldSet>
        <FieldLegend variant="label">Rules</FieldLegend>
        <FieldDescription>Applied to every route in this run.</FieldDescription>
        <FieldGroup className="gap-3">
          <Field orientation="horizontal">
            <Checkbox id="field-dupes" defaultChecked />
            <FieldLabel htmlFor="field-dupes">Dupes clause</FieldLabel>
          </Field>
          <Field orientation="horizontal">
            <Checkbox id="field-nick" defaultChecked />
            <FieldLabel htmlFor="field-nick">Nickname every catch</FieldLabel>
          </Field>
          <Field orientation="horizontal" data-disabled="true">
            <Checkbox id="field-items" disabled />
            <FieldLabel htmlFor="field-items">No items in battle</FieldLabel>
          </Field>
        </FieldGroup>
      </FieldSet>
    </div>
  )
}
