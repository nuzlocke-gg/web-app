# nuzlocke.gg version 1: product spec

What version 1 does and why: the problem, the user stories, the domain model, the product rules, and what is out of scope. What each screen shows and says is in [screens.md](screens.md); how it is built is in [technical-design.md](technical-design.md); how it is tested is in [testing.md](testing.md). Sources, open details, and the build order are in [README.md](README.md).

Glossary terms are capitalized (Run, Journey, Place, Slot, Link, Warning). UI copy uses the words the tickets decided ("location", "Encounters", never "Place").

**Contents**: [Problem Statement](#problem-statement) · [Solution](#solution) · [User Stories](#user-stories) · [The domain model](#the-domain-model) · [Rules and Warnings](#rules-and-warnings) · [Soul Link](#soul-link) · [Shared fate](#shared-fate) · [Run lifecycle](#run-lifecycle) · [Player identity](#player-identity) · [Visibility and the Reader](#visibility-and-the-reader) · [Out of Scope](#out-of-scope)

## Problem Statement

A player who plays a Pokémon game under Nuzlocke rules has to remember, by hand, which locations already gave an encounter, which Pokémon died and why, and whether the self-imposed rules still hold. Spreadsheets do this badly on a phone, and the existing trackers either keep data only in the browser (so it is lost or stuck on one device), or have no checked rules, or have no live Soul Link. The best-known tracker, nuzlocke.app, is paused.

A Soul Link is worse: two or three friends play separate cartridges, and a death on one side must be mirrored on the other. Today they coordinate by chat and a shared spreadsheet, and nothing warns them when their parties drift apart or a link is incomplete.

## Solution

nuzlocke.gg is a public, phone-first web app where a player with a Google account tracks a Run by manual entry.

- A player makes a Run on one of three Maps (Emerald; FireRed and LeafGreen; Platinum), records an Encounter at each location, and records what became of each Pokémon: Party, Box, or Graveyard.
- The Run selects its Rules from a list of nine. The app checks each Rule and shows a quiet Warning while the Run breaks it. A Warning never blocks an entry. The player is the authority.
- A Soul Link is a Run for two or three players. Each player enters their own Journey; everyone sees the same Run within seconds. Pokémon caught in the same Slot are a Link. When one dies, the Shared Fate Rule gives each partner a Warning with a one-tap "Record death", and nothing dies on its own.
- A player marks a Run Failed or Complete; the app only suggests it. A Failed Run has "Try again", which makes the next Attempt of its Chain with the same players and Rules.
- A Run is private or readable by link. A Reader needs no account and changes nothing.
- Every change is optimistic: it shows at once and saves through headcanon.

## User Stories

### Sign-in and identity

1. As a new player, I want to sign in with my Google account, so that I do not have to make a password for a hobby app.
2. As a new player, I want to choose a Display Name at my first sign-in, prefilled with my Google given name, so that my partners see a name I chose and my surname never reaches a shared page.
3. As a streamer, I want to type my stream name as my Display Name, so that my audience recognizes me on a readable Run.
4. As a player, I want to change my Display Name in Settings at any time, so that every chip, toast, and history line reads the new name.
5. As a player, I want to see my own name with "(you)" in lists of players, so that the list reads the same for everyone and I still find myself.
6. As a player, I want to see which Google email I am signed in with, visible only to me, so that I know which account holds my Runs.
7. As a player, I want to sign out from Settings, so that a shared device does not keep my account.
8. As a player, I want to delete my account, so that my solo Runs and my Google identity are gone, while a Soul Link that has started keeps my Journey for my partners under "Deleted player".
9. As a player, I want the delete confirmation to say exactly what is removed and what stays, so that I am not surprised afterwards.
10. As a player, I want to pick System, Light, or Dark theme, so that the app matches my phone.
11. As a new player who opened a friend's invite link, I want to sign in, choose my name, and land back on the join screen, so that I do not have to find the link again.

### Run list

12. As a player, I want a Run list as my home screen, so that I open the Run I am playing in one tap.
13. As a player, I want the list sorted Active first, then Complete, then Failed, with Waiting Runs at the top of Active and no headers, so that what I am playing is always at the top.
14. As a player, I want each row to show the name, the Game, a Soul Link badge, my partners, and either a Progress bar ("16/64 encounters") or the state line ("Failed · Attempt 3 · Wiped to Norman"), so that I can tell Runs apart without opening them.
15. As a player, I want the row icon to be the sprite of my starter's current Species, so that I recognize a Run at a glance.
16. As a player, I want one row per Chain, showing the newest Attempt, so that a 151-attempt Kaizo run does not fill my list.
17. As a player, I want an "Archived" link at the end of the list that opens my archived Runs in the same row shape, so that I can bring one back.
18. As a new player, I want an empty state that tells me to make a Run or open a friend's invite link, so that I know how to start.

### Making a Run

19. As a player, I want to choose Solo or Soul Link when I make a Run, knowing it does not change later, so that the Run is set up for the right number of players.
20. As a player, I want to choose a Map from a Drawer grouped by region, so that I find Emerald under Hoenn and FireRed and LeafGreen under Kanto.
21. As a player on a paired Map, I want to choose my Game (FireRed or LeafGreen) under the Map, so that my encounter suggestions and location names match my cartridge.
22. As a player, I want the Run name prefilled from the Game ("Emerald Hardcore", "Kanto link"), so that I can make a Run in a few taps.
23. As a player, I want to see and change the Rules before I make the Run, with the usual rules already on, so that the first Warning is one I expect.
24. As a solo player, I want "Make the run" to open the tracking screen with the Starter location first, so that I record my starter straight away.
25. As a Soul Link creator, I want "Make the run" to open the waiting screen with an invite link, so that I can send it to my friends.
26. As a player, I want a new Run to be private until I switch it to readable by link, so that nothing I record is reachable before I decide to share it.

### Rules and House rules

27. As a player, I want a Rules screen with a switch per Rule and a one-sentence description under each, so that I know exactly what each Rule checks.
28. As a player, I want a Rule change to save at once and the Warnings to follow immediately, so that I can turn a Rule on mid-Run and see what it flags.
29. As a Soul Link player, I want a separate "Soul Link rules" group with Shared Fate, Linked Party, and Complete Links on by default, so that the common Soul Link rules are checked from the start.
30. As a player, I want the Shared Duplicate Clause to turn on the Duplicate Clause, and the Duplicate Clause going off to turn the shared one off, so that the Rules never contradict each other.
31. As a player, I want a House rules text field under the switches for rules the app cannot check (a level cap, Set mode, no items in battle), so that my Run records its full ruleset.
32. As a player of a Finished Run, I want the switches disabled with a note that the Rules are a record, while House rules stay editable, so that a finished Run keeps its history honest.
33. As a player, I want the Rules screen reachable from the Run menu in every state, including a Finished Run and an earlier Attempt, so that I can read the Rules of any Run and edit its House rules.

### Soul Link: waiting and joining

34. As a Soul Link creator, I want one invite link that works until the Run starts, with a Copy button, so that I can share it in any chat.
35. As a Soul Link creator, I want to see who has joined and when, and a dashed "Room for one more player" row, so that I know when everyone is here.
36. As a Soul Link player, I want any player to tap "Start the run with 2 players", disabled while I am alone, so that the Run begins when we decide and not before.
37. As a Soul Link player, I want to leave the Run while it waits, so that a Run I joined by mistake does not follow me.
38. As an invited player, I want the join screen to show the Run name, the Game, the players, and one line on shared fate, so that I know what I am joining.
39. As an invited player on a paired Map, I want to choose my own Game on the join screen, so that each player plays their own cartridge on one Map.
40. As an invited player, I want a clear page when the Run has started or is full, so that I know to ask for a new Run.
41. As a Soul Link player, I want the Soul Link Rules visible, read only, on the Rules screen while the Run waits, so that we see what we play under before the start.

### The tracking screen: Encounters tab

42. As a player, I want a new Run to show only the Starter location, and every other location to join the list when it gets its first Encounter, in the order I recorded them, so that the list follows the route I actually took. Pokémon games are not linear, and a list in play order makes me jump around.
43. As a player, I want each location row to show the Species I met, with a second line for what became of it (nickname, "now Grovyle", Party, Box, or "died at Lv 24"), so that one list tells me the state of my Run.
44. As a player, I want a Failed Encounter to show "Failed" on its row, so that I remember that the location gave nothing.
45. As a player, I want one "Add a location" button in the dock that opens a Drawer of the locations with no Encounter yet, A to Z, with a search and an "All" view, and a pick that goes straight to the Species step, so that a new location costs one tap and closing the Drawer adds nothing.
46. As a player, I want to record a second Encounter at a location by picking it again in the Drawer (under All, or by search), in a new Slot, with the Slot count shown on a location that has two or more, so that a second Encounter is possible but visible.
47. As a player on an Active Run, I want to add a Custom location from the end of the Drawer ("Not listed? Add a custom location"), have it join the list at once, find the Run's Custom locations in their own group in the Drawer, and to rename one even when it has Encounters and remove one, with removal refused while it still has Encounters, so that a trade from another cartridge or a bonus-disc Pokémon has a home and my record stays whole.
48. As a player, I want to tap a row to open its Pokémon, and a Failed row to open a small Drawer to set its Species or remove it, so that every row leads somewhere useful.
49. As a Reader, a partner, or a player on a Finished Run, I want a Failed row and a removed Pokémon's row to open a read-only view of that Encounter, so that every row still leads somewhere when nothing can change.
50. As a player, I want the number of locations with no Encounter yet next to the Add button ("53 remaining"), and the list to end with my Progress ("11/64 encounters") as one cell per location, Caught, Failed, and Missing (a location in my list where I have no Encounter) in the order of the list, and then one grey cell for each remaining location, so that a location I put off keeps reminding me and I see how my Run is going at a glance.

### Recording an Encounter

51. As a player, I want a two-step Drawer: pick a Species, then the details, so that the common case takes a few taps.
52. As a player, I want the Species found at the location listed first by method group (Walk, Surf, Fishing, Rock Smash, Static, Roaming, Gift, Trade), then "Other species", so that the likely Species is at the top and any Species is reachable.
53. As a player, I want a search over all Species of the Game, so that a randomizer or a hatched egg is recorded as easily as a wild catch.
54. As a player, I want the Origin (Wild, Gift, Trade) to default from the method group, so that I rarely change it.
55. As a player, I want to choose Caught or Failed, give a nickname, and send the Pokémon to the Party or the Box, with the Party option disabled when full, so that the catch lands where I want.
56. As a player, I want to record a Failed Encounter without naming a Species ("Species unknown"), so that a Pokémon that fled before I saw it still uses up the location.
57. As a player, I want the Drawer to show every Warning the save will cause (First Encounter Rule, Duplicate Clause, Nickname Clause) before I save, without blocking the save, so that I break a Rule knowingly.
58. As a player, I want a Species with more than one Form (Platinum's Wormadam, Shaymin, Arceus) to show a Form control, and a Species with one Form to show none, so that the Drawer stays short.
59. As a player, I want to correct the Species met, the Form, and the origin of an Encounter later, so that a typo does not need a delete and re-entry.
60. As a player, I want to fix a wrong location, Slot, or outcome by removing the Encounter and recording it again, with the confirm naming what goes, so that the record stays consistent.
61. As a player, I want to remove an Encounter for a mistake, with a confirm that names the Pokémon that go with it, so that I do not lose a Pokémon by accident.

### The tracking screen: Pokémon tab

62. As a player, I want the Pokémon tab to show my Party with its count of six, my Box, and my Graveyard, so that I see my team at once.
63. As a player with a large Box (12 or more), I want a search field and a sort and filter button that stay at the top of the Box while it scrolls, so that a Kaizo-size Box stays usable.
64. As a player, I want to sort the Box by Newest, Oldest, A to Z, or National Dex, and to filter it by type, with the header saying what is on ("12 of 47 · Water, Grass"), so that I find a Pokémon fast.

### The Pokémon screen

65. As a player, I want a full screen for one Pokémon with its sprite, nickname, current Species, and a Party, Box, or Dead badge, so that one Pokémon's story is in one place.
66. As a player, I want the Warnings about this Pokémon shown under its name as quiet Alerts that say what the Rule wants, so that I know what to fix without a modal.
67. As a player, I want to rename a Pokémon from a Nickname row, so that a Pokémon caught in a hurry gets its name later.
68. As a player, I want to evolve a Pokémon from a Species row that shows the next Species of its Evolution Line first, with "Other species" to correct a wrong Species, so that an evolution is one tap.
69. As a player, I want a dead Pokémon to be renamable but not evolvable, so that the record stays true to the game.
70. As a player, I want a Party | Box toggle that saves at once, and a swap Drawer when the Party is full, so that a single move never needs the editor.
71. As a player, I want to record a death with an optional level and an optional free-text cause, so that my Graveyard tells the story of the Run.
72. As a player, I want to undo a death for a mistake and have the Pokémon return to where it was, or to the Box when the Party filled meanwhile, so that a mis-tap costs nothing.
73. As a player, I want to edit the level and cause of a recorded death without undoing it, so that a typo in the Graveyard is cheap to fix.
74. As a player, I want a removed Pokémon to still open read only from its Encounter, with a "Removed" badge and its history, so that the record of a trade or a release is not lost.
75. As a player, I want to remove a Pokémon for a trade or a release, with a confirm that its Encounter and history stay, so that the location still counts as used.
76. As a player, I want to change a Pokémon's Form from a Form row that shows only when the Species has more than one Form, so that Wormadam's types are right for Type Restriction.
77. As a player, I want a History section with the Encounter, each evolution, and the death, with dates, so that I can retell the Run.
78. As a player, I want "Correct encounter" and "Remove encounter" on this screen in the Encounter section, so that the Encounter and its Pokémon are edited together.

### The Party editor

79. As a player, I want an Edit button on the Party header that opens a full-screen editor, so that I can rebuild my team before a gym in one go.
80. As a player, I want the editor to hold a draft and save all moves in one tap ("Save 3 moves"), with Reset and a discard confirm on Back, so that nothing half-saved reaches my partners.
81. As a player, I want the Party to show six rows with dashed "Empty" rows for free room, and Box rows disabled with "Party full" when the Party is full, so that the six limit is always visible and never a surprise error.
82. As a player, I want a bar of my six Party icons at the bottom when the Party scrolls away, each a tap to send that Pokémon to the Box, so that a large Box does not hide my Party.
83. As a player, I want a Pokémon I moved into the Box in this draft to stay at the top whatever the sort, and a note when a filter hides it, so that I can undo the move without searching.
84. As a player, I want the Graveyard left out of the editor with a line saying a dead Pokémon cannot move, so that the editor shows only what can change.
85. As a Soul Link player, I want partner pills under each row that go amber when a partner's linked Pokémon is in a different place, and an "After you save" list of the Linked Party Warnings of my draft, so that I see the consequence before I save and can still save.

### Warnings

86. As a player, I want one bar at the bottom of the tracking screen with the count ("2 warnings") that opens the list on a tap and minimizes on a second tap, so that Warnings are always one tap away and never in my way.
87. As a player, I want each Warning to mark its row with a small amber icon next to the Species, so that I find the Pokémon or Encounter the Warning is about.
88. As a player, I want a tap on a Warning in the list to go to its row, so that fixing it is one more tap.
89. As a player, I want Warnings to appear and disappear with the data and to have no accept, close, or snooze, so that a Warning always means the Run currently breaks a Rule.
90. As a player, I want no Warning for a Species outside the location's table, so that a hatched egg or a randomized game is not flagged.

### Soul Link play

91. As a Soul Link player, I want each Slot to show my Encounter as a full row with a chip per partner under it ("Riley · Mudkip", "Sam · none yet"), so that I see the Link without a second column.
92. As a Soul Link player, I want a "Record yours" button where a partner filled a Slot I have not, so that I record into the right Link.
93. As a Soul Link player, I want to tap a partner's chip to see their Encounter read only, so that I can check their catch without being able to change it.
94. As a Soul Link player, I want a partner's entry to appear on my screen within a few seconds and quietly, so that we stay in step without noise.
95. As a Soul Link player, I want two of us who record a new Slot at one location at the same moment to land in one Slot, so that the Link is made the way we meant.
96. As a Soul Link player, I want a Link section on the Pokémon screen that lists the other Pokémon of the Link, with the player, the Species, and where each is, so that I know who my Pokémon's fate is tied to.
97. As a Soul Link player, I want the death Drawer to name the linked Pokémon whose players will see a Shared Fate Warning, so that I know what my entry triggers.
98. As a Soul Link player, I want a Shared Fate Warning on my living Pokémon when a partner's linked Pokémon dies ("Riley's Mudkip died. Under Soul Link rules, your Leafy dies too."), wherever mine is, Party or Box, so that I do not miss a death on the other side.
99. As a Soul Link player, I want that Warning to offer "Record death" with the level empty and the cause prefilled ("Linked to Riley's Mudkip"), so that mirroring a death is as cheap as it can be.
100. As a Soul Link group, I want to turn Shared Fate off on the Rules screen, so that a house exception is our call.
101. As a Soul Link player, I want to change Custom locations, Rules, the name, and the visibility of the Run like any other player, with no owner role, so that nobody is stuck waiting for the creator.
102. As a Soul Link player, I want a change of mine that a partner's change made impossible to be withdrawn with a toast that says what happened ("Secret Base was removed, so your encounter was not saved."), so that I understand without being blamed.

### Run lifecycle

103. As a player, I want a Run menu ("…") that opens a Drawer with Mark as complete, Mark as failed, All attempts, Set the rules, Rename, Visibility, and Archive, so that Run-level actions are in one place and never a mis-tap away.
104. As a player, I want a quiet "No Pokémon left." bar with "Mark as failed" when a Journey has no living Pokémon, so that the app suggests the end and never decides it.
105. As a player with the Whiteout Rule on, I want the bar to say "Your party wiped." when my Party died even with Pokémon in the Box, so that the hardcore ruleset is honored on suggestion.
106. As a player, I want "Mark as failed" to open a small Drawer with an optional cause and suggestions from this Chain's earlier causes ("Wiped to Norman ×5"), so that the same wipe counts together on the Attempts screen.
107. As a player, I want "Mark as complete" to open a confirm Drawer, so that the end of a Run is never one accidental tap.
108. As a player, I want a Finished Run to show a banner ("Failed on 3 Oct · Wiped to Norman · Attempt 3") with Reopen and Try again, and to open every row read only, so that a finished Run is a record I can still read.
109. As a player, I want Reopen with no time limit, so that a mis-tap on the end of a Run is as cheap to undo as a death.
110. As a player, I want "Try again" on a Failed Run to make the next Attempt with the same players, Rules, Custom locations, House rules, and visibility, straight to Active, so that a retry starts in seconds.
111. As a player, I want two players who tap Try again at once to make one next Run, with the second sent to it, so that a Chain stays a line.
112. As a player, I want "Attempt 3" under the Run title and "All attempts" in the menu to open an Attempts screen with the count, the first date, the furthest Progress, the most common cause, and one compact row per attempt, so that I see the shape of my Chain.
113. As a player, I want an earlier Attempt to open read only with a banner that links to the newest, and no Reopen, so that there is never more than one live Attempt in a Chain.
114. As a player, I want Archive instead of Delete, on the newest Attempt of a Chain, from any state and by any player, hiding the Chain from every player's list while every Run in it still opens, so that nothing is lost by a tap.
115. As a player, I want Unarchive from the menu of an archived Run, so that a Run hidden by a partner comes back.
116. As a player, I want to rename a Run and change its visibility in any state, so that a finished Run can still be shared.
117. As a player, I want a Run whose last Player deleted their account to be gone, and a Failed Soul Link with a deleted Player to say why Try again is unavailable, so that the app never shows a dead end without a reason.

### Readers and sharing

118. As a player, I want two visibility values, private and readable by link, with the link being the Run's normal URL, so that sharing is one copy and revoking is one switch.
119. As a Reader, I want to open a readable Run without an account and see the tracking screen, the Pokémon screen, the Attempts screen, and the Rules screen read only, so that I can follow a friend's or a streamer's Run.
120. As a Reader, I want to see the Rules, the House rules, and the Warnings bar, but not the fail bar, so that I see the Run's rules and state without the players' prompts.
121. As a Reader on a Soul Link, I want a segmented control of the players' Display Names under the header to choose whose Journey takes the "yours" position, so that I can follow each player.
122. As a Reader, I want a "Rules" link under the header that opens the Rules screen read only, so that I can see which Rules and House rules the Run plays under.
123. As a Reader, I want a readable Run that is Waiting for players to show the banner and the players but never the invite link, so that I cannot join by accident.
124. As a Reader, I want a "This run is private" page when the Run is private, so that a stale link fails politely.
125. As a player, I want a readable Run to have a link preview card (name, Game, Progress) and to be excluded from search engines, so that a Run is shared on purpose and never found.
126. As a Reader, I want a private earlier Attempt on the Attempts screen to be a plain row and not a link, so that visibility is honored across a Chain.

### Saving and recovery

127. As a player, I want every change to show at once and save in the background with no per-row spinners, so that entry on a phone feels instant.
128. As a player, I want a refused change (a seventh Party Pokémon, a removed location, a second Encounter in one Slot) to roll the screen back with a toast that names the change and the reason, so that I know what did not save.
129. As a player, I want a bottom bar "Not saved yet. Your changes are kept here." with Retry when delivery is uncertain, so that a bad signal does not lose my entry.
130. As a player, I want a "Leave site?" prompt while a change is unsaved, so that I do not close the tab on a pending save.
131. As a player, I want a change that was still saving when the page reloaded or I left the Run to be sent when I come back to the Run, with a notice if it could not be saved, so that a server error never loses my entry silently.
132. As a player with a tab open across a deploy, I want "Your app is out of date. Refresh?" when a save cannot reach the old version, so that a release never eats my changes silently.
133. As a player, I want an open Run screen to refresh when I come back to it, so that a missed live signal or a partner's change shows as soon as I look.

### Game data and sprites

134. As a player, I want each Species and Form to show its sprite in rows, Drawers, headers, pills, and chips, so that I recognize Pokémon faster than by name.
135. As a player, I want the location names to be the ones my Game shows, so that Black City and White Forest are one location with the right name for each cartridge.
136. As a player, I want every Species of the Game's generation to be enterable at any location, so that trades and eggs are never refused.
137. As a player, I want corrected game data to reach my existing Run, so that a fixed encounter table updates my suggestions without a migration.
138. As a player, I want a rights line in Settings and on the sign-in page that says the app is a fan project not affiliated with Nintendo, Creatures Inc., or GAME FREAK inc., so that the app is honest about the sprites.

## The domain model

The glossary ([`apps/web/CONTEXT.md`](../../../apps/web/CONTEXT.md)) is the authority. The model, in brief:

- A **Run** is one Attempt at a Nuzlocke: a name, a kind (solo or Soul Link, fixed at creation, ADR 0004), a Map, its Rules, House rules, visibility, a Run state, an archived flag, its Journeys, and its Custom Places. A Run is one unit of consistency (ADR 0002).
- A **Journey** is one Player's part of a Run on one Game of the Run's Map. It owns its Encounters and its Pokémon. A solo Run has one Journey; a Soul Link has two or three, one per account.
- A **Place** is the location the game records on a Pokémon, or a Custom Place of the Run. Each Place has **Slots**; each Place starts with one, a new Slot exists when an Encounter is recorded in it, and the app stores no empty Slots (ADR 0008). Each Journey has at most one Encounter per Slot.
- An **Encounter** is one meeting at a Place in a Slot: outcome Caught or Failed, origin Wild, Gift, or Trade, the Species and Form met (optional when Failed), and its time of entry. It never changes after an evolution. A Failed Encounter records no reason (fled, fainted, skipped) in version 1. "One per Place" is a Rule, not a limit of the model.
- A **Pokémon** is one individual from exactly one Encounter: current Species and Form, optional nickname, in the Party (six at most, a hard limit) or the Box, alive or dead (optional level and cause), or removed (traded away or released; the row stays). A Caught Encounter has exactly one Pokémon and a Failed one has none. A second Pokémon from one evolution (Nincada's Shedinja) is recorded as its own Gift Encounter at a Custom Place.
- A **Link** is the Encounters that the Journeys of a Soul Link have in one Slot. It is computed, never stored. The Pokémon from those Encounters are linked. A death is recorded by each player for their own Pokémon; the Shared Fate Rule gives the partners a Warning, and the app kills nothing (ADR 0009).
- A **Chain** is the line of Runs that "Try again" joins (ADR 0005). Every Run is in exactly one Chain with an Attempt number.
- A **Warning** is computed from the current state, stored nowhere, dismissable by nobody. A **Refusal** is a change the server does not save because it breaks a limit of the model.
- **History** (Encounter, evolution, and death lines with the time of entry) is a view of the record, not a table (ADR 0008). Renames, moves, Form changes, Set the Rules, and House rules leave no line. A correction edits the old line.
- **Not recorded in version 1**: a current level, moves, nature, ability, badges or Milestones, Party order, structured opponent data.

## Rules and Warnings

Nine Rules. A Rule is a constraint the app checks; there are no display-only or free-text Rules, no presets. "A Pokémon that faints is dead" is the model, not a Rule.

| Rule | UI description | Default | Shows |
| --- | --- | --- | --- |
| First Encounter Rule | You can have only one encounter on each route or area. If you miss it, that route gives nothing. | On | All Runs |
| Nickname Clause | You must give each Pokémon a nickname. | On | All Runs |
| Duplicate Clause | If you catch a Pokémon, you cannot catch or receive another Pokémon in the same evolution line. | Off | All Runs |
| Whiteout Rule | If every Pokémon in your party dies, the run is over, even with Pokémon in the box. The app suggests marking the run as failed. | Off | All Runs |
| Shared Fate | When a Pokémon dies, the Pokémon linked to it die too. | On | Soul Link |
| Linked Party | Linked Pokémon must be in the party together or in the box together. | On | Soul Link |
| Complete Links | You can use a Pokémon only while each player has a living Pokémon in its link. | On | Soul Link |
| Type Restriction | No primary type can appear twice across the parties of all players. | Off | Soul Link |
| Shared Duplicate Clause | The Duplicate Clause counts the Pokémon of all players. It turns on the Duplicate Clause. | Off | Soul Link |

What each check does ("later" is the later time of entry, ties by id):

| Rule | A Warning shows when | It marks |
| --- | --- | --- |
| First Encounter Rule | A Journey has Encounters in two or more Slots at one Place, of any origin or outcome, Custom Places included. | Each Encounter after the first |
| Nickname Clause | A living Pokémon (Party or Box) has no nickname. | That Pokémon |
| Duplicate Clause | A Caught Encounter's Species is in the Evolution Line of an earlier Caught Encounter of the same Journey (living, dead, and removed Pokémon all count; a Failed Encounter does not). | The later Encounter |
| Shared Duplicate Clause | The same, across all Journeys. | The later Encounter |
| Shared Fate | A living Pokémon (Party or Box, not removed) is in a Link that has a dead Pokémon from another Journey. | That Pokémon, with "Record death" and the cause prefilled from the first death ("Linked to Riley's Mudkip") |
| Linked Party | Living Pokémon of one Link are in the Party in one Journey and in the Box in another. | Each Pokémon of that Link |
| Complete Links | A Pokémon is in the Party and its Link has no living Pokémon from one or more Journeys (no partner Encounter, a Failed one, or a dead or removed Pokémon). When Shared Fate is on and already marks the Pokémon, only the Shared Fate Warning shows. | That Pokémon |
| Type Restriction | Two or more Pokémon in the Parties of the Run have the same primary type (the primary type of the Form, as in that Game). | Each of those Pokémon |

- The **Whiteout Rule** gives no Warning. It shows the quiet fail bar "Your party wiped." when a Journey has no living Party Pokémon and at least one Pokémon that died in the Party (a dead Pokémon keeps the Party or Box place it died in). Nothing is stored: the games do not let the player deposit their last Pokémon, so an empty Party means a wipe. The one false case (a Party emptied in the tracker after a Party death) shows a quiet bar that blocks nothing, accepted. In a Soul Link the bar shows when any Journey's Party wiped. It never marks the Run Failed by itself.
- **Dependency**: selecting the Shared Duplicate Clause selects the Duplicate Clause; deselecting the Duplicate Clause deselects the shared one.
- **Soul Link Rules show when the Run is a Soul Link**, from creation, including while it waits.
- **A Warning never blocks a change** and is never a Refusal. It shows while the Run breaks the Rule and goes when the data changes. Nothing about Warnings is stored. How Warnings are computed is in [technical-design.md](technical-design.md#rules-and-warnings).
- **Set the Rules** is possible on an Active Run only. Warnings follow at once. No history line.
- **House rules**: one plain-text field per Run, up to 2,000 characters, line breaks kept, no Markdown. Run metadata like the name: any player edits it in every state including Finished, last write wins. Not a Rule, no Warning, no history line. Copied by Try again. Shown to a Reader.

## Soul Link

- **Kind fixed at creation** (ADR 0004). Two or three players, one Journey each, one Journey per account. Four players rejected for version 1.
- **Waiting for players**: the Run begins here; the creator has a Journey at once; no entry is possible. One invite link is made with the Run, valid until the start, with no expiry. Any player copies it. A signed-in player who opens it sees the Run name and the players and taps Join, which makes a Journey on the Game they pick from the Run's Map (no choice on a one-Game Map). A player can leave while the Run waits; the empty Journey is removed. Any player taps "Start the Run" with two or three players in. After the start nobody joins or leaves and the link is dead. There is no control to regenerate the link; a leaked link is fixed by a new Run.
- **Who changes what**: a player changes their own Journey only (its Encounters and Pokémon). Every player changes the Run: Custom Places, the Rules, the name, the visibility, the House rules, and the lifecycle actions. There is no owner or creator role. How the server enforces this is the `canChange` policy in [technical-design.md](technical-design.md#soul-link-access-slots-and-order).
- **One shared list**: a location shows in every player's list once any Journey has an Encounter there, in the order of its first Encounter in the Run (the earliest time of entry of any Journey). A Custom location joins every list when a player adds it, in the order it was added. A location in my list where I have no Encounter is **Missing** for me: it shows the partners' chips and "Record yours", and its Progress cell is amber. The order is computed, never stored (ADR 0008); removing the first Encounter at a location can move it down the list.
- **Links and Slots**: a Link is the Encounters in one Slot. The player chooses the Link by choosing the Slot; the screen shows the partners' Encounters in it. Two partners who make a new Slot at one Place at the same time land in one Slot. Remove and record again is the only way to move an Encounter to another Link. An Encounter with no partner in its Slot is an incomplete Link, permitted.
- **Shared fate is manual** (ADR 0009). Record a death kills one Pokémon; the Shared Fate Rule then marks each partner's living Pokémon in the Link with a Warning ([Shared fate](#shared-fate)). Undo a death restores one Pokémon and nothing else; a partner who mirrored the death undoes their own. A late entry (a Pokémon recorded into a Link that already has a dead Pokémon) gets the same Warning.
- **What a partner sees**: ordinary entries arrive quietly, rows and chips change in place within a few seconds. No join or leave notices (those happen only while the Run waits, and the waiting screen updates in place), no presence, no kick. An open Drawer updates its partner information live and keeps typed fields; Save on a target that is gone gives a Refusal, a toast, and closes the Drawer.
- **Changes at the same time**: two players who toggle different Rules at the same time both keep their change. A withdrawn change gives a toast that says what happened, never who did it.
- **Games**: all Journeys of a Run use Games of one Map. A Soul Link between Games that share no Map is out of scope.

## Shared fate

- **A Rule, not a stored message** (ADR 0009). The Shared Fate Rule is a Warning like the others: computed in the browser, stored nowhere, dismissable by nobody. It shows on a living Pokémon in any place, Party or Box, while its Link has a dead Pokémon from another Journey, and goes when the player records the death, when no linked Pokémon of another Journey is dead any more, or when the group turns the Rule off. In a Link of three, an undo can thus leave a Warning in place, or give the undone Pokémon one of its own while another linked Pokémon is still dead; that is an ordinary Shared Fate Warning, never an undo prompt, and its cause names the earliest death that remains. A group that keeps linked Pokémon alive as a house exception turns the Rule off and writes the exception in House rules.
- **"Record death" on the Warning** opens the death Drawer with the level empty and the cause prefilled from the first death of the Link ("Linked to Riley's Mudkip", editable); one tap saves. A Link of three with two deaths is one Warning on the living Pokémon, whose cause names the earliest death.
- **Undo is not mirrored.** A partner who undoes a death leaves the other players' mirrored deaths as they are; a dead Pokémon in a living Link is a legitimate state. The players settle a mistaken mirror between them and undo their own.
- **On a Finished Run** the Warning still shows, like every Warning; its "Record death" action is absent, because a Finished Run admits no change. A Reader sees it with the other Warnings.

## Run lifecycle

- **Four states**: Waiting for players (Soul Link only), Active, Failed, Complete. Finished means Failed or Complete. No Abandoned state; no per-Journey "gave up" mark. **A player moves the Run; the data never does.**
- **Transitions**: Active → Failed by Mark as failed with an optional free-text cause; Active → Complete by Mark as complete; Finished → Active by Reopen, any player, no time limit, newest Attempt only. Both marks open a small confirm Drawer. The Run records the date of each state change; the latest end date and cause show in the list, the banner, and the Reader view.
- **What each state permits**: Waiting: join, leave, Start the Run, House rules, Rename, Visibility, Archive. Active: all [16 changes](technical-design.md#the-named-changes-to-a-run), House rules, Rename, Visibility, Mark as failed, Mark as complete, Archive. Finished: Reopen, Try again (Failed, newest Attempt, no deleted Player), House rules, Rename, Visibility, Archive, Unarchive. A Finished or Waiting Run refuses the 16 changes with the "wrong state" Refusal. The archived flag does not affect permissions.
- **The fail suggestion**: a quiet bar above the Warnings line with "Mark as failed": "No Pokémon left." when a Journey has no living Pokémon (any Journey, in a Soul Link); with the Whiteout Rule on, also "Your party wiped." Hidden from Readers.
- **Chain** (ADR 0005): a Failed Run has at most one next Run. Try again makes a new Run with the same kind, name, Rules, Custom Places, House rules, visibility, and one Journey per Player on the same Game; it records the Failed Run as its previous Run, inherits the Chain id, and takes the next Attempt number. A Soul Link attempt goes straight to Active with no waiting and no invite link; a partner who does not want it archives it. Try again refuses when a next Run exists, sending the player to it. A Complete Run has no Try again; a new Run from it is a new Chain. A Run with a deleted Player has no Try again, and the banner says so. **Only the newest Attempt of a Chain can be reopened**; an earlier one opens read only with a banner that links to the newest and a menu with no Reopen, Try again, or Archive.
- **Archive**: one flag on the newest Attempt of a Chain, any player, any state. It hides the Chain from every player's list; an earlier Attempt has no Archive of its own. Every Run in the Chain keeps its state, opens as before, and a Reader still reads it. Unarchive brings the Chain back. There is no Delete in version 1.
- **The Rules screen is reachable in every state**: the Run menu has "Set the rules" on an Active Run and "Rules" on a Waiting or Finished Run and on an earlier Attempt (switches disabled; House rules editable there too, like the name and the visibility, because House rules are Run metadata that any player edits in every state).
- **Progress**: the Places of the Game where a Journey has an Encounter (Caught or Failed) over all the Places of the Game. Custom Places and Event Places count on neither side. In a Soul Link a Place counts when any Journey has an Encounter there. The UI label is "16/64 encounters". The tracking screen shows it at the end of the Encounters list, one cell per Place, from the viewer's own Journey: a Place is Caught when any of their Encounters there is Caught, Failed when every one of them is Failed, and Missing when it counts toward Progress through a partner's Encounter but the viewer has none there; these come in the order of the list, then one grey cell for each Place with no Encounter. Missing is the same case as a location added but not filled in, which only a Soul Link can make on a Map Place (a solo pick that is closed adds nothing; a Custom location counts on neither side). Missing is a mark, not a Warning: a Linked Pokémon with no partner is already the Complete Links Rule. The count beside "Add a location" ("53 remaining") is the denominator minus the numerator. There is no "nothing here" state: a Place the player cannot finish yet (it needs Surf or a rod) stays in the count until it has an Encounter, so the count keeps reminding them.
- **The Run list**: the player's Journeys → Runs with no next Run → one row per Chain, grouped Active (Waiting first), Complete, Failed with no headers and a wider gap between groups; within a group by last change, newest first. A row: the starter's sprite (the Game monogram until there is a starter), the name, a "Soul Link" Badge, a line with the Game and the partners ("Emerald · with Riley and Sam", "FireRed · with Sam on LeafGreen"), then the Progress bar and label (Active) or the state line ("Waiting for players · 2 of 3", "Complete · 28 Sep", "Failed · Attempt 151 · Wiped to Wallace").
- **The Attempts screen**: a summary (number of attempts and the first date, the furthest Progress with its attempt, the most common cause with its count) and one compact row per attempt, newest first (number, cause, end date, Progress at the end). Causes are counted by a normalized string (trim, collapse spaces, ignore case); no stored key. The Mark as failed Drawer suggests the Chain's earlier causes as tappable pills with counts, filtered as the player types.

## Player identity

- A **Player** is an account with a Google id, an email (shown only to themselves), and one **Display Name**: 1 to 30 characters after trimming, any Unicode, not unique, no handle, no profanity filter, no reserved words. Chosen at the first sign-in on one screen prefilled with the Google given name; the step cannot be skipped but Continue with the prefill is one tap. Changed in Settings. No picture, ever; the Google picture is never shown.
- The name is read live everywhere, so a rename shows in every chip, toast, and history line. A rename reaches a partner on the next load or refresh.
- The player's own name shows with "(you)" in player lists; sentences stay in the second person.
- **A new player through an invite link**: sign in, the name step, then the join screen. The app remembers the invite link across sign-in.
- **Delete account** (ADR 0006): deletes solo Runs; keeps every Journey in a Soul Link that still has a living Player and shows the deleted Player as "Deleted player"; leaves a waiting Run the way Leave does; deletes the Run when the last living Player goes; removes Try again from a Failed Run. The confirm dialog says all of this.

## Visibility and the Reader

- **Two values**: private and readable by link. **A new Run is private**; the New run screen has no visibility control, and the Run menu's Visibility item switches it. The link is the Run's normal URL with an unguessable id (a random UUID v4). Switching to private revokes it. No share token, no rotation, no third value. Try again copies the visibility.
- **Who sees what at the URL**: a signed-in Player of the Run gets the editable screens. Anyone else, signed in or not, gets the Reader view when the Run is readable by link, and a "This run is private" page when it is not. A Reader needs no account.
- **The Reader opens** the tracking screen (both tabs), the Pokémon screen (any player's Pokémon, from a row or a chip), the Attempts screen, and the Rules screen, all read only: no "Add a location" button, no "Record yours", no "…" menu, no Edit button, no record Drawer. Because a Reader has no menu, a "Rules" link under the header (next to "Attempt 3") opens the Rules screen, and a Failed row or a removed Pokémon's row opens the read-only Encounter view. Not reachable: Settings, the Party editor, the Run list. A readable Run that is Waiting for players shows the state banner and the players, never the invite link.
- **The Reader sees** the Rules (switches disabled), the House rules, the Warnings bar (computed in the browser the same way), the state banner and cause, the players' Display Names. **The Reader does not see** the fail bar, the "Record death" action on a Warning, emails, pictures, or the invite link. A private Attempt's row on the Attempts screen is not a link.
- **On a Soul Link** a segmented control under the header, labelled with the players' Display Names, picks the Journey that takes the "yours" position on both tabs; the others show as chips. Default: the first player who joined. A long name truncates with an ellipsis; the accessible label is the full name.
- **Link previews and indexing**: a readable Run has a preview card (Run name, Game, Progress) from public data only, and `noindex`. No browse page, no public listing.
## Out of Scope

- Import from save files or emulators.
- Stream overlays.
- Payments. The app is non-commercial, which also bounds the sprite rights risk.
- Team-building advice (damage calculators, type coverage).
- Social features (follows, comments), a browse page, a public listing of Runs, and a "readable by signed-in players only" visibility.
- Native mobile apps.
- Tracking without an account. A Reader with the link needs no account.
- A Soul Link between Games that share no Map (Emerald and Platinum). A Link needs a shared Place.
- Fate shared only in pairs in a Soul Link of three. Fate is shared by the full Link.
- Four players in a Soul Link.
- Offline entry.
- ROM hack content in the version 1 release. The architecture must hold ROM hacks (a Game with a Map of its own, compiled from a second importer); version 1 ships none.
- Milestones (badges, trials, Elite Four, Champion, Titans) with opponent data and an outcome per Journey. A future effort; the game data format must leave room for a per-Map Milestone section.
- A level cap, as a Rule or as shown data. It waits on Milestones.
- A current level per Pokémon during play.
- Custom player-written rules. The Rules map keyed by identifier keeps them possible without a schema change.
- Generation 1 Maps and any Map beyond the three of version 1. Each later Map is new data files only.
- A "Randomized" option on the Run that hides the encounter suggestions.
- Game-style sprite sets per Map. Version 1 uses one set; a per-Map set is Map data that can come after launch.
- Search engine indexing of readable Runs.
- A hard Delete of a Run, a per-player hide, or a delete that needs every player to agree. Archive covers version 1.
- Presence ("Riley is online"), kicking a partner, leaving after the start.
- Party order, a Box grid view, pagination of the Box, Markdown in House rules, a profile page or picture, a unique handle.
- A stored Warning or a control to accept one; a stored message about a partner's death or undo (the Shared Fate Rule replaces it).
- Mirroring a partner's undo of a death; an expiring or regenerated invite link; more than one Pokémon per Encounter; Correct an Encounter across locations, Slots, or outcomes.
- Vercel Skew Protection and a version endpoint.
- Game data in Postgres; an adapter per data source at run time; edition numbers for game data.
