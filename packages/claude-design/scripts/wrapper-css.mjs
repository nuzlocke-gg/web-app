// PostCSS plugin: make the component styles work when a host (the Design canvas) puts each component
// and icon in its own display:contents element. canvas-compat.js tags those elements [data-ds-contents].
//
// A wrapper breaks three kinds of selector, because the element's parent and siblings are now the
// wrapper's. In each, the element's wrapper W stands in for the element:
//   child     A > E            also  A > W > E
//   position  E:last-child     ->    E:last-child:not(W > *)   and  W:last-child > E
//             (also :first-/:only-/:nth-*, :not() of those, and :has(~ X) / :has(+ X))
//   sibling   L ~ R, L + R     also  W:has(> L) ~ R,  L ~ W > R,  W:has(> L) ~ W > R
// W is :where([data-ds-contents]), so no copy changes specificity. Copies go in a rule right after the
// original. The position rewrite also edits the original: without the :not guard it would match every
// wrapped element, since each one is the first, last and only child of its wrapper.
import parser from "postcss-selector-parser"

const ATTR = "data-ds-contents"
const STRUCTURAL =
  /^:(?:(?:first|last|only)-(?:child|of-type)|nth-(?:last-)?(?:child|of-type))$/
const MAX_COPIES = 48

const W = () => {
  const p = parser.pseudo({ value: ":where" })
  const s = parser.selector()
  s.append(parser.attribute({ attribute: ATTR }))
  p.append(s)
  return p
}
const isW = (n) =>
  n &&
  n.type === "pseudo" &&
  n.value === ":where" &&
  String(n) === `:where([${ATTR}])`
const gt = () => parser.combinator({ value: ">" })
const isComb = (n) => n && n.type === "combinator"
const isSibling = (n) => isComb(n) && ["~", "+"].includes(n.value.trim())
const hasW = (n) => String(n).includes(ATTR)
const insideHas = (n) => {
  for (let p = n.parent; p; p = p.parent)
    if (p.type === "pseudo" && p.value === ":has") return true
  return false
}

const isSiblingHas = (n) =>
  n.type === "pseudo" &&
  n.value === ":has" &&
  n.nodes.length > 0 &&
  n.nodes.every((s) => isSibling(s.nodes[0]))
const isPositional = (n) =>
  n.type === "pseudo" &&
  (STRUCTURAL.test(n.value) ||
    isSiblingHas(n) ||
    (n.value === ":not" &&
      n.nodes.length > 0 &&
      !hasW(n) &&
      n.nodes.every((s) => s.nodes.length > 0 && s.nodes.every(isPositional))))

// compounds of a selector as [start, end) index ranges between combinators
function compounds(sel) {
  const out = []
  let start = 0
  sel.nodes.forEach((n, i) => {
    if (isComb(n)) {
      if (i > start) out.push([start, i])
      start = i + 1
    }
  })
  if (sel.nodes.length > start) out.push([start, sel.nodes.length])
  return out
}

// replace nodes [start, end) of sel with list
function splice(sel, start, end, list) {
  const old = sel.nodes.slice(start, end)
  const before = start > 0 ? sel.nodes[start - 1] : null
  old.forEach((n) => n.remove())
  let at = before
  for (const n of list) {
    if (at) sel.insertAfter(at, n)
    else sel.prepend(n)
    at = n
  }
}

// a moved :has(~ X) also accepts a wrapped sibling: :has(~ X, ~ W > X)
function widen(p) {
  if (isSiblingHas(p)) {
    for (const s of [...p.nodes]) {
      const c = s.clone()
      c.insertAfter(c.nodes[0], W())
      c.insertAfter(c.nodes[1], gt())
      p.append(c)
    }
  } else if (p.value === ":not") p.nodes.forEach((s) => s.nodes.forEach(widen))
  return p
}

// Position rewrite: per positional compound, either "not wrapped" (guard) or "wrapped" (moved to W)
function positionVariants(sel) {
  const targets = compounds(sel)
    .filter(([s, e]) => sel.nodes.slice(s, e).some(isPositional))
    .slice(0, 3)
  if (!targets.length) return [sel]
  const out = []
  for (let mask = 0; mask < 1 << targets.length; mask++) {
    const copy = sel.clone()
    for (let t = targets.length - 1; t >= 0; t--) {
      const [start, end] = targets[t]
      const nodes = copy.nodes.slice(start, end)
      const positional = nodes.filter(isPositional)
      const rest = nodes.filter((n) => !positional.includes(n))
      if (!(mask & (1 << t))) {
        // guard: E:pos:not(W > *) — before any pseudo-element, which must stay last
        const not = parser.pseudo({ value: ":not" })
        const s = parser.selector()
        s.append(W())
        s.append(gt())
        s.append(parser.universal())
        not.append(s)
        const pe = nodes.find(
          (n) => n.type === "pseudo" && n.value.startsWith("::")
        )
        if (pe) copy.insertBefore(pe, not)
        else copy.insertAfter(nodes[nodes.length - 1], not)
        continue
      }
      const restNodes = rest.length
        ? rest.map((n) => n.clone())
        : [parser.universal()]
      const wrapper = [W(), ...positional.map((p) => widen(p.clone()))]
      const next = copy.nodes[end]
      if (isSibling(next)) {
        if (insideHas(copy)) return [sel] // :has() cannot nest
        const has = parser.pseudo({ value: ":has" })
        const s = parser.selector()
        s.append(gt())
        restNodes.forEach((n) => s.append(n))
        has.append(s)
        splice(copy, start, end, [...wrapper, has])
      } else splice(copy, start, end, [...wrapper, gt(), ...restNodes])
    }
    out.push(copy)
  }
  return out // out[0] is the guarded original
}

