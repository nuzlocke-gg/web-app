// PROTOTYPE (NUZ-44). `node packages/game-data/prototype/build-explorer.ts`
// Inlines model.ts and fixture.ts (types stripped) into explorer.html, so the
// page opens by double-click.

import { readFileSync, writeFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";

const read = (f: string) => readFileSync(new URL(f, import.meta.url), "utf8");
const js = (f: string) =>
  stripTypeScriptTypes(read(f))
    .replace(/^import[\s\S]*?from\s+"[^"]+";?\s*$/gm, "")
    .replace(/^export\s+/gm, "");
const module = `${js("./model.ts")}\n${js("./fixture.ts")}`;
writeFileSync(new URL("./explorer.html", import.meta.url), read("./explorer.template.html").replace("/*__MODULE__*/", () => module));
console.log("wrote explorer.html");
