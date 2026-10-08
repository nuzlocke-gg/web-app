// Every Phosphor icon, regular weight only, as React components with @phosphor-icons/react's API
// (same names, props and IconContext; `weight` is accepted but always draws regular). Reads the
// version installed in the repo, so it changes only when that version does.
import * as esbuild from "esbuild"
import fs from "node:fs"
import { createRequire } from "node:module"
import path from "node:path"

const require = createRequire(import.meta.url)

export async function buildIcons(outFile, cacheDir) {
  const pkg = path.dirname(
    require.resolve("@phosphor-icons/react/package.json")
  )
  const version = JSON.parse(
    fs.readFileSync(path.join(pkg, "package.json"), "utf8")
  ).version
  const csr = path.join(pkg, "dist/csr")
  const defsDir = path.join(pkg, "dist/defs")

  // export name (…Icon) -> outline module, from each csr module's import and exports
  const names = {}
  for (const f of fs.readdirSync(csr).filter((f) => f.endsWith(".es.js"))) {
    const src = fs.readFileSync(path.join(csr, f), "utf8")
    const def = /from "\.\.\/defs\/(\w+)\.es\.js"/.exec(src)?.[1]
    for (const [, n] of src.matchAll(/as (\w+Icon)\b/g)) names[n] = def
  }

  // evaluate the outline modules against a fake React that records the element tree
  const FAKE = `const F = Symbol("Fragment");
module.exports = { Fragment: F, createElement: (t, p, ...c) => ({ t: t === F ? "#" : t, p: p || {}, c: c.flat() }) };`
  fs.mkdirSync(cacheDir, { recursive: true })
  const used = [...new Set(Object.values(names))].sort()
  const entry =
    used
      .map(
        (d, i) =>
          `import d${i} from ${JSON.stringify(path.join(defsDir, `${d}.es.js`))};`
      )
      .join("\n") +
    `\nmodule.exports = {${used.map((d, i) => `${JSON.stringify(d)}: d${i}`).join(",")}};`
  const r = await esbuild.build({
    stdin: { contents: entry, resolveDir: cacheDir, loader: "js" },
    bundle: true,
    write: false,
    format: "cjs",
    platform: "node",
    logLevel: "error",
    plugins: [
      {
        name: "fake-react",
        setup(b) {
          b.onResolve({ filter: /^react$/ }, () => ({
            path: "react",
            namespace: "fake",
          }))
          b.onLoad({ filter: /.*/, namespace: "fake" }, () => ({
            contents: FAKE,
            loader: "js",
          }))
        },
      },
    ],
  })
  const tmp = path.join(cacheDir, "phosphor-defs.cjs")
  fs.writeFileSync(tmp, r.outputFiles[0].text)
  const defs = require(tmp)

  // element tree -> compact [tag, attrs, ...children]
  const pack = (n) => [n.t, n.p, ...n.c.filter(Boolean).map(pack)]
  const data = {}
  for (const d of used) {
    const regular = defs[d].get("regular")
    if (!regular || regular.t !== "#")
      throw new Error(`${d}: no regular-weight fragment`)
    data[d] = regular.c.filter(Boolean).map(pack)
  }

  // mirrors @phosphor-icons/react's IconBase so the markup is identical (checked by `npm run test`)
  const runtime = `/* Phosphor Icons ${version} (MIT, phosphoricons.com), regular weight only. Generated for the nuzlocke.gg design system. */
(function () {
  var R = window.React;
  var D = ${JSON.stringify(data)};
  var N = ${JSON.stringify(names)};
  var IconContext = R.createContext({ color: "currentColor", size: "1em", weight: "regular", mirrored: false });
  var OWN = { alt: 1, color: 1, size: 1, weight: 1, mirrored: 1, children: 1, weights: 1 };
  var CTX = { color: 1, size: 1, weight: 1, mirrored: 1 };
  function el(n) { return R.createElement.apply(null, [n[0], n[1]].concat(n.slice(2).map(el))); }
  function make(name, key) {
    var shape = null;
    var C = R.forwardRef(function (s, ref) {
      var ctx = R.useContext(IconContext), rest = {}, w = {}, k;
      for (k in s) if (!OWN[k]) rest[k] = s[k];
      for (k in ctx) if (!CTX[k]) w[k] = ctx[k];
      var size = s.size != null ? s.size : ctx.size;
      var color = s.color != null ? s.color : ctx.color === undefined ? "currentColor" : ctx.color;
      if (!shape) shape = R.createElement.apply(null, [R.Fragment, null].concat(D[key].map(el)));
      var props = Object.assign({ ref: ref, xmlns: "http://www.w3.org/2000/svg", width: size, height: size, fill: color,
        viewBox: "0 0 256 256", transform: s.mirrored || ctx.mirrored ? "scale(-1, 1)" : undefined }, w, rest);
      return R.createElement("svg", props, !!s.alt && R.createElement("title", null, s.alt), s.children, shape);
    });
    C.displayName = name;
    return C;
  }
  var icons = { IconContext: IconContext };
  for (var name in N) icons[name] = make(name, N[name]);
  window.NuzlockeIcons = icons;
  if (window.Nuzlocke) Object.assign(window.Nuzlocke, icons);
})();
`
  fs.mkdirSync(path.dirname(outFile), { recursive: true })
  fs.writeFileSync(outFile, runtime)
  return { names: Object.keys(names).sort(), version }
}
