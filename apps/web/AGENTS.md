# Web app

These rules cover framework behavior that the code does not show. Each one comes from a bug in an earlier project with the same stack.

## Server Actions: let navigation errors through

`redirect()`, `notFound()`, `forbidden()`, and `unauthorized()` navigate by throwing an error that Next catches. A `catch` around a Server Action call catches that error first. The navigation then does not happen, and the user sees an error toast instead.

- In a `catch` around a Server Action call inside a transition, call `unstable_rethrow(error)` (from `next/navigation`) on the first line. Handle the real failure after it.
- Put this catch in one shared helper, and use that helper for each write.
- A detached promise chain (outside a transition) has no boundary to receive the rethrown error. Decide in that catch what the user sees.

headcanon's Next binding already does this for changes to a Run (`delivery-cancelled`). The rule applies to the plain actions, such as create, join, leave, Display Name, and delete account.

## Predicted changes: keep the control enabled

A predicted change shows its new value at once, and the prediction is the feedback. Keep the control enabled while the change is pending. Rapid taps are valid intent: headcanon applies each one to the prediction, refuses one that is not valid, and keeps the order. `disabled={pending}` brings back the wait that predictions remove.

The exception is a change that has no client prediction, where success is a navigation. Show a busy state for it.

## Transitions: pending state is shared

React 19 joins all pending transition work, including Actions, `router.refresh()`, navigations, and the new RSC payload that a Server Action returns. None of it commits until all of it settles.

- `isPending` from `useTransition` says that some transition work is pending. It does not say that your operation is complete. To know when one operation is complete, await that operation's own promise.
- Inside `startTransition`, await only work that ends by itself in a bounded time. A wait that needs a React commit (a router refresh, a new prop, an effect) never ends, because the pending Action blocks that commit. All navigation then stops too. A wait with no limit, such as a pause for a manual retry, has the same result.

## Postgres errors: read the whole cause chain

Drizzle wraps the driver error, so the SQLSTATE `code` is on `error.cause`, sometimes more than one level down. Examples are `23505` (unique violation, such as a second Pokémon for one Encounter) and `40001` (serialization failure). To classify a database error, follow the `cause` chain through every object, including `Error` instances. Read `code` at each level, and stop if the chain loops. Test the classifier with an error from a real Postgres, not a hand-made object.

## Signing in as an agent

Google sign-in needs a person, so local development has dev sign-in. It signs in as the account with the email in `DEV_AUTH_EMAIL` and makes that account on first use. It is off in a production build, without `DEV_AUTH_EMAIL`, on a host that is not localhost, and for an account that signs in with Google. Use an email that nobody signs in with, such as `dev@nuzlocke.test`.

- In a browser: open `/sign-in` and select "Dev sign in". The first time, the name step follows.
- From a script: `POST /api/dev/sign-in` sets the session cookie and returns it in the body. `POST /api/dev/sign-out` ends the session.
- The `web-local-db` launch configuration sets `DEV_AUTH_EMAIL` and uses the test database of `compose.test.yaml`. Start that database with `docker compose -f apps/web/compose.test.yaml up -d`.

Playwright does not use dev sign-in: `e2e/players.ts` makes each session in the database.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
