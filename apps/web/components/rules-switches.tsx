"use client"

import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldTitle,
} from "@workspace/ui/components/field"
import { Switch } from "@workspace/ui/components/switch"
import { useId } from "react"

import { rulesShown, type Rule, type RulePatch } from "@/lib/runs/rules"
import type { RunKind } from "@/lib/runs/state"

type RulesSwitchesProps = {
  kind: RunKind
  /** `{ ruleId: on }`; an absent key is Off. */
  rules: Readonly<Record<string, boolean>>
  /** Shows the Rules as a record that does not change. */
  disabled?: boolean
  /** Called with the one Rule the player switched. */
  onChange: (patch: RulePatch) => void
}

/**
 * A switch per Rule with its description, in two groups: the Rules of every
 * Run, then the Soul Link rules on a Soul Link. A whole row toggles its Rule.
 */
export function RulesSwitches({
  kind,
  rules,
  disabled = false,
  onChange,
}: RulesSwitchesProps) {
  const shown = rulesShown(kind)
  const groups = [
    { title: "Rules", rules: shown.filter((rule) => !rule.soulLinkOnly) },
    {
      title: "Soul Link rules",
      rules: shown.filter((rule) => rule.soulLinkOnly),
    },
  ].filter((group) => group.rules.length > 0)

  return (
    <div className="flex flex-col gap-6">
      {groups.map((group) => (
        <FieldSet key={group.title} className="gap-0">
          <FieldLegend
            variant="label"
            className="mb-1.5 px-1 font-normal text-muted-foreground"
          >
            {group.title}
          </FieldLegend>
          <FieldGroup variant="joined">
            {group.rules.map((rule) => (
              <RuleSwitch
                key={rule.id}
                rule={rule}
                on={rules[rule.id] === true}
                disabled={disabled}
                onChange={(on) => onChange({ [rule.id]: on })}
              />
            ))}
          </FieldGroup>
        </FieldSet>
      ))}
    </div>
  )
}

type RuleSwitchProps = {
  rule: Rule
  on: boolean
  disabled: boolean
  onChange: (on: boolean) => void
}

function RuleSwitch({ rule, on, disabled, onChange }: RuleSwitchProps) {
  const id = useId()

  return (
    <FieldLabel htmlFor={id}>
      <Field orientation="horizontal" data-disabled={disabled || undefined}>
        <FieldContent>
          <FieldTitle id={`${id}-title`}>{rule.name}</FieldTitle>
          <FieldDescription id={`${id}-description`}>
            {rule.description}
          </FieldDescription>
        </FieldContent>
        {/* Named by its title alone; the label around the row would add
            the description to its name. */}
        <Switch
          id={id}
          checked={on}
          disabled={disabled}
          aria-labelledby={`${id}-title`}
          aria-describedby={`${id}-description`}
          onCheckedChange={onChange}
        />
      </Field>
    </FieldLabel>
  )
}
