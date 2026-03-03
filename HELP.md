# StoryLine — Obsidian Plugin for Writers

**Version 1.3.2** · By Jan Sandström

StoryLine transforms your Obsidian vault into a full-featured book planning and writing tool. Organize scenes, build rich character profiles, manage worlds and locations, track plotlines, and monitor your progress — all without leaving Obsidian. Fully theme-aware with dark and light mode support.

---

## Table of Contents

- [Installation](#installation)
- [Getting Started](#getting-started)
- [Views](#views)
  - [Board View](#board-view)
  - [Corkboard Mode](#corkboard-mode)
  - [Plotgrid View](#plotgrid-view)
  - [Timeline View](#timeline-view)
  - [Plotlines View](#plotlines-view)
  - [Characters View](#characters-view)
  - [Locations View](#locations-view)
  - [Stats View](#stats-view)
  - [Navigator View](#navigator-view)
- [Scene Cards](#scene-cards)
- [Inspector Panel](#inspector-panel)
- [Filtering & Presets](#filtering--presets)
- [Multi-Select & Bulk Edit](#multi-select--bulk-edit)
- [Setup / Payoff Tracking](#setup--payoff-tracking)
- [Plot Hole Detection](#plot-hole-detection)
- [Undo / Redo](#undo--redo)
- [Reading Order vs Chronological Order](#reading-order-vs-chronological-order)
- [Beat Sheet Templates](#beat-sheet-templates)
- [Scene Notes](#scene-notes)
- [Scene Snapshots](#scene-snapshots)
- [Scene Templates](#scene-templates)
- [Color Coding & Tag Colors](#color-coding--tag-colors)
- [Plotline HSL Sliders](#plotline-hsl-sliders)
- [Sticky Note Themes](#sticky-note-themes)
- [Per-Project Color Overrides](#per-project-color-overrides)
- [Timeline Swimlanes](#timeline-swimlanes)
- [Timeline Modes](#timeline-modes)
- [Pacing Analysis](#pacing-analysis)
- [Writing Sprint](#writing-sprint)
- [Relationship Map](#relationship-map)
- [Story Graph](#story-graph)
- [Link Scanner & Detected Links](#link-scanner--detected-links)
- [Tag Type Overrides](#tag-type-overrides)
- [Export](#export)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [Settings](#settings)
- [Project Management](#project-management)
- [File Structure](#file-structure)
- [Tips & Workflow](#tips--workflow)

---

## Installation

### Manual Install

1. Copy these three files into your vault at `.obsidian/plugins/StoryLine/`:
   - `main.js`
   - `manifest.json`
   - `styles.css`
2. Open Obsidian → **Settings → Community Plugins** → enable **StoryLine**.
3. Restart Obsidian.

### From Source

1. Clone or download this repository into `.obsidian/plugins/StoryLine/`.
2. Run `npm install` and `npm run build`.
3. Enable the plugin in Obsidian settings.

---

## Getting Started

1. **Create a project** — Open the command palette (`Ctrl+P`) and run **StoryLine: Create New Project**. Give your project a title.
2. StoryLine creates a folder structure for you:
   ```
   StoryLine/
     My Novel/
       Scenes/
       Characters/
       Locations/
   ```
3. **Create your first scene** — Use `Ctrl+Shift+N` or click the **+** button in the Board view.
4. **Switch between views** using the tab bar at the top of any StoryLine view.

---

## Views

StoryLine provides seven interconnected views plus a sidebar navigator. Switch between them using the tab bar or keyboard shortcuts.

### Board View

The main workspace — a Kanban-style board that displays your scenes as cards.

- **Group by:** Act, Chapter, Status, or POV (use the dropdown in the toolbar).
- **Drag and drop** cards between columns to reassign act, chapter, status, or POV.
- **Color-coded cards** based on status, POV, emotion, act, or tag (configurable in settings).
- **Quick actions:** right-click any card for a context menu with edit, duplicate, delete, and open options.
- **Add acts/chapters** using the Structure and Chapters buttons in the toolbar.
- **Resequence** — click the resequence button to auto-number all scenes based on their current board order.
- **Search** — type in the search bar to filter scenes by title, content, characters, or tags.
- **Beat Sheet Templates** — apply a beat sheet template (Save the Cat, 3-Act, Hero's Journey) from the Structure modal.
- **Act labels** — custom labels on act dividers (e.g., beat names); inline-editable.

### Corkboard Mode

Toggle between the standard Kanban column layout and a freeform **corkboard** canvas using the toggle button in the Board toolbar.

- **Sticky notes** — create color-coded sticky notes to brainstorm and capture your first ideas. Notes support markdown formatting.
- **Convert to scene** — when an idea is ready, convert a sticky note into a full scene with one click.
- **Freeform positioning** — drag scene cards and sticky notes anywhere on the spatial canvas.
- **Positions saved per project** — your corkboard layout is stored in `System/board.json` and syncs across devices.

### Plotgrid View

A spreadsheet-like grid for detailed scene planning.

- Rows and columns represent your story structure.
- Click any cell to edit its content, link a scene, set colors, or adjust metadata.
- **Zoom in/out** for overview or detail.
- Drag scenes onto cells to link them.
- Supports custom row/column headers for acts, chapters, plotlines, etc.

### Timeline View

Visualize your scenes on a chronological timeline.

- Scenes are positioned by `storyDate` and `storyTime` metadata.
- Useful for tracking parallel storylines and temporal flow.
- Click a scene to edit its time properties.
- Supports multiple timelines for complex narratives.
- Add acts and chapters from the toolbar.
- **Order Toggle** — switch between **Reading Order** (scene sequence) and **Chronological Order** (in-story timeline). See [Reading Order vs Chronological Order](#reading-order-vs-chronological-order).
- **Dual-order badges** — each scene card shows both its reading-order number and chronological-order number.
- **Beat Sheet Templates** — apply a story structure template from the Structure modal.
- **Act labels** — custom beat/act labels are displayed on timeline dividers and are inline-editable.
- **Swimlane mode** — see [Timeline Swimlanes](#timeline-swimlanes).

### Plotlines View

Track your story's plotlines (tags) across the narrative. Two view modes are available — toggle between them with the buttons in the toolbar.

#### Subway Map (default)
- Transit-style SVG visualization with one flat lane per plotline.
- Scenes appear as labeled station nodes along each plotline's track.
- **Gradient connectors** link shared scenes across plotlines, colored by the source tag.
- **Act dividers** show vertical lines with act labels for structural context.
- **Scene labels & tag pills** display below each node for quick identification.
- **Drag to pan** — click and drag the map to navigate large stories.
- **Per-tag color picker** — click the palette (🎨) icon next to any plotline header to assign a custom color. Right-click a header for "Change color" / "Reset color".

#### List View
- Each plotline (tag) gets its own row showing which scenes it appears in.
- Quickly see which plotlines are active, dormant, or unresolved.

#### Common Features
- **Rename** or **delete** plotlines across all scenes at once.
- Visualize plotline density and coverage.
- Scenes default to **book order** (reading order). Toggle to sequence order from the toolbar.

### Characters View

A dedicated character management system with rich profiles.

#### Overview Grid
- All characters displayed as **compact cards** with role badge, snippet, and completeness bar.
- **Portrait images** — each card shows a circular portrait (64×64 px). Click the placeholder icon to add an image.
- Cards are color-coded by role (protagonist, antagonist, supporting, minor, mentor, love interest).
- **Unlinked characters** — characters mentioned in scenes but without a profile are listed separately with a one-click "Create" button.
- Click any card to open the full character detail editor.
- **Relationship Map** — see [Relationship Map](#relationship-map).

#### Character Detail Editor
- **Collapsible sections** organized into seven categories:
  - **Basic Information** — name, age, role, occupation, nickname, residency, locations.
  - **Physical Characteristics** — appearance, distinguishing features.
  - **Personality** — traits, strengths, weaknesses, fears, motivations.
  - **Backstory** — background, key events, secrets.
  - **Relationships** — allies, enemies, romantic, mentors, other connections.
  - **Character Arc** — starting state, desired arc, ending state.
  - **Custom Fields** — add your own key/value pairs for anything else.
- **Portrait area** — circular portrait (96×96 px) at the top of the editor. Click to add or change the image. Hover shows "Add image" / "Change image" label.
- **Image picker** — choose to import an image from your computer (saved into `<Project>/Images/`), pick an existing vault image, or remove the current image.
- All fields show grey **placeholder text** that disappears when you type.
- **Auto-save** — changes are saved automatically after a short delay (no manual save needed).
- **Side panel** shows:
  - Scene count, word count, and POV scene count.
  - Intensity curve graph for scenes featuring this character.
  - Gap detection warnings.
  - Full list of scenes the character appears in, with status badges.

### Locations View

A hierarchical worldbuilding and location management system.

#### Two-Level Structure
- **Worlds** — top-level containers for worldbuilding (geography, culture, politics, magic/technology, beliefs, economy, history).
- **Locations** — specific places that can optionally belong to a world. Locations can also have a **parent location**, enabling unlimited nesting (e.g., a building → its rooms).

#### Overview Tree
- Worlds appear as **collapsible top-level nodes** with a globe icon and location count.
- **Image thumbnails** — small (20×20 px) thumbnails appear next to each node when an image is set.
- Locations nest underneath their world, with further child locations indented below their parent.
- **Standalone locations** (not linked to any world) appear in a separate section.
- **Unlinked locations** — places referenced in scenes but without a profile show a "Create" button.
- Click any node to open its detail editor.

#### Detail Editor
- **World profiles** have eight collapsible sections: Overview, Geography & Environment, Culture & Society, Politics & Power, Magic & Technology, Beliefs & Mythology, Economy & Trade, History & Lore.
- **Location profiles** have five sections: Overview, Atmosphere & Description, Story Significance, Connected Locations, and a Hierarchy section with World and Parent dropdowns.
- **Portrait area** — rectangular portrait (120×80 px) at the top of the detail editor. Click to add or change the image.
- **Image picker** — import from computer (saved into `<Project>/Images/` with automatic dedup), choose from vault, or remove.
- **Custom fields** for any additional notes.
- **Auto-save** with focus-loss protection (editing won't be interrupted).
- **Side panel** shows:
  - Location/world stats (scene count, sub-location count).
  - List of scenes set at the location.
  - Characters who appear at the location (with frequency count).
  - For worlds: all locations in that world with one-click navigation.

### Stats View

A statistics dashboard with at-a-glance project health.

- **Word count** progress (actual vs. target).
- **Scene count** by status (idea → final pipeline).
- **Status distribution** breakdown.
- **Tension/intensity curve** — visual graph of your story's emotional arc.
- **POV distribution** — who gets the most page time.
- **Act balance** — see if your acts are roughly even.
- **Plot hole detection** — automated warnings grouped by category (see below).
- **Pacing Analysis** — see [Pacing Analysis](#pacing-analysis).
- **Writing Sprint** — see [Writing Sprint](#writing-sprint).

### Navigator View

A compact sidebar panel for quick scene navigation without leaving your current view.

#### Toolbar
- **Search** — type to filter scenes by title.
- **Sort** — five modes: Sequence (default), Status, Recently Modified, Word Count, and Title (A–Z).

#### Plotline Filter
- Collapsible section listing all plotline tags in the project.
- Each plotline shows a **color dot** (matching your color scheme) and a **scene count**.
- Click a plotline to filter scenes to only those tagged with it. Click again to clear.

#### Scene List
- Scenes grouped by **act** with collapsible act headers.
- Each row shows: sequence number, title, status badge, and word count.
- **Pinned scenes** appear at the top in a dedicated section for quick access.
- Click a scene to select it in the main view. Right-click for a context menu: pin/unpin and change status.

#### Progress Bar
- A bottom bar showing overall word count progress toward your project goal.

#### Auto-Open
- The Navigator opens automatically when a project loads (configurable via **Settings → Auto-open Navigator**).
- You can also open it manually via the command palette: **Open StoryLine Navigator**.

---

## Scene Cards

Each scene is a Markdown file with YAML frontmatter. StoryLine manages these fields:

| Field | Description | Example |
|-------|-------------|---------|
| `title` | Scene title | `"The Chase"` |
| `act` | Act number | `2` |
| `chapter` | Chapter number | `7` |
| `sequence` | Reading order (as written) | `14` |
| `chronologicalOrder` | In-story chronological order | `8` |
| `pov` | Point of view character | `"Anna"` |
| `characters` | Characters present (wikilinks) | `["[[Anna]]", "[[Erik]]"]` |
| `location` | Setting (wikilink) | `"[[Castle]]"` |
| `status` | Completion status | `draft` |
| `storyDate` | Date in the story | `"2026-02-17"` or `"Day 3"` |
| `storyTime` | Time in the story | `"14:00"` or `"morning"` |
| `conflict` | Main conflict | `"Anna must escape"` |
| `emotion` | Emotional tone | `"tense"` |
| `intensity` | Arc intensity (-10 to +10) | `7` |
| `wordcount` | Actual word count (auto) | `1200` |
| `target_wordcount` | Target word count | `800` |
| `tags` | Plotlines and themes | `["romance", "betrayal"]` |
| `notes` | Editorial / author notes | `"Needs more tension"` || `timeline_mode` | Non-linear narrative technique | `"flashback"` |
| `timeline_strand` | Parallel/frame strand group | `"1985"` || `setup_scenes` | Scenes this sets up | `["path/to/scene.md"]` |
| `payoff_scenes` | Scenes that pay off this one | `["path/to/scene.md"]` |

**Status progression:** `idea` → `outlined` → `draft` → `written` → `revised` → `final`

Write your scene content below the frontmatter as normal Markdown.

---

## Inspector Panel

Click any scene card to open the **Inspector Panel** on the right side. It provides:

- **Metadata editing** — title, act, chapter, sequence, status, POV, location, conflict, emotion, intensity.
- **Characters** — add/remove characters with autocomplete.
- **Tags** — manage plotline tags, with color-coded tag badges when tag colors are configured.
- **Notes** — editorial notes field for author comments and reminders.
- **Word count** — current vs. target with progress indicator.
- **Setup/Payoff links** — see and manage which scenes set up or pay off this scene.
- **Time & Order** — story date, story time, chronological order, timeline mode, and timeline strand (see [Reading Order vs Chronological Order](#reading-order-vs-chronological-order) and [Timeline Modes](#timeline-modes)).
- **Open scene** — click to open the full Markdown file in a new tab.

---

## Filtering & Presets

All views support filtering by:

- **Status** (idea, outlined, draft, written, revised, final)
- **Characters** — filter by character presence
- **Locations** — filter by location
- **Tags** — filter by plotline/theme tags
- **Search text** — free-text search across titles and content

### Filter Chips

Active filters appear as clickable chips at the top. Click a chip to remove that filter.

### Saved Presets

Save your current filter combination as a **preset** for quick reuse:

1. Set your desired filters.
2. Click **Save Preset** and give it a name.
3. Access saved presets from the preset dropdown.
4. Delete presets you no longer need.

---

## Multi-Select & Bulk Edit

In the **Board View**, hold `Ctrl` (or `Cmd` on Mac) and click multiple scene cards to select them. A **bulk action bar** appears with:

- **Set Status** — change status for all selected scenes.
- **Move to Act** — reassign act for all selected scenes.
- **Add Tag** — add a tag to all selected scenes.
- **Delete** — trash all selected scenes (with confirmation).
- **Clear** — deselect all.

---

## Setup / Payoff Tracking

Link scenes that set up (foreshadow) and pay off (resolve) each other:

1. Open a scene in the **Inspector Panel**.
2. Scroll to the **Setup / Payoff** section.
3. Click **+ Add** to link a target scene using the scene picker.
4. Links are bidirectional — if Scene A "sets up" Scene B, Scene B shows Scene A under "Set up by".

The Stats View and Plot Hole Detection will warn about:
- Setups without payoffs.
- Payoffs without setups.
- Setups that appear *after* their payoff (ordering issues).

---

## Plot Hole Detection

StoryLine's **Validator** engine automatically scans your story for potential issues. Enable it in Settings (`enablePlotHoleDetection`). Warnings appear in the **Stats View**, grouped into six categories:

### 1. Timeline
- Duplicate sequence numbers.
- Large sequence gaps (>5 missing numbers) — skipped for `timeskip`, `dream`, and `mythic` modes.
- Story dates out of chronological order — skipped for `flashback`, `flash_forward`, `dream`, `mythic`, and `circular` modes.
- Parallel/frame strand scenes are validated independently within each strand group.

### 2. Characters
- Scenes missing a POV character.
- Characters that only appear once (potential orphans).
- Characters that disappear for more than 40% of the story.

### 3. Plotlines
- Tags/plotlines that appear in early acts but vanish before the end.
- Plotlines missing from middle acts.
- Scenes with no tags at all.

### 4. Setup / Payoff
- Setups that reference non-existent scenes.
- Missing reverse links (one-directional connections).
- Setup scenes that appear *after* their payoff scene.

### 5. Structure
- Untitled scenes.
- Scenes without an act assignment.
- Severe act imbalance (one act 3× larger than another).
- Scenes with no conflict defined.

### 6. Continuity & Pacing
- Sharp intensity drops (≥6 points between consecutive scenes) — skipped when `dream` or `mythic` scenes are involved.
- Monotonous emotion streaks (5+ consecutive scenes with the same emotion) — streaks reset at `dream`/`mythic` boundaries.

Each warning has a **severity level**:
- 🔴 **Error** — likely a real problem.
- 🟡 **Warning** — worth investigating.
- ℹ️ **Info** — minor suggestion.

---

## Undo / Redo

StoryLine tracks changes to scenes (create, update, delete) and lets you undo/redo:

- **Undo:** `Ctrl+Z` (or command palette: *Undo Last Scene Change*)
- **Redo:** `Ctrl+Shift+Z` (or command palette: *Redo Last Scene Change*)

The undo stack stores up to 50 actions and persists within the current session.

---

## Reading Order vs Chronological Order

For non-linear narratives (flashbacks, time jumps, in medias res), StoryLine supports two separate ordering fields:

- **Reading Order** (`sequence`) — the order scenes appear when the reader reads the book, page by page.
- **Chronological Order** (`chronologicalOrder`) — the order events happen within the story's timeline.

### How to Use

1. **Set chronological order** in the Inspector's **Time & Order** modal, or directly in the scene's YAML frontmatter.
2. **Switch order in Timeline View** — use the order dropdown in the toolbar to toggle between "Reading Order" and "Chronological Order".
3. **Dual-order badges** appear on scene cards showing both numbers (e.g., `R:5 / C:2` means reading order 5, chronological order 2).
4. **Drag-and-drop** in the Timeline respects the currently active order mode.

### Export

Both `sequence` and `chronologicalOrder` are included in all export formats (Markdown, JSON, CSV, PDF).

---

## Beat Sheet Templates

Apply proven story structure templates to quickly scaffold your acts:

### Built-in Templates

| Template | Beats | Description |
|----------|-------|-------------|
| **Save the Cat!** | 15 beats | Blake Snyder's popular screenplay structure (Opening Image, Theme Stated, Set-Up, Catalyst, Debate, Break into Two, B Story, Fun & Games, Midpoint, Bad Guys Close In, All Is Lost, Dark Night of the Soul, Break into Three, Finale, Final Image) |
| **Three-Act Structure** | 10 beats | Classic three-act framework (Hook, Inciting Incident, First Plot Point, Rising Action, Midpoint, Complications, Crisis, Climax, Falling Action, Resolution) |
| **Hero's Journey** | 12 stages | Joseph Campbell's monomyth (Ordinary World, Call to Adventure, Refusal of the Call, Meeting the Mentor, Crossing the Threshold, Tests Allies Enemies, Approach to the Inmost Cave, The Ordeal, Reward, The Road Back, Resurrection, Return with the Elixir) |

### How to Use

1. Open the **Structure** modal from the Board or Timeline toolbar.
2. Select a **Beat Sheet Template** from the dropdown.
3. Click **Apply** — StoryLine creates the acts and assigns beat labels automatically.
4. **Act labels** appear on column headers (Board View) and timeline dividers (Timeline View).
5. **Edit labels inline** by clicking the label text on any act divider.

Beat names are stored as `actLabels` on the project and persist across sessions.

---

## Scene Notes

Each scene has an optional **notes** field for editorial comments, reminders, and revision notes:

- Edit notes in the **Inspector Panel** under the Notes section.
- Notes are separate from the scene body — they're for author-facing comments that won't appear in the manuscript.
- Notes are included in **outline exports** (Markdown, JSON, CSV) so you can share them with editors.

---

## Scene Snapshots

Save point-in-time snapshots of a scene for version tracking:

- **Save Snapshot** — captures the current state of a scene (frontmatter + body).
- **View Snapshots** — browse previous snapshots with timestamps.
- **Restore** — revert a scene to any previous snapshot.

Useful for experimenting with rewrites without losing your earlier work.

---

## Scene Templates

Create reusable templates for common scene types:

### Built-in Templates
- Starter templates for common scene patterns.

### Custom Templates
1. Set up a scene with your desired default values (status, act, tags, conflict patterns, etc.).
2. Save it as a template from the scene context menu.
3. When creating new scenes, choose a template to pre-fill fields.

Templates are stored in settings and available across all projects.

---

## Color Coding & Tag Colors

StoryLine color-codes scene cards across all views. Choose a mode in **Settings → Color Coding**:

| Mode | Behavior |
|------|----------|
| **Status** | Colors based on scene status (idea, draft, final, etc.) |
| **POV** | Each POV character gets a unique color |
| **Emotion** | Colors mapped to emotional tones |
| **Act** | Each act gets a distinct color |
| **Tag** | Cards colored by their first tag's assigned color |

### Color Schemes

StoryLine ships with **16 built-in color schemes** plus a fully custom option:

| Group | Schemes |
|-------|----------|
| **Catppuccin** | Latte, Frappé, Macchiato, Mocha |
| **Moods** | Spring, Morning, Summer, Dusk, Midnight, Autumn, Ocean, Forest, Sunset, Arctic, Vintage, Neon |
| **Custom** | Define your own palette in settings |

Each scheme provides 14 colors that are automatically assigned to tags. Select a scheme in **Settings → Color Coding** — schemes are displayed as compact cards grouped by family, with a color preview strip and a mood hint.

### Per-Tag Color Overrides

Override individual tag colors without changing the whole scheme:

- **From the Plotlines view** — click the palette (🎨) icon next to any plotline header, or right-click and choose "Change color" / "Reset color".
- **From Settings** — in the Color Coding section, each tag appears as a compact chip with a color swatch. Click the swatch to pick a custom color; click the × to reset.

Overrides persist across sessions and take priority over the active scheme.

All color coding is **theme-aware** — colors automatically adapt to your current Obsidian theme (dark or light mode).

---

## Plotline HSL Sliders

Fine-tune your plotline color palette without switching schemes. In **Settings → Plotline Color Scheme**, three sliders let you adjust the entire palette at once:

| Slider | Range | Effect |
|--------|-------|--------|
| **Hue Shift** | −180 … +180 | Rotates all palette colors around the color wheel |
| **Saturation** | −100 … +100 | Makes colors more vivid (positive) or muted (negative) |
| **Lightness** | −100 … +100 | Makes colors lighter (positive) or darker (negative) |

Changes apply in real time with a live swatch preview. The adjustments stack on top of the active color scheme and per-tag overrides.

---

## Sticky Note Themes

Corkboard sticky notes have their own independent color system. Choose a theme in **Settings → Sticky Note Colors**:

| Theme | Description |
|-------|-------------|
| **Classic** | Warm yellows, pinks, greens, and blues |
| **Pastel** | Soft, low-saturation tones |
| **Earth** | Warm browns, olive, terracotta, and sage |
| **Jewel** | Rich, saturated gemstone colors |
| **Neon** | Bright, high-energy fluorescent tones |
| **Mono** | Greyscale neutrals |

Each theme provides 14 colors. Like plotline colors, sticky notes also have **HSL sliders** (hue shift, saturation, lightness) for fine-tuning and **per-note color overrides** — right-click a sticky note to assign a specific color.

---

## Per-Project Color Overrides

By default, color scheme, HSL adjustments, and sticky note theme are global settings shared across all projects. You can optionally save them per project so each book has its own look.

### Enabling

1. Open **Settings → Plotline Color Scheme**.
2. Toggle **Use project-specific colors** (visible only when a project is loaded).
3. Any changes you make to the color scheme, HSL sliders, or sticky note theme will now be saved into the active project's `System/plotlines.json` file.

### Behavior

- **Toggle ON** — color settings are stored in the project and override the global defaults whenever that project is active.
- **Toggle OFF** — removes per-project overrides and restores the global color settings.
- **Switching projects** — when you open a project with per-project colors, those colors load automatically. When you open a project without them, the global defaults are restored.

This is useful when you want a dark moody palette for a thriller and bright pastels for a romance, without manually switching schemes every time you change projects.

---

## Timeline Swimlanes

The Timeline View supports a **Swimlane Mode** that organizes scenes into vertical columns:

### Enabling Swimlanes

1. Open the **Timeline View**.
2. Click the **Swimlanes** toggle button in the toolbar.
3. Choose a grouping from the **Group By** dropdown:

| Group By | Behavior |
|----------|----------|
| **POV** | One swimlane column per POV character |
| **Location** | One swimlane per location |
| **Tag** | One swimlane per tag/plotline |

### How It Works

- Scenes are placed in a **CSS grid** layout with swimlane columns.
- Each column has a **header** showing the group name and scene count.
- Scenes without a value for the grouping field appear in an "Ungrouped" column.
- Swimlanes combine with the reading/chronological order toggle — scenes are sorted within each column by the active order.

This is especially useful for visualizing parallel storylines, tracking character arcs across locations, or analyzing plotline distribution.

---

## Timeline Modes

For stories with non-linear narratives, each scene can declare a **timeline mode** that describes its temporal relationship to the main narrative. This prevents false plot-hole warnings and provides visual indicators throughout the UI.

### Available Modes

| Mode | YAML Value | Description |
|------|-----------|-------------|
| Linear | `linear` | Default — scene follows the normal timeline |
| Flashback | `flashback` | Scene depicts past events |
| Flash Forward | `flash_forward` | Scene depicts future events |
| Parallel | `parallel` | Scene runs on a separate parallel timeline |
| Frame | `frame` | Scene is part of a framing narrative |
| Simultaneous | `simultaneous` | Scene happens at the same time as the previous |
| Time Skip | `timeskip` | Scene jumps forward, skipping elapsed time |
| Dream | `dream` | Dream sequence, vision, or hallucination |
| Mythic | `mythic` | Myth, legend, story-within-a-story |
| Circular | `circular` | Scene echoes or returns to an earlier moment |

### Setting Timeline Mode

1. **Inspector** — open the scene's **Time & Order** modal and select a mode from the dropdown.
2. **YAML frontmatter** — set `timeline_mode: flashback` (or any value above) directly in the file.
3. **Timeline strand** — for `parallel` and `frame` modes, set `timeline_strand` to group related scenes (e.g., `timeline_strand: "1985"`).

### How Modes Affect Validation

- **Date order checks** are skipped for flashback, flash_forward, dream, mythic, and circular scenes.
- **Gap checks** are skipped for timeskip, dream, and mythic scenes.
- **Intensity drop warnings** are skipped when dream or mythic scenes are involved.
- **Emotion streak detection** resets at dream/mythic boundaries.
- **Parallel/frame strands** are validated independently — each strand group must have internally consistent dates.
- **Simultaneous scenes** are allowed to share the same date as adjacent scenes.

### Visual Indicators

- **Color-coded badges** appear on scene cards (Board View), timeline entries, swimlane cards, and the Inspector.
- Each mode has a distinct color (e.g., flashback = purple, parallel = blue, dream = violet, mythic = gold).
- Strand labels are shown alongside mode badges for parallel/frame scenes.
- All 10 modes are included in exports (Markdown, JSON, CSV, PDF).

### Narrative Techniques Covered

These 10 modes cover all common non-linear structures:

| Technique | Recommended Mode |
|-----------|------------------|
| Flashback / analepsis | `flashback` |
| Flash-forward / prolepsis | `flash_forward` |
| Parallel timelines | `parallel` + `timeline_strand` |
| Frame story / nested narrative | `frame` + `timeline_strand` |
| Simultaneous action | `simultaneous` |
| Time skip / ellipsis | `timeskip` |
| Dream / vision / hallucination | `dream` |
| Myth / legend / story-within-story | `mythic` |
| Circular narrative | `circular` |
| In medias res | `flashback` for backstory scenes |
| Retrospective narration | `frame` for narrator frame |
| Epistolary non-linearity | `parallel` with letter/diary strands |
| Subjective time distortion | `dream` |

---

## Pacing Analysis

The **Stats View** includes a Pacing Analysis panel with two visualizations:

### Average Scene Length by Act
- A **bar chart** showing the average word count of scenes in each act.
- Helps identify acts that may be too sparse or too dense.
- Acts use their custom beat labels if a beat sheet template has been applied.

### Word Count Distribution
- A **histogram** showing how scene word counts are distributed across your project.
- Bin ranges (e.g., 0–500, 500–1000, …) are automatically calculated.
- Helps identify if your scenes are consistently sized or if you have outliers.

---

## Writing Sprint

StoryLine includes a built-in writing sprint timer in the **Stats View**:

1. Set your desired sprint duration.
2. Click **Start** to begin the countdown.
3. Write in your scene files — the timer runs in the Stats panel.
4. When the timer ends, your sprint session is recorded.

Use sprints to stay focused and build a consistent writing habit.

---

## Relationship Map

The **Characters View** includes a visual relationship map:

- Displays characters as nodes connected by relationship lines.
- **Six relationship types**, each with a distinct color and line style:

| Type | Color | Line Style |
|------|-------|------------|
| Ally | Green | Solid |
| Enemy | Red | Dashed |
| Romantic | Pink | Dotted |
| Family | Orange | Solid |
| Mentor | Purple | Dash-dot |
| Other | Grey | Dashed |

- Click a character node to navigate to their profile.
- **Zoom** — scroll the mouse wheel to zoom in/out (cursor-centered).
- **Pan** — click and drag the background to pan the view.
- Helps visualize complex webs of character relationships at a glance.

### Character Relationship Fields

Relationships are populated from the character profile editor:

| Field | Description | Stored As |
|-------|-------------|-----------|
| **Allies & Friends** | Trusted companions | `allies: ["Name", ...]` |
| **Enemies & Rivals** | Opponents and conflicts | `enemies: ["Name", ...]` |
| **Romantic** | Love interests, partners, exes | `romantic: ["Name", ...]` |
| **Mentors** | Teachers, guides, role models | `mentors: ["Name", ...]` |
| **Other Connections** | Any other notable relationships | `otherRelations: ["Name", ...]` |
| **Family** | Parsed from the Family free-text field | `family: "free text"` |

---

## Story Graph

The **Characters View** includes a **Story Graph** (third tab alongside Overview and Relationship Map).

The Story Graph is an interactive force-directed SVG visualization showing how scenes, characters, locations, and props are interconnected:

### Node Types

| Node | Shape | Color | Source |
|------|-------|-------|--------|
| Scene | Rectangle | Purple | Scenes with detected `[[wikilinks]]` |
| Character | Circle | Blue | Characters referenced via wikilinks |
| Location | Diamond | Green | Locations referenced via wikilinks or character fields |
| Prop | Hexagon | Pink | `#hashtags` in character text fields |
| Other | Small circle | Orange | Unclassified wikilink targets |

### Edge Types

Edges represent three categories of connections:

1. **Scene ↔ Entity** — a scene references a character, location, or entity via `[[wikilink]]` in its body text.
2. **Character ↔ Character** — relationship edges (ally, enemy, romantic, family, mentor, other) from character profiles.
3. **Character → Prop** — `#hashtags` found in character text fields (appearance, props, habits, etc.).
4. **Character → Location** — from the `locations` field or `#tags` in the residency field.

### Filter Toggles

The toolbar provides entity-type filter buttons:

- **Characters** — show/hide character nodes
- **Locations** — show/hide location nodes
- **Other** — show/hide unclassified nodes
- **Props** — show/hide prop hexagons
- **Relationships** — show/hide character-to-character relationship edges

### Interaction

- **Drag nodes** — click and drag any node to reposition it.
- **Zoom** — scroll the mouse wheel to zoom in/out (cursor-centered).
- **Pan** — click and drag the background to pan the view.
- **Click a scene node** — fires the scene select callback.
- **Legend** — a color legend shows all node types and relationship edge colors.

### How Links Are Detected

The Story Graph uses the **Link Scanner** to find connections. See [Link Scanner & Detected Links](#link-scanner--detected-links).

---

## Link Scanner & Detected Links

StoryLine includes a **Link Scanner** that automatically extracts `[[wikilinks]]` from your scene body text and classifies them:

### How It Works

1. The scanner extracts all `[[wikilinks]]` from each scene's Markdown body (below the frontmatter).
2. Each link is classified against your project's characters and locations:
   - If the link matches a character name or nickname → **character**
   - If the link matches a location name → **location**
   - Otherwise → **other** (unclassified)

### Where Links Appear

- **Inspector Panel** — a "Detected Links" section shows all wikilinks found in the selected scene, displayed as typed pills (character / location / other).
- **Story Graph** — detected links drive the scene-to-entity edges in the graph visualization.

### Usage Tips

- Write `[[Character Name]]` or `[[Location Name]]` naturally in your scene prose.
- The scanner runs automatically — no manual tagging required.
- Links that don't match any known character or location appear as "other" — you can override their type via the context menu (see [Tag Type Overrides](#tag-type-overrides)).

---

## Tag Type Overrides

When StoryLine auto-classifies `#hashtags` or detected `[[wikilinks]]`, it may sometimes get the type wrong (e.g., classifying a prop as a location). You can manually override any tag's type:

### How to Override

1. **From the Inspector** — right-click any detected link pill in the "Detected Links" section.
2. **From the Characters View** — right-click any tag pill shown under a character's profile.
3. A context menu appears with options:
   - **Prop** — reclassify as a prop
   - **Location** — reclassify as a location
   - **Character** — reclassify as a character
   - **Other** — reclassify as unclassified
   - **Reset** — remove the override and revert to auto-classification

### Details

- Overrides are stored in plugin settings and persist across sessions.
- Overridden tags show a visual indicator (e.g., different styling) so you know they've been manually classified.
- Overrides affect both the Inspector display and the Story Graph visualization.
- `#hashtags` in **custom fields** are also scanned and can be overridden.

### Character Locations Field

The character profile includes a **Locations** field (right after Residency) for listing story locations the character appears at:

- **Residency** = where they live (static, biographical)
- **Locations** = places they go in the narrative (dynamic, plot-driven)

Values in the Locations field create character → location edges in the Story Graph. You can also use `#hashtags` inside location entries for tag-based connections.

---

## Export

Export your project in six formats. Access via the **Export** button in the view switcher toolbar (download icon) or `Ctrl+Shift+E`.

### Scope Options

| Scope | Description |
|-------|-------------|
| **Outline** | Metadata table, summary statistics, character list, location/world list, plotline list, notes |
| **Manuscript** | Full scene content assembled in act → chapter → sequence order |

### Format Options

| Format | Output |
|--------|--------|
| **Markdown (.md)** | Saved to `ProjectName/Exports/` folder |
| **JSON (.json)** | Structured data, saved to `ProjectName/Exports/` folder |
| **CSV (.csv)** | Spreadsheet-ready data, saved to `ProjectName/Exports/` folder |
| **HTML (.html)** | Standalone web page with embedded styles. Works on desktop and mobile |
| **PDF (.pdf)** | Rendered via the built-in print engine. Desktop only |
| **DOCX (.docx)** | Word document ready for editors, agents, or print. Works on desktop and mobile |

### Exported Fields

**Outline exports** include all scene metadata:

| Field | MD | JSON | CSV | HTML | PDF | DOCX |
|-------|:--:|:----:|:---:|:----:|:---:|:----:|
| Sequence | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Chronological Order | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Title | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Act / Chapter | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Status | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| POV | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Location | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Characters | — | ✓ | ✓ | — | — | — |
| Emotion | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Intensity | ✓ | ✓ | ✓ | — | — | — |
| Word Count | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Target Word Count | — | ✓ | ✓ | — | — | — |
| Conflict | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Tags | ✓ | ✓ | ✓ | — | — | — |
| Story Date / Time | — | ✓ | ✓ | — | — | — |
| Notes | ✓ | ✓ | ✓ | — | — | — |
| Setup / Payoff | — | ✓ | ✓ | — | — | — |

**Manuscript exports** include: title, act, chapter, sequence, chronological order, and full scene body.

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+1` | Switch to Board view |
| `Ctrl+Shift+2` | Switch to Plotgrid view |
| `Ctrl+Shift+3` | Switch to Timeline view |
| `Ctrl+Shift+4` | Switch to Plotlines view |
| `Ctrl+Shift+5` | Switch to Characters view |
| `Ctrl+Shift+6` | Switch to Stats view |
| `Ctrl+Shift+7` | Switch to Locations view |
| `Ctrl+Shift+N` | Quick-add a new scene |
| `Ctrl+Shift+E` | Export project |
| `Ctrl+Z` | Undo last scene change |
| `Ctrl+Shift+Z` | Redo last scene change |

All shortcuts can be customized in Obsidian's **Settings → Hotkeys**.

---

## Settings

Open **Settings → StoryLine** to configure:

| Setting | Description | Default |
|---------|-------------|---------|
| StoryLine Root | Root folder for all projects | `StoryLine` |
| Default Status | Status for new scenes | `idea` |
| Auto-generate Sequence | Auto-number new scenes | On |
| Default Target Word Count | Word count goal per scene | `800` |
| Project Word Goal | Word count goal for the whole project | `80000` |
| Default View | Which view opens first | `Board` |
| Color Coding | Card color mode (status / POV / emotion / act / tag) | `status` |
| Color Scheme | Choose from 16 palettes (Catppuccin + Moods) or custom | `mocha` |
| Tag Color Overrides | Per-tag color overrides shown as compact chips | — |
| Show Word Counts | Display word counts on cards | On |
| Compact Card View | Smaller cards with less detail | Off |
| Plot Hole Detection | Enable the Validator engine | On |
| Scene Templates | Custom scene templates for quick scene creation | — |

---

## Project Management

StoryLine supports **multiple projects** in the same vault.

### Creating a Project
1. Command palette → **Create New StoryLine Project**.
2. Enter a project title.
3. StoryLine creates the folder structure automatically.

### Switching Projects
1. Command palette → **Open/Switch StoryLine Project**.
2. Select the project from the dropdown.

### Forking a Project
Create a copy of an existing project (useful for alternate drafts or backups):
1. Command palette → **Fork Current StoryLine Project**.
2. Enter a new title. All scenes are duplicated.

---

## File Structure

StoryLine organizes your vault like this:

```
YourVault/
  StoryLine/                      ← Root folder (configurable)
    My Novel.md                   ← Project file
    My Novel/                     ← Project folder
      Scenes/                     ← Scene files (Markdown with frontmatter)
        01 - The Beginning.md
        02 - The Chase.md
        ...
      Characters/                 ← Character profiles (Markdown with frontmatter)
      Locations/                  ← Location & world profiles
        Eryndor.md                ← World file
        Eryndor/                  ← Locations in this world
          The Iron Citadel.md
          Port Veyra.md
      System/                     ← Per-project settings (auto-managed)
        settings.json             ← Tag colors, aliases, overrides
        plotgrid.json             ← Plotgrid layout data
        board.json                ← Corkboard positions
        tracker.json              ← Writing tracker history
      Exports/                    ← Exported files (MD, JSON, CSV, HTML, PDF, DOCX)
    Another Book.md               ← Another project
    Another Book/
      Scenes/
      ...
```

Scene files are standard Markdown — you can edit them directly in Obsidian's editor, and StoryLine reads the frontmatter automatically.

---

## Tips & Workflow

1. **Start with the Board View** — create scenes as ideas, then outline and draft them.
2. **Use acts and chapters** to structure your story. Add empty act/chapter columns from the Board toolbar so you can see gaps.
3. **Apply a beat sheet** — use Save the Cat, 3-Act, or Hero's Journey templates for instant structure scaffolding.
4. **Tag your plotlines** — assign tags like `romance`, `mystery`, `character-arc` to track storylines across the Plotlines View. Assign colors to tags for instant visual identification.
5. **Set up POV and characters** early — the Characters View and Relationship Map become more useful as you add character metadata.
6. **Use the intensity field** (-10 to +10) to plan your emotional arc. The Stats View graphs this as a tension curve.
7. **Use chronological order** if your story has flashbacks or non-linear timelines. Toggle between reading and chronological order in the Timeline View.
17. **Set timeline modes** for non-linear scenes — flashbacks, dreams, parallel timelines, etc. This suppresses false plot-hole warnings and adds visual badges.
8. **Check Stats regularly** — the plot hole detector and pacing analysis catch structural issues early.
9. **Save filter presets** for your common views (e.g., "Act 1 only", "Unfinished scenes", "Anna's POV").
10. **Use scene notes** for editorial comments — they export with your outline but stay separate from manuscript text.
11. **Save snapshots** before major rewrites — you can always restore a previous version.
12. **Export outlines** to share with beta readers or editors without sharing your vault. CSV exports open directly in Excel/Sheets.
13. **Use `Ctrl+Z`** freely — undo tracks all scene changes within the session.
14. **Use writing sprints** to stay focused — the built-in timer in Stats View keeps you on track.
15. **Scene content is just Markdown** — use headings, links, callouts, and any Obsidian feature inside your scenes.
16. **Enable swimlanes** in the Timeline for a bird's-eye view of parallel storylines by POV, location, or tag.

---

## License

MIT

---

*StoryLine v1.3.2 — Transform your vault into a powerful book planning tool.*
