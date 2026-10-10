# Web

The app where players track their Runs of Pokémon games played under Nuzlocke rules.

## Language

### People

**Player**:
A person with an account who tracks a Journey. A Run shows its Players by Display Name.
_Avoid_: User, member, account (for the person)

**Display Name**:
The name a Player chooses at the first sign-in and can change in Settings. It is not unique, and it is the only name the app shows.
_Avoid_: Username, handle, nickname (that word is for a Pokémon)

**Reader**:
A person who opens a Run that is readable by link. A Reader needs no account and can change nothing.
_Avoid_: Viewer, spectator, guest

### Runs

**Run**:
One attempt at a Nuzlocke, made of one or more Journeys under one set of Rules.
_Avoid_: Nuzlocke (as a noun for the tracked thing), playthrough, save

**Journey**:
One player's part of a Run, played on one Game. It has its own Encounters and its own Pokémon.
_Avoid_: Side, playthrough, save

**Soul Link**:
A Run made at creation for two or three players, with one Journey for each player. A Run is solo or a Soul Link from the start, and its kind does not change.
_Avoid_: Co-op run, duo run

**Link**:
The Encounters that the Journeys of a Soul Link have in one Slot. The Pokémon that come from those Encounters are linked: when one dies, the others should die too, and each player records the death of their own. The Shared Fate Rule gives the partners a Warning; the app kills nothing on its own.
_Avoid_: Pair (a Link can join more than two), bond, Soul Link (that is the Run)

**Nuzlocke**:
The set of Rules a Run is played under.
_Avoid_: Using it to mean a Run

**Rule**:
One self-imposed constraint that a Run selects from a list. The app checks each Rule. A broken Rule gives a Warning, never a blocked entry; the Whiteout Rule instead makes the app suggest that the Run is Failed. A constraint that the app cannot check is not a Rule.
_Avoid_: Clause, restriction (as words for the concept; the name of a Rule can contain them)

**House rules**:
The free text of a Run for constraints that the app cannot check, such as a level cap, Set mode, or no items in battle. Every player of the Run can edit it in any state. The app reads none of it: a house rule is not a Rule and gives no Warning.
_Avoid_: Notes, custom rules, Rule (for a constraint the app cannot check)

**Warning**:
A notice that the current state of a Run breaks a Rule. It shows while the condition is true and goes when the data changes. The player is the authority: a Warning blocks nothing, and the player cannot accept it or remove it.
_Avoid_: Error, violation, alert

**Refusal**:
A change that the app does not save, because it breaks a limit of the model and not a Rule: a seventh Pokémon in the Party, a second Encounter of one Journey in one Slot, a Species that the Game does not have, or a change to something that is gone. A broken Rule is never a Refusal.
_Avoid_: Error, rejection, Warning (for a change that does not save)

**Run state**:
Where a Run is in its life: Waiting for players, Active, Failed, or Complete. A Soul Link begins in Waiting for players; a solo Run begins Active. A player moves a Run from one state to the next; the data never does.
_Avoid_: Status, phase, stage

**Waiting for players**:
The state of a Soul Link before its start. Players join and leave, and no entry is possible. The Run leaves it when a player starts the Run.
_Avoid_: Lobby, pending, setup

**Active**:
The state of a Run that is in play. It admits every change.
_Avoid_: In progress, ongoing, open, live

**Failed**:
The state of a Finished Run that a player marked as lost, with an optional cause. The app suggests it when a Journey has no living Pokémon, and never applies it on its own. A Failed Encounter is the other use of the word: the outcome of an Encounter that gave no Pokémon. Say "Failed Run" or "Failed Encounter" wherever the context does not settle which.
_Avoid_: Dead, lost, wiped, game over, abandoned

**Complete**:
The state of a Finished Run that a player marked as won.
_Avoid_: Won, beaten, done, finished (that word covers Failed too)

**Finished**:
A Run that is Failed or Complete. It admits no change to its Journeys, Custom Places, or Rules, only to its name, visibility, and House rules, until a player reopens it.
_Avoid_: Closed, ended, over

**Attempt**:
A Run's position in its chain. A Failed Run can have one next Run, made with the same players, Rules, and Custom Places; the chain gives each Run its attempt number. Only the newest attempt of a chain can be reopened, and the Run list shows one row for each chain. A Run with a different set of players begins a chain of its own.
_Avoid_: Retry, run number, try

**Chain**:
The line of Runs that "Try again" joins: a first Run and each next Run. Every Run is in exactly one Chain, the Chain gives each Run its Attempt number, and the Run list shows one row for each Chain.
_Avoid_: Series, run history, thread

**Archived**:
A mark that hides a Run from the Run list of every player, in any state. It is not a Run state: an Archived Run opens and reads as before, and any player can bring it back.
_Avoid_: Deleted, hidden, trashed, removed

