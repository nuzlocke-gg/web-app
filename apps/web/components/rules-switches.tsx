"use client"

import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
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
 * Run, then the Soul Link rules on a Soul Link.
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
        <FieldSet key={group.title}>
          <FieldLegend variant="label">{group.title}</FieldLegend>
          <FieldGroup className="gap-4">
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
    <Field orientation="horizontal" data-disabled={disabled || undefined}>
      <FieldContent>
        <FieldLabel htmlFor={id}>{rule.name}</FieldLabel>
        <FieldDescription>{rule.description}</FieldDescription>
      </FieldContent>
      <Switch
        id={id}
        checked={on}
        disabled={disabled}
        onCheckedChange={onChange}
      />
    </Field>
  )
}
