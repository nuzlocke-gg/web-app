# Contributing

## Engineering Principles

> _Perfection is lots of little things done well_
>
> — Marco Pierre White

### How to read this section

Not every principle has the same force:

- **Must** marks a correctness, security, or data-integrity requirement. Depart only through an
  explicit exception that names the risk and its compensating control.
- **Default** marks a design choice that usually pays for itself. Contrary local evidence may
  override it.
- **Diagnostic** marks a reason to investigate, not a verdict or an instruction to refactor.

Unless a principle uses `must`, `never`, or equivalent as an instruction, read it as a Default. The
Diagnostics section contains Diagnostics. The purpose of this distinction is to preserve judgment
while making clear which constraints judgment may not silently waive.

### Organizing idea: authority, home, and derivation

Most avoidable complexity comes from a fact, decision, or rule having no clear home, or from several
places acting as its authority. Ask where each becomes knowable, which lifetime it belongs to, which
context can enforce it, and how its consequences reach the rest of the system. Make the choice once
at that home; preserve what was learned at boundaries; derive or synchronize every other
representation explicitly; hide the resulting complexity behind the smallest useful interface.

### Working method

- Before editing, define the intended outcome and how it will be verified. State assumptions when
  ambiguity could materially change the result; otherwise make a reasonable choice and proceed.
- Read the nearest project instructions, source of truth, enforcement gate, and existing code before
  encoding a rule. A schema shows what can be stored, not what the system permits.
- Seek the root cause before designing machinery. Ask which requirement creates the complexity and
  whether that requirement can be removed or reshaped.
- Make the narrowest coherent change. Preserve unrelated work and avoid opportunistic refactors.
- Do not disguise a workaround as a solution. If a workaround is proportionate, record the cause it
  contains, why the direct fix is unavailable, and what would make the workaround removable.
- Complete the feedback loop: run the checks that observe the changed contract, inspect their output,
  and verify user-visible work through the real interface when practical.
- Report the outcome, evidence, assumptions, and deliberately deferred concerns. Do not claim success
  from code inspection alone when executable verification is available.
- Review — including self-review — with a fault-finding frame: hunt for what is wrong rather than
  grading overall quality. Review by first seeking evidence that would disprove correctness, then assess the overall design. Do not let an encouraging global assessment excuse a concrete defect.

### Design vocabulary

Use these names as precise shorthand:

| Name                              | Meaning here                                                              |
| --------------------------------- | ------------------------------------------------------------------------- |
| Hunt & Thomas, DRY                | one authority for each piece of knowledge, not textual deduplication      |
| Parnas, information hiding        | a module hides a consequential design decision                            |
| Meyer, Single Choice              | decide a distinction once where it first becomes knowable                 |
| Ousterhout, deep modules          | substantial behavior behind a small interface                             |
| Feathers, seam                    | a place where behavior can be altered without editing that place          |
| Alexis King, parse-don't-validate | preserve evidence in a refined value instead of returning ambiguous input |

### Design defaults

- **One authority, explicit derivations.** Multiple representations are legitimate when their source,
  synchronization, staleness, ownership, and rebuild semantics are explicit. A cache or projection
  must not become an accidental second authority. (Hunt & Thomas.)
- **Hide decisions, not files.** A module may be a function, class, package, or tier-spanning slice.
  Its interface includes everything callers must know: types, invariants, ordering, errors,
  configuration, consistency, and performance characteristics. (Parnas.)
- **Prefer deep modules.** Give callers leverage through a small interface and keep change, knowledge,
  and verification local. Apply the deletion test: if removing a module spreads its decision across
  callers, it was useful; if only import paths change, it was ceremony. (Ousterhout.)
- **Let the interface be the test surface.** If callers or tests routinely reach through it, the
  module may hide the wrong thing. Keep internal seams private.
- **Require evidence for seams.** One adapter is hypothetical; two establish real variation. A facade
  may still earn its place by preventing a consequential vendor or package choice from fanning out,
  but do not prebuild speculative dependency injection. (Feathers.)
- **Home state according to lifetime.** When every way of transporting a fact feels awkward—copying,
  summarizing, or reconstructing it—question whether it lives on the wrong object. Cleanup and
  cancellation belong to the runtime that can still invoke them.
- **Decide distinctions once.** Resolve a choice where it first becomes knowable into a value, type,
  or handler that leaves downstream code blind to it. Repeated branches are the smell, not branches
  themselves. Use exhaustive discrimination when the behavior is a genuinely closed set. (Meyer.)
- **Put rules with the context that can enforce them.** Invariants live with the model whose valid
  states they define; parsing and preconditions live at trust boundaries; contextual policies live
  at the decision point with all required facts; authorization is enforced where protected data is
  accessed or changed.
