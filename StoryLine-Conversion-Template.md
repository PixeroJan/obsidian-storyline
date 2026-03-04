# StoryLine — AI Conversion Templates

Use these templates to convert existing character, location, and world data into
StoryLine's markdown format. Feed this entire document to an AI along with your
existing source material, and ask it to produce one `.md` file per entity.

---

## How StoryLine stores data

Each entity is a **standalone markdown file** with YAML frontmatter.  
All structured fields live in the `---` frontmatter block; free-form prose goes
in the markdown body (mapped to the `notes` field in StoryLine).

**File layout inside a project:**

```
MyProject/
  MyProject.md              ← project file
  Characters/
    Elara Dawnstrike.md     ← character
    Kael Ashford.md
  Locations/
    Eryndor.md              ← world
    Eryndor/
      The Iron Citadel.md   ← location (world: Eryndor)
      Port Veyra.md         ← location (world: Eryndor)
      Port Veyra/
        The Rusty Anchor.md ← sub-location (world: Eryndor, parent: Port Veyra)
  Scenes/
    ...
```

### Rules

1. **Filename = entity name** (e.g. `Elara Dawnstrike.md`).
2. The `type` field is **required** — it must be `character`, `location`, or `world`.
3. Omit any field that has no data — do **not** include empty strings.
4. List fields (like `locations`, `tags`) use YAML list syntax.
5. The `relations` field uses a structured array (see example below).
6. The `gallery` field uses a list of `{path, caption}` objects — skip it unless
   you have actual image paths.
7. The `custom` field is a key-value map for user-defined fields not covered by
   the built-in schema.
8. Everything after the closing `---` becomes the `notes` field (free-form markdown).

---

## Character Template

**File:** `Characters/<Character Name>.md`

```yaml
---
type: character
name: "Elara Dawnstrike"
# tagline: name of another field to show on the card (e.g. "role" or "occupation")
tagline: role

# ── Basic Information ──────────────────────────────
nickname: "The Dawn Blade, Ela"
age: "28"
role: Protagonist
occupation: "Knight-errant, former temple guardian"
residency: "Born in Sunhaven; currently drifting through the Ashlands"
locations:
  - "The Iron Citadel"
  - "Port Veyra"
family: "Daughter of Commander Aldric Dawnstrike (deceased) and healer Maren. Younger brother Tobias, 22, estranged."

# ── Relationships (structured) ─────────────────────
# Each relation has: category, type, target (character name)
# Categories: family | romantic | social | conflict | guidance | professional | story | custom
# Types per category:
#   family:       sibling, half-sibling, twin, parent, child, step-parent, step-child,
#                 adoptive-parent, adopted-child, guardian, ward, grandparent, grandchild,
#                 aunt/uncle, niece/nephew, cousin, in-law
#   romantic:     partner, spouse, ex-partner
#   social:       ally, friend, best-friend, confidant, acquaintance
#   conflict:     enemy, rival, betrayer, avenger
#   guidance:     mentor, mentee, leader, follower, boss, subordinate, commander,
#                 second-in-command, master, apprentice
#   professional: colleague, business-partner, client, handler, asset
#   story:        protector, dependent, owes-debt-to, sworn-to, bound-by-oath,
#                 idolizes, fears, obsessed-with
#   custom:       (any string you define)
relations:
  - category: family
    type: sibling
    target: "Tobias Dawnstrike"
  - category: guidance
    type: mentor
    target: "Ser Aldwin"
  - category: conflict
    type: rival
    target: "Kael Ashford"
  - category: romantic
    type: ex-partner
    target: "Lyra Voss"
  - category: story
    type: owes-debt-to
    target: "The Merchant Prince"

# ── Physical Characteristics ───────────────────────
appearance: "Tall and lean, 5'10\". Auburn hair kept in a practical braid. Amber eyes that catch the firelight. Olive skin, sun-weathered."
distinguishingFeatures: "Jagged scar across left collarbone from the Battle of Ashenmoor. Small tattoo of a rising sun behind the right ear."
style: "Worn leather armor over dark linen. Always carries a battered travel cloak. Stands with a slight forward lean, hand resting on the pommel."
quirks: "Taps the hilt of her sword three times before a fight. Hums an old temple hymn when anxious."

# ── Personality ────────────────────────────────────
personality: "Determined, guarded, compassionate, stubborn, resourceful"
internalMotivation: "Needs to forgive herself for failing to save her father"
externalMotivation: "Wants to find the Ashen Crown and restore her family's honor"
strengths: "Unwavering loyalty, tactical brilliance under pressure, physical endurance"
flaws: "Refuses to ask for help, carries guilt as a shield, drinks too much when idle"
fears: "Being responsible for another death — paralyzed by the weight of command"
belief: "I am only worthy if I carry the burden alone"
misbelief: "The world only rewards those who sacrifice everything"

# ── Backstory ──────────────────────────────────────
formativeMemories: "Watched her father die at Ashenmoor when she was 17. Spent two years in a temple learning discipline before being expelled for questioning the High Cleric."
accomplishments: "Single-handedly held the bridge at Greywater Ford. Failed to prevent the burning of Sunhaven."
secrets: "Secretly carries a letter from her father that reveals the war was built on a lie."

# ── Character Arc ──────────────────────────────────
startingPoint: "Lone wanderer, emotionally shut off, running from her past"
goal: "Find the Ashen Crown before Kael does and use it to end the war"
expectedChange: "Learns that strength comes from trust and connection, not isolation. Forgives herself and leads by inspiring others rather than sacrificing for them."

# ── Other ──────────────────────────────────────────
habits: "Sharpens her blade every evening. Collects pressed wildflowers in her journal. Avoids inns — prefers sleeping under the stars."
props: "Father's sword (notched, refuses to replace it), worn leather journal, a locket containing a lock of Tobias's hair"

# ── Custom fields (optional, any key-value pairs) ──
custom:
  "Blood type": "O-negative"
  "Languages": "Common, Old Sunhaven dialect, broken Ashlands pidgin"
---

Elara remembers the smell of smoke and iron. Every night, the same dream: her father's voice telling her to run, and the sound of her own footsteps obeying.

She tells herself she left to find the Crown. The truth is simpler — she left because staying meant facing what she'd done. Or rather, what she hadn't.

*Additional free-form notes, backstory prose, or development journal entries can go here. This entire section becomes the "notes" field in StoryLine.*
```

