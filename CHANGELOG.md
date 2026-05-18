# StoryLine — Changelog

## Support StoryLine

If StoryLine helps your writing, please consider buying me a coffee. Donations keep the plugin actively maintained.

[![Donate with PayPal](https://www.paypalobjects.com/en_US/i/btn/btn_donate_LG.gif)](https://www.paypal.com/donate?hosted_button_id=A2N2LE7EUBL3A)

## Version 1.10.11

### Bug Fixes

- **Plotlines view ignored chapter nesting when sorting** *([#96](https://github.com/PixeroJan/obsidian-storyline/issues/96))* — With three-part numbering (Act-Chapter-Sequence), the Plotlines **Subway Map** sorted scenes by Sequence only, so `01-02-01` (Ch 2 Seq 1) appeared *before* `01-01-02` (Ch 1 Seq 2). Sorting now uses **act → chapter → sequence**, matching the Board, Export and SceneQueryService.
- **Plotlines list view groups were unsorted** *([#96](https://github.com/PixeroJan/obsidian-storyline/issues/96))* — Each plotline's scene list appeared in whatever order scenes happened to be processed. Each plotline group is now sorted by act → chapter → sequence so reading order is consistent everywhere.
- **Timeline drag-and-drop corrupted Chapter numbers** *([#96](https://github.com/PixeroJan/obsidian-storyline/issues/96))* — Dropping a scene in reading-order mode overwrote `chapter` flatly 1..N across every scene, destroying chapter nesting and sometimes reassigning scenes to the wrong act. The reorder handler now adopts the act/chapter of the neighbour at the drop location for the moved scene and renumbers `sequence` *within* each (act, chapter) group. Chronological mode still updates `chronologicalOrder` as a single global counter (unchanged).

---
## Version 1.10.10

### Bug Fixes

- **Small CSS fixes**
- **Snapshots not appearing in the inspector** *([#95](https://github.com/PixeroJan/obsidian-storyline/issues/95))* — Snapshots were written to disk but never showed up in the list. Root cause: Obsidian's vault API ignores dot-prefixed folders, so the old `.snapshots/` directory was invisible to `vault.getAbstractFileByPath()`. The folder is now `_snapshots/` (still hidden visually in most file managers) and a one-shot migration moves any existing `.snapshots/` content over automatically the first time you open a scene after upgrading.
- **Dropdown menu cut off at bottom of a Codex section** *([#91](https://github.com/PixeroJan/obsidian-storyline/issues/91))* — The multi-select tag dropdown opened *inside* the section's scroll container, so the last few options were clipped when the field sat near the bottom. The popup is now rendered in fixed-viewport coordinates and flips above the input when there isn't enough room below, so every option is always reachable.
- **False-positive detected links cluttering the inspector** *([#89](https://github.com/PixeroJan/obsidian-storyline/issues/89))* — Plain text words that happen to match a character/location name (or appear inside wikilinks unrelated to the scene) were always shown under "Detected in text". Right-click any detected pill and choose **Ignore in this scene** to suppress it permanently for that scene. The ignored names are stored in the scene's frontmatter (`ignored_detections:`), so they round-trip via sync/git.
- **Universal field reorder couldn't swap with built-in fields** *(follow-up to [#92](https://github.com/PixeroJan/obsidian-storyline/discussions/92))* — The up/down chevrons on a universal field would only move it past *other* universal fields; existing built-in fields acted as an invisible wall. Built-in and universal fields now share a single ordered list per section (persisted in `System/field-templates.json`), so chevrons can swap any two adjacent fields regardless of kind.

### New Features

- **Reorder universal fields without leaving the sheet** *([#92](https://github.com/PixeroJan/obsidian-storyline/discussions/92))* — Hover over any universal field (Character / Codex / Location) and two small chevron buttons appear next to the pencil: click to move the field up or down within its section. When you add a new universal field, the modal now offers a **Position** dropdown so you can insert it at the top, at the end (default), or directly after any existing sibling — no more being forced to the bottom.
- **Reorder built-in fields too** *(follow-up to [#92](https://github.com/PixeroJan/obsidian-storyline/discussions/92))* — The hover chevrons are no longer exclusive to universal fields; every built-in field on the Character, Codex and Location sheets now has the same up/down arrows. Each section keeps its own custom order per project, and the order survives Obsidian restarts (stored in `System/field-templates.json`).
- **View a snapshot before restoring it** — Each snapshot row in the inspector now has a **View** icon (between **Save** and **Restore**) that opens the snapshot markdown file in a new Obsidian tab, so you can compare it side-by-side with the current scene before deciding whether to roll back.
- **Support StoryLine via PayPal** — The plugin manifest now exposes a `fundingUrl`, so Obsidian's community plugin page shows a sponsor heart. A matching donate button has been added to the README.

---
## Version 1.10.6

### Why this release

This release prepares StoryLine for submission to the **official Obsidian community plugin directory**. To pass the official review, every plugin must follow Obsidian's strict guidelines for stability, theming, and cross-platform safety. The changes below are mostly under the hood — there are no new user-facing features — but they make StoryLine eligible for one-click install from inside Obsidian, automatic updates, and the trust badge that comes with being a vetted community plugin.

### Bug Fixes & Improvements

- **Theme-friendly styling everywhere** — Every place where StoryLine previously set colors, sizes, or spacing directly on an element has been moved to proper CSS classes. Custom themes now style StoryLine consistently, and dark / light mode switches look cleaner.
- **Cross-window safety** — Views, timers, and pop-out windows now use the correct window context, so detaching the corkboard or timeline into its own Obsidian window no longer causes glitches or stale UI.
- **Help is now built in** — The Help pane no longer needs a separate `HELP.md` file shipped alongside the plugin; the help text is bundled inside the plugin itself, so it always matches the installed version and there's nothing extra to copy.
- **Cleaner integration with Obsidian** — Command names, ribbon icons, hotkeys, and menu entries follow Obsidian's official naming and behavior conventions. Default hotkeys were removed to avoid clashing with your personal shortcuts (you can assign your own under **Settings → Hotkeys**).
- **Stability & maintenance** — Switched to Obsidian's modern APIs across the board (file operations, settings, markdown rendering, network requests). Removed dead code and unused imports. The plugin is leaner, starts faster, and is less likely to break on future Obsidian updates.

---
## Version 1.9.9

### Bug Fixes

- **Corkboard sticky notes leaking into manuscript exports** *([#87](https://github.com/PixeroJan/obsidian-storyline/issues/87))* — Visual sticky notes from the Corkboard (stored as scene files with `corkboardNote: true`) were being included in every Manuscript / Outline / DOCX / PDF / CSV / JSON export. `ExportService.getSortedScenes()` now filters them out by default via a new `isCorkboardNoteScene()` helper. Users who *want* them in an export — e.g. to share planning notes with a co-writer — can flip the new **Include corkboard notes** toggle in the Export dialog.

### New Features

- **Convert any note into a scene** *([#83](https://github.com/PixeroJan/obsidian-storyline/discussions/83))* — Existing notes (or stub notes auto-created from broken `[[wikilinks]]`) can now be promoted to full StoryLine scenes in one click. New command **"Convert note to scene"** acts on the currently active markdown file, and a matching **"StoryLine: Convert to scene"** entry appears in the file-explorer right-click menu for any `.md` file that isn't already a scene. The new `SceneManager.convertFileToScene()` writes the required scene frontmatter (`type: scene`, default status, today's `created` date), assigns the next sequence number, and moves the file into the project's `Scenes/` (or `Scenes/Act N/`) folder so it shows up in every view.
- **Manuscript export — title & numbering options** *([#85](https://github.com/PixeroJan/obsidian-storyline/issues/85))* — The Export dialog gained two new mutually-exclusive toggles when **Manuscript** is selected: **Include scene titles** (off ⇒ no `## Title` headings between scenes — clean prose for publisher submissions) and **Number scenes (Scene 1, Scene 2…)** (on ⇒ working titles are replaced with running numbered headings). Implemented via a new `ExportOptions` interface on `ExportService` and an updated `buildManuscriptMd()`.
- **Wikilink autocomplete in the Scene Inspector's Notes / Comments field** *([#84](https://github.com/PixeroJan/obsidian-storyline/discussions/84))* — Typing `[[` in the editorial-notes textarea now pops up a fuzzy-matched list of vault notes, just like the regular Obsidian editor. Pick one with **Arrow keys + Enter**, **Tab**, or a mouse click and StoryLine inserts the wikilink for you. Powered by a new lightweight `WikilinkSuggest` component attached to the plain `<textarea>` (Obsidian's built-in `EditorSuggest` only works inside CodeMirror editors).

---
## Version 1.9.8

### Bug Fixes

- **Cannot create new notes in the corkboard when *Auto-generate Sequence* is off** *([#81](https://github.com/PixeroJan/obsidian-storyline/issues/81))* — With auto-sequence disabled, every new sticky note resolved to the same `00-00 Untitled.md` filename, and the second create failed because the file already existed. `SceneManager.createScene()` now appends ` (1)`, ` (2)`, … to the filename until it is unique, so unlimited untitled notes (and untitled scenes) can be created in the corkboard regardless of the auto-sequence setting.
- **Infinite loop when creating a new series whose name matches the active book** *([#82](https://github.com/PixeroJan/obsidian-storyline/issues/82))* — Naming a new series the same as the current book made `seriesFolder` resolve to the book's own folder, so `moveFolderRecursive` kept moving the destination subtree into itself, spawning an unbounded chain of identically-named subfolders. `SeriesManager.createSeriesFromProject()` and `addProjectToSeries()` now refuse the operation up front with a friendly notice (suggesting e.g. *"`<name>` Series"*), and `moveFolderRecursive()` defensively rejects any move whose destination is inside the source.

### New Features

- **Weekly & monthly word goals + circular progress rings** — Settings → **Writing Goals** gained two new targets: **Weekly word goal** (default `7000`, Monday → today) and **Monthly word goal** (default `30000`, day 1 → today). The Stats view's *Writing Sprint* section now shows three SVG progress rings (Today / This week / This month) under the existing daily progress bar. Each arc turns green when its goal is reached, and the percentage label is uncapped, so blowing past a target shows the actual value (e.g. *127%*). Backed by three new helpers on `WritingTracker` (`getWordsInLastDays`, `getThisWeekWords`, `getThisMonthWords`) — no on-disk format change.
- **Custom location types** *(user request — sci-fi / D&D campaigns)* — The Location editor's **Type** dropdown now lists the built-in types (City, Town, Wilderness, …) followed by your own custom types (e.g. **Planet**, **Star System**, **Galactic Region**, **Galaxy**, **Dimension**). Add a new type on the fly via the **+ Add custom type…** option at the bottom of the dropdown, or manage the full list under **Settings → Custom Location Types**. Custom types are vault-wide and persist across all projects; the existing `locationType` YAML field accepts any string, so your data stays clean and portable.

---
## Version 1.9.7

### Bug Fixes

- **Codex gallery thumbnails opened nothing in items / custom categories** — In the Character profile, clicking the large gallery image opened a draggable lightbox window. In the codex (items and any user-added categories) the same gallery only swapped thumbnails into the viewer; clicking the main image did nothing. `CodexView.renderGallerySection` is now wired to the same `openGalleryLightbox` helper used by `CharacterView` and `LocationView`, so codex entries can also expand gallery images to a larger floating window with prev/next, zoom and Escape-to-close.
- **Scene cards: word count and progress dots overlapping** — The three progress dots (●●○) were absolutely positioned at the top-right corner of each scene card and rendered on top of the word count badge. They were first moved to the lower-right corner, but on cards with a long row of character pills (e.g. three names) the pills could still slide under the dots. The dots are now anchored just below the word count (top-right, under the wordcount badge), where they never collide with either the wordcount or the character pills.
- **Board columns had inconsistent widths** — `.story-line-column` used `min-width: 260px; max-width: 320px`, so an act whose scenes had wider content (more character pills) ended up visibly wider than an act whose scenes had fewer pills. Columns are now a fixed `width: 300px`, and scene cards inside the column body get `width: 100%; min-width: 0; box-sizing: border-box` so the character-pill row wraps to a new line *inside the card* instead of stretching the parent column.
- **Custom fields with `topLevelKey` did not migrate existing entries** — Adding a Top-level YAML key to an existing dropdown / multi-select template (or flipping the global *Mirror custom fields to top-level YAML* toggle on) only affected new edits; previously-saved values stayed locked inside `universalFields:` until the user re-selected each one by hand. StoryLine now retro-mirrors all characters, codex entries, locations and scenes whenever a template's top-level key or folder source changes — and runs the same sweep when the global mirror toggle is enabled. Renamed top-level keys also clean up the stale property name automatically.

### New Features

- **Folder-sourced custom-field selections become clickable wikilinks** — When a dropdown or multi-select Universal Field draws its options from a vault folder (e.g. *Traits/*, *Houses/*, *Magic Systems/*), the value mirrored to top-level YAML is now wrapped as `[[Note Name]]`. Obsidian Properties, Bases, Dataview and the graph all treat the property as a real link, so you can jump straight from a character's Properties panel to the source note. The in-app dropdown UI keeps showing plain names — bracket stripping/wrapping happens only at the YAML boundary.
- **Folder source available for dropdown fields too** — Previously only multi-select fields could be sourced from a folder of notes. The Add/Edit Field modal now exposes the same *Folder source (optional)* setting for single-value dropdowns, with the matching wikilink-on-mirror behaviour above.

---
## Version 1.9.6

### Bug Fixes

- **Codex / character / location notes vanishing after a template insert** *([#74](https://github.com/PixeroJan/obsidian-storyline/issues/74))* — When a Templates / Templater plugin replaced the YAML block and dropped the `type:` discriminator, the affected note silently disappeared from the Codex, Characters or Locations view. StoryLine now falls back to folder-based detection: any note that lives under the canonical entity folder (`Codex/<Category>/`, `Characters/`, `World/Locations/`) is recognised even if `type:` is missing, wrong, or the frontmatter is empty.
- **Plot Grid sorting by Sequence / Chapter / Act now respects non-numeric values** *([#76](https://github.com/PixeroJan/obsidian-storyline/issues/76))* — Sorting rows by Act, Chapter, or Sequence used to coerce values via `Number(...)`, which silently turned strings like `Prologue`, `Epilogue`, or `1.1` into `NaN` and produced an apparently random order. Plot Grid (and the shared `SceneQueryService` used by every other view) now uses the numeric-aware `compareActChapter` comparator and falls back through Act → Chapter → Sequence in reading order. *Note: the second half of the issue — automatic sequence reflow when inserting a chapter mid-book — is intentionally deferred to a later release; it requires a project-wide renumber that we want to design carefully.*

### New Features

- **Multiple roles per character** *([#72](https://github.com/PixeroJan/obsidian-storyline/issues/72), Tier 1)* — A character can now hold more than one role at the same time (e.g. *protagonist* + *narrator*). The role field in the Character inspector accepts comma-separated values and renders one badge per role. Existing single-role characters keep working unchanged.
- **Role history across scenes / plotlines / books** *([#72](https://github.com/PixeroJan/obsidian-storyline/issues/72), Tier 2)* — Characters can now record a *history* of role changes in a structured `roles:` YAML array. Each entry has a role label and optional `from` (scene name or `[[wikilink]]`), `plotline`, and `book` (free-text label) anchors. A new repeating-row editor under the role field in the Character inspector lets you add/remove entries. Both the legacy `role:` field and the new `roles:` history coexist; if both are set, the structured history wins for display order. The `book:` anchor is plain author-facing metadata — no cross-book plumbing required.
- **Wikilink-aware scene references** *([#73](https://github.com/PixeroJan/obsidian-storyline/issues/73))* — Scene fields that reference other notes (`pov`, `location`, `characters`, `setup_scenes`, `payoff_scenes`) are now stored as Obsidian `[[wikilinks]]` so renames are picked up automatically by Obsidian's metadata cache. Plain-text values continue to work — the readers accept either form. Toggle in **Settings → Write scene references as wikilinks** (on by default).
- **Custom fields visible to Properties / Bases / Dataview** *([#71](https://github.com/PixeroJan/obsidian-storyline/issues/71))* — Universal Field Templates gained an optional **Top-level YAML key**. When set, the field's value is mirrored to a real top-level YAML key (in addition to `universalFields:`) so it appears in Obsidian's Properties panel, Bases, Dataview and the graph. Reserved StoryLine keys (`type`, `pov`, `act`, `chapter`, `tags`, …) are blocked. Toggle in **Settings → Mirror custom fields to top-level YAML** (on by default).
- **Step-sibling and teammate relations** *([#70](https://github.com/PixeroJan/obsidian-storyline/issues/70))* — Added `step-sibling` to the family relation list and `teammate` to the professional relation list, with matching symmetric inverses.
- **Default scene frontmatter snippet** *([#77](https://github.com/PixeroJan/obsidian-storyline/issues/77))* — Universal Field Templates gained an optional **Default value** that is applied automatically when a new scene is created (multi-select fields accept comma-separated defaults). In addition, **Settings → Default scene frontmatter** accepts a free-form YAML block whose keys are merged into every newly created scene's frontmatter. StoryLine-owned keys (`type`, `title`, `act`, `chapter`, `sequence`, `status`, `wordcount`, …) always win on conflict, so the default snippet can never overwrite the engine's own metadata.
- **Wordcount can now ignore comments and checkbox lines** *([#78](https://github.com/PixeroJan/obsidian-storyline/issues/78))* — Two new toggles under **Settings → Scene Cards**:
  - **Exclude `%%comments%%` from wordcount** *(default on)* — Obsidian comment blocks no longer inflate the count, so author notes and TODOs stay invisible to the manuscript total.
  - **Also ignore checkbox lines** *(default off)* — When enabled, `- [ ]` and `- [x]` lines are also stripped before counting, which is useful for outline-style scenes that mix prose with task lists.
  Both toggles flow through the central `MetadataParser.countWords` helper, so they apply consistently to scene cards, the inspector, the Writing Tracker, and exports.

### Internal

- **Series Arc View — foundation** *([#66](https://github.com/PixeroJan/obsidian-storyline/issues/66) Phase 1, scaffold only)* — A new `SceneProvider` indirection layer (`services/SceneProvider.ts`) was added so future view code can pull scenes from either the active book or every book in a series. Settings flags `seriesArcView` (default off) and `warnOnCrossBookMove` (default on) are reserved. The cross-book Manuscript / Kanban / Plot Grid rendering itself ships in a follow-up release.

---
## Version 1.9.5

### Bug Fixes

- **Act / chapter sort order with 10+ entries** — Filter dropdowns, board columns, manuscript order, exports, navigator, plotgrid and stats no longer sort acts/chapters lexically (`1, 10, 11, 2, 3, …`). They now sort numerically (`1, 2, 3, …, 10, 11`). Also fixes scene order in exports when a project has more than 9 acts or 9 chapters.

### New Features

- **Custom scene fields** *(requested by @rk-kontur, [#67](https://github.com/PixeroJan/obsidian-storyline/issues/67))* — Define your own metadata fields on scenes (Story Grid functions, Truby aspects, beat-sheet labels, genre conventions, anything you need) without overloading the title or subtitle. Manage templates from **Settings → Custom Scene Fields** or inline from the Inspector. Supports text, textarea, dropdown and multi-select types.
  - **Inspector** — every scene now has a "Custom Fields" section to edit values.
  - **Board → Group by** — dropdown and multi-select fields appear as grouping options in the Kanban board (multi-select scenes show in every matching column).
  - **Filters** — dropdown and multi-select fields each get a chip group in the filter panel.
  - **Scene cards** — up to three populated values appear as small badges on cards, and hovering any card shows a full summary of every custom value.
  - Values are stored under `universalFields:` in scene frontmatter; templates live in `<project>/System/field-templates.json` and sync with the rest of the project.
- **Free-form act and chapter labels** — Acts and chapters are no longer restricted to plain integers. You can now use:
  - Hierarchical decimals: `1.1`, `1.2`, `1.10`, `2.1` (sort stays correct).
  - Text labels: `Prologue`, `Epilogue`, `Interlude A` (sort numerically first, then text).
  - Plain integers: still work exactly as before.
- **Inspector — Act is now a free-text field** — The Act control in the Scene Inspector is a text input instead of a 1..N dropdown, so you can type any of the values above. Illegal Windows path characters (`< > : " / \ | ? *`) are flagged with a warning.
- **Folder and filename safety** — Scene folders (`Act 1.1/`) and filename prefixes (`1.1-02 Title.md`) are sanitized for non-numeric act/chapter values. Pure integers continue to be zero-padded as before for sortable filenames.
- **Safer next-act numbering** — The auto-suggested next act number now ignores non-numeric values, so projects containing a `Prologue` no longer break the increment.
- **Series-shared characters and locations — per-book scoping** — Series Mode now lets you mark which books a character or location appears in instead of always sharing every entity with every book. Right-click any character card or location/world row in the Codex views to:
  - **Promote to series** — move a book-local entity into the shared series Codex so sibling books can use it.
  - **Demote to project** — move a series-shared entity back into the current book's local Codex.
  - **Restrict to “<book>” only / Add to / Remove from “<book>” / Share across all books** — toggle the new optional `books:` frontmatter list. Empty / missing means “appears in every book” (the historical behavior, fully backwards compatible).
  - A new **All books / Showing: <book>** filter chip in the Characters and Locations views hides entries that don't appear in the current book.
  - Series projects can now keep both a per-project `Codex/Characters` and `Codex/Locations` folder for book-only entities, alongside the shared series-level Codex.

---
## Version 1.9.4

### Bug Fixes

- **Board view drag-and-drop** — Dragging cards in the Kanban board now places them where you drop them. Previously the internal sort used only the sequence field (instead of act → chapter → sequence), causing cards to land at unexpected positions. Drag-and-drop also now correctly updates the chapter field and renumbers sequences within each (act, chapter) group. *(reported by @stootz)*

- **Navigator reading-order sort** — The Navigator's "Reading order" mode now sorts by act → chapter → sequence. Previously it sorted by chapter/sequence only, which could interleave scenes from different acts. *(reported by @stootz)*

- **Navigator scene count** — The footer scene count now excludes corkboard sticky notes, showing only actual scenes. *(reported by @stootz)*

---
## Version 1.9.3

### Bug Fixes

- **Daily stats not updating** — Writing sprint words now correctly flow into the Today / Last 7 Days stats and Writing History.

- **Timezone date key** — Daily stats use local date instead of UTC, fixing off-by-one day boundaries.

- **Corkboard note creation** — All "+New Note" clicks now create sticky notes in the Notes/ folder, not just the first one.

- **Board view sorting** — Board columns now sort scenes by act → chapter → sequence consistently.

- **Plotgrid right-click rename** — Rename via right-click modal now applies correctly. Fixed stale closure reference by re-resolving row/column from live data at commit time.

- **Plotgrid cell text contrast** — Cells with custom hex backgrounds now auto-apply WCAG contrast text color.

- **Plotlines pill contrast** — Subway map pills and list-view tag badges use WCAG contrast instead of hardcoded white text.

- **Manuscript title sort** — Sorting by "Title" now preserves YAML title order instead of always overriding to act→chapter→sequence.

- **Plotgrid auto-note corruption** — Fixed save race condition where creating an auto-note could cause all cells in a row to show the same content. Eliminated premature `scheduleSave()` before `linkedSceneId` is set and added double-fire guard.

- **Plotgrid broken scene links** — Added auto-repair on load: broken `linkedSceneId` paths are resolved by filename matching, fixing sample project links after version migrations.

### New Features

- **Act 6+ in dropdowns** — Act dropdown in Quick Add and Inspector now dynamically scales based on existing scenes instead of being hardcoded to 5.

- **Sprint end sound** — Optional chime when the writing sprint timer reaches zero (Settings → Writing Goals). Uses a two-tone Web Audio chime.

---
## Version 1.9.2

### Bug Fixes

- **Setup / Payoff links** — Fixed broken references in the Sample Project. Setup/payoff ordering warnings now use full reading order (act → chapter → sequence) instead of sequence alone, eliminating false warnings. Renaming a scene now automatically updates setup/payoff references in all other scenes.

- **Plotgrid rename sync** — Renaming a scene no longer leaves orphaned rows in the Plot Grid. Merge mode auto-cleans orphaned rows while preserving manually added ones.

- **Timeline & Board sorting** — Sorting by chapter now uses multi-key act → chapter → sequence order, fixing incorrect scene interleaving across acts.

- **Navigator sorting** — Chronological order now uses the correct fields (`chronologicalOrder` → `storyDate` → `sequence`) and displays as a flat list. "Recently edited" sort uses actual file modification time.

- **Manuscript backlinks** — Obsidian's native backlink panes are now hidden inside embedded manuscript editors, removing visual clutter and gaps.

- **Tag text contrast** — Tag pills, chips, and color-coded badges now automatically use black or white text based on background brightness (WCAG contrast formula), fixing unreadable light-on-light combinations.

- **Resequence preserves chapters** — The Resequence button no longer assigns every scene its own chapter. It now sorts by act → chapter → sequence and renumbers scenes within each chapter, keeping your existing chapter structure intact.

### New Features

- **Four new beat sheet templates** — Seven-Point Story Structure (Dan Wells), Story Circle (Dan Harmon), Romancing the Beat (Gwen Hayes), and 27 Chapter Method (Kat O'Keeffe). The template picker is redesigned as a compact list with expandable beat previews.

- **Beat sheet YAML field** — When a beat sheet template is applied, the template name is stored on the project and auto-populated as a `beatsheet` field on every new scene.

- **Custom scene fields** — Define your own fields for scenes (text, textarea, dropdown, or multi-select) via Settings → Field Templates. Custom fields appear in the Inspector under "Custom Fields" and are stored in YAML as `universalFields`.

- **Save as Template** — Right-click any scene card in the Board view and choose "Save as Template" to capture its fields and body as a reusable scene template.

- **Quick Add chapter dropdown** — The Quick Add modal now shows a dropdown of existing chapters with scene counts, defaulting to the latest chapter. Includes a "+ New chapter" option.

- **Writing Sprint timer** — Fully functional sprint timer in Stats View with start/stop/reset, editable duration, live word count and WPM during the sprint, and a persistent sprint history log.

---

## Version 1.9.1

### Bug Fixes

- **Tab title on project switch** — Switching projects now immediately updates the tab title. Previously the tab still showed the old project name until you changed views.

- **Resequencing preserves existing order** — Dragging a card in the Board view no longer resets all sequence numbers in the column. Only the dragged card gets a new sequence number (inserted between neighbors using midpoint gaps, or shifting only when necessary). Cards that aren't moved keep their original sequence, so dragging a scene to another act and back preserves the numbering of all other scenes. The Resequence toolbar button and column-level drops also no longer overwrite the `chapter` field when grouping by status or other non-chapter fields.

- **Plotgrid Rename Row & Column now works** — The right-click "Rename Row" and "Rename Column" menu items in Plot Grid view now open a small modal dialog instead of a browser prompt, which was blocked by the context menu and drag-to-reorder systems. Double-click editing on row headers also disables dragging during the edit so mouse text selection works properly. For rows linked to scenes, single-click opens the scene (with a short delay) and double-click enters edit mode without also opening the file.

### New Features

- **Custom statuses** — Define your own scene statuses (e.g. "Sent to Team", "Waiting", "Edited", "Pitched", "Published") in Settings → Scene Cards → Custom Statuses. Each custom status gets a label and color. Custom statuses appear in all status dropdowns, Board columns, filter chips, progress dots, and exports alongside the six built-in statuses. Existing projects are unaffected — the built-in statuses remain permanent and custom statuses are purely additive.

- **Reading order vs chronological order** — Sort terminology is now consistent across all views. "Reading order" sorts by the `chapter` YAML field (the order scenes appear in the book). "Chronological order" sorts by `sequence` / `chronologicalOrder` (the order events happen in story time). The Navigator now offers both "Reading order" and "Chronological order" sort options (replacing the old "Book order"). The Timeline view's "Reading Order" toggle now correctly sorts by chapter. The Plotlines (Storyline) view sort is renamed to "Reading order (chapter #)".

- **Beat Sheet Templates discoverability** — The "Add acts or chapters" button is now available in both Corkboard and Kanban modes (previously Kanban only), with an updated tooltip mentioning Beat Sheet Templates. When adding chapters, a new "Create an empty scene per chapter" toggle optionally creates placeholder scenes so new chapters are immediately visible in all views — not just Kanban. After adding chapters, a notice directs you to Board → Kanban → Group by Chapter. HELP.md updated with step-by-step instructions and a scene ordering terminology guide.

---
## Version 1.9.0

### Bug Fixes

- **Location hierarchy in dropdowns** — Location autocomplete fields (Inspector, Quick Add) now display locations with their parent as "Parent > Child" while still storing the plain name. Makes it easy to distinguish identically-named locations in different regions.

- **Dropdown positioning** — Autocomplete dropdowns no longer overflow below the viewport. When there isn't enough space underneath, the dropdown now appears above the input field instead.

- **Resequencing across acts** — The Resequence button now applies global continuous numbering sorted by act → sequence, and keeps the chapter field in sync. Dragging cards between acts also updates both sequence and chapter correctly.

- **Plot Grid sort order** — The sort dropdown in the Plot Grid filter bar now actually controls the row display order. Previously the selected sort was ignored during rendering.

- **Views not re-rendering after rapid changes** — A second file change arriving while a refresh was already queued could be silently dropped. Board, Timeline, and Plotlines views now use `cancelAnimationFrame` coalescing so every change is rendered.

### New Features

- **Switch Project command** — A new command palette entry "Open/Switch StoryLine Project" (`Ctrl+P` → "Switch Project") lets you quickly jump between projects.

- **Plotlines refresh button** — The Plotlines toolbar now includes a manual refresh button (↻) that forces a full re-render, useful after bulk edits.

- **Multi-select field template type** — Universal field templates now support a "Multi-select (tags)" input type. Selected values display as removable pills. Options can be defined manually or sourced from a vault folder (note names become selectable items). Values are stored as a YAML list, making them queryable from Obsidian Bases.

---
## Version 1.8.9

### Bug Fixes

- **Corkboard empty on first open (iPad)** — Opening the Corkboard for the first time on iPad no longer shows an empty board. Scene cards now appear immediately without needing to switch to another view and back. The root cause was a race condition where the scene index was not re-initialized after the active project was set during startup.

- **Scene card order badge now includes chapter** — The sequence badge on scene cards now displays the full Act-Chapter-Scene ordering (e.g. `01-02-03`) when a chapter number is assigned. Previously only Act-Scene was shown, omitting the chapter. Scenes without a chapter still display as before (e.g. `01-03`).

---

## Version 1.8.8

### Bug Fixes

- **Plot Grid scroll reset** — Changing a scene name, finishing a drag, or editing any attribute in the Plot Grid no longer resets the view to the top. Scroll position is now preserved across re-renders.

- **Corkboard rendering resilience** — If a single scene's data causes an error during corkboard rendering, the remaining scenes now still display instead of the entire board silently failing. Errors are logged to the console for diagnosis.

### New Feature

- **Timeline drag-scroll settings** — Two new settings under **Settings → Timeline Drag-Scroll** let you control the auto-scroll behavior when dragging scenes near the viewport edge: **Scroll speed** (1–30 px/frame, default 8) and **Scroll zone** (20–200 px from edge, default 60).

---

## Version 1.8.7

### Bug Fix

- **Export order** — Export was only sorting by sequence, which caused scenes from different acts to interleave. It now sorts by act → chapter → sequence, matching the same ordering logic that ManuscriptView already uses.

## Version 1.8.5

### New Features

- **Show in StoryLine** — Right-click any character, location, or codex entry file (in the file explorer, tab header, or editor) and choose **Show in StoryLine** to jump directly to its detail panel. Also available in the command palette (`Ctrl+P` → "Show in StoryLine"). The command auto-detects whether the file is a character, location, or codex entry and opens the correct view.

- **Formatting Toolbar Toggle** — The formatting toolbar in the Manuscript view now respects the **Formatting toolbar** toggle in Settings. Previously the Manuscript view always showed the toolbar regardless of the setting.

### Bug Fixes

- **Corkboard scene card display** — Scene cards in Corkboard view now expand to fit their content (title, conflict, characters, etc.) after being filled out. Previously, cards could appear clipped because CSS containment prevented them from growing, and persisted sticky-note heights were incorrectly applied to regular scene cards.

---

## Version 1.8.4

### New Features

- **Scene Colors** — Assign a custom background color to any scene card. Right-click a scene in Board, Timeline, or Navigator and choose **Set color**. The color tints the card background using a subtle wash, independent of the color-coding edge stripe. Clear it with **Clear color** from the same menu. Color is stored in the `color` field in frontmatter.

- **Codex Linking** — Link Codex entries directly to scenes. Any enabled Codex category (Items, Creatures, Factions, or your own custom categories) can appear as a tag-pill section in the Scene Inspector sidebar, letting you associate entries with scenes just like Characters and Locations.

  - **Inspector sections** — Enable a Codex category for the Inspector via **Codex → Manage Categories → Inspector** checkbox. Enabled categories appear as tag-pill inputs in the Inspector with autocomplete from your Codex entries.
  - **Assign from detected links** — Right-click any detected link in the "Detected in text" section to assign it to a Codex category. The entry is added to the scene's `codexLinks` frontmatter automatically.
  - **Plot Grid sync** — The "Sync from Scenes" modal now includes enabled Codex categories in the "Columns from" dropdown. Sync scenes against your Items, Factions, or any custom category. Click a Codex column header to open the entry file.
  - **Stored in frontmatter** — Codex links are saved as `codexLinks` in scene YAML (e.g., `codexLinks: { items: ['Magic Sword', 'Shield'], factions: ['Rebels'] }`).

- **Plotline Filtering (Plotlines View)** — Filter the subway map and list view to show only selected plotlines.

### Bug Fixes

- **Act reassignment** — Changing a scene's act in the Inspector now moves the file to the correct `Act N/` subfolder and updates the filename prefix. Previously, only the frontmatter was updated while the file stayed in the old location.

- **Board resequencing** — The resequence button now numbers scenes within each act starting from 1, rather than numbering globally across all acts. Scenes in Act 2 no longer continue the numbering from Act 1.

- **Timeline drag-and-drop** — Fixed drag-and-drop scene reordering in Timeline view.

- **Timeline auto-scroll** — The Timeline now auto-scrolls when dragging a scene near the edges.

- **Timeline scroll-to-new** — Creating a new scene in Timeline view now scrolls to show it.

### Performance

- **Query memoization** — Scene filtering and sorting results are now cached and only recomputed when scene data actually changes. Views that haven't changed skip re-rendering entirely.

- **Debounced re-renders** — Board, Timeline, and Plotlines views now coalesce rapid refresh calls using requestAnimationFrame, preventing redundant DOM rebuilds during batch operations.

- **Progressive timeline rendering** — Projects with 40+ scenes now render the timeline in batches (first 20 immediately, then 10 per frame), keeping the UI responsive during initial load.

- **CSS layout containment** — Scene cards and timeline cards use `contain: content` to isolate browser layout recalculations, reducing paint cost as scene count grows.

- **Reverse tag index** — SceneManager maintains a tag → scenes lookup index, updated incrementally on each mutation, for O(1) plotline-to-scene queries.

---

## Version 1.8.3

- **Scrivener Import** — Import a Scrivener project (.scriv folder) as a new StoryLine project. Attempts to convert scenes, characters, locations, and research notes. Supports Scrivener 2 and 3 project formats. Results may vary depending on project complexity — review imported data carefully.
  
  - Access via **Settings → Import** or command palette → **Import Scrivener Project**.

- **Scene Inspector sidebar** now works from Board, Timeline, and Plotgrid views (previously Manuscript only).

- **Research sidebar** — Open and Edit buttons for all research post types. Web clips open their URL; all types support an edit modal.

- **View Snapshots** — Save and restore point-in-time snapshots of your project's view layout. Each snapshot captures corkboard card positions (including card heights), the full Plot Grid state (rows, columns, cells, zoom, styling), and scene layout metadata (act, chapter, status, POV, sequence). Create, rename, load, and delete snapshots from the toolbar button (clock icon) in Board or Plotgrid views, or via the command palette.
  
  - **Auto-save** — When a snapshot is active, layout changes are automatically saved back to it after a 2-second debounce. No manual saving needed.
  - **Free-editing mode** — With no active snapshot, changes are saved normally without snapshot tracking.
  - **Per-project** — Each project has its own snapshot history, stored in `System/Snapshots/`.

---

## Version 1.8.2

- **Separate Notes/ folder** — Corkboard sticky notes are now stored in a dedicated `Notes/` folder inside your project, keeping the `Scenes/` folder clean. Converting a note to a scene moves the file to `Scenes/` automatically.

- **Scene Archive** — Right-click any scene in Board or Navigator and choose *Archive Scene* to move it to an `Archive/` folder. Archived scenes are removed from all views but preserved on disk. Restore them via the archive button (📦) in the Board toolbar.

- **Scene Subtitles** — An optional subtitle field (e.g. *“Three years later”*, *“Meanwhile, in Paris”*) is shown below the title on scene cards and in the Manuscript view header. Edit it in the Inspector.

- **Novel Covers / Project Art** — Click the cover thumbnail (or placeholder icon) in the toolbar to pick a cover image for your project. The thumbnail appears next to the project name in the toolbar selector.

- **Research Sidebar** — A dedicated right-sidebar panel for storing and browsing research while you write. Supports four post types: **Note**, **Web Clip**, **Image**, and **Question** (with open/resolved tracking). Features include free-text search, tag chip filters, type filters, and an **Auto-suggest** mode that surfaces relevant research based on the active scene's characters, location, and tags. Create, read, edit, and delete posts without leaving your writing flow. Open the panel via command palette → *Open Research Sidebar*.

---

## Version 1.8.1

Bug fixes to linkscanner and small UI improvements.

## Version 1.8.0

### New Features

- **Focus Mode (Manuscript View)** — A glasses icon (👓) in the filter bar toggles Focus Mode. When active, surrounding UI (sidebars, ribbon, title bar, tab headers) is dimmed, darkened, and optionally blurred so you can concentrate on writing. The filter bar, scene headers, dividers, and footer are hidden. Three adjustable sliders in **Settings → Focus Mode**: Dim amount (inactive scenes), Darken amount (environment), and Blur amount (environment). A reset button restores defaults (25% / 40% / 1px).

- **Codex Tags in Plot Grid Cells** — Every plot grid cell now automatically shows color-coded pills for characters (blue), locations (green), and codex entries (purple) detected in the cell text and/or the linked scene's body. Entity detection uses the same LinkScanner engine that powers cross-entity references. No manual tagging required.

- **Two-Way Codex ↔ Prose Change Detection** — When a codex entry's content is edited after its initial creation, StoryLine flags it as "modified" on the Codex detail page and lists all scenes that reference the entry. A **"Mark as reviewed"** button clears the warning. Digests are stored per-project in `System/codex-digests.json`.

- **Setup & Payoff Map (Stats View)** — A new collapsible section in the Stats dashboard visualizes setup → payoff chains across your scenes. Uses `setup_scenes` and `payoff_scenes` frontmatter to draw explicit links and flags dangling payoffs with no matching setup. Click any scene name to open it.

- **Pacing Coach (Stats View)** — Added inside the Pacing & Tension section. A bar chart with conflict-presence dots highlights scenes where word count is high but no conflict is defined — potential pacing issues. Includes summary stats (average length with/without conflict) and flags specific long scenes lacking conflict.

- **Character × Chapter Heatmap (Stats View)** — A grid heatmap in the Characters & World section showing how often each character appears per chapter. Color intensity reflects appearance count. Helps spot under-represented characters and distribution gaps.

- **Echo Finder (Stats View)** — A new collapsible section that scans your prose for repeated phrases and sentence-level echoes. Finds duplicated multi-word sequences that may indicate unintentional repetition.

### Improvements

- **Manuscript Performance** — Memoized filtered scene list, skeleton placeholders during lazy loading, and cached footer stats reduce re-render overhead for large projects.

---

## Version 1.7.2

### New Features

- **Formatting Toolbar (Manuscript View)** — A built-in formatting toolbar appears above the manuscript when you click into any scene editor. Provides one-click access to common formatting commands without needing the third-party Editing Toolbar plugin (which cannot hook into embedded editors). The toolbar auto-hides when you click away from the editor.

- **Formatting Toolbar in Scene Editors** — When the Editing Toolbar plugin is not installed, StoryLine now automatically opens a formatting toolbar into standard scene editor tabs (any markdown file inside the active project). This gives you formatting buttons everywhere without needing a third-party plugin. A new **Settings → Display Options → Formatting toolbar** toggle lets you turn this off if you prefer.

## Version 1.7.1

### New Features

- **Cross-Entity References ("Referenced By" panel)** — Characters, Locations, and Codex entries now show a **Referenced By** section in their side panel. StoryLine scans all entity descriptions and scene text for `[[wikilinks]]`, `#tags`, and plain-text name mentions, then builds a reverse index so you can see at a glance which other characters, locations, codex entries, and scenes mention the entity you're viewing. References are grouped by type (characters, locations, codex category, scenes) and each is a clickable link that opens the source file.
  
  Use standard Obsidian `[[wikilinks]]`, `#tags`, or just write entity names as plain text in any text field — scene prose, character backstory, location descriptions, codex entry notes — and StoryLine will automatically detect the cross-entity connection.

- **Hide / Show Built-in Fields** — Declutter your character, location, and codex editors by hiding built-in fields you don't use. Every built-in field (except Name) now has a small **eye icon** that appears when you hover over the field label.
  
  - **Hide a field** — hover over any field label and click the eye-off (👁‍🗨) icon. The field disappears from the form.
  - **Show hidden fields** — a "Show N hidden fields" link appears at the bottom of each category section. Click it to expand the hidden fields in a dimmed container.
  - **Unhide a field** — inside the hidden-fields container, hover over the field label and click the eye icon to restore it permanently.
  - Hidden fields are grouped per view: `character`, `location`, or the codex category ID (e.g., `items`, `creatures`). Hiding a field in one category does not affect other categories.
  - **Data is never deleted** — hiding a field only affects the UI. The value remains safely stored in your frontmatter and will reappear if you unhide the field later.

- **Universal Fields scoped per category** — Custom universal fields (created with the + button in section headers) are now scoped to their entity type: character fields only appear on characters, location fields on locations, and codex fields on their specific codex category. Previously all universal fields were shared across all entity types.

### Bug Fixes

- **Files open in Live Preview** — All scene and entity files now open in Live Preview mode (`source: false`) instead of Reading View, so the cursor is immediately editable and third-party editor plugins work correctly.

- **Board: Quick-add inherits column context** — Creating a new scene from a Kanban column now pre-fills the field for that column's grouping. For example, adding a scene to the "Act 2" column pre-fills Act = 2; adding to the "Sarah" POV column pre-fills POV = Sarah.

- **Board: View mode remembered** — The Board view now remembers your last-used sub-mode (Corkboard or Kanban) and Kanban grouping (act, chapter, status, or POV) across sessions.

- **MetadataParser: Clear act field** — Setting a scene's act to "None" now correctly removes the `act` field from frontmatter instead of leaving it as an empty value.

- **Dark mode: Dropdown styling** — Select dropdowns in character and location editors now render correctly in dark themes (proper background and text colors via `color-scheme: dark`).

- **Locations: Universal fields** — Locations and worlds now support universal (template-defined) fields, matching the existing support in characters and codex entries.

---

## Version 1.7.0

### New Features

- **Series Mode** — Group multiple book projects into a shared series. Books in a series share a single Codex (characters, locations, and custom categories) so every entry is available across all books without duplication.
  
  - **Create Series** — Command palette → **Create Series from Current Project**. Wraps the active book in a new series folder, moves its Codex to the series level, and writes a `series.json` manifest.
  - **Add to Series** — Command palette → **Add Current Project to Series**. Discovers existing series in your vault and lets you pick one. The book folder moves into the series folder and its Codex entries are migrated into the shared Codex.
  - **Remove from Series** — Command palette → **Remove Current Project from Series**. Copies the shared Codex back into the book's local folder and moves the book out of the series folder.
  - **Series badge** — When the active project belongs to a series, the project selector toolbar shows a small badge with the series name and a library icon.
  - **Transparent to all views** — Characters, Locations, and Codex views automatically resolve to the series-level Codex folder when the active project belongs to a series. No changes needed in your workflow.
  - **Pre-flight check** — Before migration, StoryLine verifies that Obsidian's "Automatically update internal links" setting is enabled, so all `[[wikilinks]]` stay valid when files move.
  - **Safe file moves** — All file operations use Obsidian's `fileManager.renameFile()` to ensure links are updated vault-wide. Duplicate filenames in the destination are skipped with a notice.
  - **Settings → Project Management** — New section in the plugin settings tab with buttons for **Rename book**, **Create series from this book**, and **Manage series** — no need to use the command palette.
  - **Series Management Modal** — Accessible from Settings or the Open Project modal. View, rename, and reorder books within a series, add standalone books, or remove them.
  
  Series folder structure:
  
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

---

## Version 1.6.0

### New Features

- **Stats View Rewrite** — The Stats dashboard has been completely rebuilt with eight collapsible sections for a cleaner, more organized layout. Click any section header to expand or collapse it.
  
  - **Overview** — Project word count with goal progress bar, estimated reading time, pace-to-deadline projection, and estimated completion date.
  - **Writing Sprint** — Session word count, duration, speed (wpm), streak, daily goal progress bar, and a 7-day sparkline.
  - **Writing History** — Daily bar chart with range selector (7d / 30d / 90d / All) showing words written per day.
  - **Progress Breakdown** — Word counts by status, by chapter (with outlier highlighting), and act balance stacked bars.
  - **Characters & World** — POV distribution, character scene coverage heatmap, and location frequency chart.
  - **Pacing & Tension** — Average scene length by act, word count distribution histogram, scene length outlier detection, dialogue vs. narrative ratio per scene, and tension curve.
  - **Prose Analysis** — Lazy-loaded section with Flesch-Kincaid readability scores, average sentence/word length, top 20 word frequency chart, and overused word warnings.
  - **Warnings** — Plot hole detection and validation warnings (unchanged).

- **Image Sticky Notes** — Corkboard notes can now hold images (maps, charts, reference art) instead of text. Click the **+ New Image Note** button in the corkboard toolbar, or drag an image from the vault file explorer or your desktop directly onto the canvas. Each image note supports an optional caption with full markdown and `[[wikilink]]` support — captions are included in link scanning. Right-click an image note to set, change, or remove the image. Click the image to open a fullscreen lightbox. Image notes can be resized and repositioned like regular sticky notes.

### Bug Fixes

- **Writing Tracker accuracy** — Fixed a bug where the "Today" word counter and "Session" counter could show the entire project word count instead of actual words written. The root cause was the tracker recording project totals as session words when the baseline wasn't properly initialized. The tracker now uses a null baseline that only activates after explicit initialization, includes lazy self-healing, and sanitizes corrupted daily history entries on startup.

- **Range button styling** — The 7d/30d/90d/All range buttons in Writing History are now styled as text links with hover effects instead of bordered buttons, matching the rest of the UI.

- **Manuscript View** — A Scrivenings-style continuous document view that displays all scenes as a single scrollable manuscript in reading order (act → chapter → sequence). Each scene is an embedded Live Preview editor — full editing with all Obsidian formatting (bold, italic, links, etc.) works inline. Scenes are separated by subtle dividers with title and status badge. Includes act and chapter headings, filter support, word count footer, and clickable scene titles to open individual files. Access via the new Manuscript tab (📖) in the view switcher between Plotlines and Codex.

- **Manuscript: Plain Text toggle** — A toolbar toggle that hides wiki-link underlines/colors, tag `#` prefixes, and other markup decorations so the manuscript reads like clean prose. Both links and tags appear as ordinary text while the toggle is active.

- **Manuscript: Lock Links toggle** — A toolbar toggle that makes wiki-links and tags non-editable (atomic). The cursor skips over link/tag text so you can't accidentally break link targets while editing. Both toggles are on by default.

- **Scene Details Sidebar** — A standalone sidebar panel that shows the full Inspector for the currently active scene file. Open it from the **Scene Details** button in the Navigator, or via the command palette (`Open Scene Details Sidebar`). Auto-updates when you switch between scene files in the editor, so you can view and edit metadata side-by-side with your writing.

- **Additional Source Folders (Experimental)** — Point StoryLine at any folder in your vault and it will recursively scan all `.md` files, automatically routing each one to the correct manager based on its frontmatter `type:` field (scene, character, location, world, or any codex category). Supports any folder structure — no need to organize files by entity type. Configure under **Settings → Advanced → Additional Source Folders** with a folder browser and autocomplete. ⚠ Experimental — back up your files before linking external folders.

### Improvements

- **Internal links in scene cards** — `[[wikilinks]]` in scene card conflict fields and Plotgrid cells now render as clickable links instead of plain text. Click to open the linked note.

- **Navigator "Scene Details" button** — A new button in the Navigator sidebar opens the Scene Details panel in the right sidebar with one click.

### Bug Fixes

- **Sequence renumbering on drag-reorder** — Fixed a bug where dragging a scene card to a new position in the Board view could produce inconsistent sequence numbers (e.g., 02-01, 02-02, 02-06). The algorithm now builds the correct insertion order first, then assigns clean 1..N sequences.

- **Corkboard double-click** — Fixed an issue where double-clicking a scene card on the corkboard did not open the scene file. The pointer capture used for drag was suppressing native click events.

---

## Version 1.5.0

### New Features

- **Codex Hub** — Characters and Locations now live inside a unified **Codex** view with tab-based navigation. Add your own custom categories (e.g., Props, Factions, Magic Systems) — each category gets its own folder, search, and detail pages. The Codex replaces the separate Characters and Locations tabs with a single, extensible hub.

- **Plotgrid Auto-Note** — Typing into an empty, unlinked Plotgrid cell now automatically creates a corkboard note and links it back to the cell. The note is created as an *idea* with a plotgrid-origin label (row / column) for easy tracking. Enabled by default; toggle on or off from the Plotgrid toolbar.

### Design Overhaul

The entire UI has been refined for a cleaner, less cluttered look:

- **Minimal tab navigation** — View mode toggles (Corkboard/Kanban, List/Subway, Grid/Map/Story Graph) now use a clean underline-tab style instead of bordered buttons.
- **Icon-only action buttons** — "New Character", "New World", and "New Location" buttons have been replaced with compact icon-only buttons with tooltips, freeing up toolbar space.
- **Streamlined toolbars** — Toolbar gaps and spacing have been tightened across all views for a more compact layout. 

### Improvements

- **Codex folder structure** — New projects now store Characters and Locations inside a `Codex/` folder. Existing projects with the old folder layout are detected and work without changes.
- **Codex search** — The Codex hub search now includes Characters, Locations, and any custom categories in its results.

### Bug Fixes

- **YAML frontmatter corruption** — Fixed an issue where invisible characters (zero-width non-joiners, byte order marks) could be inserted into frontmatter, breaking YAML parsing. All frontmatter is now sanitized on read and write.
- **Kanban rubber-banding** — Fixed an issue where Kanban columns could snap back after dragging if the underlying data hadn't finished saving.
- **Relationship Map scaling** — Fixed a rendering issue where the relationship map could appear at the wrong scale after switching views.
- **Story Graph scaling** — Fixed a similar scaling issue in the story graph visualization.
- **Location portrait layout** — Location detail portraits are now styled consistently with character portraits.
- **Codex hub category reset** — Fixed the category tabs sometimes resetting to the first tab when switching back to the hub.
- **Plotgrid left padding** — Fixed the first column in the Plot Grid being too close to the edge.

---

## Version 1.4.0

### New Features

- **Custom Field Templates** — Define your own reusable fields for character and location profiles. Add any fields you need beyond the built-in ones and they'll appear in every character or location editor.

- **Image Gallery** — Characters and locations now support a full image gallery (up to 10 images each) with a carousel, editable captions, and a floating lightbox viewer you can resize and drag around. Great for reference art, concept images, or mood boards.

- **Resizable Text Blocks** — All text fields in character and location detail views can now be resized by dragging the corner. No more squinting at tiny boxes.

- **Autocomplete & Tag Inputs** — Character, location, and tag fields now use autocomplete with a tag-pill style instead of plain text inputs. Start typing and pick from existing entries.

- **Chapter Titles & Descriptions** — Acts and chapters can now have descriptions in addition to labels. Right-click any act or chapter column header in the Board view and choose "Edit Description" to add notes about that section of your story. Descriptions appear as subtitles under column headers.

### Plotgrid Improvements

- **Act & Chapter Dividers** — The grid now shows colored divider bands when the act or chapter changes, with labels from your project structure. Makes it easy to see where story sections begin and end.

- **Status Color-Coding** — Scene rows show a colored left border matching their status (idea, outlined, draft, written, revised, final) so you can see progress at a glance.

- **Click to Open Files** — Click any scene row header to open its file. Click a column header to open the character or location file. Quick way to jump to your notes while working in the grid.

- **Shared Filters** — The Plotgrid now uses the same filter bar as the Board and Timeline views. Filter by status, act, chapter, POV, characters, locations, tags, or search text. Presets are shared across all views.

- **Tabbed Cell Inspector** — When a cell has a linked scene, the inspector panel now shows two tabs: **Cell** (cell content, detected links, and scan results) and **Scene** (the full scene editor with all fields). Switch between them to edit cell notes or scene details without leaving the grid.

### Improvements

- **Files open in preview mode** — Clicking to open a scene, character, or location file from anywhere in StoryLine now opens it in reading view by default, keeping frontmatter out of sight.

### Bug Fixes

- **POV dropdown staying open** — Fixed an issue where the POV autocomplete dropdown would keep reopening after being dismissed on empty fields.

- **Autocomplete cleanup** — Fixed a memory issue where autocomplete dropdowns weren't being properly cleaned up when fields were re-rendered.

---

## Version 1.3.2

### New Features

- **Story Navigator** — A compact sidebar panel for quick scene navigation. Search and filter scenes by title, sort by five modes (sequence, status, recent, words, title), filter by plotline with color-coded dots and scene counts, group by act with collapsible sections, pin scenes for quick access, and track progress with a bottom bar. Auto-opens when a project loads (configurable in settings) or via the command palette.

- **Sticky Note Themes** — Six built-in color themes for corkboard sticky notes: Classic, Pastel, Earth, Jewel, Neon, and Mono. Each provides 14 colors. Includes HSL sliders (hue shift, saturation, lightness) for fine-tuning and per-note color overrides via right-click.

- **Plotline HSL Sliders** — Fine-tune your entire plotline color palette with hue shift, saturation, and lightness sliders. Real-time swatch preview. Adjustments stack on top of the active scheme and per-tag overrides.

- **Per-Project Color Overrides** — Optionally save color scheme, HSL adjustments, and sticky note theme per project. Toggle "Use project-specific colors" in settings so each book can have its own look. Settings are stored in the project's `System/plotlines.json` and load automatically when switching projects.

### Improvements

- **Corkboard smoothness** — Improved drag performance with `requestAnimationFrame`, added inertia on release, and smoother zoom transitions.

- 

### Bug Fixes

- **Scene split placement** — Split scene now correctly preserves the sequence number for the first half instead of overwriting it. It also places the second split half under the first instead of at the end.

---

## Version 1.3.1

Version 1.3.1 fixes:

**Cascade Rename**
Renaming a character or location now updates all references across the project, with a confirmation modal.

**PlotGrid Editing**
Inspector textarea edits no longer get wiped by grid re-renders. Headers are also protected while editing.

**Family/Background Field**
Moved from "Basic Information" to the "Relationships" section in character view.

**Character Tagline Setting**
New setting to choose which field appears as the tagline on character cards.

**Scene Deselect on Save**
Selected scene stays selected after saving/refreshing in Board and Timeline views.

**Scene Rename in Inspector**
Editing a scene title in the inspector no longer causes the inspector to re-render mid-typing.

**Larger Textareas**
Description and Conflict fields increased from 4/2 rows to 12 rows each.
*Note that right clicking on a scene and choosing edit will open the scene and you can type as much as you like.*

**Split Scene Fix**
Split no longer deletes the first half. The split button was accidentally calling the delete handler instead of a refresh.

**More options for Location types.**

## Version 1.3.0

> **⚠️ Important — Back up your StoryLine folder before updating!**
> 
> This release includes a one-time automatic migration that moves per-project settings out of the shared `data.json` file and into individual `System/` files inside each project folder. This is a necessary change to make StoryLine work reliably across multiple devices (desktop, mobile, sync services).
> 
> The migration runs automatically on first launch and should be seamless, but as a precaution, **please make a copy of your entire `StoryLine/` folder** before installing version 1.3.0 — just in case something goes wrong.

### New Features

- **Corkboard View** — A new freeform corkboard layout in the Board view. Use sticky notes to brainstorm and capture your first ideas, then convert them into scenes when they're ready. Notes can be styled with different colors and support markdown. Pin notes and scene cards anywhere on a spatial canvas and drag them to rearrange. Toggle between the standard column layout Kanban and corkboard mode with a single click. Positions are saved per project.

- **DOCX Export** — Export your manuscript or outline as a `.docx` Word document, ready for editors, agents, or print formatting. Includes its own settings for page size, margins, font, and header styles. Works also on mobile.

- **PDF Export** — Export your project directly to PDF with styled formatting and section headers. Works on desktop via the built-in print engine. PDF export only works on desktop.

- **HTML Export** — Full HTML export with embedded styles for sharing or archiving your project as a standalone web page.

- **Browse for Project** — A new "Browse for Project…" button in the project selector lets you manually find and open any StoryLine project in your vault, including deeply nested series projects. Useful when projects aren't detected automatically (e.g. on mobile or after a fresh sync).

### Improvements

- **System file architecture** — Per-project data (tag colors, character aliases, plotgrid layout, corkboard positions, writing tracker history, filter presets) is now stored in `System/` JSON files inside each project folder instead of the shared plugin `data.json`. This eliminates sync conflicts when working across multiple devices and keeps project data portable.

- **Automatic migration** — On first launch, existing per-project data is automatically migrated from `data.json` to the new `System/` files. No manual steps required.

- **Project detection retry** — If no projects are found on startup (common on mobile where the file system may load slowly), StoryLine now retries up to three times with increasing delays before showing the project selector.

- **Recursive project scanning** — Project detection now scans subfolders recursively, so series projects nested several levels deep (e.g. `StoryLine/My Series/Book 1/Book 1.md`) are found automatically.

- **Default view setting** — Choose which view opens by default when launching StoryLine. Set your preferred starting view (Board, Timeline, Characters, etc.) in the plugin settings.

### Bug Fixes

- **Dropdown background fix** — Fixed a visual bug where dropdown menus (status, POV, filters) had transparent or incorrectly themed backgrounds, making them hard to read in certain themes.

- **Corkboard positions no longer stored in frontmatter** — Board positions are now saved in `System/board.json` instead of the project file's YAML frontmatter, preventing unnecessary file changes and sync noise.

- **Feature flags preserved during migration** — Global settings like series mode and export toggles are no longer accidentally removed when migrating per-project data.

- **Migration timing fix** — Resolved a race condition where settings could be saved before migration data was fully loaded into memory, which previously caused tag overrides and other project data to be lost.

---
