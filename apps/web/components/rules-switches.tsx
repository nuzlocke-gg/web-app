"use client"

import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemSeparator,
  ItemTitle,
} from "@workspace/ui/components/item"
import { Switch } from "@workspace/ui/components/switch"
import { Fragment, useId } from "react"

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
        <RuleGroup key={group.title} title={group.title}>
          {group.rules.map((rule, index) => (
            <Fragment key={rule.id}>
              {index > 0 ? <ItemSeparator className="my-0" /> : null}
              <RuleSwitch
                rule={rule}
                on={rules[rule.id] === true}
                disabled={disabled}
                onChange={(on) => onChange({ [rule.id]: on })}
              />
            </Fragment>
          ))}
        </RuleGroup>
      ))}
    </div>
  )
}

function RuleGroup({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  const id = useId()

  return (
    <section aria-labelledby={id} className="flex flex-col gap-1.5">
      <h2 id={id} className="px-1 text-sm text-muted-foreground">
        {title}
      </h2>
      <ItemGroup className="gap-0 rounded-2xl bg-muted/50">
        {children}
      </ItemGroup>
    </section>
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
    <Item role="listitem" className="items-start">
      <ItemContent>
        <ItemTitle id={`${id}-title`}>{rule.name}</ItemTitle>
        <ItemDescription id={`${id}-description`} className="line-clamp-none">
          {rule.description}
        </ItemDescription>
      </ItemContent>
      <ItemActions className="pt-0.5">
        <Switch
          checked={on}
          disabled={disabled}
          aria-labelledby={`${id}-title`}
          aria-describedby={`${id}-description`}
          onCheckedChange={onChange}
        />
      </ItemActions>
    </Item>
  )
}