---

## Location Template

**File:** `Locations/<Location Name>.md`  
(or nested: `Locations/<World>/<Location Name>.md`)

```yaml
---
type: location
name: "The Iron Citadel"
# locationType options: City, Town, Village, Neighborhood, Building, Room,
#   Wilderness, Forest, Mountain, River, Lake, Sea, Island, Harbour,
#   Road, Vehicle, Region, Country, Other
locationType: building
world: "Eryndor"
# parent: "Port Veyra"    ← use for sub-locations (e.g. a room inside a building)
description: "A fortress of black iron and volcanic stone rising from the Ashlands plateau. Its towers are perpetually wreathed in thin smoke from the geothermal vents below. The walls are warm to the touch."
atmosphere: "Oppressive and ancient. The air smells of sulfur and heated metal. Echoes carry unnaturally through the corridors — whispers seem to follow visitors."
significance: "Seat of the Ash Council. The Ashen Crown is believed to be hidden in its deepest vault. Elara and Kael's paths converge here."
inhabitants: "Lord Cinder (the Ash Council's figurehead), a garrison of 200 Iron Guard soldiers, and the Keeper — an ancient archivist who may know the Crown's location."
connectedLocations: "Port Veyra (two days south by road), The Ashlands (surrounding wasteland), The Undercroft (beneath the citadel)"
mapNotes: "Sits on a plateau 200m above the Ashlands floor. Main gate faces south. Secret entrance through the geothermal tunnels on the north face."

# ── Custom fields (optional) ──
custom:
  "Climate": "Extreme heat, ash-fall common"
  "Defenses": "Triple iron walls, boiling vent traps, gargoyle sentries"
---

The Iron Citadel has stood for a thousand years. No army has breached its walls. But the real danger has always been inside — in the politics of the Ash Council and the secrets buried in the Undercroft.

*Free-form location notes, history, or development prose goes here.*
```

---

## World Template

**File:** `Locations/<World Name>.md`

```yaml
---
type: world
name: "Eryndor"
description: "A continent scarred by the Sundering — a cataclysmic magical war fought three centuries ago. The west is fertile and civilized; the east is the Ashlands, a volcanic wasteland slowly being reclaimed."
geography: "Western coast: temperate forests & rich farmland. Central range: the Spine Mountains. Eastern half: the Ashlands — volcanic plateau, geothermal vents, ash deserts. Three major rivers flow west from the Spine."
culture: "Western kingdoms value honor, chivalry, and temple worship. Ashlands settlers are pragmatic survivalists with a distrust of magic. Port cities are cosmopolitan melting pots."
politics: "The Western Alliance (five kingdoms under a fragile peace treaty) vs. the Ash Council (military junta ruling the Ashlands). Port Veyra is neutral ground — and a powder keg."
magicTechnology: "Magic exists but is feared after the Sundering. Licensed mages serve the Western Alliance; unlicensed use is punishable by exile to the Ashlands. Technology is pre-industrial — black powder weapons are emerging."
beliefs: "Western kingdoms worship the Dawnfather (sun god). Ashlanders follow the Ember Creed — a philosophy of endurance and rebirth through fire. Secret cults worship the old gods who caused the Sundering."
economy: "Western Alliance trades grain, textiles, and timber. Ashlands export rare minerals and geothermal-forged steel. Port Veyra controls the shipping lanes and takes a cut of everything."
history: "300 years ago: The Sundering — mages tear the continent apart. 150 years ago: founding of the Western Alliance. 50 years ago: the Ash Council seizes power. Present day: tensions are escalating toward a second war."

# ── Custom fields (optional) ──
custom:
  "Calendar": "360-day year, 12 months of 30 days"
  "Currency": "Western: gold crowns / Ashlands: iron marks"
---

Eryndor is a world that remembers its scars. The Sundering didn't just reshape the land — it reshaped what people believe is possible, and what they fear.

*Free-form worldbuilding notes, timelines, or development prose goes here.*
```

