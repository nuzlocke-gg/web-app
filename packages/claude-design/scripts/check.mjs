// Checks the design system sources against packages/ui. Exits 1 on any failure.
//   1. tokens: every color in globals.css (:root and .dark) has the same value in src/tokens.json
//   2. inventory: every component file in packages/ui has an entry in src/components.json, and every
//      entry has preview.tsx, README.md and types.d.ts
//   3. previews: each preview server-renders without throwing (portalled content excepted)
//   4. icons: dist's phosphor-regular.js renders the same markup as @phosphor-icons/react (after a build)
//   5. libraries: dist/libraries.json passes the design-system page's rules (after a build)
import * as esbuild from "esbuild"
import fs from "node:fs"
import { createRequire } from "node:module"
import path from "node:path"
import { fileURLToPath } from "node:url"

const PKG = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const REPO = path.resolve(PKG, "../..")
const UI = path.join(REPO, "packages/ui/src")
const SRC = path.join(PKG, "src")
const require = createRequire(import.meta.url)
const read = (p) => fs.readFileSync(p, "utf8")
const failures = []
const fail = (msg) => failures.push(msg)

// 1. tokens
{
  const css = read(path.join(UI, "styles/globals.css"))
  const block = (sel) => {
    const m = new RegExp(`^${sel}\\s*\\{([\\s\\S]*?)^\\}`, "m").exec(css)
    return Object.fromEntries(
      [...(m?.[1] ?? "").matchAll(/--([\w-]+):\s*([^;]+);/g)].map(
        ([, k, v]) => [k, v.trim()]
      )
    )
  }
  const themes = { light: block(":root"), dark: block("\\.dark") }
  const tokens = JSON.parse(read(path.join(SRC, "tokens.json")))
  const byName = Object.fromEntries(tokens.color.tokens.map((t) => [t.name, t]))
  for (const [theme, vars] of Object.entries(themes)) {
    for (const [name, value] of Object.entries(vars)) {
      if (!value.startsWith("oklch") && !value.startsWith("#")) continue // lengths such as --radius
      const t = byName[name]
      if (!t) {
        fail(`tokens: --${name} is in globals.css but not in src/tokens.json`)
        continue
      }
      const v =
        typeof t.value === "string"
          ? t.value
          : (t.value[theme] ?? t.value.light)
      if (v !== value)
        fail(
          `tokens: --${name} (${theme}) is ${value} in globals.css, ${v} in src/tokens.json`
        )
    }
  }
  for (const t of tokens.color.tokens) {
    if (
      !(t.name in themes.light) &&
      !/^Added in the design system/.test(t.usage ?? "")
    )
      fail(
        `tokens: ${t.name} is in src/tokens.json but not in globals.css (start its usage with "Added in the design system" if intended)`
      )
  }
}

// 2. inventory
const components = JSON.parse(read(path.join(SRC, "components.json")))
{
  const listed = new Set(components.map((c) => c.file))
  for (const f of fs
    .readdirSync(path.join(UI, "components"))
    .filter((f) => f.endsWith(".tsx"))) {
    if (!listed.has(f.replace(/\.tsx$/, "")))
      fail(
        `inventory: packages/ui/src/components/${f} has no entry in src/components.json`
      )
  }
  for (const c of components) {
    if (!fs.existsSync(path.join(UI, "components", `${c.file}.tsx`)))
      fail(`inventory: ${c.name} points at missing ${c.file}.tsx`)
    for (const f of ["preview.tsx", "README.md", "types.d.ts"]) {
      if (!fs.existsSync(path.join(SRC, "components", c.name, f)))
        fail(`inventory: src/components/${c.name}/${f} is missing`)
    }
  }
}

// 3. previews
{
  const cache = path.join(PKG, "dist/.cache/check")
  fs.mkdirSync(cache, { recursive: true })
  for (const c of components) {
    const file = path.join(SRC, "components", c.name, "preview.tsx")
    if (!fs.existsSync(file)) continue
    try {
      const r = await esbuild.build({
        stdin: {
          contents: `import Demo from ${JSON.stringify(file)}; import {createElement} from "react"; import {renderToString} from "react-dom/server"; module.exports = () => renderToString(createElement(Demo));`,
          resolveDir: PKG,
          loader: "tsx",
        },
        bundle: true,
        write: false,
        format: "cjs",
        platform: "node",
        logLevel: "error",
        jsx: "automatic",
        alias: { "@workspace/ui": UI },
        external: ["react", "react-dom", "react/*", "react-dom/*"],
        absWorkingDir: PKG,
      })
      const tmp = path.join(cache, `${c.name}.cjs`)
      fs.writeFileSync(tmp, r.outputFiles[0].text)
      delete require.cache[tmp]
      require(tmp)()
    } catch (e) {
      fail(`previews: ${c.name} — ${String(e.message).split("\n")[0]}`)
    }
  }
}

// 5. libraries: the design-system page drops any entry that breaks its rules, and every preview then
//    fails (they take React and the icons from these files)
{
  const file = path.join(PKG, "dist/libraries.json")
  if (fs.existsSync(file)) {
    for (const lib of JSON.parse(read(file))) {
      if (!/^[a-z][a-z0-9._-]{0,40}$/.test(lib.name))
        fail(
          `libraries: name ${JSON.stringify(lib.name)} must match /^[a-z][a-z0-9._-]{0,40}$/`
        )
      if (!/^\d{1,4}(?:\.\d{1,4}){0,2}$/.test(lib.version))
        fail(
          `libraries: ${lib.name} version ${JSON.stringify(lib.version)} must be up to three numbers`
        )
      if (!/^components\/lib\/[^/]{1,120}\.m?js$/.test(lib.file))
        fail(
          `libraries: ${lib.name} file must be one .js under components/lib/`
        )
      if (!/^[A-Za-z_$][\w$]*$/.test(lib.global))
        fail(`libraries: ${lib.name} global must be a JS identifier`)
      if (!fs.existsSync(path.join(PKG, "dist/project", lib.file)))
        fail(`libraries: ${lib.file} was not built`)
    }
  }
}

// 4. icons
{
  const lib = path.join(PKG, "dist/project/components/lib/phosphor-regular.js")
  if (!fs.existsSync(lib))
    console.log("icons: skipped (run npm run build first)")
  else {
    const React = require("react")
    const { renderToStaticMarkup: render } = require("react-dom/server")
    const real = await import("@phosphor-icons/react")
    globalThis.window = { React }
    new Function(read(lib))()
    const mine = globalThis.window.NuzlockeIcons
    const sets = [
      {},
      { size: 24 },
      {
        size: "2rem",
        color: "red",
        mirrored: true,
        alt: "Alt",
        className: "c",
      },
    ]
    let n = 0,
      bad = 0
    for (const name of Object.keys(mine)) {
      if (name === "IconContext") continue
      if (!real[name]) {
        fail(`icons: ${name} is not exported by @phosphor-icons/react`)
        continue
      }
      for (const p of sets) {
        n++
        if (
          render(React.createElement(real[name], p)) !==
          render(React.createElement(mine[name], p))
        )
          bad++
      }
    }
    if (bad)
      fail(`icons: ${bad} of ${n} renders differ from @phosphor-icons/react`)
    else console.log(`icons: ${n} renders match @phosphor-icons/react`)
  }
}

if (failures.length) {
  console.error(failures.map((f) => `✗ ${f}`).join("\n"))
  process.exit(1)
}
console.log(
  `ok: tokens match globals.css, ${components.length} components complete, previews render`
)