- **Parse, don't validate.** Convert ambiguous input into values that carry the evidence downstream
  code needs. Do not scatter repeated checks over an unchanged, weakly typed value. (Alexis King.)
- **Abstract shared knowledge, not shared shape.** Similar code may encode different decisions.
  Extract when semantics and ownership are genuinely shared; do not import across peer domains merely
  to avoid duplicating a small type.
- **Names tell the truth.** A name must not misrepresent what a thing is, returns, or does; fix the
  name or the behavior rather than leaving them disagreeing.
- **Prefer cohesion over file or function count.** Keep things that change together together; split
  things that change for different reasons. Use composition when collaborators vary independently,
  and keep the happy path linear when guard clauses improve clarity.
- **Comments preserve information code cannot carry.** Record rationale, protocol and concurrency
  constraints, security assumptions, rejected alternatives, and workaround provenance. Do not
  narrate syntax. Promote normative comments to proportionate enforcement when possible.

### Boundaries and change

When the system crosses process, trust, persistence, or deployment boundaries:

- Derive identity, authorization, tenant, and protected routing facts from trusted context. Client
  claims may narrow a request only when disagreement fails closed.
- Prefer commands that express intent over client-composed aggregate state. The authority reads the
  current state, checks policy, applies the operation atomically, and returns the accepted result.
- Define concurrency and retry semantics explicitly. Choose version guards, transactions,
  commutative operations, serialization, idempotency, duplicate detection, or intentional
  last-writer-wins behavior; accidental last-writer-wins is not a strategy.
- Preserve round-trip tokens exactly. Versions, cursors, timestamps, and idempotency keys must not
  lose precision or change representation across a boundary.
- Evolve contracts without requiring synchronized deployment. Expand before contracting: deploy
  compatible readers and writers, migrate, observe, then remove the old form. Preserve rollback.
- Bound external work with timeouts, cancellation, and retry budgets. Retry only operations whose
  idempotency and load consequences are understood.

### Testing

- Test through the smallest interface that observes the contract: focused tests for pure rules,
  contract or integration tests for adapters, and end-to-end tests for critical user flows.
- Make a failure exist before trusting its fix when practical. Verify a regression test by
  reintroducing the regression, observing the intended failure, then restoring the fix.
- Use examples to explain cases and property-based tests (fast-check, QuickCheck, Hypothesis, or
  equivalent) for universal claims. Keep generators representative and total over domain variants;
  preserve minimized failures as regression examples when useful.
- Use mutation testing selectively to measure whether tests detect plausible faults, especially
  around pure, high-value rules. Surviving non-equivalent mutants expose unobserved behavior or weak
  assertions; mutation score is a diagnostic, not a target.
- Prove sophisticated tests, generators, and architecture gates can go red with a deliberate
  negative control before trusting them.
- For eventual positive state, poll the authority. For absence, define the event or observation
  window across which absence matters; neither an instant snapshot nor generic polling proves every
  negative claim.
- Isolate parallel tests by construction with unique data and tracked cleanup. A test double must
  preserve the ordering, failure, and consistency behavior relevant to the contract.
- Verification is proportional to risk, not convenience. Security boundaries, migrations,
  concurrency, and irreversible operations warrant stronger evidence than a local presentation edit.

### Diagnostics

Treat these as triggers to investigate, not automatic verdicts:

- State copied through several layers → does the fact live on an object with the wrong lifetime?
- The same branch repeated → was a distinction decided but never resolved into a useful shape?
- `kind` or `type` checked throughout core logic → is behavior open and capability-based, or is this
  a legitimate exhaustive operation over a closed set?
- A view type named for storage → is presentation re-deciding a persistence concern?
- Empty and absent conflated → does `null` mean "cannot" while `[]` means "can, but empty"?
- A sort feeds equality, hashing, signing, or encoding → is its order total and environment-independent?
- "It is type-only" excuses a dependency violation → what assumptions still cross the seam?
- A wrapper only delegates → what decision, policy, stability, or observability does it provide?
- A cleanup is locally tidier but conceptually awkward → which invariant did the old shape preserve?
- A test or gate has always been green → has a negative control shown it detects the claimed failure?

### Proportion

- Every mechanism has a cost. Right-size structure and enforcement to risk, repetition, and the cost
  of failure; a large codebase does not justify ceremony and a small one does not excuse insecurity.
- Model only what somebody reads, writes, computes, audits, or references. Before adding a field ask
  who consumes it; before adding a module ask which decision it hides.
- Prefer established language, library, framework, and design-system primitives when their contracts
  fit. Adapt cosmetic differences; replace them when behavior or ownership truly differs.
- When borrowing an architecture or pattern, adopt its modeling discipline, not its machinery. Each
  borrowed element earns its place by present need, not fidelity to the source's context.
