# Issue tracker: Linear

Issues and specs for this repo live in Linear, team **NuzlockeGG**. Use the Linear MCP tools for all operations (not `gh issue`; the GitHub remote is for code and PRs only).

## Conventions

- **Create an issue**: `save_issue` with `team: "NuzlockeGG"`, `title`, `description` (Markdown). New issues go to `Backlog` unless they are ready to work on (`Todo`).
- **Read an issue**: `get_issue` with the identifier (e.g. `<KEY>-123`), then `list_comments` for the discussion.
- **List issues**: `list_issues` with `team: "NuzlockeGG"` and filters such as `state`, `assignee`, `parentId`, `query`.
- **Comment on an issue**: `save_comment`.
- **Change status**: `save_issue` with `id` and `state`. Workflow: Backlog → Todo → In Progress → In Review → Done. Use `Canceled` for won't-do and `Duplicate` (with `duplicateOf`) for duplicates.
- **Close**: set `state: "Done"` (or `Canceled`) and leave a comment saying why.

No triage labels are used. Status is the only workflow signal.

## When a skill says "publish to the issue tracker"

Create a Linear issue in the NuzlockeGG team.

## When a skill says "fetch the relevant ticket"

Run `get_issue` on the identifier, then `list_comments`.

## Wayfinding operations

Used by `/wayfinder`. The **map** is one parent issue. Its **child** issues are the tickets.

Wayfinder labels live in a single-select Linear label group named **Wayfinder**, not as colon-separated names. Where the skill says `wayfinder:<x>`, apply the child label `<x>` (Title Case) from that group:

| Skill says            | Linear label          |
| --------------------- | --------------------- |
| `wayfinder:map`       | Wayfinder → Map       |
| `wayfinder:research`  | Wayfinder → Research  |
| `wayfinder:prototype` | Wayfinder → Prototype |
| `wayfinder:grilling`  | Wayfinder → Grilling  |
| `wayfinder:task`      | Wayfinder → Task      |

Apply with `save_issue` and `addLabels: ["Map"]` (etc.). Filter with `list_issues` and `label: "Map"`. The labels already exist; don't create new ones.

- **Map**: one issue with the `Map` label. Its description holds the Notes / Decisions-so-far / Fog sections.
- **Child ticket**: a sub-issue of the map (`save_issue` with `parentId: <map>`). Label: one of `Research` / `Prototype` / `Grilling` / `Task`.
- **Blocking**: native Linear relations (`save_issue` with `blockedBy: [...]`). A ticket is unblocked when every blocker is Done or Canceled.
- **Frontier query**: `list_issues` with `parentId: <map>`, open states only. Drop tickets that have an open blocker or an assignee. The first one in map order wins.
- **Claim**: `save_issue` with `assignee: "me"` and `state: "In Progress"`. This is the session's first write.
- **Resolve**: `save_comment` with the answer, set `state: "Done"`, then add a context pointer (summary + link) to the map's Decisions-so-far.
