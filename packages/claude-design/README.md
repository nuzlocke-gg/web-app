# @workspace/claude-design

Builds the nuzlocke.gg design system for [Claude Design](https://claude.ai/artifact/9CktMtc38XzkxhY9hFMJrv) from `@workspace/ui`. The output is a compiled bundle (components, CSS, tokens, icons, guides and previews) that runs without a bundler or Tailwind, on React 18 or 19. The app does not use this package; `@workspace/ui` stays the source of truth.

## Commands

Run from the repo root, or drop `-w @workspace/claude-design` inside this folder.

```bash
npm run generate -w @workspace/claude-design
```

Writes `dist/project/` (the design system's files) and `dist/libraries.json`. Add `:test` (`generate:test`) to also write local test pages.

```bash
npm run test -w @workspace/claude-design
```

Fails if a color in `globals.css` differs from `src/tokens.json`, a `packages/ui` component has no entry here, a preview throws when rendered, or the generated icons render differently from `@phosphor-icons/react` (after a build).

```bash
npm run serve -w @workspace/claude-design
```

Serves `dist/` for the test pages: `test/gallery.html` (`?v=react19|react18|canvas`, `&theme=dark`, `&only=Button,Card`) and `test/compare.html`, which renders every preview with and without a `display: contents` wrapper around each component and icon, as the Design canvas mounts them, and lists any element whose box or key styles differ.

## What lives where

| Path | What |
| --- | --- |
| `src/README.md` | The brand book: usage rules for people and agents |
| `src/tokens.json` | Tokens in the Design System format, with usage notes. Colors must match `globals.css` (`check` enforces it); a token that exists only here starts its usage with "Added in the design system" |
| `src/components.json` | One entry per component: name, `packages/ui` file, group and preview height |
| `src/components/<Name>/` | `preview.tsx` (imports from `@workspace/ui/components/*` like app code), `README.md` (the guide), `types.d.ts` (documentation types) |
| `src/cover.html` | The cover shown above the brand book |
| `scripts/build.mjs` | The build: React libs, icons, bundle, CSS, previews, content |
| `scripts/icons.mjs` | Every Phosphor icon, regular weight only, with Phosphor's API |
| `scripts/wrapper-css.mjs` | Copies every child, sibling and position rule so it also matches through a `display: contents` wrapper |
| `scripts/canvas-compat.js` | Runs in the bundle: tags those wrappers `data-ds-contents`; restores the InputGroup addon click |

How the build adapts the components (none of this is needed in the app):

- **React 18:** each component is wrapped in `forwardRef` when React is older than 19, so refs reach Base UI.
- **CSS:** Tailwind compiles `globals.css` over `packages/ui` and the previews. The token values come from `src/tokens.json`, in a layer that a design-system `tokens.css` can still override. Dark mode follows `data-theme="dark"` as well as `.dark`.
- **Wrappers:** Claude Design mounts each component in its own `display: contents` element. That breaks `A > B`, `A ~ B` and `:first-child`-style rules. `wrapper-css.mjs` adds copies of those rules that look through the wrapper.

## Adding or changing a component

1. Add or change it in `packages/ui` (for shadcn components: `npx shadcn add <name> -c apps/web`).
2. Add an entry to `src/components.json` and a folder `src/components/<Name>/` with `preview.tsx`, `README.md` and `types.d.ts`. Copy an existing component's files as a start.
3. Run `generate:test`, then `test` and `typecheck`, and look at the preview in `test/gallery.html` and `test/compare.html`.
4. Publish (below).

## Publishing

Publishing goes through Claude's Artifact tool; there is no API token for CI. Ask Claude to publish `packages/claude-design/dist/project` to the design system. Claude reads the system's `project/design-system.json` first. It keeps every key there, replaces `libraries` with `dist/libraries.json`, sets `lastChange`, and sends the changed files under `project/`.