---

## Conversion Instructions for the AI

When you give this template to your AI, include a prompt like:

> I'm using an Obsidian plugin called StoryLine. Below are the templates showing
> the exact YAML frontmatter format for characters, locations, and worlds.
>
> Please convert the following source material into StoryLine-compatible
> `.md` files. Rules:
>
> 1. One file per character / location / world.
> 2. Use the exact field names shown in the templates (camelCase).
> 3. The `type` field is required (`character`, `location`, or `world`).
> 4. Omit any field that has no data — do not include empty strings or empty lists.
> 5. Use YAML list syntax for array fields (`locations`, `tags`, `relations`).
> 6. Put free-form prose in the markdown body after the closing `---`.
> 7. Relations use the structured format: `{category, type, target}`.
> 8. Wrap multi-line strings with YAML's `>-` or quote them properly.
> 9. The filename should be `<Entity Name>.md`.
>
> Here is my source material:
> [paste your existing character/location descriptions here]

---

## Quick Field Reference

### Character fields
| Field | Type | Description |
|---|---|---|
| `name` | string | Full name (required) |
| `type` | string | Must be `character` (required) |
| `tagline` | string | Field key to show on card (e.g. `role`) |
| `nickname` | string | Aliases, alternative names |
| `age` | string | Age or date of birth |
| `role` | string | Protagonist, antagonist, mentor… |
| `occupation` | string | Job, career |
| `residency` | string | Where they live / are from |
| `locations` | string[] | Story locations they appear at |
| `family` | string | Family background description |
| `relations` | object[] | Structured `{category, type, target}` rows |
| `appearance` | string | Physical description |
| `distinguishingFeatures` | string | Scars, tattoos, birthmarks |
| `style` | string | Clothing, accessories, posture |
| `quirks` | string | Habits, mannerisms |
| `personality` | string | 3–5 descriptive words |
| `internalMotivation` | string | What they need (internal) |
| `externalMotivation` | string | What they want (external) |
| `strengths` | string | Best qualities |
| `flaws` | string | Fatal flaws |
| `fears` | string | Deepest fears |
| `belief` | string | Core belief about themselves |
| `misbelief` | string | False belief about the world |
| `formativeMemories` | string | Key past events |
| `accomplishments` | string | Defining successes or failures |
| `secrets` | string | What they're hiding |
| `startingPoint` | string | State at story start |
| `goal` | string | What they want to achieve |
| `expectedChange` | string | How they change by the end |
| `habits` | string | Hobbies, routines, favorites |
| `props` | string | Items they carry or use |
| `custom` | map | Any additional key-value pairs |
| `notes` | (body) | Free-form markdown after `---` |

### Location fields
| Field | Type | Description |
|---|---|---|
| `name` | string | Location name (required) |
| `type` | string | Must be `location` (required) |
| `locationType` | string | City, Building, Wilderness, etc. |
| `world` | string | Parent world name |
| `parent` | string | Parent location (for nesting) |
| `description` | string | Sights, sounds, smells |
| `atmosphere` | string | Mood and feeling |
| `significance` | string | Why it matters to the story |
| `inhabitants` | string | Key people present |
| `connectedLocations` | string | Nearby or linked places |
| `mapNotes` | string | Coordinates, spatial info |
| `custom` | map | Any additional key-value pairs |
| `notes` | (body) | Free-form markdown after `---` |

### World fields
| Field | Type | Description |
|---|---|---|
| `name` | string | World name (required) |
| `type` | string | Must be `world` (required) |
| `description` | string | General overview |
| `geography` | string | Terrain, climate, environment |
| `culture` | string | Norms, traditions, social structures |
| `politics` | string | Systems of power and governance |
| `magicTechnology` | string | Rules of magic and/or technology |
| `beliefs` | string | Religion, philosophy, myths |
| `economy` | string | Trade, currency, resources |
| `history` | string | Key historical events |
| `custom` | map | Any additional key-value pairs |
| `notes` | (body) | Free-form markdown after `---` |

### Relation categories & types
| Category | Types |
|---|---|
| `family` | sibling, half-sibling, twin, parent, child, step-parent, step-child, adoptive-parent, adopted-child, guardian, ward, grandparent, grandchild, aunt/uncle, niece/nephew, cousin, in-law |
| `romantic` | partner, spouse, ex-partner |
| `social` | ally, friend, best-friend, confidant, acquaintance |
| `conflict` | enemy, rival, betrayer, avenger |
| `guidance` | mentor, mentee, leader, follower, boss, subordinate, commander, second-in-command, master, apprentice |
| `professional` | colleague, business-partner, client, handler, asset |
| `story` | protector, dependent, owes-debt-to, sworn-to, bound-by-oath, idolizes, fears, obsessed-with |
| `custom` | (any string you define) |