**Progress**:
The Places of the Game where a Journey has an Encounter, over all the Places of the Game. Custom Places and Event Places count on neither side. In a Soul Link a Place counts when any Journey has an Encounter there.
_Avoid_: Completion, percent complete, explored

### Play

**Slot**:
One position for an Encounter at a Place, shared by all Journeys of a Run. Each Place has one Slot at the start, and each Journey has one Encounter at most in a Slot.
_Avoid_: Using Encounter for the shared position

**Encounter**:
One meeting with a wild, gift, or traded Pokémon that the player counts for the Run, recorded in a Slot at a Place. It is Caught or Failed, and its origin is Wild, Gift, or Trade. It keeps the Species and Form that the player met and does not change after an evolution.
_Avoid_: Catch (for the record itself), capture, Missed (the old word for a Failed Encounter)

**Missing**:
A Place in a player's list of a Soul Link where a partner's Journey has an Encounter and the player's own Journey has none. It counts toward Progress through the partner, and the player sees "Record yours" there. It is a mark on the list and on Progress, not a Warning.
_Avoid_: Missed (the old word for a Failed Encounter), skipped, deferred

**Pokémon**:
One individual that a player owns in a Journey. It has a Species, a Form of that Species, and an optional nickname, and it is in the Party, the Box, or the Graveyard. Each Pokémon comes from exactly one Encounter. A Caught Encounter has exactly one Pokémon and a Failed one has none. A Shedinja from a Nincada is recorded as its own Gift Encounter at a Custom Place.
_Avoid_: Using it to mean a Species; mon

**Species**:
A kind of Pokémon, such as Charmander. The Species of a Pokémon changes when it evolves. A Game has all Species of its generation, with the types and evolution lines that they have in that Game.
_Avoid_: Pokémon (for the kind)

**Form**:
One of the lasting shapes that a Species can have, such as the three cloaks of Wormadam. Each Species has one Form or more, and each Form has its own types. A Pokémon keeps its Species when its Form changes.
_Avoid_: Forme, variant

**Mode**:
A change of shape that exists only in battle, such as a Mega Evolution or the sword and shield of Aegislash. The game data does not have Modes and the app does not record them.
_Avoid_: Form (for a change that exists only in battle)

**Regional Variant**:
A Species that is the regional version of an older Species, such as Alolan Rattata. It is a Species of its own, and its Evolution Line follows its own evolutions.
_Avoid_: Regional form

**Evolution Line**:
The Species that evolution joins, such as Pichu, Pikachu, Raichu, and Alolan Raichu. Alolan Rattata and Alolan Raticate are a line apart from Rattata and Raticate, because no evolution joins them. Two Species are duplicates when they are in one Evolution Line.
_Avoid_: Family, evolution chain

**Party**:
The Pokémon that a player carries, six at most.
_Avoid_: Team

**Box**:
The living Pokémon of a Journey that are not in the Party.
_Avoid_: PC, storage

**Graveyard**:
The dead Pokémon of a Journey.
_Avoid_: Cemetery, deaths

### Game data

**Game**:
One playable version of a Pokémon title, such as Emerald, Black, or White. A ROM hack is a Game also. Each Game belongs to one Map.
_Avoid_: Version, title

**Map**:
The set of Places that Games released together share, such as the one map of Black and White. Each Game has every Place of its Map. A spot that differs between the Games, such as Black City in Black and White Forest in White, is one Place with a name for each Game. A third version or a sequel has a Map of its own: Emerald does not share the Map of Ruby and Sapphire. A ROM hack has a Map of its own and does not join the Map of the Game that it changes.
_Avoid_: Region (that word names Kanto, Hoenn, or Unova, and one of those can appear in several Maps)

**Place**:
One spot where a player can have Encounters, such as a route, a cave, or a city. The game is the authority: a Place is the location that the game records on a Pokémon as the spot where the player met it. A cave with several floors is thus one Place, and a building is a Place of its own only if the game records it by its own name. Two spots that the game records with the same name are one Place: Underwater is one Place. An egg is met where it hatches, because the game records that spot. When the game records no location for a Pokémon (an in-game trade, or any Pokémon in a Game that records no location), its Place is the spot where the player received it. A Place comes from a Map, or it is a Custom Place. Each Map has a Place for the starter, apart from the first route; this is the one exception to the rule of the recorded location. A Place can have a different name in each Game of its Map: Black City in Black and White Forest in White are one Place. The word never shows in the app: UI copy says "location" for one Place and "Encounters" for the list of them.
_Avoid_: Route, location, area (as domain terms; "location" is the UI word)

**Custom Place**:
A Place that belongs to one Run and not to a Map. It has a name only, and all Journeys of the Run share it.
_Avoid_: Custom Encounter

**Event Place**:
A Place of a Map that a player can reach only with an item from a distribution event, such as Navel Rock. Event Places come last in the play order and do not count toward Progress.
_Avoid_: Event location, bonus area
