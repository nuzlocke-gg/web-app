// Builds the nuzlocke.gg design system for Claude Design from packages/ui.
// Output: dist/project/ — the files of the Design System artifact (see README.md).
// usage: node scripts/build.mjs [--test]   --test also writes local test pages to dist/test/
import * as esbuild from "esbuild"
import { execSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import postcss from "postcss"
import tailwind from "@tailwindcss/postcss"

import { buildIcons } from "./icons.mjs"
import wrapperCss from "./wrapper-css.mjs"
import { writeTestPages } from "./test-pages.mjs"

const PKG = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const REPO = path.resolve(PKG, "../..")
const UI = path.join(REPO, "packages/ui/src")
const SRC = path.join(PKG, "src")
const DIST = path.join(PKG, "dist")
const OUT = path.join(DIST, "project")
const CACHE = path.join(DIST, ".cache")
const NS = "Nuzlocke"
const FONTS_URL =
  "https://fonts.googleapis.com/css2?family=Geist:wght@400;500&family=Geist+Mono:wght@400;500&display=swap"
// classes for tokens that no shipped component uses
const SAFELIST =
  "text-warning bg-warning/10 dark:bg-warning/20 border-warning/30 dark:border-warning/40 *:[svg]:text-warning"

const COMPONENTS = JSON.parse(
  fs.readFileSync(path.join(SRC, "components.json"), "utf8")
)
const read = (p) => fs.readFileSync(p, "utf8")
const write = (rel, text) => {
  const p = path.join(OUT, rel)
  fs.mkdirSync(path.dirname(p), { recursive: true })
  fs.writeFileSync(p, text)
}
const safeScript = (js) =>
  js.replace(/<\/script/gi, "<\\/script").replace(/<!--/g, "\\x3C!--")

const common = {
  bundle: true,
  minify: true,
  format: "iife",
  platform: "browser",
  target: "es2020",
  define: { "process.env.NODE_ENV": '"production"' },
  legalComments: "none",
  logLevel: "warning",
  absWorkingDir: PKG,
}

// The jsx runtime as calls to window.React.createElement
const JSX_SHIM = `var R=window.React;function mk(t,p,k){var c=p.children,r={};for(var n in p)if(n!=="children")r[n]=p[n];if(k!==undefined)r.key=k;return c===undefined?R.createElement(t,r):Array.isArray(c)?R.createElement.apply(null,[t,r].concat(c)):R.createElement(t,r,c)}module.exports={jsx:mk,jsxs:mk,jsxDEV:mk,Fragment:R.Fragment};`

// Resolve these imports to window globals instead of bundling them
function globals(map) {
  const exact = new Map(Object.entries(map).filter(([k]) => !k.endsWith("*")))
  const prefixes = Object.entries(map)
    .filter(([k]) => k.endsWith("*"))
    .map(([k, v]) => [k.slice(0, -1), v])
  return {
    name: "globals",
    setup(b) {
      b.onResolve({ filter: /.*/ }, (a) => {
        if (exact.has(a.path)) return { path: a.path, namespace: "global" }
        if (prefixes.some(([p]) => a.path.startsWith(p)))
          return { path: a.path, namespace: "global" }
      })
      b.onLoad({ filter: /.*/, namespace: "global" }, (a) => ({
        contents:
          exact.get(a.path) ?? prefixes.find(([p]) => a.path.startsWith(p))[1],
        loader: "js",
      }))
    },
  }
}
const REACT_GLOBALS = {
  react: "module.exports=window.React;",
  "react-dom": "module.exports=window.ReactDOM;",
  "react-dom/client": "module.exports=window.ReactDOM;",
  "react/jsx-runtime": JSX_SHIM,
  "react/jsx-dev-runtime": JSX_SHIM,
}

// React 19 and React DOM as classic scripts: window.React, window.ReactDOM (with createRoot)
async function libs() {
  const react = await esbuild.build({
    ...common,
    write: false,
    stdin: { contents: `window.React=require("react");`, resolveDir: PKG },
  })
  write("components/lib/react.production.min.js", react.outputFiles[0].text)
  const dom = await esbuild.build({
    ...common,
    write: false,
    plugins: [globals({ react: "module.exports=window.React;" })],
    stdin: {
      contents: `window.ReactDOM=Object.assign({},require("react-dom"),require("react-dom/client"));`,
      resolveDir: PKG,
    },
  })
  write("components/lib/react-dom.production.min.js", dom.outputFiles[0].text)
}

const componentFiles = () =>
  fs
    .readdirSync(path.join(UI, "components"))
    .filter((f) => f.endsWith(".tsx"))
    .sort()

// The components take `ref` as a plain prop (React 19). React 18 drops a ref passed to a function
// component, so Base UI cannot measure triggers and anchors. On React < 19 each component is rebound
// to a forwardRef wrapper; module-local uses see the new binding too.
const REF_COMPAT = `export function __refCompat(fn) {
  var R = window.React;
  if (!R || parseInt(R.version, 10) >= 19) return fn;
  var W = R.forwardRef(function (props, ref) { return fn(ref ? Object.assign({}, props, { ref: ref }) : props); });
  W.displayName = fn.name;
  return W;
}`
function refCompat() {
  const dir = path.join(UI, "components")
  return {
    name: "ref-compat",
    setup(b) {
      b.onResolve({ filter: /^ref-compat$/ }, () => ({
        path: "ref-compat",
        namespace: "ref-compat",
      }))
      b.onLoad({ filter: /.*/, namespace: "ref-compat" }, () => ({
        contents: REF_COMPAT,
        loader: "js",
      }))
      b.onLoad({ filter: /\.tsx$/ }, (a) => {
        if (path.dirname(a.path) !== dir) return
        const src = read(a.path)
        const names = [...src.matchAll(/^function ([A-Z]\w*)\s*\(/gm)].map(
          (m) => m[1]
        )
        const tail = names.map((n) => `${n} = __refCompat(${n});`).join("\n")
        return {
          contents: `${src}\nimport { __refCompat } from "ref-compat";\n${tail}\n`,
          loader: "tsx",
        }
      })
    },
  }
}

// Every export of packages/ui/src/components on window.Nuzlocke, plus the icons and the wrapper runtime
async function bundle() {
  const entry = componentFiles()
    .map(
      (f) =>
        `export * from "@workspace/ui/components/${f.replace(/\.tsx$/, "")}";`
    )
    .join("\n")
  const r = await esbuild.build({
    ...common,
    write: false,
    globalName: NS,
    alias: { "@workspace/ui": UI },
    plugins: [globals(REACT_GLOBALS), refCompat()],
    stdin: { contents: entry, resolveDir: PKG, loader: "ts" },
  })
  const js = safeScript(
    r.outputFiles[0].text.replace(new RegExp(`^var ${NS}=`), `window.${NS}=`)
  )
  const header = {
    format: 4,
    namespace: NS,
    components: COMPONENTS.map((c) => ({ name: c.name })),
  }
  // components/lib/phosphor-regular.js loads before this file: copy its icons onto window.Nuzlocke
  const merge = `if(window.NuzlockeIcons)Object.assign(window.${NS},window.NuzlockeIcons);`
  const compat = read(path.join(PKG, "scripts/canvas-compat.js"))
  write(
    "components/bundle.js",
    `/* @ds-bundle: ${JSON.stringify(header)} */\n${js}\n${merge}\n${compat}`
  )
}

// The token values from tokens.json, in a layer declared last: they beat Tailwind's theme layer, and
// an unlayered tokens.css (written by the design-system page) still beats them.
function tokensLayer(t) {
  const [first, ...rest] = t.color.themes.map((th) => th.id)
  const val = (tok, th) =>
    typeof tok.value === "string"
      ? tok.value
      : (tok.value[th] ?? tok.value[first])
  const decl = (name, v) =>
    `--${name}:${String(v).replace(/^\{(.+)\}$/, "var(--$1)")};`
  const base = [
    ...t.color.tokens.map((tok) => decl(tok.name, val(tok, first))),
    ...(t.shadow?.tokens ?? []).map((tok) => decl(tok.name, val(tok, first))),
    ...t.radius.tokens.map((tok) => decl(tok.name, tok.value)),
    ...Object.entries(t.type.families).map(([k, v]) => decl(`font-${k}`, v)),
  ].join("")
  const themes = rest.map((th) => {
    const sel =
      th === "dark" ? `[data-theme="dark"],.dark` : `[data-theme="${th}"]`
    const decls = t.color.tokens
      .filter((tok) => typeof tok.value === "object" && tok.value[th])
      .map((tok) => decl(tok.name, tok.value[th]))
    return `${sel}{${decls.join("")}}`
  })
  return `@layer nuzlocke-tokens{:root,[data-theme="${first}"]{${base}}${themes.join("")}}`
}

// globals.css compiled by Tailwind over packages/ui and the previews, then made wrapper-tolerant
async function css(tokens) {
  let entry = read(path.join(UI, "styles/globals.css"))
    // the :root/.dark blocks are replaced by tokensLayer()
    .replace(/^:root\s*\{[\s\S]*?^\}\s*$/m, "")
    .replace(/^\.dark\s*\{[\s\S]*?^\}\s*$/m, "")
    // Claude Design sets data-theme on <html>; the app sets the class
    .replace(
      /@custom-variant dark[^;]*;/,
      `@custom-variant dark (&:is(.dark *, [data-theme="dark"] *));`
    )
    .replace(/@source[^;]*;\n/g, "")
    // next/font sets --font-sans in the app; here it would point at itself
    .replace(/^\s*--font-sans: var\(--font-sans\);\n/m, "")
  entry = entry.replace(
    /(@custom-variant[^;]*;)/,
    `$1\n@source "${UI}/**/*.{ts,tsx}";\n@source "${SRC}/components/**/*.tsx";\n@source inline("${SAFELIST}");`
  )
  const from = path.join(CACHE, "entry.css")
  fs.mkdirSync(CACHE, { recursive: true })
  fs.writeFileSync(from, entry)
  const res = await postcss([
    tailwind({ base: PKG, optimize: { minify: true } }),
    wrapperCss(),
  ]).process(entry, { from })
  write(
    "components/bundle.css",
    `@import url("${FONTS_URL}");\n${res.css}\n${tokensLayer(tokens)}\n`
  )
}

// One preview.html per component: src/components/<Name>/preview.tsx against window.Nuzlocke
async function previews() {
  for (const c of COMPONENTS) {
    const file = path.join(SRC, "components", c.name, "preview.tsx")
    const r = await esbuild.build({
      ...common,
      write: false,
      plugins: [
        globals({
          ...REACT_GLOBALS,
          "@workspace/ui/components/*": `module.exports=window.${NS};`,
          "@phosphor-icons/react": `module.exports=window.${NS};`,
        }),
      ],
      stdin: {
        contents: `import Demo from ${JSON.stringify(file)};\nimport * as React from "react";\nwindow.ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(Demo));`,
        resolveDir: PKG,
        loader: "tsx",
      },
    })
    write(
      `components/${c.name}/preview.html`,
      `<!-- @dsCard group="${c.group}" height=${c.height} -->
<!doctype html>
<html>
<head><meta charset="utf-8"><title>${c.name} — preview</title>
<style>body{margin:0;background:var(--background);color:var(--foreground);font-family:var(--font-sans)}#root{padding:24px}</style>
</head>
<body>
<div id="root"></div>
<script>
/* preview only: open overlays focus without scrolling the page around this card */
var __f=HTMLElement.prototype.focus;HTMLElement.prototype.focus=function(o){return __f.call(this,Object.assign({preventScroll:true},o))};
${safeScript(r.outputFiles[0].text)}</script>
</body>
</html>
`
    )
  }
}

// Guides, brand book, tokens (with the source commit), cover and the types file
function content(tokens, icons) {
  write("README.md", read(path.join(SRC, "README.md")))
  write("components/Cover/preview.html", read(path.join(SRC, "cover.html")))
  const types = [
    "/* nuzlocke.gg — component types (documentation). Components read from window.Nuzlocke. */",
    'import type * as React from "react";',
    "",
  ]
  for (const c of COMPONENTS) {
    const dir = path.join(SRC, "components", c.name)
    write(`components/${c.name}/README.md`, read(path.join(dir, "README.md")))
    types.push(`// ── ${c.name}`, read(path.join(dir, "types.d.ts")).trim(), "")
  }
  types.push(
    "// ── Icons: every Phosphor icon (components/lib/phosphor-regular.js), regular weight only; `weight` is accepted but always draws regular",
    'export interface IconProps extends React.SVGProps<SVGSVGElement> { size?: number | string; color?: string; mirrored?: boolean; alt?: string; weight?: "thin" | "light" | "regular" | "bold" | "fill" | "duotone" }',
    "export type Icon = React.ForwardRefExoticComponent<IconProps & React.RefAttributes<SVGSVGElement>>",
    '/** Default size, color and mirroring for every icon below it. Default: { color: "currentColor", size: "1em", mirrored: false }. */',
    'export declare const IconContext: React.Context<Omit<IconProps, "ref">>',
    ...icons.names.map((n) => `export declare const ${n}: Icon`),
    "",
    `declare global { interface Window { ${NS}: Record<string, unknown> } }`,
    ""
  )
  write("components/index.d.ts", types.join("\n"))

  const git = (cmd) => {
    try {
      return execSync(`git ${cmd}`, { cwd: REPO }).toString().trim()
    } catch {
      return ""
    }
  }
  const out = structuredClone(tokens)
  out.meta = {
    ...out.meta,
    ref: `${git("rev-parse --abbrev-ref HEAD") || "main"}@${git("rev-parse --short HEAD") || "unknown"}${git("status --porcelain packages/ui") ? "+local" : ""}`,
    synced: new Date().toISOString().slice(0, 10),
    components: Object.fromEntries(
      COMPONENTS.map((c) => [
        c.name,
        `packages/ui/src/components/${c.file}.tsx`,
      ])
    ),
  }
  write("tokens.json", JSON.stringify(out, null, 2) + "\n")
}

const tokens = JSON.parse(read(path.join(SRC, "tokens.json")))
fs.rmSync(OUT, { recursive: true, force: true })
const t0 = Date.now()
await libs()
const icons = await buildIcons(
  path.join(OUT, "components/lib/phosphor-regular.js"),
  CACHE
)
await bundle()
await css(tokens)
await previews()
content(tokens, icons)
// the index's `libraries` list (design-system.json is the artifact's own; merge this into it on publish).
// Previews take their icons from window.Nuzlocke, so they all fail if a library here is dropped.
fs.writeFileSync(
  path.join(DIST, "libraries.json"),
  JSON.stringify(
    [
      {
        name: "react",
        version: JSON.parse(
          read(path.join(REPO, "node_modules/react/package.json"))
        ).version,
        global: "React",
        file: "components/lib/react.production.min.js",
      },
      {
        name: "react-dom",
        version: JSON.parse(
          read(path.join(REPO, "node_modules/react-dom/package.json"))
        ).version,
        global: "ReactDOM",
        file: "components/lib/react-dom.production.min.js",
      },
      {
        // the page drops a library whose name is not /^[a-z][a-z0-9._-]{0,40}$/ (no scope)
        name: "phosphor-icons",
        version: icons.version,
        global: "NuzlockeIcons",
        file: "components/lib/phosphor-regular.js",
      },
    ],
    null,
    2
  ) + "\n"
)
if (process.argv.includes("--test"))
  writeTestPages({ dist: DIST, components: COMPONENTS })
const files = []
;(function walk(d) {
  for (const f of fs.readdirSync(d, { withFileTypes: true }))
    f.isDirectory()
      ? walk(path.join(d, f.name))
      : files.push(path.join(d, f.name))
})(OUT)
const bytes = files.reduce((s, f) => s + fs.statSync(f).size, 0)
console.log(
  `dist/project: ${files.length} files, ${(bytes / 1024).toFixed(0)} KB, ${COMPONENTS.length} components, ${icons.names.length} icons (${Date.now() - t0} ms)`
)