// Sibling rewrite: L ~ R also as W:has(> L) ~ R, L ~ W > R, W:has(> L) ~ W > R
function siblingVariants(sel, { rightOnly = false } = {}) {
  const idx = sel.nodes
    .map((n, i) => (isSibling(n) ? i : -1))
    .filter((i) => i >= 0)
  if (!idx.length || idx.length > 2) return []
  const modes = rightOnly ? ["R"] : ["L", "R", "LR"]
  const out = []
  for (const i of idx)
    for (const mode of modes) {
      const copy = sel.clone()
      const comps = compounds(copy)
      const left = comps.find(([, e]) => e === i)
      const right = comps.find(([s]) => s === i + 1)
      if (!right || (mode.includes("L") && !left)) continue
      if (mode.includes("R"))
        splice(copy, right[0], right[1], [
          W(),
          gt(),
          ...copy.nodes.slice(right[0], right[1]).map((n) => n.clone()),
        ])
      if (mode.includes("L")) {
        const has = parser.pseudo({ value: ":has" })
        const s = parser.selector()
        s.append(gt())
        copy.nodes.slice(left[0], left[1]).forEach((n) => s.append(n.clone()))
        has.append(s)
        splice(copy, left[0], left[1], [W(), has])
      }
      out.push(copy)
    }
  return out
}

// Sibling rewrite inside :is/:where (forgiving lists) and :has (right side only: :has cannot nest),
// e.g. Tailwind's peer variant :is(.peer ~ *)
function expandInner(sel) {
  const pseudos = []
  sel.walkPseudos((p) => {
    if ([":is", ":where", ":has"].includes(p.value) && !hasW(p)) pseudos.push(p)
  })
  for (const p of pseudos) {
    const nested = p.value === ":has" || insideHas(p)
    for (const s of [...p.nodes])
      for (const v of siblingVariants(s, { rightOnly: nested })) p.append(v)
  }
  return sel
}

// Child rewrite: each subset of the > combinators (not our own) gets a W in between
function childVariants(sel) {
  const all = []
  sel.walkCombinators((c) => {
    if (c.value.trim() === ">") all.push(c)
  })
  const mine = all.filter((c) => {
    const sib = c.parent.nodes,
      i = sib.indexOf(c)
    if (isW(sib[i + 1]) || isW(sib[i - 1])) return false
    for (let p = c.parent; p; p = p.parent) {
      if (p.type === "pseudo" && p.value === ":not" && hasW(p)) return false
      if (
        p.type === "pseudo" &&
        p.value === ":has" &&
        p.parent &&
        p.parent.nodes.some(isW)
      )
        return false
    }
    return true
  })
  if (!mine.length || mine.length > 3) return []
  const out = []
  for (let mask = 1; mask < 1 << mine.length; mask++) {
    const copy = sel.clone()
    const cc = []
    copy.walkCombinators((c) => {
      if (c.value.trim() === ">") cc.push(c)
    })
    mine.forEach((c, k) => {
      if (!(mask & (1 << k))) return
      const t = cc[all.indexOf(c)]
      const w = W()
      t.parent.insertAfter(t, w)
      t.parent.insertAfter(w, gt())
    })
    out.push(copy)
  }
  return out
}

export default function wrapperCss() {
  return {
    postcssPlugin: "wrapper-css",
    OnceExit(root) {
      let edited = 0,
        copied = 0
      root.walkRules((rule) => {
        if (
          !/[>~+]|:(first|last|only|nth)-/.test(rule.selector) ||
          rule.selector.includes(ATTR)
        )
          return
        if (
          rule.parent &&
          rule.parent.type === "atrule" &&
          /keyframes/.test(rule.parent.name)
        )
          return
        const originals = []
        const copies = new Set()
        parser((sels) => {
          sels.each((sel) => {
            const [guarded, ...moved] = positionVariants(sel.clone()).map(
              expandInner
            )
            originals.push(String(guarded).trim())
            const bases = [
              guarded,
              ...moved,
              ...[guarded, ...moved].flatMap((b) => siblingVariants(b)),
            ]
            bases.forEach((b, i) => {
              if (i > 0) copies.add(String(b).trim())
              childVariants(b).forEach((c) => copies.add(String(c).trim()))
            })
          })
        }).processSync(rule.selector)
        const selector = originals.join(",")
        const list = [...copies]
          .filter((s) => s && !originals.includes(s))
          .slice(0, MAX_COPIES)
        if (selector !== rule.selector) {
          rule.selector = selector
          edited++
        }
        if (list.length) {
          rule.cloneAfter({ selector: list.join(",") })
          copied++
        }
      })
      root.append({
        text: `wrapper-css: ${edited} rules guarded, ${copied} copies`,
      })
    },
  }
}
wrapperCss.postcss = true