- Make reversible decisions quickly and irreversible decisions deliberately. Preserve options where
  uncertainty is expensive, not where change is already cheap.
- Keep scope tight. Relocate contextual information instead of cramming or silently deleting it, and
  surface any behavior intentionally removed or deferred.
- Enforce a rule with the earliest reliable, proportionate mechanism: type, exhaustive table, static
  gate, test, runtime assertion, monitoring, or prose. These cover different failures; they are not a
  universal ladder.

### Distillation

0. **One authority for each piece of knowledge (DRY).**
1. **Keep it simple; don't get clever.**
2. **Give functions and files clear names and purposes.**
3. **Don't write inline comments except to explain a non-obvious decision.**
4. **Resist premature abstraction.**
5. **Favor composition over inheritance.**
6. **Keep the happy path linear; return early.**
7. **Write tests to enable confident refactoring.**
8. **Promote normative comments to enforcement (Design by Contract).**
9. **Decide a distinction once (Meyer's Single Choice Principle, Replace Conditionals with Polymorphism).**
10. **Home state on the object whose lifetime matches it.**

## Code Style

The Code Style guidelines apply to individual lines you write. These guidelines exist to ensure the codebase
is maintainable, easy to understand, and elegant.

### Strength

- **Must** identifies code that would mislead its reader or conceal behavior.
- **Default** identifies the clearest choice unless the code provides contrary evidence.
- **Diagnostic** identifies a reason to inspect the code, not an automatic refactor.

### Working method

1. Read the surrounding code and state the behavior the change must preserve or introduce.
2. Write the smallest direct implementation that follows the local idiom.
3. Read the result as its next maintainer. Remove avoidable cleverness, nesting, indirection, and
   explanation debt.
4. Improve code that the change must touch, but do not expand into unrelated cleanup.
5. Use the project's verification requirements; test design is outside this skill.

### 1. Write simple, direct code

> “Everyone knows that debugging is twice as hard as writing a program in the first place. So if
> you're as clever as you can be when you write it, how will you ever debug it?”
>
> — Brian Kernighan

Prefer the direct, idiomatic implementation with the fewest concepts a reader must hold at once.
Concise code is not necessarily simple: expand an expression into named steps when understanding it
would otherwise require mental execution, unusual language knowledge, or navigation through extra
indirection. Do not add extensibility for a variation that does not exist.

**Diagnostic:** Understanding an expression requires mentally executing nested callbacks,
conditionals, chains, or a non-obvious language feature. Would named intermediate values make its
sequence and meaning visible?

**Diagnostic:** An abstraction supports configuration, callbacks, or variants for which only one
real use exists. What present requirement earns that flexibility?

### 2. Give names and functions one truthful purpose

Names describe the role a value plays and the behavior a function performs. They must not hide an
effect or claim a narrower result than the code delivers. Prefer domain meaning such as
`eligiblePlanets` and `serializeTrigger` over placeholders such as `filteredItems`, `processData`,
`helper`, or `manager`.

Extract a function when it owns a coherent operation, rule, effect, useful boundary, or consequential
incidental detail. Do not extract merely to reduce line count. Never create a pass-through function
that only forwards arguments or gives a second name to one obvious expression: it adds navigation
without hiding a decision. Keep the expression inline until the function owns meaningful behavior.
Keep each function at one conceptual level: an orchestration function names its steps; the called
functions contain their details.

**Diagnostic:** A function changes purpose, conceptual level, or kind of work while reading it. Does
it contain more than one coherent operation? A function over 100 lines warrants this inspection, but
length alone is not the defect.

**Diagnostic:** A name such as `data`, `item`, `result`, `helper`, or `process` requires reading its
implementation to learn its domain role. What truth could the name carry?

### 3. Keep a pure core inside an explicit impure shell

Pure functions own calculations, decisions, validation, and transformations. An impure shell
coordinates input and output. A function that both calculates a rule and performs an effect has two
jobs; split it.

Pass every variable input to a pure function explicitly. It must not secretly read mutable
configuration, clocks, randomness, environment state, storage, or other external sources. Ordinary
parameters are enough; do not introduce dependency-injection machinery without another reason.

The shell may sequence effects, pass results between operations, and make trivial structural
adaptations. A policy branch or meaningful transformation in the shell is a Diagnostic: extract it
into a pure function so the workflow reads at one level.

```ts
import { readFile, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";

type Config = { outputDirectory: string };

function calculateOutputPath(filePath: string, config: Config): string {
  return join(config.outputDirectory, basename(filePath));
}

function transformContents(contents: string): string {
  return contents.trim();
}

async function transformFile(filePath: string, config: Config): Promise<void> {
  const contents = await readFile(filePath, "utf8");
  const outputPath = calculateOutputPath(filePath, config);
  const transformedContents = transformContents(contents);

  await writeFile(outputPath, transformedContents);
}
```

**Diagnostic:** Meaningful decisions or transformations are interleaved with side effects, so
testing the rule requires performing or mocking those effects. Can the result be calculated before
the shell applies it?

**Diagnostic:** A function presented as pure reads mutable configuration, the clock, randomness,
environment state, storage, or another variable dependency that is not an argument. Which input
should be explicit?

### 4. Make code explain itself

Code structure and names explain what the program does. Rewrite code instead of adding a comment
that narrates its syntax or compensates for a vague name.

Use an inline comment only for information code cannot carry: rationale, an external constraint, a
protocol or concurrency requirement, a counterintuitive trade-off, or the provenance of a necessary
workaround. A normative comment should become proportionate enforcement when possible.

**Diagnostic:** A comment restates control flow, data flow, or an expression, or compensates for a
vague name. Can the code carry the same information directly?

**Diagnostic:** A workaround or normative comment does not name its cause, constraint, enforcement,
or removal condition. Would a future maintainer know when it is safe to change?

### 5. Document the public surface

Every exported declaration and public member has a concise JSDoc description of its purpose. The
JSDocs should explain what the member is, what it does, and how to use it. Add parameter and
return documentation only when meaning, units, constraints, mutation, or failure
behavior is not evident from the signature. Do not repeat type information in prose.

Add an `@example` when correct use requires non-obvious setup, ordering, composition, callbacks,
structured input, or interpretation of a result. The example must teach something the signature and
description do not.

Do NOT narrativize in the JSDocs. Do NOT explain the inner workings of a function. Do NOT drop
project lore or factoids. The consumer doesn't need to know the member's life story. Treat JSDocs
as public documentation, not a novel.

**Diagnostic:** A consumer must inspect the implementation or tests to learn the member's
constraints, units, mutation, ordering, failure behavior, or required setup. Which part of that
contract belongs in the JSDoc?

**Diagnostic:** A JSDoc repeats names and types or narrates implementation without changing how a
consumer uses the member. What consumer-relevant information does it provide?

### 6. Apply DRY to knowledge, not text

Use DRY in the Hunt and Thomas sense: each piece of knowledge has one authority. Extract code when
copies must change together because they encode the same rule, policy, or invariant. Keep similar
code separate when it represents different concepts that may change independently. There is no
numeric duplication threshold; small duplication is cheaper than false coupling.

**Diagnostic:** The same rule, policy, invariant, mapping, or significant constant is encoded in
several places that must change together. Which place should be its authority?

**Diagnostic:** A shared abstraction has accumulated flags, branches, or caller-specific
terminology to preserve differences between its users. Do those users share knowledge, or only
shape?

### 7. Prefer composition over inheritance

Use composition when collaborators can vary independently. Inheritance is justified only when the
subtype preserves the parent contract and the hierarchy is the simplest model of the relationship.
Never create a base class solely to reuse implementation.

**Diagnostic:** A subclass overrides inherited behavior with a no-op, throws for valid parent
operations, narrows accepted inputs, or exists only to access protected implementation. Does it
preserve the parent contract?

**Diagnostic:** The base class changes repeatedly to support the needs of one subtype. Is that
behavior an independently varying collaborator?

### 8. Keep the happy path linear

Use guard clauses for invalid, absent, exceptional, and already-complete cases so the main operation
remains direct and unindented. Do not invert every conditional mechanically: keep related
alternatives together when their symmetry is clearer as an `if`/`else` or exhaustive dispatch.

**Diagnostic:** The normal successful operation remains nested beneath checks for invalid, absent,
exceptional, or already-complete cases. Would guard clauses expose the main path?

**Diagnostic:** Following the successful path requires tracking several levels of indentation or
repeatedly remembering which earlier conditions remain true. Can the control flow be flattened
without separating symmetric alternatives?

### 9. Decide each distinction once

When the same condition controls several nearby operations, resolve it once into a named value,
selected implementation, or cohesive branch. Engineering Principles governs the larger placement
and modeling decision.

**Diagnostic:** The same predicate or discriminant is checked several times to select related
values, collaborators, or operations. Can the distinction be resolved once into a named result or
cohesive branch?

### Self-review

- Is this the most direct idiomatic implementation, or merely the shortest?
- Does every name tell the truth, and does every function own meaningful behavior?
- Are decisions and transformations pure, with all variable inputs explicit?
- Do inline comments carry information the code cannot, and is the public surface documented?
- Does each abstraction own shared knowledge rather than shared shape?
- Is inheritance genuinely substitutable, or only an implementation-reuse device?
- Is the main path linear, with each distinction resolved once?