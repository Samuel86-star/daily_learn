# Wood Screw: Bolts Puzzle System Design

## Positioning
Mobile casual puzzle for players who like short deterministic sequence-solving. Each level is a 30-60 second furniture, clock, storage box, or repair-shop teardown where the promise is simple: remove screws in the right order, free the boards, and clear the mechanism.

## Core Loop
Inspect the object -> choose a screw -> move the screw to a valid empty hole or remove it -> boards loosen, drop, or rotate -> expose new screws and holes -> finish when every board is cleared.

Secondary loop: complete a level -> earn stars/coins based on mistakes and time -> unlock the next repair object pack -> replay stuck levels to find a cleaner sequence.

## Core Rules
- Screws hold one or more boards in place.
- A screw can be moved only if its head is visible and not covered by another board.
- A removed screw must either go into an open matching hole or into a small temporary tray slot.
- A board clears when all screws attached to it are removed and no other board is physically blocking its exit path.
- Boards can fall, slide, or rotate only through predefined level-authored directions.
- Level success is deterministic: the same sequence always produces the same result.
- Failure happens when the tray is full and no legal screw move remains.
- Undo is allowed for the last move in MVP to reduce frustration without adding complex hint logic.

## Level or Content Structure
Levels are authored as small layered assemblies:
- 3-8 boards per level.
- 4-14 screws per level.
- 1-4 spare holes per level.
- 0-2 tray slots for temporary screw storage.
- Board exit directions are set by the designer: down, side, hinge rotate, or lift off.

MVP level types:
- Flat plank stack: remove overlapping boards in order.
- Hinged plate: one board rotates away after its screws are removed.
- Locked cross: two or three boards block each other's exits.
- Storage teardown: screws must be parked in spare holes before the final board can leave.

Difficulty should scale by adding new relationships, not just more blockers. Each 5-level batch introduces one clear idea, then combines it with earlier ideas.

## Progression
Use a simple world map with themed packs:
- Pack 1: Old Wooden Stool, 10 tutorial levels.
- Pack 2: Repair Shop Shelf, 15 medium levels.
- Pack 3: Old Clock Case, 15 sequence-heavy levels.

Stars:
- 3 stars: clear with no undo and no tray overflow.
- 2 stars: clear with undo or slow time.
- 1 star: clear after using a hint.

Coins are used only for hints in MVP. No upgrades, inventory crafting, or decorative systems in the first version.

## Retention
Day 1:
- Fast tutorial, satisfying board-drop feedback, first 10 levels finishable in one sitting.

Day 2-3:
- Daily teardown challenge using one curated level with fixed rewards.
- Pack unlocks show the next repair theme clearly.

Day 7:
- Hard-level chain with 5 compact expert puzzles.
- Star cleanup gives completion-minded players a reason to replay earlier levels.

## Monetization
MVP monetization should be modest:
- Rewarded ad for one hint.
- Rewarded ad for one extra tray slot on a failed level.
- Interstitial ad after every 4-6 completed levels, disabled during the first 5 tutorial levels.
- Optional no-ads purchase later, not needed for prototype validation.

No energy system in MVP. It would hurt the fast replay hook.

## Low-Art Production Plan
Minimum assets:
- 4 board shapes: rectangle, short plank, long plank, hinge plate.
- 2 screw states: installed and selected.
- 3 hole types: empty, occupied, blocked.
- 3 background themes: workbench, repair cloth, clock interior.
- Simple UI: level number, undo, hint, tray, star result.

Use flat 2D sprites with light shadows, wood grain overlays, and small particles when a board clears. Theme replacement should swap background, board texture, and level pack names without changing rules.

## MVP Scope
Build first:
- 30 handcrafted levels.
- Deterministic screw selection and movement.
- Board dependency and clear detection.
- Tray capacity failure state.
- Undo last move.
- Basic hint that highlights one currently useful screw.
- Star rating and level unlocks.
- Simple level editor data format using JSON-like board, screw, hole, and dependency definitions.

Do not build yet:
- Physics simulation.
- Procedural level generation.
- Skins, decoration, room building, narrative, crafting, multiplayer, leaderboard, or live events.

## Risks and Avoidance
Cloning/IP risk:
- Avoid copying exact board layouts, icon style, ad creatives, titles, or UI flow from competitors.
- Use local repair themes and original object silhouettes.

Design risk:
- Levels may feel stale if difficulty only comes from hidden screws or blocked exits.
- Avoidance: introduce level verbs in small batches: park screw, rotate board, free cross lock, choose exit order.

Production risk:
- Hand-authoring levels can become slow.
- Avoidance: keep a tiny declarative format and build 4 reusable level templates before making variants.

Platform risk:
- Mini game performance and touch precision may suffer on small screens.
- Avoidance: large screw hit areas, no real physics, limited moving parts, and fixed portrait layout.

## Validation Metrics
Prototype success after 30 levels:
- Tutorial level 1 completion rate above 90%.
- Level 10 completion rate above 60%.
- Average session length above 6 minutes.
- At least 25% of players replay one level for a better star result.
- Hint use below 35% before level 15.
- Rewarded hint ad opt-in above 15% on failed levels.
- Qualitative test: players can explain why the correct order worked after finishing a level.
