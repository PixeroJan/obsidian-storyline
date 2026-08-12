# StoryLine — Obsidian Plugin for Writers

By Jan Sandström

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
  - [Manuscript View](#manuscript-view)
  - [Characters View](#characters-view)
  - [Locations View](#locations-view)
  - [Codex Hub](#codex-hub)
  - [Stats View](#stats-view)
  - [Navigator View](#navigator-view)
  - [Scene Details Sidebar](#scene-details-sidebar)
  - [Research Sidebar](#research-sidebar)
- [Scene Cards](#scene-cards)
- [Scene Subtitles](#scene-subtitles)
- [Scene Archive](#scene-archive)
- [Inactive Scenes](#inactive-scenes)
- [Inspector Panel](#inspector-panel)
- [Filtering & Presets](#filtering--presets)
- [Multi-Select & Bulk Edit](#multi-select--bulk-edit)
- [Setup / Payoff Tracking](#setup--payoff-tracking)
- [Plot Hole Detection](#plot-hole-detection)
- [Undo / Redo](#undo--redo)
- [Reading Order vs Chronological Order](#reading-order-vs-chronological-order)
- [Beat Sheet Templates](#beat-sheet-templates)
- [Scene Notes](#scene-notes)
- [Arc Points](#arc-points)
- [Scene Snapshots](#scene-snapshots)
- [View Snapshots](#view-snapshots)
- [Scene Templates](#scene-templates)
- [Custom Scene Fields](#custom-scene-fields)
- [Color Coding & Tag Colors](#color-coding--tag-colors)
- [Scene Colors](#scene-colors)
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
- [Cross-Entity References](#cross-entity-references)
- [Codex Linking](#codex-linking)
- [Linking & Matching](#linking--matching)
- [Hide / Show Built-in Fields](#hide--show-built-in-fields)
- [Reordering Fields & Sections](#reordering-fields--sections)
- [Tag Type Overrides](#tag-type-overrides)
- [Export](#export)
- [Import (Scrivener)](#import-scrivener)
- [Custom Field Templates](#custom-field-templates)
- [Image Galleries](#image-galleries)
- [Additional Source Folders](#additional-source-folders)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [Settings](#settings)
- [Project Management](#project-management)
- [Series Mode](#series-mode)
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
       Codex/
         Characters/
         Locations/
   ```
3. **Create your first scene** — Use `Ctrl+Shift+N` or click the **+** button in the Board view.
4. **Switch between views** using the tab bar at the top of any StoryLine view.

---

## Language Support

StoryLine analyses your prose for word counts, reading time, dialogue %, stop-words, readability and PDF line-wrapping. From v1.10.12 these all respect the **project language**.

### Setting the language

- **Per project** — open the project file and add a `language:` key to its frontmatter:
  ```yaml
  ---
  type: storyline-project
  title: My Swedish Novel
  language: sv
  ---
  ```
- **Default for new projects** — Settings → **StoryLine** → **Default project language**. Choose `auto` to detect from existing content.

### Supported codes

`en` English · `sv` Swedish · `nl` Dutch · `da` Danish · `no` Norwegian · `fi` Finnish · `pl` Polish · `es` Spanish · `fr` French · `de` German · `it` Italian · `pt` Portuguese · `ru` Russian · `zh` Chinese · `ja` Japanese · `ko` Korean · `th` Thai · `ar` Arabic · `he` Hebrew · `hi` Hindi. Use full BCP-47 tags (`pt-BR`, `zh-Hant`, …) and StoryLine will pick the closest script profile.

### What changes per language

- **Word counts** use `Intl.Segmenter` for Chinese / Japanese / Korean / Thai (where spaces aren't word boundaries) and locale-aware splitting elsewhere.
- **Reading time** uses words-per-minute for Latin/Cyrillic scripts and characters-per-minute for CJK/Thai.
- **Dialogue detection** recognises locale quote marks: `« »`, `„ "`, `「 」`, `『 』`, `《 》`.
- **Stop-words & word-frequency** use language-appropriate lists.
- **Flesch readability** is shown only for English (it's tuned for English syllable structure); other languages show **N/A** but still report sentence and word averages.
- **PDF export** keeps CJK characters together without inserting spaces.

---

## Views

StoryLine provides seven interconnected views plus a sidebar navigator. Switch between them using the tab bar or keyboard shortcuts.

### Board View

The main workspace — a Kanban-style board that displays your scenes as cards.

- **Group by:** Act, Chapter, Status, or POV (use the dropdown in the toolbar).
- **Status order** — when grouped by Status, columns follow the default progression: Idea, Outlined, Draft, Written, Revised, Final. Custom statuses follow in their configured order.
- **Drag and drop** cards between columns to reassign act, chapter, status, or POV.
- **Color-coded cards** based on status, POV, emotion, act, or tag (configurable in settings).
- **Quick actions:** right-click any card for a context menu with edit, duplicate, delete, and open options.
- **Add acts/chapters** using the Structure and Chapters buttons in the toolbar.
- **Insert Chapter** — when grouping by Chapter, a **+ New Chapter** button appears in the toolbar to append a new chapter. To insert a chapter between existing ones, right-click a chapter column header and choose **Insert Chapter Before** or **Insert Chapter After**; existing chapters (and their scenes, labels, and descriptions) are renumbered automatically to make room.
- **Resequence** — click the resequence button to auto-number all scenes based on their current board order.
- **Search** — type in the search bar to filter scenes by title, content, characters, or tags.
- **Beat Sheet Templates** — apply a beat sheet template (Save the Cat, 3-Act, Hero's Journey, Seven-Point, Story Circle, Romancing the Beat, 27 Chapter Method) from the Structure modal.
- **Act labels** — custom labels on act dividers (e.g., beat names); inline-editable.

### Corkboard Mode

Toggle between the standard Kanban column layout and a freeform **corkboard** canvas using the toggle button in the Board toolbar.

- **Sticky notes** — create color-coded sticky notes to brainstorm and capture your first ideas. Notes support markdown formatting. Sticky notes are stored in a separate `Notes/` folder inside your project so they don't clutter the `Scenes/` folder in Obsidian's file explorer.
- **Image sticky notes** — pin reference art, maps, and charts on the board. Click **+ New Image Note** in the toolbar, or drag an image from the vault file explorer or your desktop onto the canvas. Each image note has an optional caption that supports markdown and `[[wikilinks]]` — links in captions are included in relationship scanning. Right-click an image note to set, change, or remove the image. Click the image to open a fullscreen lightbox.
- **Convert to scene** — when an idea is ready, convert a sticky note into a full scene with one click. The file is moved from `Notes/` to `Scenes/` automatically.
- **Freeform positioning** — drag scene cards and sticky notes anywhere on the spatial canvas.
- **Positions saved per project** — your corkboard layout is stored in `System/board.json` and syncs across devices.

### Plotgrid View

A spreadsheet-like grid for detailed scene planning.

- Rows and columns represent your story structure.
- Click any cell to edit its content, link a scene, set colors, or adjust metadata.
- **Zoom in/out** for overview or detail.
- Drag scenes onto cells to link them.
- Supports custom row/column headers for acts, chapters, plotlines, etc.
- **Fit row heights to content** — click the scan icon in the toolbar to resize visible row heights so linked scene cards, notes, and entity tags are easier to see without changing column widths.
- **Act & chapter dividers** — colored bands appear when the act or chapter changes, showing labels from your project structure.
- **Status color-coding** — scene rows show a colored left border matching their current status.
- **Click to open** — click a row header to open the linked scene file. Click a column header to open the character or location file.
- **Shared filters** — the same filter bar used in Board and Timeline views is now available in the Plotgrid. Filter by status, act, chapter, POV, characters, locations, tags, or search text. Presets are shared across views.
- **Tabbed cell inspector** — when a cell has a linked scene, the inspector shows two tabs:
  - **Cell tab** — cell content, detected characters/locations/tags, and a linked scene link.
  - **Scene tab** — the full scene editor (status, POV, characters, location, tags, conflict, synopsis, etc.) so you can edit scene details without leaving the grid.
- **Auto-Note** — When the Auto-Note toggle is on (enabled by default), typing text into an empty, unlinked cell automatically creates a corkboard note and links it back to the cell. The note is saved as an *idea* with a `plotgridOrigin` label built from the row and column names, so you can always trace it back to where it started. Toggle Auto-Note on or off with the sticky-note icon in the Plotgrid toolbar — the icon turns accent-colored when active.
- **Codex entity tags** — Each cell automatically displays small color-coded pills at the bottom showing characters (blue), locations (green), and codex entries (purple) detected in the cell text and/or the linked scene's prose. Entity detection uses the same LinkScanner engine — no manual tagging needed.
- **Sync from Scenes** — Click the sync button in the toolbar to auto-populate the grid. Choose a column source: Characters, Plotlines (tags), Locations, or any Codex category enabled for the Inspector. Rows are created from scenes (sorted by act → chapter → sequence) and cells are filled where data exists. Manual edits are preserved in merge mode. Click a Codex column header to open the linked entry file.
- **Drag with confirmation** — Dragging a cell onto another cell that already has content asks for confirmation before overwriting. Cell-to-cell moves can be undone with `Ctrl+Z`.

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
- **Multi-select** — ctrl/cmd-click to select multiple scenes. Right-click a selected scene for bulk actions.
- **Shift dates** — when two or more scenes are selected, right-click → **"Shift dates (N scenes)…"** opens a modal to adjust their dates/times in bulk. Two modes: **"Start on a new date"** (set a new date/time for the earliest scene; the delta is applied to all others, preserving gaps) or **"Move by a set amount"** (shift all by a signed number of days/weeks/hours/minutes). A live preview shows each scene's current → new date/time. Only `storyDate` and `storyTime` are written; sequence and order are untouched.

### Plotlines View

Track your story's plotlines (tags) across the narrative. Two view modes are available — toggle between them with the buttons in the toolbar.

#### Subway Map (default)
- Transit-style SVG visualization with one flat lane per plotline.
- Scenes appear as labeled station nodes along each plotline's track.
- **Gradient connectors** link shared scenes across plotlines, colored by the source tag.
- **Act dividers** show vertical lines with act labels for structural context.
- **Scene labels & tag pills** display below each node for quick identification.
- **Hover details** show title, subtitle, synopsis, Arc Point status, plotlines, and story date/time when available.
- **Drag to pan** — click and drag the map to navigate large stories.
- **Per-tag color picker** — click the palette (🎨) icon next to any plotline header to assign a custom color. Right-click a header for "Change color" / "Reset color".

#### List View
- Each plotline (tag) gets its own row showing which scenes it appears in.
- Quickly see which plotlines are active, dormant, or unresolved.

#### Common Features
- **Rename** or **delete** plotlines across all scenes at once.
- **Descriptions / notes** *(new in 1.10.51)* — click the **file-text** (📄) icon on a plotline header to add a short note reminding you what the plotline is supposed to do. The description is shown under the plotline header in list view, and is carried over when you rename the plotline. Useful for tracking open threads ("the mage in the tower") without resorting to a full plotline for every small detail.
- Visualize plotline density and coverage.
- Scenes default to **reading order** (chapter). Toggle to chronological order from the toolbar.

### Manuscript View

A Scrivenings-style continuous document view that presents your entire story as a single scrollable manuscript. Each scene is an embedded Live Preview editor — you can read and edit everything in place without switching files.

- **Embedded editing** — every scene is a fully functional Obsidian Live Preview editor. Click into any scene and start typing.
- **Continuous reading** — scenes are arranged in reading order (act → chapter → sequence) with no frontmatter visible.
- **Act & chapter headings** — automatic section dividers appear whenever the act or chapter changes.
- **Scene dividers** — each scene block shows a subtle header with the scene title and a color-coded status badge (idea, draft, written, etc.).
- **Clickable titles** — click any scene title to open that scene file in a new tab.
- **Plain Text toggle** — hides wiki-link styling, tag `#` prefixes, and external-link URLs so the text reads like clean prose. Defaults to ON for first-time users; the toolbar remembers your last choice (ON or OFF) across view switches and Obsidian restarts.
- **Lock Links toggle** — makes internal links and tags non-editable. The cursor skips over link and tag text, preventing accidental changes while you write around them. Default: ON.
- **Filter support** — use the same filter bar as other views to narrow down which scenes appear.
- **Word count footer** — total scene count and aggregate word count displayed at the bottom.
- **Lazy loading** — editors are mounted on demand as you scroll, keeping memory usage low even for large projects.
- **Navigator integration** — clicking a scene in the Navigator scrolls the manuscript to that scene instead of opening a new file.
- **Inspector tracking** — the Scene Details sidebar automatically follows whichever scene is currently visible in the manuscript.
- **Focus Mode** — click the glasses icon (👓) in the filter bar to enter Focus Mode. Surrounding UI (sidebars, ribbon, title bar, tab headers) is dimmed, darkened, and optionally blurred so you can concentrate on your text. The filter bar, scene headers, dividers, and footer are hidden. Adjust the effect in **Settings → Focus Mode Settings**: Dim amount (toolbar opacity), Darken (environment brightness), and Blur (environment blur). Click the glasses icon again to exit.
- **Find & replace across the whole book** — right-click inside a scene in the Manuscript view and choose **Find & replace in manuscript** (added to Obsidian's native editor context menu, so all the usual editor menu items remain available) to open a search panel that scans every scene in the current filter/sort scope (not just the scenes currently scrolled into view). Use the chevron buttons or Enter / Shift+Enter to jump between matches; navigating to a match in an unmounted scene auto-mounts its editor and scrolls it into view. Toggle case-sensitive, whole-word, or regular-expression matching with the Aa / whole-word / .* buttons. Enter replacement text and click the replace icon (single match) or check icon (all matches). Replacements in unmounted scenes are written directly to disk. *(Issue #195)*

Access the Manuscript view from the **Manuscript** tab (📖 book-open-text icon) in the view switcher, located between Plotlines and Codex.

### Characters View

A dedicated character management system with rich profiles. Characters are accessed through the **Codex** hub.

#### Overview Grid
- All characters displayed as **compact cards** with role badge, snippet, and completeness bar.
- **Portrait images** — each card shows a circular portrait (64×64 px). Click the placeholder icon to add an image.
- Cards are color-coded by role (protagonist, antagonist, supporting, minor, mentor, love interest).
- **Unlinked characters** — characters mentioned in scenes but without a profile are listed separately with a one-click "Create" button.
- Click any card to open the full character detail editor.
- **Relationship Map** — see [Relationship Map](#relationship-map).

#### Character Detail Editor
- **Collapsible sections** organized into seven categories:
  - **Basic Information** — name, age, role, occupation, nickname, residency, locations. *(Since 1.9.6 a character can hold more than one role at once — type comma-separated values such as `protagonist, narrator` and one badge per role is rendered.)*
  - **Physical Characteristics** — appearance, distinguishing features.
  - **Personality** — traits, strengths, weaknesses, fears, motivations.
  - **Backstory** — background, key events, secrets.
  - **Relationships** — allies, enemies, romantic, mentors, other connections.
  - **Character Arc** — starting state, desired arc, ending state.
  - **Custom Fields** — add your own key/value pairs for anything else.
- **Portrait area** — circular portrait (96×96 px) at the top of the editor. Click to add or change the image. Hover shows "Add image" / "Change image" label.
- **Image gallery** — add up to 10 reference images with captions. Browse them in a carousel below the portrait, or open any image in a floating lightbox you can resize and drag around. See [Image Galleries](#image-galleries).
- **Image picker** — choose to import an image from your computer (saved into `<Project>/Images/`), pick an existing vault image, or remove the current image.
- All fields show grey **placeholder text** that disappears when you type.
- **Auto-save** — changes are saved automatically after a short delay (no manual save needed).
- **Show in StoryLine** — when editing a character’s markdown file in a regular Obsidian tab, right-click and choose **Show in StoryLine** (or use the command palette) to jump back to the character’s detail panel. This also works for location and codex entry files.
- **Side panel** shows:
  - Scene count, word count, and POV scene count.
  - Intensity curve graph for scenes featuring this character.
  - Gap detection warnings.
  - Full list of scenes the character appears in, with status badges.
  - **Referenced By** — other characters, locations, codex entries, and scenes that mention this character (see [Cross-Entity References](#cross-entity-references)).
  - **Linked Aliases** — when you use the **Link to…** action on an unlinked character name (in the overview grid's "Unlinked" tab), that alias is mapped to a canonical character profile so scenes aggregate correctly. The side panel now lists every alias linked to the current character, each with an **Unlink** button that removes the mapping and restores the alias as a standalone entry. *(Issue #213)*
- **Hide/show fields** — hover over any field label to reveal an eye icon. Click to hide unused fields. See [Hide / Show Built-in Fields](#hide--show-built-in-fields).

### Locations View

A hierarchical worldbuilding and location management system. Locations are accessed through the **Codex** hub.

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
- **Drag-and-drop reparenting** *(new in 1.10.51)* — drag any location node and drop it onto another location (to make that its parent) or onto a world (to move it into that world as a top-level location). Cycles are prevented automatically. This is a fast way to reorganise your hierarchy without opening each location's Hierarchy section.

#### Detail Editor
- **World profiles** have eight collapsible sections: Overview, Geography & Environment, Culture & Society, Politics & Power, Magic & Technology, Beliefs & Mythology, Economy & Trade, History & Lore.
- **Location profiles** have five sections: Overview, Atmosphere & Description, Story Significance, Connected Locations, and a Hierarchy section with World and Parent dropdowns.
- **Nicknames / Aliases** — Both worlds and locations now support a **Nickname / Alias** field (comma-separated). The Link Scanner uses these to match alternative names in your prose, so writing "The Citadel" will link to a location whose nickname includes it.
- **Portrait area** — rectangular portrait (120×80 px) at the top of the detail editor. Click to add or change the image.
- **Image gallery** — add up to 10 images with captions. Browse via carousel or open in a floating lightbox. See [Image Galleries](#image-galleries).
- **Image picker** — import from computer (saved into `<Project>/Images/` with automatic dedup), choose from vault, or remove.
- **Custom fields** for any additional notes.
- **Custom location types** — the **Type** dropdown on a Location includes built-in options (City, Town, Wilderness, …) plus any types you've added. Pick **+ Add custom type…** at the bottom of the list to add a new one on the fly (e.g. **Planet**, **Star System**, **Galactic Region**, **Galaxy**, **Dimension**) — useful for sci-fi, fantasy, and tabletop campaigns. You can also manage the list under **Settings → Custom Location Types**.
- **Auto-save** with focus-loss protection (editing won't be interrupted).
- **Side panel** shows:
  - Location/world stats (scene count, sub-location count).
  - List of scenes set at the location.
  - Characters who appear at the location (with frequency count).
  - For worlds: all locations in that world with one-click navigation.
  - **Referenced By** — other entities and scenes that mention this location (see [Cross-Entity References](#cross-entity-references)).
- **Hide/show fields** — hover over any field label to reveal an eye icon. Click to hide unused fields. See [Hide / Show Built-in Fields](#hide--show-built-in-fields).

### Codex Hub

The Codex is a unified hub that brings Characters, Locations, and custom categories together in one place.

- **Tab navigation** — Switch between Characters, Locations, and any custom categories using the tab bar at the top of the Codex.
- **Custom categories** — Add your own categories (for example: Props, Factions, Magic Systems, Creatures) from the Codex toolbar. Each category gets its own folder inside `Codex/`, its own search, and individual detail pages with editable fields.
- **Inspector toggle** — In the Manage Categories modal, each category has an **Inspector** checkbox. When enabled, that category appears as a tag-pill section in the Scene Inspector sidebar, letting you link Codex entries to scenes just like Characters and Locations. Linked entries are stored in the scene’s `codexLinks` frontmatter field.
- **Search** — A search bar at the top of the hub filters across all entries, including Characters and Locations.
- **Back navigation** — From any detail page, click the back arrow to return to the Codex hub.
- **Change detection** — When a codex entry's content has been modified since it was last reviewed, an amber warning banner appears on the detail page listing all scenes that reference the entry. Click any scene name to open it. Click **"Mark as reviewed"** to clear the warning and update the stored digest. Digests are stored per-project in `System/codex-digests.json`.
- **Backward compatible** — Existing projects that have Characters and Locations folders at the top level (outside Codex/) continue to work without any changes.

#### Linking & Matching

Every Codex category (Items, Creatures, Lore, Organizations, Culture, Systems, and custom categories) includes a shared **Linking & Matching** section at the bottom of each entry's detail page. Characters and Locations also have this section (without the Aliases field, since they already have a Nickname field in Basic Information / Overview).

| Field | Description |
|-------|-------------|
| **Type** | A free-form sub-type label (e.g. "Sword", "Potion", "Legend") shown as a badge next to the entry name in the list. |
| **Aliases** | Comma- or newline-separated alternative names that should also link to this entry when found in scene text. *(Codex entries only — Characters and Locations use the Nickname field.)* |
| **Case-sensitive matching** | An on/off toggle. When on, the entry's name and aliases only match text with the exact same capitalisation (e.g. "Dust" matches "Dust" but not "dust"). Off by default. |
| **Exclude terms** | Comma- or newline-separated phrases that suppress a match when they appear **at the same location** in the text (e.g. listing "Lady Margaret" on a "Lady" entry prevents that specific mention from linking). Exclude terms are checked *per match*, not across the whole scene — so a legitimate mention elsewhere in the same scene still tags the entity. |

These rules are applied by the Link Scanner when it scans scene bodies for plain-text mentions, so you have fine-grained control over which words get linked — useful for complex name-play in speculative fiction.

> **Tip:** The scanner automatically treats the first word of a character's name as an alias (e.g. "Anna" for "Anna Svensson"), but skips this for titles (Lady, Lord, Sir, …) and descriptive phrases ("Lady of Dreams", "Keeper of the Keys") to avoid false positives.

### Stats View

A statistics dashboard organized into eight collapsible sections. Click any section header to expand or collapse it.

#### 1. Overview (open by default)
- **Word count progress** — actual vs. project goal with a progress bar.
- **Estimated reading time** — calculated from total words.
- **Pace projection** — words per day needed to hit your goal, with an estimated completion date.

#### 2. Writing Sprint (open by default)
- **Session stats** — words written this session, duration, words per minute.
- **Streak** — consecutive days with writing activity.
- **Daily goal** — today's words vs. your daily target, with a progress bar.
- **Progress rings** — three circular rings show progress toward your **Daily**, **Weekly** (Mon → today), and **Monthly** (day 1 → today) word goals. Each ring turns green when its goal is reached; the percentage label is uncapped, so you'll see "127%" if you blow past a target. Configure goals under Settings → Writing Goals.
- **7-day sparkline** — miniature bar chart showing your last seven days of writing.

#### 3. Writing History (collapsible)
- **Daily bar chart** — words written per day, with a range selector: 7d, 30d, 90d, or All.
- Hover any bar to see the exact date and word count.

#### 4. Progress Breakdown (collapsible)
- **By status** — word counts for each status stage (idea → final).
- **By chapter** — word count per chapter, with outlier highlighting for unusually short or long chapters.
- **Act balance** — stacked bars showing how evenly your acts are distributed.

#### 5. Characters & World (collapsed by default)
- **POV distribution** — who gets the most page time.
- **Character scene coverage** — heatmap of how often each character appears.
- **Character × Chapter Heatmap** — a grid showing character appearances per chapter with color-coded intensity. Helps spot under-represented characters and distribution gaps.
- **Location frequency** — bar chart of how often each location is used.

#### 6. Pacing & Tension (collapsed by default)
- **Average scene length by act** — bar chart.
- **Word count distribution** — histogram of scene lengths.
- **Scene length outliers** — flags unusually short or long scenes.
- **Dialogue vs. narrative ratio** — per-scene breakdown.
- **Tension curve** — visual graph of your story's emotional arc based on scene intensity values.

#### 5b. Setup & Payoff Map (collapsed by default)
- **Setup → Payoff chains** — visualizes explicit links between scenes using `setup_scenes` and `payoff_scenes` frontmatter.
- **Dangling payoffs** — flags scenes whose setup references are never paid off.
- **Click to open** — click any scene name to open it in a new tab.

#### 6b. Pacing Coach (inside Pacing & Tension)
- **Scene length with conflict presence** — bar chart where each bar is a scene and dots indicate whether `conflict` is defined. Long bars without conflict are highlighted.
- **Summary stats** — average word count with/without conflict, total scene counts.
- **Flagged scenes** — specific long scenes lacking conflict are listed as potential pacing issues.

#### 7. Prose Analysis (collapsed, lazy-loaded)
- **Readability scores** — Flesch-Kincaid Grade Level and Flesch Reading Ease.
- **Average sentence and word length.**
- **Word frequency** — top 20 most-used words (excluding common stop words), shown as a bar chart.
- **Overused words** — flags words that appear disproportionately often.
- This section loads on demand when expanded to avoid slowing down the dashboard.

#### 7b. Echo Finder (collapsed, lazy-loaded)
- **Repeated phrases** — scans all scene prose for duplicated multi-word sequences that may indicate unintentional repetition.
- Lazy-loaded on expand to avoid slowing down the dashboard.

#### 8. Warnings (open by default)
- **Plot hole detection** — automated warnings grouped by category (see [Plot Hole Detection](#plot-hole-detection)).

### Navigator View

A compact sidebar panel for quick scene navigation without leaving your current view.

#### Toolbar
- **Search** — type to filter scenes by title.
- **Sort** — multiple modes: Reading order (by act, default), **By chapter** *(since 1.10.14, groups scenes under collapsible chapter headers, acts hidden)*, Chronological, Status, Recently Modified, Word Count, and Title (A–Z).
- **Scene Details** — a button that opens the Scene Details Sidebar in the right panel (see below).

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

### Scene Details Sidebar

A standalone sidebar panel that shows the full Inspector for the currently active scene file. Use it to view and edit scene metadata side-by-side with your writing.

#### How It Works

1. Open the Scene Details Sidebar from the **Scene Details** button in the Navigator, or via the command palette (**Open Scene Details Sidebar**).
2. The panel automatically detects the active file in the editor.
3. If the active file is a scene (has `type: scene` in frontmatter), the full Inspector is displayed — title, status, POV, characters, location, tags, conflict, notes, setup/payoff links, and more.
4. When you switch to a different file, the panel updates automatically.
5. If the active file is not a scene, an empty state message is shown.

#### Features

- **Info tab** *(since 1.10.14)* — a lightweight planning panel showing synopsis, status, POV, location, word count and notes at a glance. Use it when you want a quick overview without scrolling through the full Inspector.
- **Auto-update** — follows the active editor file. Switch between scene files and the sidebar updates instantly.
- **Full Inspector** — all the same fields and editing capabilities as the main Inspector panel.
- **Refresh on save** — when you modify a scene file in the editor, the sidebar refreshes to reflect changes (with a short delay to avoid conflicts).
- **Non-intrusive** — lives in the right sidebar and doesn’t interfere with your main views.

### Research Sidebar

A right-sidebar panel for collecting and browsing research material alongside your writing. Research posts are stored as Markdown files in the `Research/` folder inside your project.

#### Post Types

| Type | Purpose |
|------|---------|
| **Note** | Free-form research notes |
| **Web Clip** | Content clipped from the web, with source URL |
| **Image** | Image-based reference material |
| **Question** | Open questions that need answering, with resolved/unresolved tracking |

#### Features

- **Search** - type in the search box to filter posts by title, body text, and tags.
- **Tag filter** - click any tag chip to filter results to that tag. Click again to clear. Your selection is remembered between sessions.
- **Type filter** - filter by post type (Note, Web Clip, Image, Question) or show all. Your selection is remembered between sessions.
- **Auto-suggest** - click the sparkle button to switch to auto-suggest mode. The panel surfaces research posts relevant to the active scene's characters, location, and tags.
- **Open question badge** - shows a red badge with the count of unresolved questions.
- **Inline detail** - click a card to expand it and read the full content, source URL, and action buttons.
- **Create** - click the + button to create a new research post with title, type, tags, optional source URL, and content.
- **Image posts** - when creating or editing an Image-type post, use the built-in image picker to import or choose a vault image. Image previews appear inline on expanded cards.
- **Open / Resolve / Delete** - expanded cards include buttons to open the file in the editor, toggle question resolved status, or delete the post.

#### How to Open

Use the command palette: **Open Research Sidebar**.

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
| `pov` | Point of view character | `"[[Anna]]"` |
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
| `timeline_strand` | Parallel/frame strand group | `"1985"` |
| `subtitle` | Optional subtitle below the title | `"Three years later"` |
| `color` | Custom scene card background color (hex) | `"#FF6B6B"` |
| `codexLinks` | Linked Codex entries per category | `{ items: ["Sword"], factions: ["Rebels"] }` |
| `setup_scenes` | Scenes this sets up (by title or `[[wikilink]]`) | `["Scene 10"]` or `["[[Scene 10]]"]` |
| `payoff_scenes` | Scenes that pay off this one (by title or `[[wikilink]]`) | `["Scene 10"]` or `["[[Scene 10]]"]` |

**Status progression:** `idea` → `outlined` → `draft` → `written` → `revised` → `final`. Custom statuses can be added in Settings. Enable **Counts as written** on a custom status if it should be included in character writing-progress bars.

**References as wikilinks** *(since 1.9.6)* — `pov`, `location`, `characters`, `setup_scenes` and `payoff_scenes` are written as Obsidian `[[wikilinks]]` by default so they auto-update when you rename a character or scene. Plain-text values still work — readers accept either form. Toggle the writer at **Settings → Write scene references as wikilinks**.

**Wordcount exclusions** *(since 1.9.6)* — Two toggles under **Settings → Scene Cards** control what `MetadataParser.countWords` actually counts:

- **Exclude `%%comments%%` from wordcount** *(default on)* — Obsidian comment blocks are stripped before counting, so author notes and TODOs do not inflate scene/manuscript totals.
- **Also ignore checkbox lines** *(default off)* — When enabled, lines starting with `- [ ]` or `- [x]` are also stripped, useful for outline-style scenes that mix prose with task lists.

These settings flow through scene cards, the inspector, the Writing Tracker, and exports.

**Count unit: words or characters** *(since 1.10.31)* — A **Count unit for scene lengths** dropdown under **Settings → Scene Cards** lets you choose whether scene cards, the Timeline, and the Inspector show scene length in **Words** (default) or **Characters**. The character count is stored in a new `charcount` frontmatter field and applies the same exclusions as the word count. Handy for prose writers who track length in characters (e.g. Russian, Chinese, Japanese).

**Default scene frontmatter** *(since 1.9.6)* — Universal Field Templates have an optional **Default value** that is auto-applied to newly created scenes (multi-select fields accept comma-separated defaults). In addition, **Settings → Default scene frontmatter** accepts a free-form YAML block whose keys are merged into every newly created scene's frontmatter. StoryLine-owned keys (`type`, `title`, `act`, `chapter`, `sequence`, `status`, `wordcount`, …) always win on conflict, so the default snippet can never overwrite the engine's own metadata.

**Scene card preview text** *(since 1.10.14)* — Beneath each scene card title you can show a short preview line. Choose what to display at **Settings → Scene Cards → Scene card preview text**: **None**, **Synopsis**, **First lines of draft**, or **Conflict**. The card stays compact and the preview is clipped to ~4 lines.

**Hide frontmatter on StoryLine notes** *(since 1.10.14)* — Toggle **Settings → Editor → Hide frontmatter** to hide the properties block on notes inside your StoryLine root folder. Other vault notes are unaffected. All scene metadata remains editable from the Inspector.

Write your scene content below the frontmatter as normal Markdown.

---

## Scene Subtitles

Scenes can have an optional **subtitle** field — a short phrase displayed below the title. Use it for things like:

- *"Three years later"*
- *"Meanwhile, in Paris"*
- *"Interlude: Letters from the front"*

Subtitles appear on scene cards (Board view) and in the Manuscript view header. Edit them in the Inspector panel just below the title input.

Set the `subtitle` field in frontmatter, or type it directly in the Inspector. Leave it blank to hide.

---

## Scene Archive

Archive a scene to remove it from all views without deleting it. Archived scenes are moved to the `Archive/` folder inside your project.

- **Archive** — right-click any scene in the Board or Navigator and choose **Archive Scene**. The file moves to `Archive/` and disappears from the index.
- **Restore** — click the **archive button** (📦) in the Board view toolbar. This opens a modal listing all archived scenes, each with a **Restore** button that moves the file back to `Scenes/` and re-indexes it.
- **Forking** — when you fork a project, archived scenes are copied to the new project's `Archive/` folder.

Archived scenes stay as regular `.md` files and can be reviewed or edited at any time through Obsidian's file explorer.

---

## Inactive Scenes

Mark a scene inactive when you want to park it without moving it to the Archive. Inactive scenes stay in the project and keep their metadata, notes, links, and position, but they are hidden from Manuscript, exports, Navigator, and aggregate stats by default.

- **Mark inactive** — open the scene in the Inspector and enable **Inactive scene**, or right-click a scene in the Board and choose **Mark Inactive**.
- **Show parked scenes** — use the **Active / All / Inactive** control in the shared filter bar to switch between normal scenes, every scene, or inactive scenes only.
- **Export inactive scenes** — exports exclude inactive scenes unless you enable **Include inactive scenes** in the export dialog.

Inactive status is stored as `inactive: true` in scene frontmatter. Use Archive when you want to move a scene out of the active project folder entirely; use inactive when the scene still belongs in your planning space.

---

## Inspector Panel

Click any scene card to open the **Inspector Panel** on the right side. It provides:

- **Metadata editing** — title, act, chapter, sequence, status, POV, location, conflict, emotion, intensity. Act and chapter are free-text fields: use plain numbers (`1`, `2`, `10`), hierarchical decimals (`1.1`, `1.2`, `2.1`), or text labels (`Prologue`, `Interlude A`). Sorting throughout the plugin is numeric-aware. Avoid Windows-illegal characters (`< > : " / \ | ? *`) — the Inspector will warn you if you type one.
- **Prologue & Epilogue** *(new in 1.10.18)* — Set act to **0** for Prologue or **99** for Epilogue. Quick-select buttons appear below the Act input. All views display "Prologue" and "Epilogue" instead of "Act 0" / "Act 99".
- **Characters** — add/remove characters with autocomplete and tag-pill inputs.
- **Codex sections** — any Codex category enabled for the Inspector (via Codex → Manage Categories) appears as a tag-pill input below the Location field. Add or remove linked Codex entries with autocomplete from your category’s entries.
- **Tags** — manage plotline tags with autocomplete, color-coded tag badges when tag colors are configured.
- **Notes** — editorial notes for author comments and reminders. StoryLine stores scene notes in a separate notes file named `Scene Title - Notes.md` and links it from the scene frontmatter with `notesFile`. Type `[[` to get an inline wikilink autocomplete *(new in 1.9.9)* — pick a note with **↑/↓ + Enter** (or click) to drop a `[[Note Name]]` link straight into your comment.
- **Custom Fields** — values for any [Custom Scene Fields](#custom-scene-fields) you've defined for the project. Click the **+** button on the section header to create a new field on the fly, or the pencil button next to a field to edit / delete it.
- **Snapshots** — save and restore point-in-time versions of the scene.
- **Word count** — current vs. target with progress indicator.
- **Setup/Payoff links** — see and manage which scenes set up or pay off this scene.
- **Time & Order** — story date, story time, chronological order, timeline mode, and timeline strand (see [Reading Order vs Chronological Order](#reading-order-vs-chronological-order) and [Timeline Modes](#timeline-modes)).
- **Open scene** — click to open the full Markdown file in reading view (frontmatter stays hidden).

---

## Filtering & Presets

All views support filtering by:

- **Active state** — show active scenes, all scenes, or inactive scenes only
- **Status** (idea, outlined, draft, written, revised, final)
- **Characters** — filter by character presence
- **Locations** — filter by location
- **Tags** — filter by plotline/theme tags
- **Custom Scene Fields** — every dropdown / multi-select [custom field](#custom-scene-fields) automatically gets its own chip group in the filter panel.
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
3. Type a scene title in the **Sets up** or **Set up by** input to search and select. Existing links appear as removable pills.
4. Links are bidirectional — if Scene A "sets up" Scene B, Scene B shows Scene A under "Set up by".

Links are stored by **scene title** (or as `[[wikilinks]]` to the scene). The reader is tolerant of other forms too — plain file paths (`"MyProject/Scenes/Scene 10.md"`) and filenames with a `.md` extension are normalised to the scene title automatically, so links written that way still resolve. The recommended form is a plain title or a `[[wikilink]]`.

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
- **Redo:** `Ctrl+Shift+Z` / `Ctrl+Y` (or command palette: *Redo Last Scene Change*)

When a StoryLine view is active and you're not typing in a text field, `Ctrl+Z` and `Ctrl+Y` automatically route to StoryLine's undo/redo instead of Obsidian's editor undo.

The undo stack stores up to 50 actions and persists within the current session.

---

## Reading Order vs Chronological Order

For non-linear narratives (flashbacks, time jumps, in medias res), StoryLine supports two separate ordering fields:

- **Reading Order** (`sequence`) — the order scenes appear when the reader reads the book, page by page.
- **Chronological Order** (`chronologicalOrder`) — the order events happen within the story's timeline.

### How to Use

1. **Set story dates** — fill in the `storyDate` and `storyTime` fields on each scene. When you switch the Timeline to Chronological Order, scenes are automatically sorted by these fields.
2. **Set chronological order manually** — if you prefer, set `chronologicalOrder` in the Inspector's **Time & Order** section, or directly in the scene's YAML frontmatter. Scenes without a story date fall back to this number.
3. **Switch order in Timeline View** — use the order dropdown in the toolbar to toggle between "Reading Order" and "Chronological Order".
4. **Dual-order badges** appear on scene cards showing both numbers (e.g., `R:5 / C:2` means reading order 5, chronological order 2).
5. **Drag-and-drop** in the Timeline respects the currently active order mode.

### Export

Both `sequence` and `chronologicalOrder` are included in all export formats (Markdown, JSON, CSV, PDF).

#### Scene separators

When exporting a manuscript you can insert a separator between scenes. Choose from:

- **Blank Line** — default; no extra separator is added (heading structure provides separation).
- **`* * *`** — centered three-asterisk scene break.
- **Custom Separator** — any UTF-8 text (e.g. `~ ~ ~`, `—`, or a word).

The setting is in **Settings → Export & Import → Scene separator**, and can also be overridden per-export in the Export modal. Separators are skipped at act and chapter boundaries, where a heading already provides visual separation. Markdown exports emit plain text (no HTML), keeping the `.md` file portable for Scribe and other markdown consumers; HTML/PDF/Word exports render the separator centered with vertical spacing.

---

## Beat Sheet Templates

Apply proven story structure templates to quickly scaffold your acts:

### Built-in Templates

| Template | Beats | Description |
|----------|-------|-------------|
| **Save the Cat!** | 15 beats | Blake Snyder's popular screenplay structure (Opening Image, Theme Stated, Set-Up, Catalyst, Debate, Break into Two, B Story, Fun & Games, Midpoint, Bad Guys Close In, All Is Lost, Dark Night of the Soul, Break into Three, Finale, Final Image) |
| **Three-Act Structure** | 10 beats | Classic three-act framework (Hook, Inciting Incident, First Plot Point, Rising Action, Midpoint, Complications, Crisis, Climax, Falling Action, Resolution) |
| **Hero's Journey** | 12 stages | Joseph Campbell's monomyth (Ordinary World, Call to Adventure, Refusal of the Call, Meeting the Mentor, Crossing the Threshold, Tests Allies Enemies, Approach to the Inmost Cave, The Ordeal, Reward, The Road Back, Resurrection, Return with the Elixir) |
| **Seven-Point Story Structure** | 7 beats | Dan Wells' structure (Hook, Plot Turn 1, Pinch Point 1, Midpoint, Pinch Point 2, Plot Turn 2, Resolution) |
| **Story Circle** | 8 beats | Dan Harmon's story circle (You, Need, Go, Search, Find, Take, Return, Change) |
| **Romancing the Beat** | 20 beats | Gwen Hayes' four-phase romance structure (Phase 1 Setup: Introduce Hero 1, Introduce Hero 2, Meet Cute, No Way #1, Adhesion; Phase 2 Falling in Love: No Way #2, The Inkling, Deepening Desire, Maybe This Could Work, Midpoint of Love; Phase 3 Retreating from Love: Inkling of Doubt, Deepening Doubt, Retreat, Shields Up, Break Up; Phase 4 Fighting for Love: Dark Night of the Soul, Wake Up, Grand Gesture, Whole-Hearted, Epilogue) |
| **27 Chapter Method** | 27 beats | Kat O'Keeffe's fractal 3×3×3 structure — 3 Acts → 9 Parts → 27 Chapters, each following a setup–conflict–resolution pattern |

### How to Use

1. Open the **Structure** modal from the Board or Timeline toolbar (the columns icon).
2. Select a **Beat Sheet Template** and click **Apply** — StoryLine creates the acts and assigns beat labels automatically.
3. **Create placeholder scenes** — toggle "Create placeholder scenes from beats" before applying to auto-create one scene per beat with the correct act, chapter, and synopsis.
4. **Custom Structure** — use the Custom Structure builder at the bottom of the modal to define your own number of acts, chapters per act, and scenes per chapter.
5. **Act labels** appear on column headers (Board View) and timeline dividers (Timeline View).
6. **Edit labels inline** by clicking the label text on any act divider.
7. To **add chapters**, use the "Add chapters" section in the same modal. Enter a range (e.g. "1-10") and click Add.
8. **Seeing chapters**: After adding chapters, switch to Board View → **Kanban** mode → set "Group by" to **Chapter**. Chapters will appear as columns.

Beat names are stored as `actLabels` on the project and persist across sessions.

### Scene Ordering Terminology

| Term | YAML field | Meaning |
|------|-----------|---------|
| **Reading order** | `chapter` | The order scenes appear in the book as the reader reads them. Chapter 1 comes before Chapter 2, etc. |
| **Chronological order** | `sequence` (or `chronologicalOrder` if set) | The order events happen in story time. For non-linear narratives (flashbacks, parallel timelines), this may differ from reading order. |
| **Scene #** | `sequence` | A unique number identifying each scene, used for file naming and default sorting. |

In the Navigator, Timeline, and Plotlines views you can toggle between **Reading order** and **Chronological order** to see your scenes arranged either way.

---

## Scene Notes

Each scene can have an external **notes file** for editorial comments, reminders, and revision notes:

- Edit notes in the **Inspector Panel** under the Notes section.
- StoryLine creates the notes file when you first edit notes for a scene. New notes files are named `Scene Title - Notes.md` and saved in the project's scene notes folder.
- The scene stores a `notesFile` link in frontmatter so StoryLine can reopen the same notes file later. Older inline `notes` frontmatter is still read as a fallback.
- Notes are separate from the scene body — they're for author-facing comments that won't appear in the manuscript.
- Notes are included in **outline exports** (Markdown, JSON, CSV) so you can share them with editors.
- Type `[[` *(new in 1.9.9)* to get inline wikilink autocomplete — link to characters, locations, research notes, or anything else in your vault directly from the comments field.

- **Live Markdown editor** *(new in 1.10.18)* — The Notes tab in the Scene Details sidebar now renders as a full Obsidian Live Preview editor. Write with markdown formatting, wikilinks, and tags — just like a regular note file. Edits are saved automatically.

---

## Arc Points

Arc Points *(introduced in 1.10.18, [issue #128](https://github.com/PixeroJan/obsidian-storyline/issues/128))* mark **arc milestones** — planned narrative beats on a character's arc journey, such as "Mira discovers she is dying" or "Jonas burns the archive". They let you plan at *arc granularity* alongside scene granularity, without conflating the two.

An Arc Point is a regular scene file with one extra frontmatter boolean: `arcAnchor: true`. This is independent of `status` — it describes what the node *means narratively* (an arc milestone), not where it is in the production pipeline. A common workflow is to create Arc Points as lightweight **stub scenes** (`status: stub`) for beats you intend to write later — possibly in a future book — then let them grow into fully-written scenes over time. The Arc Point flag stays on when a stub becomes a real scene, because the scene *is* the arc beat; removing it would be semantically wrong. `status` continues to evolve from `stub` → `draft` → `done` on its own track.

> **Why use stub scenes instead of just notes?** Because Arc Points render on the Subway map and Board alongside real scenes, giving you a visual arc landscape across your story (and, with the `_Plotline` naming convention, across a series). Without the flag, stub scenes are indistinguishable from real scenes and create noise in word counts, the Validator, and the Timeline. The Arc Point flag + the **All / Scenes / Arc Points** filter let you switch between the two lenses in one click.

> **Tip:** The Arc Point flag is a single boolean — it doesn't record *which* arc a milestone belongs to or *what kind* of beat it is (inciting incident, midpoint, climax, etc.). To track that, pair Arc Points with [plotlines](#plotlines-view) (e.g. a `_Mira` plotline for Mira's character arc) and/or a [custom scene field](#custom-scene-fields) for the beat type. The `_`-prefix naming convention is a common way to group arc-milestone plotlines separately from story-thread plotlines.

### How to mark a scene as an Arc Point

Open the Scene Details sidebar and check the **Arc Point** checkbox on the Details tab. The scene's frontmatter gets `arcAnchor: true`.

### Where Arc Points appear

- **Board cards** — an orange "◆ Arc Point" badge is shown below the title.
- **StoryLine subway map** — Arc Points render as filled diamonds (◆) instead of hollow circles, making them stand out at a glance.
- **Tooltip** — hovering a subway-map node includes Arc Point status along with the scene's available subtitle, synopsis, plotlines, and story date/time.

### Filtering

Both the Board and StoryLine views have an **All / Scenes / Arc Points** toggle in the toolbar:

- **All** — show everything (default).
- **Scenes** — show only regular scenes (no Arc Points).
- **Arc Points** — show only Arc Points.

Arc Points are included in word counts, stats, and exports just like any other scene. If you prefer to exclude Arc Point scenes from aggregate word counts (Stats view, Manuscript footer), enable **Settings → Scene Cards → Exclude Arc Points from word count**. This is on by default. Individual scene cards still show their own word count regardless of this setting.

---

## Convert Note to Scene *(new in 1.9.9)*

Any markdown file in your vault — a character study, a research note, a stub note that Obsidian created from a broken `[[wikilink]]`, or an idea you wrote in a different app and pasted in — can be promoted to a full StoryLine scene in one click.

Two ways to do it:

- **Command palette** — open the note, run **"Convert note to scene"**.
- **File explorer** — right-click any `.md` file and pick **"StoryLine: Convert to scene"**.

StoryLine will:

1. Add the required scene frontmatter (`type: scene`, default `status: idea`, today's `created` date).
2. Assign the next available sequence number (so the new scene appears at the end of the running order).
3. Move the file into your project's `Scenes/` folder — or `Scenes/Act N/` if the note already declares an act.
4. Refresh every open view so the scene shows up immediately on the Board, Manuscript, Plot Grid, etc.

Files that are already indexed as scenes are skipped, so the operation is safe to run on anything.

---

## Scene Snapshots

Save point-in-time snapshots of a scene for version tracking:

- **Save Snapshot** — captures the current state of a scene (frontmatter + body).
- **View Snapshots** — browse previous snapshots with timestamps.
- **Restore** — revert a scene to any previous snapshot.

Useful for experimenting with rewrites without losing your earlier work.

---

## View Snapshots

Save and restore point-in-time snapshots of your entire project's **view layout** — corkboard positions, Plot Grid state, and scene ordering — without affecting scene content.

### What a snapshot captures
- **Corkboard layout** — card x/y positions and individual card heights.
- **Plot Grid state** — rows, columns, cells, zoom level, styling, and linked scenes.
- **Scene layout metadata** — act, chapter, status, POV, and sequence numbers.

### How to use
1. Click the **clock icon** (🕓) in the Board or Plotgrid toolbar, or run **Manage View Snapshots** from the command palette.
2. Click **+** to create a new snapshot. It becomes the active snapshot immediately.
3. Rearrange your corkboard, edit the Plot Grid, or reorder scenes — changes are **auto-saved** back to the active snapshot after a 2-second pause.
4. To compare different layouts, load a different snapshot from the list.
5. Rename or delete snapshots from the same modal.

### Key details
- **Free-editing mode** — when no snapshot is active, changes are saved normally without snapshot tracking.
- **Per-project** — each project has its own snapshot history, stored in `System/Snapshots/`.
- **Layout only** — snapshots do not capture scene prose or frontmatter content. Use **Scene Snapshots** for that.

---

## Scene Templates

Create reusable templates for common scene types:

### Built-in Templates
- Starter templates for common scene patterns.

### Custom Templates
1. Set up a scene with your desired default values (status, act, tags, conflict patterns, etc.).
2. Right-click the scene card and select **Save as Template** from the context menu.
3. Alternatively, create templates manually in **Settings → Scene Templates → Add Template**.
4. When creating new scenes, choose a template to pre-fill fields.

Templates are stored in settings and available across all projects.

### Default PoV character *(new in 1.10.51)*

If your story never changes point of view, set **Settings → Scene Cards → Default PoV character** to your protagonist. Every newly-created scene will then have that character pre-filled as its PoV, saving you a pick on every new scene. Leave it blank to choose the PoV manually each time. This works alongside [Default scene frontmatter](#settings) and [custom field defaults](#custom-field-templates) — StoryLine's own `pov` key wins on conflict.

### Sort suggestions by frequency *(new in 1.10.51)*

Enable **Settings → Scene Cards → Sort suggestions by frequency** to make the character and location autocomplete suggestions in the Scene Inspector appear in order of how often each one is already used across your scenes (most-used first, then alphabetically). Off by default (alphabetical only). Handy for large projects where your main character should sit at the top of the list instead of being buried in the middle.

---

## Custom Scene Fields

Define your own metadata fields on every scene — Story Grid functions, John Truby aspects, beat-sheet labels, genre conventions, "Five Commandments" tags, anything your method needs. This avoids overloading the title or subtitle with structural information.

### Creating a field

Two ways:

1. **Settings → Custom Scene Fields → Add Scene Field.**
2. **Inspector → Custom Fields section → click the + button** (creates the field and immediately lets you fill in a value).

You'll be prompted for:

- **Label** — what shows in the Inspector and on cards (e.g. `SG Function`, `JT Aspect`, `Obligatory Scene`).
- **Type** — `text`, `textarea`, `dropdown`, or `multi-select`.
- **Options** — for dropdown / multi-select: the choices the user can pick (e.g. `Inciting Incident, Turning Point, Crisis, Climax, Resolution`).
- **Placeholder / hint text** (optional).
- **Top-level YAML key** *(optional, since 1.9.6)* — when set, the field's value is also written as a real top-level YAML key (in addition to `universalFields:`) so it appears in Obsidian's Properties panel, Bases, Dataview and the graph. Auto-suggested from the label; reserved StoryLine keys (`type`, `pov`, `act`, `chapter`, `tags`, …) are blocked. Leave blank to keep the field inside `universalFields:` only. The global toggle lives at **Settings → Mirror custom fields to top-level YAML**.

Fields can be edited or deleted anytime from either location (pencil / trash icons).

### Where the values appear

- **Inspector** — every scene gets a "Custom Fields" section listing all defined scene fields, with the appropriate input control (text box, textarea, dropdown, multi-select pills).
- **Board → Group by** — `dropdown` and `multi-select` fields appear as grouping options in the Kanban board. Multi-select scenes appear in every matching column. Empty values land in `(empty)`.
- **Filter panel** — `dropdown` and `multi-select` fields each get their own chip group; toggling chips filters scenes by value.
- **Scene cards** — up to three populated dropdown / multi-select values appear as small badges below the card. Hovering any scene card shows a full summary of every populated custom field, regardless of type.

### Where it's stored

- **Values** live in the scene's frontmatter under `universalFields:`, keyed by template id. Safe to read or edit by hand.
- **Templates** live in `<project>/System/field-templates.json` along with character custom fields, so they sync with the rest of the project.

### Tips

- Combine with a dedicated plotline tag (e.g. `love-genre`) to also get colour-coded visibility for genre conventions on the timeline / Kanban.
- Keep dropdown options short — long values are ellipsised on the card badges (the full value is still visible in the hover tooltip and Inspector).
- Multi-select is the right choice for fields where a single scene can play multiple structural roles (e.g. a scene that is both a *Turning Point* and an *Obligatory Scene*).

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

## Scene Colors

Assign a custom background color to individual scene cards, independent of the color-coding system.

- **Set color** — right-click any scene card in Board, Timeline, or Navigator view and choose **Set color**. A color picker opens where you can select any color.
- **Background tint** — the color is applied as a subtle background wash (18% blend), so the card text remains readable. On hover, the tint intensifies slightly (26%).
- **Independent from color-coding** — the scene color tints the card background, while the left-edge stripe continues to show the active color-coding mode (status, POV, emotion, etc.).
- **Clear color** — right-click the card and choose **Clear color** to remove the custom background.
- **Stored in frontmatter** — the color is saved as a hex value in the `color` field (e.g., `color: "#FF6B6B"`).

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

### Font Color

By default, sticky-note text color is derived automatically by darkening the note's background. On similarly-toned backgrounds (e.g. pale yellow text on a pale yellow note) this can be hard to read. You can set an explicit font color in **Settings → Sticky Note Colors → Font Color**, with **two independent buckets** so a single global setting stays readable across both bright and dark notes:

- **On light notes** — text color used on bright note backgrounds (defaults to black).
- **On dark notes** — text color used on dark note backgrounds (defaults to white).

The plugin uses the WCAG relative-luminance formula to decide which bucket applies to each note, so a bright yellow note and a dark violet note automatically get the right text color without any per-note configuration. Leave a bucket on "Auto" to keep the background-derived behavior for that brightness.

Both buckets are also reachable from the corkboard note's right-click context menu:

- **Font Color: Light Notes…** — opens a color picker for the light-background bucket.
- **Font Color: Dark Notes…** — opens a color picker for the dark-background bucket.
- **Font Color: Reset to Auto** — clears both buckets back to the default (only appears when a custom color is set).

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
| **Character** | One swimlane per character listed on a scene |
| **Location** | One swimlane per location |
| **Plotline** | One swimlane per plotline/tag |

### How It Works

- Scenes are placed in a **CSS grid** layout with swimlane columns. For multi-value groups like Character and Plotline, a scene appears in every lane it belongs to.
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

1. Set your desired sprint duration (click the time to edit).
2. Click **Start** to begin the countdown.
3. Write in your scene files — the timer shows remaining time, live word count, and words-per-minute.
4. Click **Stop** to end the sprint early, or let the timer run out. Your sprint is recorded with word count, duration, and WPM.
5. Click **Reset** to cancel without recording.

Completed sprints are saved in a persistent log. The Stats panel shows your sprint history with total sprints, total words, and average WPM.

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
- **Toggle relationship types** — click any item in the colour-coded legend at the top of the map to show or hide that relationship type. Hidden types are dimmed in the legend and their edges are removed from the graph; click again to bring them back. Useful for focusing on one kind of connection (e.g. only family ties) at a time.
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

> **Note on layout stability *(1.10.51)*:** The Story Graph now uses a cooling schedule (alpha decay) plus collision detection and velocity capping, so it settles smoothly instead of jittering on graphs with many connections. If you have a very large cast, the graph may still take a moment to settle — drag a few hub nodes to nudge the layout.

### How Links Are Detected

The Story Graph uses the **Link Scanner** to find connections. See [Link Scanner & Detected Links](#link-scanner--detected-links).

---

## Link Scanner & Detected Links

StoryLine includes a **Link Scanner** that automatically extracts `[[wikilinks]]` from your scene body text and classifies them:

### How It Works

1. The scanner extracts all `[[wikilinks]]` from each scene's Markdown body (below the frontmatter).
2. Each link is classified against your project's characters, locations, and codex entries:
   - If the link matches a character name or nickname → **character**
   - If the link matches a location name or nickname → **location**
   - If the link matches a codex entry name or nickname → **codex** (with its category)
   - Otherwise → **other** (unclassified)

### Where Links Appear

- **Inspector Panel** — a "Detected Links" section shows all wikilinks found in the selected scene, displayed as typed pills (character / location / codex / other).
- **Story Graph** — detected links drive the scene-to-entity edges in the graph visualization.
- **Referenced By panel** — cross-entity references are shown on every character, location, and codex detail page (see [Cross-Entity References](#cross-entity-references)).

### Usage Tips

- Write `[[Character Name]]`, `[[Location Name]]`, or `[[Codex Entry]]` naturally in your scene prose or in any entity text field.
- The scanner runs automatically — no manual tagging required.
- Links that don't match any known entity appear as "other" — you can override their type via the context menu (see [Tag Type Overrides](#tag-type-overrides)).

---

## Cross-Entity References

StoryLine now tracks **cross-entity references** across your entire project. When you mention a character in a location description, or reference a location in a codex entry, StoryLine detects the connection and displays it in a **"Referenced By"** panel on the entity's side panel.

### How It Works

1. Write `[[Character Name]]`, `[[Location Name]]`, or `[[Codex Entry]]` in any text field — scene prose, character backstory, location descriptions, codex entry fields, etc.
2. Use `#tags` that match entity names (e.g., `#MagicSword` will reference a codex entry named "MagicSword").
3. Plain-text name mentions (without brackets or #) are also detected automatically.
4. StoryLine scans all entities and scenes and builds a reverse reference index.
5. Open any character, location, or codex detail page — the side panel shows a **"Referenced By"** section listing every entity and scene that mentions it.

### What Gets Scanned

| Source | Fields scanned |
|---|---|
| **Characters** | Backstory, appearance, personality, motivations, strengths, flaws, fears, belief, misbelief, notes |
| **Locations** | Description, atmosphere, significance, inhabitants, connected locations, map notes, notes |
| **Worlds** | Description, geography, culture, politics, magic/technology, beliefs, economy, history, notes |
| **Codex entries** | All text fields |
| **Scenes** | Full body text (wikilinks and plain-text matches) **plus** Codex entries tagged via the Scene Inspector (`codexLinks` frontmatter) |

### Reference Display

References are grouped by type:
- **Character** — other characters that mention this entity
- **Location** — locations or worlds that mention it
- **Codex category name** (e.g., "Items", "Creatures") — codex entries that mention it
- **Scene** — scenes that contain a wikilink or name match

Each reference is a clickable link that opens the source file.

### Tips

- Use `[[wikilinks]]` or `#tags` for guaranteed detection — plain-text matching depends on exact name matches.
- `#tags` are matched case-insensitively: `#magicsword` will match a codex entry named "MagicSword".
- The scanner updates every time you open an entity detail page, so new connections appear immediately.
- Self-references are excluded (a character's own fields won't list itself).

---

## Codex Linking

Link Codex entries directly to scenes, making custom categories (Items, Factions, Creatures, etc.) first-class metadata on your scene cards — just like Characters and Locations.

### Enabling Categories for the Inspector

1. Open the **Codex** view and click **Manage Categories** (gear icon in the toolbar).
2. Each category row has an **Inspector** checkbox on the right side.
3. Check it to make that category appear in the Scene Inspector sidebar.
4. Click **Save**.

Enabled categories appear as tag-pill input sections in the Inspector, right below the Location field. Each section shows the category icon and label, with autocomplete suggestions pulled from your Codex entries for that category.

### Linking Entries to Scenes

- **From the Inspector** — type an entry name in the tag-pill input for any enabled Codex category. Autocomplete suggests existing entries. Press Enter to add.
- **From Detected Links** — right-click any detected link pill in the "Detected in text" section and choose a Codex category from the context menu. The entry is added to the scene's `codexLinks` and removed from the detected links list.

### Where Codex Links Appear

- **Scene Inspector** — tag-pill inputs for each enabled category.
- **Plot Grid** — the "Sync from Scenes" modal includes enabled Codex categories in the "Columns from" dropdown. Sync your grid against Items, Factions, or any custom category. Click a Codex column header to open the entry file.
- **Frontmatter** — stored as `codexLinks` in scene YAML:
  ```yaml
  codexLinks:
    items:
      - Magic Sword
      - Shield
    factions:
      - Rebels
  ```

---

## Linking & Matching

The **Linking & Matching** section appears at the bottom of every Character, Location, and Codex entry editor. It controls how the [Link Scanner](#link-scanner--detected-links) matches plain-text mentions of that entity in your scene prose and turns them into detected links.

### Fields

- **Type** *(entryType)* — an optional sub-type for the entry (e.g., a "Sword" type for an Items entry, or a "Potion" type). Free-text; used for your own organisation.
- **Aliases** *(aliases)* — alternative names that should also link to this entry. Comma-separated. For example, a character "Elizabeth Bennet" might have aliases `Lizzy, Miss Bennet`. The Link Scanner matches any alias in addition to the primary name.
- **Case-sensitive matching** *(caseSensitive)* — when on, the name and aliases only match text with the exact same capitalisation. Off by default (case-insensitive), which is usually what you want for prose. Turn it on for entries whose name is a common word (e.g., a location called "Hope") to avoid matching every occurrence of "hope" in your writing.
- **Exclude terms** *(excludeTerms)* — phrases that suppress a match when they appear adjacent to (or overlapping) a potential match. For example, if "The Tower" is a location but you also write "the tower of paperwork", adding `paperwork` as an exclude term prevents the latter from being detected as a link. Exclude terms are **contextual**: they only suppress the specific match they overlap, not every mention in the scene.

### How it works

When the Link Scanner runs (on load and after every edit), it scans each scene's body text for occurrences of every entity's name + aliases, respecting the case-sensitivity and exclude-term rules. Matches appear as pills in the **Detected in text** section of the Scene Inspector. You can then promote a detected link to a Codex category, a character, or a location via the right-click menu.

### Where the data lives

The fields are stored in each entity's frontmatter:

```yaml
# In a Codex entry
aliases: [Lizzy, Miss Bennet]
caseSensitive: false
excludeTerms: [paperwork]
entryType: Sword
```

Characters and Locations use the same fields (Issue #228 extended this section from the Codex to Characters and Locations).

---

## Hide / Show Built-in Fields

Every character, location, and codex detail editor comes with a set of built-in fields (e.g., Fears, Belief, Atmosphere, Significance). If you don't use all of them, you can **hide** the ones you don't need to keep your editor clean.

### How to Hide a Field

1. Open any character, location, or codex detail editor.
2. **Hover** over a field label — a small **eye-off icon** (👁‍🗨) appears to the right of the label.
3. **Click the icon** — the field disappears from the form.

### How to Show Hidden Fields

1. At the bottom of each category section, a link appears: **"Show N hidden fields"**.
2. **Click the link** — the hidden fields expand in a dimmed container with a left border.
3. You can view and edit data in hidden fields while they're expanded.
4. The link text changes to **"Hide N hidden fields"** — click again to collapse.

### How to Unhide a Field

1. Expand the hidden fields using the "Show N hidden fields" link.
2. **Hover** over the hidden field's label — an **eye icon** appears.
3. **Click the eye icon** — the field is restored to its normal position permanently.

### Details

- The **Name** field can never be hidden.
- Hidden fields are stored per entity type: `character`, `location`, or the codex category ID (e.g., `items`, `creatures`). Hiding "Fears" in Characters does not affect any other view.
- **Data is never deleted.** Hiding a field only removes it from the UI. The value stays in your frontmatter unchanged and reappears when you unhide the field.
- Hidden field preferences are saved per project in `System/custom-sections.json` and persist across sessions.

#### Hiding entire categories

An eye-off button on each section header lets you hide a whole category in one click, instead of hiding each field individually. Hidden categories are collected into a collapsible **"Show N hidden categories"** toggle at the bottom of the form — when collapsed, no trace of the hidden categories is visible in the normal flow. Click the toggle to expand, then click the eye button on a hidden category's header to un-hide it.

- Hidden categories are stored per entity type alongside hidden fields.
- Hiding a category does not delete its data — values stay in frontmatter and reappear when un-hidden.
- Applies to Character, Codex, and Location views.

---

## Reordering Fields & Sections

You can change the order of fields inside a section, and the order of sections themselves, in the Character, Codex, and Location detail editors. This lets you put the fields you use most towards the top — for example, moving the **Hierarchy** section under Locations up so you don't have to scroll past everything else to set a parent.

### Reordering fields within a section

1. Open any character, location, or codex detail editor.
2. **Hover** over a field label — small **up/down chevron buttons** (⌃/⌄) appear to the right of the label.
3. Click a chevron to move that field up or down within its section.

Both built-in fields and your [custom (universal) fields](#custom-field-templates) can be reordered, and they interleave freely — a custom field can sit between two built-in fields.

### Reordering sections

Custom sections you've added (via **+ Add Section** at the bottom of an editor) can be moved between slots:

1. Hover the section header — up/down chevron buttons appear.
2. Click to move the whole section earlier or later in the form.

Built-in sections (like Hierarchy under Locations) are fixed in position; if a built-in section sits too low for your workflow, you can hide the sections above it that you don't need (see [Hide / Show Built-in Fields](#hide--show-built-in-fields)) to bring it closer to the top.

### Where the order is saved

Field and section order is saved per project in `System/field-templates.json` and persists across sessions. Each category (character, each codex category, location) keeps its own order.

> **Note:** The scene Inspector (Scene Details sidebar) uses a fixed built-in field order. Custom scene fields appear in a "Custom Fields" block after the built-ins. Reordering built-in scene fields is not yet supported.

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
   - **Codex categories** — any Codex category enabled for the Inspector appears as an option. Selecting one adds the entity to the scene’s `codexLinks` for that category and removes it from the detected links.
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

### Range Exports *(new in 1.10.58)*

To export only part of a manuscript, choose **Scenes** or **Chapters** from the **Content** dropdown:

- **Scenes** — the input is labelled **Scenes to export** and matches scene `sequence` numbers.
- **Chapters** — the input is labelled **Chapters to export** and matches numeric `chapter` values.

Enter single values and inclusive ranges separated by commas, for example:

```text
1-5, 8, 9, 11, 13-18
```

The selected scenes are exported in the normal act → chapter → sequence order. Range exports are available in Markdown, Word, PDF, HTML, CSV, and JSON formats.

### Format Options

| Format | Output |
|--------|--------|
| **Markdown (.md)** | Saved to `ProjectName/Exports/` folder |
| **JSON (.json)** | Structured data, saved to `ProjectName/Exports/` folder |
| **CSV (.csv)** | Spreadsheet-ready data, saved to `ProjectName/Exports/` folder |
| **HTML (.html)** | Standalone web page with embedded styles. Works on desktop and mobile |
| **PDF (.pdf)** | Rendered via the built-in print engine. Desktop only |
| **DOCX (.docx)** | Word document ready for editors, agents, or print. Works on desktop and mobile |

### Manuscript Options *(new in 1.9.9)*

The export dialog also includes **Include inactive scenes** *(default: off)*. Parked scenes marked inactive are normally hidden from exports; switch this on when you want to include them in a review copy or outline export.

When **Manuscript** is selected the dialog reveals three more toggles:

- **Include scene titles** *(default: on)* — turn off to omit the `## Scene Title` headings between scenes. Produces a clean continuous prose document, ideal for publisher/agent submissions where working titles shouldn't be visible.
- **Number scenes (Scene 1, Scene 2…)** *(default: off)* — replaces titles with simple running numbered headings. Mutually exclusive with *Include scene titles*.
- **Include corkboard notes** *(default: off)* — visual sticky notes from the Corkboard are normally hidden from every export. Switch this on to include them, e.g. when sharing planning notes with a co-writer.

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

## Import (Scrivener)

Import an existing Scrivener project (.scriv) as a new StoryLine project. Desktop only.

### How to Import

1. Open **Settings → Import** and click **Import .scriv**, or run **Import Scrivener Project** from the command palette.
2. Select your `.scriv` folder in the file picker.
3. If any top-level Scrivener folders don’t match a known category (Characters, Locations, Research, Notes), a **classification modal** appears asking how each should be imported:
   - **Codex category** — creates a new custom Codex category (e.g. “Magic”, “Factions”)
   - **Notes** / **Research** / **Scenes** — routes items to the corresponding StoryLine folder
   - **Skip** — excludes the folder from import
4. A new StoryLine project is created with all converted files.

### What Gets Imported

| Scrivener | StoryLine | Details |
|---|---|---|
| Draft / Manuscript folder | Scenes | RTF converted to Markdown. Part/chapter folder names written to `part` and `chapter` frontmatter. |
| Character Sketches | Characters | Synopsis → tagline, keywords → tags, custom metadata → custom fields |
| Places / Locations | Locations | Synopsis → description, keywords → tags, custom metadata → custom fields |
| Research folder | Research | Imported as research notes |
| Notes / Front Matter / Back Matter | Notes | Plain markdown notes |
| Unknown folders | User’s choice | Classification modal (see above) |
| Images & PDFs | Binary files | Copied to vault with a companion .md that embeds them |
| Labels | Tags | Scrivener label → tag |
| Status | Status | Mapped to StoryLine’s 6-stage pipeline (idea → outlined → draft → written → revised → final) |
| Custom metadata | Custom fields | Field definitions are read from the project; values written to `custom:` in frontmatter |
| Include in Compile | `compile` field | Items marked as non-compiled get `compile: false` |

### Supported Formats

- **Scrivener 3** (Mac & Windows) — fully supported
- **Scrivener 2** (Mac) / **1.9** (Windows) — supported (file layout: `Files/Docs/`)
- **Scrivener 1.x** (Mac, `binder.scrivproj` format) — **not supported**. Open the project in Scrivener 3 to convert it first.

### Tips

- The importer reads RTF files and converts formatting (bold, italic, paragraphs, Unicode). Complex RTF features like tables or embedded images within RTF are not converted.
- A summary notice shows how many scenes, characters, locations, research notes, files, and warnings were produced.
- Warnings are listed for any items that had no content file (e.g. from sync corruption or missing data).

---

## Custom Field Templates

Define your own reusable fields for characters, locations, and scenes. If the built-in fields don't cover everything you need, custom field templates let you add any fields you want — and they'll appear automatically in every character, location, or scene editor.

### How to Use

1. Open **Settings → Field Templates**.
2. Click **Add Field** and give it a name (e.g., "Blood Type", "Languages Spoken", "Theme Song").
3. Choose whether the field applies to **Characters**, **Locations**, **Scenes**, or a combination.
4. The new field appears in every matching editor under the **Custom Fields** section.
5. Fill in values as needed — empty fields are hidden from exports.

### Field Types

| Type | Description |
|------|-------------|
| **Text** | Single-line text input. |
| **Textarea** | Multi-line text block with auto-grow. |
| **Dropdown** | Single-select dropdown with predefined options. |
| **Multi-select (tags)** | Pick multiple values displayed as removable pills. |

### Multi-select Fields

The multi-select type is ideal for traits, themes, categories, or any field where multiple items apply:

- **Manual options** — Define a list of options in the field template (same as dropdown).
- **Folder source** — Optionally enter a vault folder path (e.g., `World/Traits`). All `.md` note names in that folder become selectable options, merged with any manual options.
- **Free entry** — Type a custom value and press Enter to add it even if it's not in the predefined list.
- **Storage** — Values are saved as a YAML list in frontmatter (`universalFields`), making them queryable from Obsidian Bases and Dataview.

Custom field data is stored in the entity's frontmatter under the `universalFields` key. For scenes, custom fields appear in the Inspector between the intensity slider and setup/payoff sections.

Custom sections on Characters, Locations, and Codex entries use the same basic field types. Fields inside those user-created sections can be edited in place, reordered with the chevrons, moved to another custom section with the move icon, and configured with a folder source for dropdown or multi-select choices.

> **Per-project:** Custom sections, codex category definitions, enabled codex categories, and custom location types are stored per project in `System/custom-sections.json` — they do not carry over between unrelated writing projects. Universal field templates (the ones added via the **+** button on a section header) are also per-project, stored in `System/field-templates.json`.

---

## Image Galleries

Characters and locations support image galleries for storing reference art, concept images, maps, mood boards, or any visual material.

### Adding Images

1. Open a character or location detail editor.
2. Scroll to the **Gallery** section (below the portrait).
3. Click **Add Image** to import from your computer or choose an existing vault image.
4. Add an optional **caption** to describe each image.
5. Up to **10 images** per character or location.

### Browsing

- Use the **carousel** arrows to browse through images in the detail panel.
- Click any image to open it in a **floating lightbox**.

### Lightbox

- The lightbox is a floating window you can **drag** around and **resize**.
- **Zoom** in and out with the scroll wheel — zoom level is remembered per image.
- Navigate between gallery images using the arrow buttons.
- Close with the × button or by clicking outside.

Images are saved into the `<Project>/Images/` folder, with automatic deduplication.

---

## Additional Source Folders

By default, StoryLine only scans files inside your project's folder structure (Scenes, Codex/Characters, Codex/Locations, etc.). The **Additional Source Folders** feature lets you point StoryLine at any other folder **inside your vault** so it can pick up entities stored elsewhere — for example, a `Shared Universe/Characters` folder that sits outside a specific project but should still appear in the Codex.

> **Folders must be inside your Obsidian vault.** Obsidian's plugin API is sandboxed to the vault: it can only read files that live inside the vault folder. A folder on your desktop or in `C:\Users\…\Documents` (outside the vault) cannot be scanned. If you want to use notes from outside the vault, move or copy them into the vault first.

### How It Works

1. Open **Settings → Advanced**.
2. Expand the **Additional Source Folders (Experimental)** section.
3. Type or browse for a vault folder and click **Add**.
4. StoryLine recursively scans the folder and every `.md` file inside. Each file is automatically routed to the correct manager based on its frontmatter `type:` field:

| `type:` value | Routed to |
|---|---|
| `scene` | Scene Manager |
| `character` | Character Manager |
| `location` | Location Manager |
| `world` | Location Manager (as a world) |
| Any codex category id | Codex Manager |

5. Entities from additional folders appear alongside your project's own entities in all views.

### Important Notes

- ⚠ **Experimental** — back up your files before linking external folders. Files in linked folders may be modified when you edit entities in StoryLine views.
- **Folders must be inside the vault** — Obsidian cannot access files outside the vault. If you enter an absolute OS path (e.g. `C:\Users\…\MyFolder` on Windows or `/Users/…/MyFolder` on macOS), StoryLine automatically converts it to a vault-relative path on save. If the path doesn't resolve to a folder inside the vault, the scan is silently skipped.
- Works with **any folder structure** — files don't need to be organized by type. StoryLine reads the `type:` field in each file's frontmatter to determine what it is.
- Folder paths are stored as **vault-relative** (e.g., `Shared Universe/Characters` or `Book 2/Scenes`). Leading/trailing slashes and Windows backslashes are normalized automatically.
- The folder browser provides **autocomplete** — start typing and it suggests matching vault folders.
- Adding or removing a folder triggers an **immediate re-scan** and view refresh, so newly linked entities appear right away (no project switch or reload needed).
- Remove a folder by clicking the × button next to it in the settings.
- Additional source folders are scanned after the main project folders, so project files take priority when there are duplicates.

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
| Daily Word Goal | Daily writing target (rings + sparkline) | `1000` |
| Weekly Word Goal | Weekly writing target (Mon → today) | `7000` |
| Monthly Word Goal | Monthly writing target (day 1 → today) | `30000` |
| Project Word Goal | Word count goal for the whole project | `80000` |
| Custom Location Types | User-defined types (Planet, Star System, Galaxy, …) for the Location Type dropdown | — |
| Default View | Which view opens first | `Board` |
| Color Coding | Card color mode (status / POV / emotion / act / tag) | `status` |
| Color Scheme | Choose from 16 palettes (Catppuccin + Moods) or custom | `mocha` |
| Tag Color Overrides | Per-tag color overrides shown as compact chips | — |
| Show Word Counts | Display word counts on cards | On |
| Compact Card View | Smaller cards with less detail | Off |
| Formatting Toolbar | Show/hide the formatting toolbar in scene editors and Manuscript view | On |
| Plot Hole Detection | Enable the Validator engine | On |
| Scene Templates | Custom scene templates for quick scene creation | — |
| Additional Source Folders | Extra vault folders to scan for entities (experimental) | None |

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

### Deleting a Project
Permanently delete the active project and everything inside its folder (scenes, codex, notes, research, and project settings):
1. Switch to the project you want to delete.
2. Command palette → **Delete Current StoryLine Project**.
3. A warning modal lists everything that will be removed. **Type the project title** to enable the Delete button, then click **Delete permanently**.

The project folder is moved to your system trash (or Obsidian's `.trash` folder, depending on your **Settings → Files & Links → Deleted files** preference). If the project belongs to a series, it is also removed from `series.json`. If it was the active project, StoryLine switches to another project automatically.

> **Why this matters:** StoryLine discovers projects by scanning the vault for `type: storyline` markdown files. Simply deleting a folder from Obsidian's file explorer can leave the `.md` file in `.trash/` (or have it restored by a sync plugin), which causes the project to reappear. The Delete command trashes the folder through Obsidian's API and re-scans, so the project is gone for good.

---

## Series Mode

Series Mode lets you group multiple book projects into a **series** with a shared Codex. Characters, locations, and any custom categories are stored once at the series level and automatically available in every book.

### Creating a Series
1. Open the project you want to use as the first book.
2. **From Settings:** Go to **Settings → Project Management** and click **Create Series…**.
   *Or from the command palette:* **Create Series from Current Project**.
3. Enter a series name.
4. StoryLine creates a series folder, moves your book into it, migrates the Codex to the series level, and writes a `series.json` manifest.

### Adding a Book to an Existing Series
1. Open the project you want to add.
2. Command palette → **Add Current Project to Series**.
3. Pick a series from the dropdown (StoryLine scans for folders containing `series.json`).
4. The book folder moves into the series folder and its Codex entries are merged into the shared Codex. Duplicate filenames are skipped.

You can also add books from the **Series Management Modal** — open it from **Settings → Project Management → Manage Series…** or the "Manage Series…" button in the Open Project modal. Each series card has an "Add book" dropdown at the bottom.

### Removing a Book from a Series
1. Open a project that belongs to a series.
2. Command palette → **Remove Current Project from Series**.
3. The shared Codex is copied into a local Codex inside the book folder, and the book moves out of the series folder.

### Renaming a Book
Go to **Settings → Project Management** and click **Rename…**. This renames the project file, its folder, updates the frontmatter title, and updates the series manifest if the book belongs to a series.

### Managing Series
Open the **Series Management Modal** from **Settings → Project Management → Manage Series…** or the "Manage Series…" button in the Open Project modal. From here you can:
- Rename a series (also renames the folder on disk).
- Reorder books within a series using the arrow buttons.
- Rename individual books.
- Add standalone books to the series.
- Remove books from the series (moves the book out of the series folder; the book is kept as a standalone project).
- **Delete a book permanently** (🗑️ trash icon) — trashes the book's folder and removes it from the series. A type-to-confirm warning modal is shown first.

### How It Works
- When a project has a `seriesId` in its frontmatter, all Codex paths (Characters, Locations, custom categories) resolve to the **series-level** Codex folder instead of the book-local one.
- All existing views — Characters, Locations, Codex Hub, Relationship Map, Story Graph, Link Scanner — work transparently with the shared Codex.
- The project selector toolbar shows a **series badge** (library icon + series name) when the active project belongs to a series.
- **Settings → Project Management** provides buttons for Rename book, Create series, and Manage series — everything is accessible without the command palette.

### Mixing Book-Only and Series-Shared Entities

By default every character, world, and location in a series Codex is visible to every book. From v1.9.5 you can fine-tune this per entity:

- **Right-click a character card** in the Characters view, or a world / location row in the Locations view, to open the context menu.
- **Promote to series (shared)** — moves the file from the book's local `Codex/Characters` (or `Codex/Locations`) folder into the shared series-level folder.
- **Demote to project (book-only)** — moves a series-shared entity back into the current book's local Codex folder. Other books in the series no longer see it.
- **Restrict to “<book>” only** — keeps the file in the shared Codex but adds a `books:` frontmatter list so the entity is treated as appearing only in the listed book.
- **Add to / Remove from “<book>”** — toggle membership for the active book.
- **Share across all books** — clears the `books:` list, restoring “appears everywhere” behavior.

The **All books / Showing: <book>** chip in the Characters and Locations search rows hides entries that aren't in the current book. Worlds remain visible if any of their child locations are in the current book, so you can still drill in.

Wikilinks reference characters and locations **by name** (not by file path), so promoting / demoting never breaks references in scenes.

#### `books:` frontmatter format

```yaml
---
type: character
name: Aria Vance
books:
  - The Sunken City
  - The Iron Crown
---
```

- Missing or empty `books:` → entity appears in every book in the series (default).
- Non-empty `books:` → entity appears only in the listed books.

### Pre-flight Checks
Before any migration, StoryLine verifies that Obsidian's **"Automatically update internal links"** setting is enabled. This ensures all `[[wikilinks]]` remain valid when files move between folders. If the setting is off, the migration is blocked with a notice.

### Series Folder Layout
```
StoryLine/
  My Series/
    series.json              ← Series manifest (name, book order)
    Codex/                   ← Shared across all books
      Characters/
      Locations/
      [Custom]/
    Book One.md
    Book One/
      Scenes/
      System/
    Book Two.md
    Book Two/
      Scenes/
      System/
```

> **Rule:** A solo book has a local Codex. A series book uses the series Codex by default. From v1.9.5, series books may additionally keep book-only entities in their per-project `Codex/Characters` and `Codex/Locations` folders — use the right-click **Promote / Demote** actions to move entities between scopes.

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
      Codex/                      ← Codex hub folder
        Characters/               ← Character profiles (Markdown with frontmatter)
        Locations/                ← Location & world profiles
          Eryndor.md              ← World file
          Eryndor/                ← Locations in this world
            The Iron Citadel.md
            Port Veyra.md
        Props/                    ← Example custom category
        Factions/                 ← Example custom category
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

Existing projects with Characters and Locations at the top level (outside Codex/) continue to work — StoryLine detects the old layout automatically.

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

*StoryLine — Transform your vault into a powerful book planning tool.*
