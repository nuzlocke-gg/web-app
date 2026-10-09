# shadcn/ui monorepo template

This is a Next.js monorepo template with shadcn/ui.

## Adding components

To add components to your app, run the following command at the root of your `web` app:

```bash
pnpm dlx shadcn@latest add button -c apps/web
```

This will place the ui components in the `packages/ui/src/components` directory.

## Using components

To use the components in your app, import them from the `ui` package.

```tsx
import { Button } from "@workspace/ui/components/button";
```

## Sprites

The Pokémon sprites are not under this project's licence. Pokémon and the sprites are © Nintendo, Creatures Inc., and GAME FREAK inc. They are not in this repository: the build copies them from a pinned commit of the [PokeAPI sprites repository](https://github.com/PokeAPI/sprites), so a first build needs network access. See `packages/game-data/README.md`.
