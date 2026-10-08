# nuzlocke.gg version 1: screens

What each screen shows and says, and the design system it uses. The behavior behind the screens is in [product.md](product.md); the prototypes are listed in [README.md](README.md#documents-and-prototypes).

## Screens and navigation

All screens follow the five prototypes. Terms in quotation marks are the decided UI copy.

**The app is phone-first.** Every prototype is 390 × 844. Desktop is the same layout with more room.

### Navigation

- No bottom bar.
- Two top places: the Run list (home) and Settings (a gear on the Run list header).
- Every other screen is pushed with a back control.
- An invite link opens the join screen directly.
- A signed-in player lands on the Run list.

### Run list

- "Your runs".
- "New run" full width.
- Rows and groups as in [Run lifecycle](product.md#run-lifecycle).
- "Archived (2)" link.
- An **Archived runs** screen with a line that explains Archive and Unarchive.
- An empty state "No runs yet" with New run and a hint about invite links.

### New run

One screen in this order:

1. Who plays (Solo | Soul Link ToggleGroup, fixed after creation, with a help line).
2. Map (one row that opens a "Choose a map" Drawer; Maps grouped by region in release order as radio rows with the Generation and the number of Games; the Drawer explains "Games that were released together share a map: the same routes and towns"; the word "map" stays in the UI).
3. Game (a toggle under the Map row only when the Map has two Games; "Your game" on a Soul Link, and each partner chooses theirs when they join).
4. Name (prefilled).
5. Rules (one row with the count, "2 of 4 rules on", that opens the Rules screen).

"Make the run": solo goes to the tracking screen, Soul Link to the waiting screen.

### Rules screen

- "Set the rules": reached from setup, the waiting screen, and the Run menu.
- Switches that save at once, in two groups, Rules and Soul Link rules.
- The House rules Textarea with Save under the switches.
- On a Finished Run the switches are disabled with an Alert ("This run is finished. Its rules are a record and do not change. Reopen the run to change them.") and the House rules field stays editable.
- On a Waiting Run the switches are disabled with an Alert ("The rules can change once the run starts.") and the House rules field stays editable.

### Waiting screen

- Header with back and the Run menu.
- "Waiting for players" and one line on what Start means.
- Players with "(you)" and when they joined.
- A dashed "Room for one more player".
- The invite link in a pill with Copy (becomes "Copied").
- The Rules row.
- "Start the run with 2 players" (disabled with one player: "You need at least one more player to start.") and "Leave the run".

### Join screen

- "You are invited to a Soul Link", the Run name, the Game and the player count, the players (each with their Game on a paired Map), the Game toggle on a paired Map, one line on shared fate, "Join the run" and "Not now".
- Signed out: "Sign in with Google to join" with a line about the name step.
- Started or full: "This invite link no longer works" or "This run is full", no Run name, "Go to your runs".

### Tracking screen

- Header with the Run name, its Game and kind, back, and "…".
- "Attempt 3" under the title when the Chain has more than one.
- Two Tabs, **"Encounters"** and **"Pokémon"**.

#### The **Encounters** tab

- Locations in play order, Starter first.
- A "+" per location that records in a new Slot (Slot 1 when the location has none; a Slot count on a location with two or more).
- Rows with the met Species sprite and the fate line.
- The **"Custom locations"** section at the end ("Locations that this run adds. All journeys share them.", "Add a location", "Add location").
- And the end line "The last locations of Emerald. Event locations come last."

#### The **Pokémon** tab

- Party with "6 of 6" and the Edit button.
- Box with the search, sort, and filter tools when it has 12 or more.
- Graveyard.

#### Soul Link

- Layout "yours first", each partner's Encounter a chip under your row.
- "Record yours" where a partner filled a Slot.
- A tap on a chip opens a read-only Drawer with that Encounter (Species met, origin, outcome, nickname, current Species, where it is, its Warning, the other Encounters of the Link).

### The dock

- One floating dock at the bottom of both tabs with one shadow: the Warnings bar ("2 warnings", "Tap to see").
- A tap opens its list; a second tap minimizes it.
- The fail bar sits above the dock.
- A Warning in the list goes to its row; a Shared Fate Warning also carries "Record death".

### Record Drawer

#### Step 1: Species

- Search "Search all 386 species", method groups, "Other species".
- At a Custom location "All species".
- The Duplicate mark "Same line as Fang".
- A last row "Species unknown" that goes to step 2 with the outcome Missed and no Species.

#### Step 2: Details

- Species with Change, or "Unknown" when none.
- Outcome Caught | Missed, with Caught disabled while the Species is unknown.
- Origin Wild | Gift | Trade.
- Form when needed.
- Nickname and "Goes to" Party | Box only when Caught, with Party disabled when full and the note "Your party is full (6 of 6), so it goes to the box."

Then the Warnings before the save as quiet Alerts:

- "Route 104 already has an encounter: Marill."
- "Poochyena is in the same evolution line as Fang (Route 101)."
- "It has no nickname yet."

Then "Save encounter".

- A Soul Link Drawer lists each partner's Encounter in that Slot ("Linked in this slot").
- Selections use a joined ToggleGroup.

### Correct Drawer

- The record Drawer filled in, with the location and Slot shown as read-only text, the Species met with Change, Origin, and Form.
- "Remove encounter" at the end opens its AlertDialog, which names the Pokémon that goes with it and says to record the Encounter again for a wrong location, Slot, or outcome.
- The Drawer is reached from "Correct encounter" on the Pokémon screen and from a tap on a Missed row (where it holds the Species, with "Species unknown", the Origin, the Form when the Species has more than one, and Remove; the outcome, location, and Slot stay fixed).

### Read-only Encounter view

- The same content as a partner's chip Drawer (location and Slot, Species met, origin, outcome, the Encounter's Pokémon with where it is, the other Encounters of the Link).
- It opens from a Missed row and from a removed Pokémon's row for a Reader, a partner, and any Finished or earlier-Attempt screen.

### Pokémon screen

- Full screen with back.
- Header block (sprite, nickname or Species, current Species, Badge Party, Box, or Dead).
- Warnings as quiet Alerts under the name (a Shared Fate Alert carries "Record death" destructive, which opens the death Drawer with the cause prefilled).

#### Sections

##### Pokémon

- Nickname, Species, Form rows that open small Drawers.
- Evolve shows "Next in its line" then "Other species" "To correct a wrong species".
- A Species that does not evolve says so.

##### Where

- Party | Box ToggleGroup with "Your party, 6 of 6".
- A full Party opens "Your party is full. Pick one to send to the box." and swaps as two moves.

##### Link

Soul Link only:

- The other Pokémon of the Link with player, Species, and place.
- A tap opens that Pokémon.

##### Encounter

- "Location" row "Route 116 · slot 1".
- Species met "It stays the same after an evolution."
- Outcome.
- Origin.
- "Correct encounter".

##### History

Lines with dates.

#### Actions

- A Graveyard box (level and cause, "No cause recorded") with "Edit" (opens the death Drawer prefilled; saving is Edit a death) and "Undo death" for a dead Pokémon.
- A removed Pokémon shows a "Removed" Badge in the header, its Encounter and History sections, and no Pokémon actions, while the Encounter section keeps "Correct encounter" and "Remove encounter" for the owner on an Active Run.
- "Record death" (destructive) opening a Drawer with "Level (optional)" and "Cause (optional)".
- In a Soul Link the Drawer names the linked Pokémon whose players will see a Shared Fate Warning ("Riley and Sam will be asked to mark Treecko and Torchic as dead").
- "Remove Pokémon" as a quiet ghost button ("Remove is for a trade or a release. The encounter stays.") with an AlertDialog that names the Encounter and history that stay and says to record a death instead if it died.
- "Correct encounter" opens the Correct Drawer.
- "Remove encounter" is in that Drawer with an AlertDialog that names the Pokémon that goes with it ("The slot is empty again.").
- A partner's Pokémon and every Reader view open read only with "Read only. Riley records this Pokémon."

### Party editor

- Full screen from Edit on the Party header.
- Party rows with "To box" and dashed "Empty" rows.
- Box rows with "To party", disabled "Party full" when full.
- "Moved" Badge on a changed row.
- "Save 3 moves", Reset, Back with a draft opens "Discard 3 moves?" with "Keep editing" and "Discard moves".
- After the save the Pokémon tab shows "Party saved: 3 moves."
- The Party bar of six icons at the bottom when the Party scrolls away (each with a screen-reader label "Move Fang to the box").
- The Graveyard line "Spore is in the graveyard. A dead Pokémon cannot move."

#### Box tools when 12 or more

- Search "Name, species or location".
- A sort and filter Drawer with Sort Newest | Oldest | A to Z | National Dex, a 3-column type grid with checks, "Show 12 Pokémon" and "Clear types", a badge with the count on the button.
- The Box header "12 of 47 · Water, Grass · National Dex".
- 44 px rows instead of 52 px.
- Moved Pokémon pinned at the top with "Shedinja and Mimi were moved here. The filter hides them." and "Show all".

#### Soul Link

- Partner pills under each row (plain when in the same place; amber with a WarningIcon when apart; dashed "none yet" with no Encounter), not tap targets in the editor.
- "After you save" lists the Linked Party Warnings of the draft and "Fixed by this save: …".
- Save stays on.

Party order is not recorded; the Party shows in the order of the Run.

### Run menu

A bottom Drawer, not a dropdown.

- **Active:** Mark as complete, Mark as failed · All attempts, Set the rules (with "3 on"), Rename, Visibility (with the current value) · Archive ("Hides the run and its earlier attempts from the list of every player").
- **Waiting:** All attempts is absent; otherwise Rules, Rename, Visibility · Archive (Leave and Start are on the screen itself).
- **Finished, newest Attempt:** Reopen, Try again (Failed only) · All attempts, Rules, Rename, Visibility · Archive.
- **Archived:** Unarchive instead of Archive.
- **Earlier Attempt:** All attempts, Rules, Rename, Visibility only; no Reopen, Try again, or Archive.

### Mark as failed Drawer

"Mark as failed?", "The run takes no more changes. Any player can reopen it later.", "Cause (optional)" with placeholder "Such as Wiped to Norman", "Causes you used before" pills, Cancel and Mark as failed.

**Mark as complete** is the same confirm without the cause.

### Finished banner

- Under the header: icon, "Failed on 3 Oct", "Wiped to Norman · Attempt 3", Try again and Reopen (Complete: Reopen only).
- "Try again is not available because a player deleted their account." when so.
- The "+" buttons go and rows open read only.
- An earlier Attempt: "A newer attempt exists, so this one stays as it ended. It cannot be reopened." with "Go to attempt 3".

### Attempts screen

- The Run name and Game.
- The summary ("Furthest", "Most often").
- Rows newest first (number, cause or "No cause given", date, Progress).

### Settings

- Display name (Input and Save).
- Google email read-only ("Only you see this").
- Theme (System | Light | Dark).
- Sign out.
- Delete account with a line on what it deletes.
- And the rights line.
- Reached by a gear on the Run list header.
- No profile page.
- The rules for the Display Name and Delete account are in [Player identity](product.md#player-identity).

### First sign-in

The screen "Choose your display name":

- "The players in your runs see this name. If you stream, use your stream name. You can change it later in Settings."
- "1 to 30 characters. It does not need to be unique."
- A line "Next, you can join Cousins link" when the player came through an invite.
- Continue.

### Sign-in page and rights line

- The rights line reads "Pokémon and the sprites are © Nintendo, Creatures Inc., and GAME FREAK inc. nuzlocke.gg is a fan project and is not affiliated with them." with a contact email for rights holders, on the sign-in page and in Settings.
- No legal page beyond that.

### Reader pages

- The private page "This run is private".
- The Reader view of each screen as in [Visibility and the Reader](product.md#visibility-and-the-reader).

## Design system and UI copy

### Components and visual style

Build with the components of `packages/ui` (shadcn, base-luma style, Base UI primitives) and the nuzlocke.gg design system:

- Geist.
- One purple accent.
- Pill shapes.
- Two weights (400 and 500, no bold).
- Phosphor regular icons.
- `text-base` on inputs so iOS does not zoom.
- Toggle group for selected options (Caught | Missed, Party | Box).
- Drawer for bottom sheets.
- AlertDialog for confirms (buttons stacked full width on a phone).

### Add a `warning` token

- (`--warning` on `:root` and `.dark`, `--color-warning` in the theme) for amber Warnings, pills, and marks.
- The word or a WarningIcon always accompanies amber.

### Two component changes for the build

- Left-align the AlertDialog header text below the `sm` breakpoint.
- Use `text-pretty` instead of `text-balance` in AlertDescription.

### Copy

- Sentence case for every label, title, and button.
- Domain nouns in lower case in UI text ("Record an encounter"), Rule names capitalized.
- "you" for the player.
- No emoji.
- Buttons say verb plus object.
- The prototypes settled a few short labels where the object is the thing next to the button ("Copy" beside the invite link, "Save" beside a field, "To box" and "To party" on a Pokémon row, "New run"); they stand as decided copy.
- "Place" never appears: "location" for one, "Encounters" for the list, "routes and towns" in sentences, "16/64 encounters" for Progress.
- "Map" stays in the UI with its explanation.
- Sentences stay in the second person ("Riley's Mudkip died. Your Leafy…").

### Accessibility

- Warnings are `role="status"` Alerts.
- Icons have labels.
- The Party bar icons have screen-reader labels.
- A tap target is at least 44 px.
- Amber is never the only sign.
