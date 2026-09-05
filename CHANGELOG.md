# StoryLine — Changelog

## Support StoryLine

If StoryLine helps your writing, please consider buying me a coffee. Donations keep the plugin actively maintained.

[![Donate with PayPal](https://www.paypalobjects.com/en_US/i/btn/btn_donate_LG.gif)](https://www.paypal.com/donate?hosted_button_id=A2N2LE7EUBL3A)

## Version 1.10.66

### Bug Fixes

- **fflate security update** — Upgraded `fflate` to `0.8.3`, outside the vulnerable range identified in [GHSA-px8p-9vwx-vf98](https://github.com/advisories/GHSA-px8p-9vwx-vf98).

## Version 1.10.65

### New Features

- **Japanese quotation styles** — Added corner brackets `「text」` and white corner brackets `『text』` to the quotation style options used by dialogue input and statistics.
- **Visual Codex groups** — Create and name display-only groups for Characters, Locations, and custom Codex categories. Assign entries from dropdowns, drag entries into bordered group areas, reorder entries within groups, and drag group headers to reorder the groups themselves. Empty groups remain available as drop zones. Grouping does not move files or change entry frontmatter.
- **Per-project group persistence** — Visual group membership, entry order, and group order are saved with project system data and restored when the project is reopened.

### Bug Fixes

- **Safer project data migration** *([#262](https://github.com/PixeroJan/obsidian-storyline/issues/262))* — Existing usable data in legacy project JSON files, including `board.json`, is preserved when System files already exist but are empty or invalid.
- **Scroll position restoration** *([#263](https://github.com/PixeroJan/obsidian-storyline/issues/263))* — StoryLine view scroll positions are restored after asynchronous refreshes caused by project and scene updates.

### Documentation

- Added Help guidance for creating visual groups, assigning entries, dragging entries, and reordering group headers in Characters, Locations, and Codex.
- Added an implementation record documenting visual grouping, persistence, ordering, quote styles, and the related data-safety and refresh fixes.

## Version 1.10.64

### Bug Fixes

- **Count unit now applies to Navigator and Stats** *([#259](https://github.com/PixeroJan/obsidian-storyline/issues/259))* — Navigator scene lengths and sorting, plus Stats scene-length totals and analyses, now use `charcount` and character labels when **Characters** is selected. Word-based writing-session metrics and goals remain word-based. Affects `services/SceneQueryService.ts`, `views/NavigatorView.ts`, and `views/StatsView.ts`.

## Version 1.10.63

### Bug Fixes

- **Character relations and sorting** — Custom relations no longer revert to sibling, Deuteragonist sorts correctly, and the selected character sort is remembered.

## Version 1.10.62

### Improvements

- **Automatic quotation marks** — Added an option to automatically replace typed double quotes with the selected quote style.
- **Reorganized settings** — Related settings are now grouped and ordered to make them easier to find.

### Bug Fixes

- **Empty book folders are removed after creating a series** — The original book folder is now checked and removed after its contents have been moved into the new series folder, while non-empty folders are preserved.

## Version 1.10.61

### Bug Fixes

- **Dialogue counting no longer treats apostrophes as quotation marks** — Apostrophes inside words, such as `don't`, `James's`, and their curly equivalent, are ignored when counting dialogue. Genuine single-quote dialogue remains supported.

## Version 1.10.60

### New Features

- **Custom Character Roles** — The Character Role field now provides a built-in role dropdown with a final **Custom role...** option for entering one or more custom roles.
- **Directional relationships** — Character relation rows now include a checked-by-default **Two-way relationship** checkbox. One-way relations do not create reciprocal entries and are shown with arrows in the Relationship Map and Story Graph.
- **Relationship history** — Character profiles can record repeated relationship periods in a separate history section. Each period supports a role, target, two-way setting, scene range, or date/time range. Scene endpoints use ordered scene dropdowns with a **Custom scene...** fallback.

### Documentation

- **Character relationships and history** — Help now documents two-way and one-way relations, directional graph arrows, repeated relationship periods, scene/date anchors, custom scenes, and custom Character Roles.
- **Help PDF export** — The Help view now has a `PDF` button that creates an A4-formatted PDF in the vault root. The PDF includes the current StoryLine version and generation date so users can identify outdated copies.

## Version 1.10.59

### Bug Fixes

- **Dialogue statistics support all configured quotation styles** *([#254](https://github.com/PixeroJan/obsidian-storyline/issues/254))* — Made dialogue counting use only the selected quotation pair, preventing narration from being counted as dialogue when multiple quote conventions appear in a manuscript.
- **Custom Codex categories persist across books in a series** *([#253](https://github.com/PixeroJan/obsidian-storyline/issues/253))* — Series books now share their custom category definitions and enabled category list, while unrelated projects retain separate settings.

## Version 1.10.58

### New Features

- **Scene and chapter range exports** *([#251](https://github.com/PixeroJan/obsidian-storyline/issues/251))* — The Export dialog can now export selected scene sequence numbers or chapter numbers using comma-separated single values and inclusive ranges, such as `1-5, 8, 9, 11, 13-18` or `1-4, 6, 8`. The selection applies across Markdown, Word, PDF, HTML, CSV, and JSON exports, with invalid input rejected before export.
- **Default status order in Kanban** *([#252](https://github.com/PixeroJan/obsidian-storyline/issues/252))* — Kanban columns grouped by Status now follow StoryLine's built-in progression (`Idea`, `Outlined`, `Draft`, `Written`, `Revised`, `Final`) followed by custom statuses, instead of alphabetical order.

## Version 1.10.57

### Bug Fixes

- **Release builds and LocationView lint cleanups** — Fixed the manual release workflow's BOM-sensitive `versions.json` parsing and removed an accidental location render call that caused unsafe-value warnings during linting.

## Version 1.10.56

### New Features

- **Stable book and series identities** — New projects receive UUID-based book identities, while series metadata now supports stable UUIDs and ordered book IDs alongside the existing folder-name fields. Existing projects and series are upgraded automatically without breaking legacy metadata or links.
- **Quotation mark styles** — Added configurable quotation mark styles for dialogue input and dialogue statistics, including straight quotes, curly quotes, guillemets, and corner brackets.
- **Manual Codex sorting** — Characters and locations can be manually ordered with persistent drag-and-drop sorting. Location hierarchy and reparenting remain supported.

### Bug Fixes

- **Legacy series membership recovery** — Older books nested inside a series folder are recovered from a validated `series.json` `bookOrder` entry even when their frontmatter lacks a series identifier.
- **Book renames no longer move files** — Renaming a book changes its display title only; its folder, filename, and existing links remain unchanged.
- **Series display-name renames are non-destructive** — Renaming a series updates its metadata name without renaming the folder or cascading changes through its books.
- **Location hierarchy duplicates** — Locations with unresolved or legacy parent references no longer render as duplicate roots or orphan entries.
- **Scene notes refresh correctly** — Scene note folders are created when needed, and open StoryLine views refresh after notes are written.

## Version 1.10.55

### Bug Fixes

- **Build output now matches the released main.js artifact** — The committed `package-lock.json` was pinned to `1.10.42` while `package.json` had advanced to `1.10.54`, so the Obsidian community scanner's clean-room rebuild (via `npm ci`) resolved a different dependency tree than the one used to build the uploaded `main.js`, producing a byte-different artifact and triggering the "Build output does not match" warning. The lockfile is now regenerated from the current `package.json` so `npm ci` reproduces the exact release build. Affects `package-lock.json`.

## Version 1.10.54

### Bug Fixes

- **System JSON writes no longer trigger a recurring autosave loop** *([#242](https://github.com/PixeroJan/obsidian-storyline/issues/242))* — After StoryLine wrote its project `System/*.json` files, those writes emitted new vault `modify` events that re-armed `scheduleWritingStatsSave()`, rewriting the four System JSON files roughly every 60 seconds while Obsidian sat idle. The vault `modify` handler now skips files under the active project's `System/` folder before scheduling a writing-stats save, so the plugin's own writes can't feed back into the timer. `writeSystemJson()` additionally compares the serialized JSON with the existing file contents and skips the write when they're identical, so the 5-minute safety-net interval (from #238) no longer rewrites unchanged files. Affects `main.ts`.

- **Character count setting now applies to the Manuscript view** *([#240](https://github.com/PixeroJan/obsidian-storyline/issues/240))* — With the "Default project language" set to a CJK locale and "Count unit for scene lengths" set to Characters, the Manuscript view footer still calculated and displayed words. The footer (both the initial render and the live `updateFooter` refresh) now honours `settings.countUnit`, summing `charcount` and labelling the result `chars` when the unit is `chars` — consistent with the Board, Timeline, and Stats views. Affects `views/ManuscriptView.ts`.

- **Em dash (`—`) no longer counted as a word** *([#243](https://github.com/PixeroJan/obsidian-storyline/issues/243))* — `tokenizeWords` split on whitespace and kept every non-empty token, so a standalone em dash (commonly used to mark dialogue) was counted as a word, inflating scene word counts relative to Obsidian's native counter. Tokens now must contain at least one letter or digit (`/\p{L}|\p{N}/u`), matching Obsidian's behaviour. This affected every view and the persisted frontmatter word count, not just the Manuscript view. Affects `utils/locale.ts`.

## Version 1.10.53

### Bug Fixes

- **Duplicate Prologue / Epilogue columns in Kanban** *([#239](https://github.com/PixeroJan/obsidian-storyline/issues/239))* — When a project had act `0` (Prologue) or act `99` (Epilogue) in its defined acts — which happens as soon as any scene stores its act as the number `0` or `99`, or the project's `definedActs` array contains them — the Kanban board rendered two separate columns for each: an empty `Act 0` / `Act 99` column (created from `definedActs`) and the real `Prologue` / `Epilogue` column holding the scenes (created from `getActDisplayLabel`). Numbered acts (1–98) were unaffected because both code paths produced the same `Act N` key. The empty-column key is now built with `getActDisplayLabel` so Prologue/Epilogue merge with their scene column instead of spawning a parallel `Act 0` / `Act 99` column. Affects `services/SceneQueryService.ts`.

## Version 1.10.52

### Bug Fixes

- **Lint cleanup — unsafe `any` assignments in settings UI** — The default PoV character picker used `this.plugin.characterManager?.getAll?.()`, where the double optional chaining (`?.getAll?.()`) made TypeScript treat the result as `any`, triggering `no-unsafe-assignment`, `no-unsafe-call`, `no-unsafe-return`, and `no-unsafe-member-access` warnings. Changed to `this.plugin.characterManager?.getAllCharacters()` — `characterManager` is typed `CharacterManager` (definite assignment), and `getAllCharacters()` returns `Character[]`, so the whole chain is now properly typed.
- **Lint cleanup — unsafe call in plotline description modal** — `setting.controlEl.createEl('textarea')` returns `HTMLElement` (Obsidian's `createEl` overload doesn't narrow to `HTMLTextAreaElement` for the string-tag form), so `ta.setValue(desc)` was an unsafe call on a loosely-typed object. Added an explicit `as HTMLTextAreaElement` cast, matching the standard pattern used elsewhere in the codebase for `createEl('textarea')` / `createEl('select')` / `createEl('input')`.

> **Note on `getSettingDefinitions()`** — The `PluginSettingTab` does not yet implement Obsidian 1.13.0+'s declarative settings API, so StoryLine's settings won't appear in Obsidian's global settings search on 1.13.0+. This is tracked as a future enhancement; the entire settings tab uses the imperative `new Setting(...)` pattern with hundreds of controls and adopting the declarative API is a large refactor that is out of scope for this patch release.

## Version 1.10.51

### Bug Fixes

- **Timeline drag-and-drop no longer scrolls to the top (regression)** — Reordering scenes by drag-and-drop in the Timeline view, and creating a new scene via Quick Add, used to reset the scroll position to the top of the list, making it nearly impossible to work with projects that have 100+ scenes. The 1.10.43 fix moved the scroll restore into a second `requestAnimationFrame`, but with large lists the browser frequently hadn't finished laying out the rebuilt DOM by that frame, so `scrollTop` was set before the content reached its final height and the browser then reset scroll to 0 once layout completed. There was also a typo (`scrollEl.left` instead of `scrollEl.scrollLeft`) that meant the horizontal scroll position was never saved. The restore now runs three times — immediately, on the next rAF, and after a 50ms timeout — so whichever runs after layout completes wins. The Quick Add "scroll to new scene" logic got the same robust retry. Affects `views/TimelineView.ts`.

- **Writing stats no longer lost on crash / force-quit** *([#238](https://github.com/PixeroJan/obsidian-storyline/issues/238))* — Writing history was flushed only on plugin unload, and the unload path swallowed any save error silently. If Obsidian crashed, was force-quit, or the unload handler threw, the entire session's words were lost. Stats now autosave on a 60-second debounce after every scene edit, with a 5-minute safety-net interval, and the final unload flush surfaces errors to the console instead of swallowing them. `flushSession` also gained a lazy-start fallback so a session that began before the scene scan completed still records words.

- **Over-aggressive stats sanitisation relaxed** *([#238](https://github.com/PixeroJan/obsidian-storyline/issues/238))* — `startSession` previously deleted today's history entry if it was ≥ 50% of the project's total word count, which wiped legitimate data for small/early-stage projects where a single productive day can easily exceed half the manuscript. The threshold is now ≥ 90% **and** more than 10,000 words, so only genuinely corrupted entries (from the old 0-baseline bug) are cleared.

- **Story Graph no longer jitters on large graphs** — The force-directed layout used constant force magnitudes for all 350 ticks with no cooling and no collision detection, so high-degree hubs were pulled in conflicting directions and never settled. The simulation now uses an alpha-decay cooling schedule (d3-force-style), collision detection between nodes, velocity capping, and higher damping (0.88) so the graph settles smoothly even with many connections.

- **Multi-select empty-form gap removed** — Custom multi-select fields (in character, location, and codex editors, and in the scene Inspector) left a visible gap between the label and the input when no pills were present, making it unclear which label belonged to which input. The empty pills row now collapses entirely (`:empty { display: none }`) so the label sits directly above the input in empty forms.

### New Features

- **Plotline descriptions / notes** — Plotlines (tags) could only carry a name and a color; there was no way to annotate what a plotline is supposed to do. Each plotline now has an optional description/notes field (click the 📄 icon on a plotline header in list view). The description is shown under the header, carried over on rename, and removed on delete. Stored per-project in `System/plotlines.json`.

- **Default PoV character** — A new **Settings → Scene Cards → Default PoV character** picker auto-assigns a character as the PoV of every newly-created scene. Useful for single-PoV stories so you don't have to pick it each time. Leave blank to choose manually.

- **Drag-and-drop location hierarchy** — In the Locations view (Codex), you can now drag a location node and drop it onto another location (to reparent it) or onto a world (to move it into that world as a top-level location). Cycles are prevented automatically. This is a fast way to reorganise your hierarchy without opening each location's Hierarchy section.

- **Frequency-based suggestion sorting** — A new **Settings → Scene Cards → Sort suggestions by frequency** toggle makes character and location autocomplete suggestions in the Scene Inspector appear in order of how often each one is already used across your scenes (most-used first, then alphabetically). Off by default (alphabetical only).

### Documentation

- New **Linking & Matching** section in HELP explains the Type, Aliases, Case-sensitive matching, and Exclude terms fields and how the Link Scanner uses them.
- New **Reordering Fields & Sections** section documents the up/down chevron controls for reordering fields within a section and moving custom sections between slots.
- The **Arc Points** section now opens with a plain-language explanation of what an Arc Point is and a tip on how to categorise arc-point *types*.
- The **Plotlines View**, **Locations View**, **Scene Templates**, and **Story Graph** sections document the new features above.

## Version 1.10.50

### Bug Fixes

- **Linking & Matching fields now persist for Characters and Locations** *([#228](https://github.com/PixeroJan/obsidian-storyline/issues/228))* — The **Case-sensitive matching** toggle and **Exclude terms** field in the Linking & Matching section were written to the markdown files but reverted to their defaults (unchecked / empty) on reload. The Character and Location parsers built their in-memory objects field-by-field and omitted the three linking fields (`entryType`, `caseSensitive`, `excludeTerms`), so the values were dropped on read-back even though they were still in the frontmatter. The parsers now read these fields back (with `caseSensitive` coerced to a boolean), so the toggle and exclude terms survive a reload round-trip. Codex entries were unaffected — their parser uses a generic field-key loop that already included the linking keys.

## Version 1.10.49

### Bug Fixes

- **Case-sensitive matching now works correctly for Characters and Locations** *([#228](https://github.com/PixeroJan/obsidian-storyline/issues/228))* — The Linking & Matching section's **Case-sensitive matching** toggle was exactly backwards: it matched the *lowercased* name instead of the *original-cased* name. A character named "Dust" with case-sensitive matching enabled would match the common word "dust" (lowercase) but *not* "Dust" (the actual character name) — tagging the character in every chapter with the word "dust" and missing chapters where "Dust" was actually written. The scanner now keeps a map of original-cased names and tests those when case-sensitive matching is on, so "Dust" matches "Dust" and "dust" does not.

- **Auto first-name aliasing no longer fires for titles and descriptive phrases** *([#228](https://github.com/PixeroJan/obsidian-storyline/issues/228))* — The scanner automatically treats the first word of a character's name as an alias (e.g. "Anna" for "Anna Svensson"). This caused false positives for titles and descriptive phrases: a character named "Lady of Dreams" would auto-alias "Lady", tagging the character in every scene containing "Lady Margaret", "Lady Smith", or any "Lady [anything]". The auto-alias is now skipped when the first word is a common title (Lady, Lord, Sir, Dame, Captain, King, Queen, Doctor, Saint, etc.) or when the second word is a connector (of, the, de, von, van, etc.). "Lady of Dreams" now only matches the full phrase.

- **Exclude terms are now contextual, not whole-scene** *([#228](https://github.com/PixeroJan/obsidian-storyline/issues/228))* — The **Exclude terms** field previously checked whether the exclude term appeared *anywhere in the entire scene*. A single "Lady Margaret" anywhere would suppress all matches for "Lady of Dreams" — even legitimate mentions elsewhere in the same scene. The scanner now collects all match positions and checks exclude terms *per match*: a match is suppressed only if an exclude term overlaps or is adjacent to that specific match. If at least one match in the scene is clean, the entity is still tagged.

- **Hidden categories now work like hidden fields** — Hiding a category previously left its header (title + eye button) visible in the normal flow, making it look identical to a collapsed section. Hidden categories are now skipped entirely in the render loop and collected into a collapsible **"Show N hidden categories"** toggle at the bottom of the form — exactly mirroring how hidden fields work. When collapsed, no trace of the hidden categories is visible. Applies to Character, Codex, and Location views.

### New Features

- **Per-project isolation of custom sections, codex categories & location types** *([#236](https://github.com/PixeroJan/obsidian-storyline/issues/236))* — Custom sections (character, location, codex), codex category definitions, enabled codex categories, and custom location types were previously stored vault-wide in `data.json`, so they leaked across unrelated writing projects. A user writing an urban fantasy story who added a "Magic" custom section to character sheets would see that section in every other project too. These settings now live in a per-project `System/custom-sections.json` file, following the same pattern as the existing per-project storage (`plotlines.json`, `characters.json`, etc.). Existing users' settings are migrated transparently on first load.

- **Shift dates for multiple scenes in Timeline view** *([#237](https://github.com/PixeroJan/obsidian-storyline/issues/237))* — Timeline view now supports multi-selection (ctrl/cmd-click) and a **"Shift dates"** action in the right-click menu. A modal offers two modes: **"Start on a new date"** (set a new date/time for the earliest selected scene; the delta is applied to all others, preserving gaps) or **"Move by a set amount"** (shift all selected scenes by a signed number of days/weeks/hours/minutes). A live preview shows each scene's current → new date/time before applying. Only `storyDate` and `storyTime` are written; sequence, act, chapter, and chronological order are untouched. All writes go through the normal scene update path (individually undoable).

## Version 1.10.48

### Bug Fixes

- **Core Properties sidebar no longer blank when StoryLine is enabled** *([#232](https://github.com/PixeroJan/obsidian-storyline/issues/232), [#230](https://github.com/PixeroJan/obsidian-storyline/discussions/230))* — When the "Hide frontmatter" setting was on, Obsidian's built-in **Properties** sidebar pane went completely blank for any file inside the StoryLine root (and stayed blank after creating a Series). The per-leaf `sl-hide-frontmatter` class was being applied to *any* leaf whose `view.file` pointed at a StoryLine file — but Obsidian's core Properties pane also tracks the active file via `view.file`, so it got tagged and its `.metadata-container` was hidden by CSS. The class is now applied only to markdown editor leaves (`viewType === 'markdown'`); StoryLine's own custom views remain covered by the body-level class and the `[data-type^="story-line-"]` CSS rule.

- **Timeline no longer reports false "31-day gap" / out-of-order warnings** *([#233](https://github.com/PixeroJan/obsidian-storyline/discussions/233))* — Scenes labelled with ordinal day markers like "Day 1" and "Day 2" triggered spurious "31-day gap without a timeskip marker" warnings and false out-of-order errors. V8's `Date.parse("Day 1")` returns `2000-12-31` and `Date.parse("Day 2")` returns `2001-01-31` — a 31-day gap — and the fallback `Date.parse()` in `Validator.parseStoryDate()` accepted these as real calendar dates. `parseStoryDate()` now only calls `Date.parse()` for strings that match real calendar-date patterns (ISO `YYYY-MM-DD`, numeric `YYYY/MM/DD`, or month-name formats); ordinal markers return `null` and are skipped. `checkDateOrderForGroup()` also stopped using naive string comparison (where `"Day 10" < "Day 2"` is `true`) and now compares parsed dates when possible.

- **Plotline colour picker no longer closes on every input** *([#234](https://github.com/PixeroJan/obsidian-storyline/issues/234))* — Typing a single digit into the RGB boxes or dragging the visual colour picker immediately closed the plotline colour customiser, making it nearly impossible to enter a precise colour. The `input` event handler called `this.refresh()`, which re-rendered the entire view and destroyed the colour input mid-edit. The `input` event now only persists the value without re-rendering; the `change` event (fired when the picker is dismissed/committed) triggers the full refresh.

- **Hidden fields and categories now reachable on mobile** *(Reddit request #4)* — The per-field hide/move buttons and the new hide-category button use `opacity: 0` + `:hover` to stay out of the way on desktop. Touch devices have no hover, so the buttons were invisible and unreachable — users couldn't hide fields, and hidden fields appeared because the toggle was inaccessible. These buttons are now always visible at reduced opacity on mobile (`.sl-mobile`).

### New Features

- **Custom fields can be used as the character card tagline** *(Reddit request #1)* — The tagline dropdown on the character sheet now lists universal (custom) fields alongside the built-in fields, so you can pick any custom field as the snippet shown on character cards. Custom-field tagline keys are stored with an `uf:` prefix to avoid colliding with built-in field keys, and card rendering resolves them via `char.universalFields`.

- **Custom relations can be assigned to an existing category** *(Reddit request #2)* — When defining a custom relation type (e.g. "mate"), a category dropdown now appears next to the type input, letting you assign it to any existing category (e.g. "romantic") so the Character Map view groups and colours it correctly. Previously every custom relation was forced into the generic "custom" bucket. The Relationship Map automatically renders the edge using the chosen category's base type via `RELATION_BASE_TYPE_BY_CATEGORY`.

- **Hide entire categories at once** *(Reddit request #3)* — A new eye/eye-off button on each section header in the Character, Codex, and Location views lets you hide a whole category in one click, instead of hiding each field individually. Hidden categories show only their header (with the eye button) so you can un-hide them later. The setting is stored in a new `hiddenCategories: Record<string, string[]>` field and round-trips through `data.json`.

## Version 1.10.47

### Bug Fixes

- **Mobile: Codex/Character/Location detail forms no longer blank out when editing** — on iOS/iPadOS, tapping a field near the bottom of a Codex (Locations/Items), Character, or Location detail form could make the whole content area blank out when the soft keyboard appeared. The root cause was conflicting CSS that set the view containers to `100dvh` and then back to `100%`, causing layout thrash when the keyboard changed the dynamic viewport height. The `100dvh` sizing is now applied only to the inspector bottom-sheet panels; the view containers always stay at `100%` of their leaf so their flex children (toolbar + scroll area) keep their pinned toolbar. The detail content areas also now explicitly use `flex: 1 1 auto; min-height: 0; overflow-y: auto` so only the content scrolls, not the toolbar. *(Issue #190)*

- **Mobile: toolbar stays pinned to the top while scrolling** — a strip of scrolling content could appear above the sticky toolbar on mobile because the `::before` overlay that covers the gap above the toolbar was only 24px tall (sufficient on desktop, too short for iOS WebKit's visual-viewport offset behaviour). The overlay is now 60px on mobile, and the toolbar's z-index is raised so it stays painted above form fields. *(Issue #190)*

- **Mobile: corkboard note editing no longer pushes content under the toolbar depending on zoom** — `panCorkboardToRevealNote()` used a fixed 45%-of-viewport heuristic to reserve space for the keyboard, which over-scrolled when zoomed in (card larger than the safe zone) and under-scrolled when zoomed out, pushing the note under the toolbar. It now uses the actual keyboard height from the Visual Viewport API (`window.visualViewport`) so the note lands in the true visible region regardless of zoom level. *(Issue #190)*

## Version 1.10.46

### Bug Fixes

- **Plotgrid no longer loses linked scenes (data-loss fix)** — opening the Plotgrid view could silently clear every cell's linked scene, and the cleared state was then captured by View Snapshot auto-save, so restoring a previous snapshot didn't bring the links back either. The root cause was `repairLinkedScenePaths()` running on every view open *before* SceneManager had finished loading the project's scenes: with an empty scene list, every link was treated as "scene no longer exists" and wiped, then saved to disk. The repair pass is now async, waits for scenes to load, and bails entirely (touching nothing) if the scene list is still empty — it's safer to leave a stale link than to wipe a good one. Links are only cleared once the scene list is confirmed complete and the referenced file genuinely can't be found.

- **Manuscript view no longer flickers / refreshes in a loop** — scrolling the Manuscript view, clicking filters, or using the scene navigator could trigger a re-render loop where the manuscript section kept refreshing and the scene details sidebar flickered, making the view almost unusable. The root cause was a feedback loop: lazy-mounting an editor via `IntersectionObserver` called `leaf.openFile()`, which fired a vault `modify` event, which triggered `refreshOpenViews()` → `refresh()`, which tore down every embedded editor (including the one mid-mount) and re-rendered the whole manuscript — which could fire another modify event. Three fixes: (1) `refresh()` now bails when any editor mount is in flight (`_lazyMounting` flag), so an in-progress `openFile()` can't be torn down by the event it triggers; (2) `mountEditor()` captures a mount token and checks it after each `await`, bailing cleanly if `detachAllEmbedded()` ran in between instead of registering a detached leaf; (3) the focus-tracking `IntersectionObserver` that syncs the Inspector sidebar is now debounced (120 ms) so rapid scrolling no longer hammers the sidebar on every frame. Lazy loading is preserved — big projects still get the performance benefit.

- **Creating a second character/location no longer fails with "Folder already exists"** — on Linux (and occasionally other platforms) creating the first character worked but the second threw `Error: Folder already exists` and no entry was created. The cause was `ensureFolder()` using `getAbstractFileByPath()` (Obsidian's in-memory cache), which can lag behind the filesystem and report an existing folder as missing — `createFolder()` then threw because the folder already existed on disk. `CharacterManager` and `LocationManager` now use `vault.adapter.exists()` (the filesystem source of truth) and wrap `createFolder()` in a try/catch that treats an existing folder as success. *(Issue #227)*

- **Character × Chapter heatmap is no longer cut off** — with many chapters (~20+) the character heatmap in Stats → Characters & World overflowed the panel with no way to see the rest. The table is now wrapped in a scrollable container (`overflow-x/y: auto`, `max-height: 60vh`) and the character-name column is sticky so it stays visible while scrolling across chapters. *(Issue #229)*

### New Features

- **Linking & Matching section for Characters and Locations** — Characters and Locations now have the same **Linking & Matching** section at the bottom of their detail page that Codex entries already had: **Type** (a free-form sub-type badge), **Case-sensitive matching** (on/off toggle), and **Exclude terms** (comma-separated phrases that should NOT link to this entry). The **Aliases** field is intentionally omitted because Characters and Locations already expose a Nickname / Alias field in their Basic Information / Overview section, which the Link Scanner already reads as a comma-separated alias list. The Link Scanner now honours `caseSensitive` and `excludeTerms` for Characters, Locations, and Worlds — not just Codex entries — so plain-text mentions respect per-entity matching rules across every entity type. *(Issue #228)*

## Version 1.10.45

### Bug Fixes

- **Inserting a chapter no longer creates phantom duplicate chapters** — `SceneManager.insertChapter()` shifted every scene's `chapter:` field and the chapter labels/descriptions up by one, but forgot to shift the project's `definedChapters` list itself — it just appended the new chapter number. This left `definedChapters` with the original (pre-shift) numbers plus the new one, producing duplicates and gaps that surfaced as extra empty chapter columns appearing throughout the Kanban board (e.g. inserting Chapter 2 could also surface Chapters 3, 5, 7 as phantom columns). `definedChapters` is now shifted in lockstep with the scenes: every defined chapter `>= beforeChapter` is incremented by one before the new chapter number is inserted, and the result is deduped via a `Set` so corrupted state can't accumulate across repeated inserts.

- **Deleting a chapter now renumbers all subsequent chapters and their scenes** — right-clicking a chapter column header in the Kanban view and choosing **Delete chapter** (or using the × button in the *Manage Story Structure* modal on the Board / Timeline) used to only remove the number from the defined-chapters list, leaving every chapter above it with its original number and its scenes still marked with the old `chapter:` value (deleting Chapter 2 left Chapter 3 still numbered 3, with its scenes still tagged `chapter: 3`). This is the mirror of the 1.10.42 *Insert chapter* behaviour, so `SceneManager.removeChapter()` now shifts every chapter above the deleted one down by one — updating the defined-chapters list, chapter labels, chapter descriptions, and the `chapter:` frontmatter field of every scene in those chapters. The Kanban context-menu confirmation modal spells out what will be renumbered before you commit. Scenes that lived in the deleted chapter itself are cleared to unassigned, matching the previous behaviour. After the shift, the scene index is re-scanned from disk (via `SceneManager.initialize()`) so the Kanban columns and the *Manage Story Structure* modal both re-render with the new chapter numbers immediately.

- **Timeline drag-and-drop no longer scrolls to the top** — reordering scenes by drag-and-drop in the Timeline view used to reset the scroll position to the top of the list, making it nearly impossible to work with projects that have 100+ scenes. The root cause was a race condition: `handleDrop` saved the scroll position and called `refresh()`, but both tried to restore scroll in competing `requestAnimationFrame` callbacks — the restore ran before the rebuilt DOM had been laid out, so it had no effect. The fix removes the redundant scroll-restore from `handleDrop` and moves `refresh()`'s scroll restore into a *second* `requestAnimationFrame`, giving the browser time to lay out the new DOM before the scroll position is applied.

- **Echo Finder now shows all scenes instead of only the first 10** — the Echo Finder and Scene-specific Favourite Words sections were hard-capped at 10 scenes via `slice(0, 10)`, so users with 42+ chapters only saw a fraction of their results. Both sections now render all scenes inside a scrollable container (`max-height: 600px`) so every chapter is visible.

- **Most used words now includes all chapters and offers an "include all words" toggle** — the Prose Analysis word frequency was computed across all scenes, but stop-word filtering removed character names that happen to be common words (e.g. "Will", "May", "Rose", "Dawn"). A new **Exclude common words** checkbox (on by default) lets you toggle between the filtered view and a complete view that includes every word — character names and all — with accurate counts across all chapters.

- **iPad/iPhone scroll and cursor no longer jump when opening settings or switching tabs** — the `active-leaf-change` handler now skips all DOM work (toolbar injection, frontmatter visibility toggles) when the new active leaf is not a StoryLine scene file. Previously, opening settings, switching to a non-StoryLine tab, or opening/closing a sidebar triggered DOM mutations inside scroll containers that WebKit interprets as "new content at the top," resetting the scroll position and cursor to the first line. This also eliminates the conflict with the Typewriter plugin, which fought the scroll reset by re-centering the cursor. Additionally, `updateFrontmatterVisibility()` now caches its last-applied state and skips redundant DOM class toggles when nothing has changed. *(Issue #215)*

- Removed uses of raw `document.createElement` / `activeDocument.createElement` where an Obsidian `createEl`/`createDiv`/`createSvg` helper was appropriate (satisfies `obsidianmd/prefer-create-el`). Detached elements that must live outside their eventual parent (file inputs, floating menus, in-line inputs inserted via `insertBefore`, the Electron-only `<webview>` used by the PDF exporter) still use the DOM API with a scoped `eslint-disable-next-line` comment — standalone `createEl` is only a runtime export on Obsidian 1.13.0+ and StoryLine still supports 1.12.7.

## Version 1.10.42

### New Features

- **Insert Chapter anywhere in Kanban** — needing to insert a chapter between two others used to require moving every scene individually. You can now right-click a chapter column header in the Kanban view and choose **Insert Chapter Before** or **Insert Chapter After**; existing chapters (and their scenes, labels, and descriptions) are renumbered automatically to make room. A **+ New Chapter** button also appears in the Kanban toolbar when grouping by Chapter, which appends a new chapter at the end. Empty act and chapter containers now render as visible columns (with a drop zone and "+ Add Scene" button) even when they have no scenes, so you can drag scenes into them immediately. *(Issue #220)*

- **Toggle relationship types in the Relationship Map** — the colour-coded legend at the top of the relationship map is now interactive. Click any legend item (Ally, Enemy, Family, Romantic, Mentor, Other) to show or hide that relationship type, so you can focus on the connections that matter. Hidden types are dimmed in the legend and their edges are removed from the graph until you toggle them back on. *(Issue #222)*

- **Aliases, Type, and matching rules for all Codex categories** — every Codex category (Items, Creatures, Lore, Organizations, Culture, Systems, and custom categories) now has a shared **Linking & Matching** section with four fields: **Type** (a free-form sub-type label shown as a badge in the list), **Aliases** (comma-separated alternative names that also link to the entry), **Case-sensitive matching** (an on/off toggle), and **Exclude terms** (comma-separated phrases that should NOT be linked to the entry even if they contain its name). Previously only Characters had aliases; now any codex entry can use them. *(Issues #209, #223)*

- **Case-sensitive Codex entries and term exclusion** — coming from apps like NovelCrafter, writers with complex name-play (e.g. a character called "Saint" who should not match the common word "saint", or "Dawnguard Saint") can now toggle **Case-sensitive matching** on a per-entry basis so only the exact casing links, and list phrases in **Exclude terms** that suppress a match when they appear in the surrounding text. The Link Scanner respects both rules when scanning scene bodies for plain-text mentions. *(Issue #223)*

### Bug Fixes

- **Clicking an already-opened scene in the Navigator no longer opens a duplicate tab** — clicking a scene in the Navigator panel that was already open in a tab used to open a second tab for the same file, cluttering the workspace. The Navigator now checks for an existing open tab for that file and focuses it instead of opening a new one; it only opens a new tab when the file isn't already open. *(Issue #224)*

- **French (and other) non-breaking spaces no longer show as literal "&nbsp;" text** — French guillemets « » use a non-breaking space (U+00A0) that markdown-it HTML-encodes as the entity string `&nbsp;`. When that entity survived into a text node (in the mobile read-only manuscript preview and the corkboard note preview), it rendered as visible `&nbsp;` text instead of a space, producing output like `« Je ne sais pas… »bout`. The rendered DOM is now walked and any literal `&nbsp;` / `&#160;` / `&#xA0;` text is decoded back to a real non-breaking space. The DOCX export preprocessor also no longer collapses U+00A0 to a regular space, preserving French typography in exported documents. *(Issue #226)*

## Version 1.10.41

### Bug Fixes

- **Codex details no longer deletes content of notes moved to a custom category** — when a note with body content but no (or mismatched) frontmatter was moved into a custom Codex category folder, opening its details panel and then navigating back to "All [category]" wiped the note's body. The root cause was `extractBody()` returning an empty string for files without a frontmatter delimiter, so the body was treated as empty and overwritten on save. `extractBody()` now returns the full content when no frontmatter is present. *(Issue #221)*

- **Characters/Locations views no longer steal focus from the editor in split view** — in a split layout, typing in the manuscript editor triggered a file-modify refresh that re-rendered the Characters or Locations overview and auto-focused its search bar, yanking the cursor out of the editor mid-keystroke. The search input is now only re-focused when that view already had focus. *(Issue #221)*

- **Kanban board no longer auto-scrolls to the bottom with large columns** — columns with 40+ scene cards used a fixed estimated row height for the virtual scroller's spacer calculations. Because real cards vary in height (conflict snippets, POV, tags, etc.), the spacers drifted from the actual content height, so scrolling past ~10 cards caused the viewport to snap to the bottom (and vice versa). The virtual scroller now measures each rendered card's real height and uses the measured values for spacer and window calculations, keeping the scroll position stable. *(Issue #218)*

- **iPad/iPhone scroll no longer jumps when switching tabs or opening settings** — the previous fix (1.10.39) stopped the formatting toolbar from being re-inserted on refocus, but the toolbar was still torn down whenever a non-markdown leaf (Settings, a sidebar, another plugin's view) became active, and re-inserted on return — which WebKit treats as new content at the top and resets the scroll position. The toolbar is now left in place when the active leaf is not a markdown editor, so returning to the scene causes no DOM mutation. *(Issue #215 follow-up)*

## Version 1.10.40

### Bug Fixes

- **Beat sheet template list now visible on iPhone/Android** — further fix for issue #214. The custom flex-list container that rendered the beat sheet rows continued to collapse to zero height on mobile WebKit regardless of overflow settings, because it relied on an Obsidian modal layout that doesn't guarantee a computed height for its direct children. The list is now rendered as standard Obsidian `Setting` items (the same component used throughout the plugin's settings page), which are guaranteed to render at their natural height on all platforms. The expandable beat preview uses a native `<details>`/`<summary>` element. The "Create placeholder scenes" toggle moved below the template list so templates are immediately visible on small screens. Previous scroll-override hacks that caused the modal to open scrolled past the Beat Sheet section have been removed; a `scrollTop = 0` reset after `modal.open()` ensures the modal always opens at the top. *(Issue #214)*

## Version 1.10.39

### Bug Fixes

- **iPad/iPhone scroll position no longer jumps to the top on refocus** — switching back to an editor pane on iPad (e.g. after opening a sidebar and tapping back) caused the scroll position to jump to the first line, and a quick tap would accidentally select a large block of text. The root cause was StoryLine's formatting toolbar being removed from the DOM and re-inserted at the top of the editor container on every `active-leaf-change`, which WebKit interprets as new content appearing at the top of the scroll view. The toolbar is now only injected once per leaf; re-focusing the same leaf is a no-op and causes no DOM reflow. *(Issue #215)*

- **Beat sheet template list is now visible on phone / scrolls correctly on iPad** — the "Manage Story Structure" modal placed the "Create placeholder scenes" toggle above the template list, pushing the list below the fold on small screens where users might not realise they need to scroll. The list is now rendered first, immediately below the section heading, with the toggle below it. The modal also gains `-webkit-overflow-scrolling: touch` so it scrolls correctly on iOS/iPadOS. *(Issue #214)*

- **Setup/Payoff links no longer create blank Obsidian graph nodes** — when the *Store links as wikilinks* setting is on, setup/payoff (and character) values were written as `[[Scene Title]]`. Because scene files are named with a sequence prefix (`01-01 Opening Image.md`), Obsidian's graph could not resolve `[[Opening Image]]` to any file and created a blank orphan node for each entry. Values are now written as aliased wikilinks — `[[01-01 Opening Image|Opening Image]]` — so Obsidian's link resolver follows the file stem to the real file, while StoryLine's internal title-based lookup reads the alias and continues to work as before. Existing plain-text or plain-wikilink values are backward-compatible. *(Discussion #212)*

## Version 1.10.38

### New Features

- **Manuscript Plain Text toggle now remembers your last choice** — the Plain Text toolbar checkbox in the Manuscript view previously always reset to ON every time you opened the view or switched back to it. It now persists your last choice (ON or OFF) to localStorage, so the Manuscript view reopens exactly as you left it — across view switches and Obsidian restarts. First-time users still default to ON.

### Bug Fixes

- **Linked aliases now visible on character profiles** — using "Link to…" in the Characters view previously made the alias disappear as a separate entry, but there was no way to see which aliases pointed at a given character, nor to unlink one. The character side panel now shows a **Linked Aliases** section listing every alias mapped to that character, each with an **Unlink** button that removes the mapping and rebuilds the link scanner lookups. *(Issue #213)*

- **Tagged Codex entries now appear in Referenced By** — checking a Codex entry in the Scene Inspector saved the link to the scene's `codexLinks` frontmatter, but the connection was one-way: the Codex entry's "Referenced By" panel only scanned scene body text, so tagged entries that weren't also mentioned by name never showed up. The reverse-lookup (`buildEntityIndex()`) now also reads `scene.codexLinks`, so tagged entries appear in the Referenced By panel of the corresponding Codex entry, character, or location. *(Issue #213)*

- **Mobile keyboard / scroll handling improved** — on phones and tablets the soft-keyboard handler used a fixed 45% viewport reservation that over-scrolled when the keyboard was small or absent, causing content to peek above sticky toolbars and the editing row to blank out (Codex Locations/Items tabs, Scene Details). The handler now computes the actual keyboard height from the Visual Viewport API, debounces `resize`/`scroll` events (which previously fired continuously during keyboard animation and fought the user's scroll position), and removes the `scrollIntoView` fallback that could push content above sticky toolbars. *(Issue #190)*

- **Corkboard note editing no longer loses focus mid-edit** — editing a corkboard note triggered a save → cache-version bump → `refreshOpenViews()` → `BoardView.refresh()` → `renderBoard()` cycle that rebuilt all cards and destroyed the focused textarea, kicking the user out of the text box. The board now tracks the actively-edited note's file path and skips rebuilds (and column scroll-position restores) while that editor is focused, so the textarea survives the refresh. *(Issues #190, #211)*

- **VirtualScroller no longer kicks focus out of text boxes on scroll** — the scroller rebuilt its visible window on every scroll event by calling `contentEl.empty()`, which unmounted any focused input/textarea inside the window. It now tags each rendered item with its index and skips the rebuild when the focused element is still within the new visible window. *(Issue #211)*

## Version 1.10.37
## Version 1.10.36

### New Features

- **Custom font color for sticky notes** — sticky notes previously derived their text color automatically by darkening the note's background color, which produced low-contrast text on similarly-toned backgrounds (e.g. pale yellow text on a pale yellow note). You can now set an explicit font color in **Settings → Sticky Note Colors → Font Color**, with two independent buckets so a single global setting stays readable across both bright and dark notes:
  - **On light notes** — text color used on bright note backgrounds (defaults to black).
  - **On dark notes** — text color used on dark note backgrounds (defaults to white).

  The plugin uses the WCAG relative-luminance formula to decide which bucket applies to each note, so a bright yellow note and a dark violet note automatically get the right text color without any per-note configuration. Both buckets are also reachable from the corkboard note's right-click context menu (**Font Color: Light Notes…** / **Font Color: Dark Notes…** / **Font Color: Reset to Auto**). Leave a bucket on "Auto" to keep the historical background-derived behavior for that brightness. The setting round-trips through the per-project color system (`System/plotlines.json`) when **Use project-specific colors** is on. *(Issue #205)*

- **Cross-scene search & replace in Manuscript view** — Obsidian's built-in Ctrl+F search only works within a single editor, but the Manuscript view embeds a separate editor per scene, so finding or replacing a term (e.g. a character name) across the whole book wasn't possible. The Manuscript view now has its own search & replace panel that searches every scene in the current filter/sort scope — not just the mounted editors. Right-click inside a scene in the Manuscript view and choose **Find & replace in manuscript** (added to Obsidian's native editor context menu, so all the usual editor menu items remain available) to open the panel. Supports case-sensitive, whole-word, and regex matching; next/previous navigation (or Enter / Shift+Enter); replace current match; and replace all. Navigating to a match in an unmounted scene auto-mounts its editor and scrolls it into view. Replacements in unmounted scenes are written directly to disk via `SceneManager.updateScene()`. *(Issue #195)*

- **Scene separators in manuscript exports** — you can now insert a separator between scenes when exporting a manuscript to Markdown, Word, PDF, or HTML. Choose between a **Blank Line** (default, unchanged behaviour), **`* * *`** (centered asterisks), or a **Custom Separator** (any UTF-8 text, e.g. `~ ~ ~`). The setting lives in **Settings → Export & Import → Scene separator** and is also exposed per-export in the Export modal so you can override it without changing the global default. Separators are skipped at act and chapter boundaries, where a heading already provides visual separation. *(PR #174 by @spv2008, with adjustments.)*

  Implementation notes:
  - **Markdown exports emit plain text** (`* * *` or the custom string) rather than an HTML `<div>`, so the exported `.md` file stays portable across markdown consumers.
  - **HTML/PDF exports** wrap the separator in a styled `<div class="scene-separator">` (centered, 1.5em vertical margin).
  - **Word exports** render the separator as a centered paragraph with 240tw spacing before/after.
  - The original regex-based `decodeHtmlEntities` in `DocxConverter` is retained (the PR's `DOMParser` replacement was reverted for portability).

### Bug Fixes

- **Nested location selected via the Scene Inspector breadcrumb no longer writes the full path into the wikilink** — when a location has a parent (e.g. "America > New York"), selecting it from the Location field's autocomplete dropdown wrote the breadcrumb display text (`[[America > New York]]`) into the scene's `location:` frontmatter instead of the location's actual note name (`[[New York]]`). The result was an unresolved wikilink that matched no real note, so the scene didn't appear in the location's "Scenes Here" list. The `InlineSuggest` dropdown now stores the canonical value on each suggestion item and commits that value on keyboard selection (Enter/Tab), so the real note name is written regardless of how the suggestion was displayed. Mouse selection was already correct. *(Issue #191)*

- **No more red spell-check underlines in StoryLine's UI fields** — Obsidian's "Disable spell check" setting only applies to its own editor, so plugin-rendered form fields (Inspector inputs, modals, the FormattingToolbar, corkboard note editor, etc.) inherited the browser default and showed red underlines for users writing in languages like Vietnamese. StoryLine now sets `spellcheck="false"` on all of its own inputs, textareas, and contenteditables via a scoped MutationObserver, so dynamically added fields are covered too. The manuscript editor (CodeMirror / `.markdown-view`) is deliberately excluded, so your chosen Obsidian spell-check setting still applies there. *(Issue #189)*

- **Mobile display / soft-keyboard fixes** — on phones and tablets the bottom of the screen could disappear behind the soft keyboard when typing in the Codex, Scene Details sidebar, or Corkboard note editor, and the Board view toolbar overran the screen width (making the sidebar toggle unreachable and inducing horizontal scroll). The Timeline view had a similar overflow problem. StoryLine now installs a global mobile-only focus handler that uses the Visual Viewport API to scroll the focused field into the visible (above-keyboard) region whenever a StoryLine input, textarea, or contenteditable gains focus or the keyboard appears/resizes. The mobile CSS has also been reworked: containers use `100dvh` (with `vh` fallback) so the layout shrinks with the keyboard instead of being covered; the inspector bottom sheet, corkboard note textarea, and detail forms now cap their height and add bottom padding so the last field clears the keyboard; the Board toolbar and its controls wrap and scroll vertically on phones instead of overflowing horizontally; the view-switcher sits on its own line; and the Timeline swimlane and zoom controls wrap/scroll within bounds. Desktop rendering is untouched — all changes are scoped to `.sl-mobile` / `.sl-phone`. *(Issue #190)*

- **Codex field position ignored when adding/editing universal fields** — when adding a new universal field (Codex / Character / Location) and choosing a **Position** in the Add Field modal ("At top" or "After: \<sibling\>"), the chosen position was silently ignored and the field always landed at the end of the section. The same applied when editing an existing field and changing its position. The renderer reads the persisted `sectionOrders` map (an interleaved list of built-in + universal field keys), but `FieldTemplateService.moveAfter()` only shuffled the per-template `order` number, which `getMergedOrder()` ignores once a `sectionOrders` entry exists. `moveAfter()` now updates the `sectionOrders` map directly (same store the renderer reads from), and all six call sites in `CodexView`, `CharacterView`, and `LocationView` pass the section, category, and current built-in keys so the chosen position is honoured on the next render. *(Issue #197)*

- **Scene notes files no longer created eagerly on render** — opening a scene in the Inspector, InfoPanel, or Notes sidebar view used to create an empty `Title - Notes.md` file in `SceneNotes/` even if the user never wrote a note, so every browsed scene sprouted a notes file and the many concurrent creation entry points occasionally produced duplicates (`Title - Notes (1).md`). Notes files are now created **lazily**: render paths use a new read-only `SceneManager.getSceneNotesFile()` lookup that returns `undefined` when no file exists and fall back to the inline `scene.notes` frontmatter field; the file is only created when the user actually types something (blur-save / checkbox-toggle via `writeSceneNotes()`) or explicitly clicks a "Click to add notes…" / "Open notes file" button. The InfoPanel and NotesView now show a clickable placeholder when no notes file exists yet. *(Issue #200)*

- **Custom section field buttons now align correctly & multi-select fields show autocomplete suggestions** — in Codex/Character/Location custom sections, action buttons (edit/move/remove) were pushed to the bottom of the row (`align-items: flex-end`) while the label sat on top, creating a misaligned layout. Fixed by switching to `align-items: center` and making labels inline so label + input + buttons sit on one line. Additionally, multi-select (tag) fields with predefined options or folder sources now show an autocomplete dropdown as you type — previously options were silently validated only on Enter with no visual feedback that they existed. *(Issue #202)*

- **Projects created in a custom vault folder no longer get orphaned on reload** — when a project was created via the New Project modal with a **Location** set to a folder outside `storyLineRoot` (e.g. `Writing/Novels`), it was written to the correct folder, but on the next Obsidian restart `scanProjects()` could fail to rediscover it. The root scan only covers `storyLineRoot`, and the vault-wide discovery pass relies on `metadataCache.getFileCache()` to detect the `type: storyline` frontmatter — a cache that lags behind on mobile, with synced folders, or immediately after a file is created. When the saved `activeProjectFile` path wasn't found, `bootstrapProjects()` fell through to the "no projects found" branch and re-opened the New Project modal, so the user ended up with an orphaned, never-updated folder in their custom location plus a new project in the default root. `scanProjects()` now has a saved-active-project fallback: when the saved path exists on disk but wasn't picked up by either scan, it reads the file directly via `vault.adapter.read()` and parses it from its contents — bypassing the metadata cache entirely — so the project is always restored. *(Issue #207)*

## Version 1.10.35

### New Features

- **Delete projects and books** — StoryLine previously had no built-in way to delete a project, which meant deleted books kept reappearing in the Navigator because `SceneManager.scanProjects()` re-discovered any surviving `type: storyline` markdown file (in `.trash/` or restored by a sync plugin). There are now two ways to permanently delete a project, both with a type-to-confirm warning modal that lists everything that will be removed (scenes, codex, notes, research, settings, and series removal where applicable):
  - **Command palette → Delete current project** — trashes the active project's folder via Obsidian's `fileManager.trashFile()` (so your "Deleted files" setting is respected), removes it from `series.json` if it belongs to a series, switches to another project if the deleted one was active, and re-scans so the project map stays in sync.
  - **Manage Series modal → 🗑️ trash button per book** — each book row in the Manage Series modal now has a trash icon next to the existing "Remove from series" (`x`) button. It opens the same warning modal and calls the same `deleteProject()` logic, so you can delete any book in a series without first switching to it.

  The existing **Remove from series** (`x`) button is unchanged: it moves the book out of the series folder and keeps it as a standalone project, without deleting anything. *(Issue #185)*

### Bug Fixes

- **Setup / Payoff links stored as file paths no longer report false "scene doesn't exist" errors** — `setup_scenes` and `payoff_scenes` are matched by scene title, but `MetadataParser.cleanWikilink()` only stripped path prefixes from values wrapped in `[[...]]` wikilink brackets. Plain strings like `"MyProject/Scenes/Scene 10.md"` were returned unchanged and never matched a title, so the validator and Inspector warned that the target scene didn't exist even though the file was present. `cleanWikilink()` now normalises plain path/filename strings too: a new `stripPathAndExtension()` helper drops any folder prefix (forward or back slash) and a trailing `.md` extension, so `"MyProject/Scenes/Scene 10.md"` resolves to `"Scene 10"`. The same normalisation is applied to the inner text of wikilinks, so `[[Scene 10.md]]` also resolves. The HELP.md frontmatter table and Setup/Payoff section now recommend titles or wikilinks and note that paths are tolerated. *(Issue #186)*

## Version 1.10.34

### Bug Fixes

- **Consistent toolbar separator line across all Codex views** — The Characters view showed a thin horizontal separator line between the StoryLine toolbar and the content area, but the Locations and Codex (Items) views did not. The shared CSS variables that the toolbar's `border-bottom` depends on are now applied to the Location and Codex containers as well, so the separator appears consistently in all three views.
- **Wikilink section headers no longer parsed as tags** — A wikilink to a note section (e.g. `[[Test#Header]]`) in a Codex note body caused the word after the `#` to be interpreted as a `#tag`, showing up as a spurious tag on the codex item card and in the Story Graph. Wikilinks are now stripped from the text before tag extraction runs, matching the approach already used for plain-text name mention scanning.
- **Manuscript view scroll position now restores correctly** — The cursor position was restored when switching back to the Manuscript view, but the scroll position snapped to the top of the document and only returned to the saved position once the user started typing. After restoring the cursor, the view now uses `coordsAtPos()` to find the cursor's actual screen position and scrolls the outer container so the cursor is visible, regardless of how content height changed during editor mounting.

## Version 1.10.33

### Bug Fixes

- **Scene Snapshot no longer crashes when `notesFile` is undefined** — `SnapshotManager.saveSnapshot()` could throw `Cannot read properties of undefined (reading 'replace')` when a scene had no external notes file, because an unvalidated `undefined` value leaked into Obsidian APIs (`normalizePath`, `getAbstractFileByPath`, `stringifyYaml`) that assume a string. `MetadataParser.parseContent()` now normalizes `notesFile` (and other frontmatter string fields like `synopsis`, `storyDate`, `storyTime`, `corkboardNoteColor`, `plotgridOrigin`) through a single `normalizeFrontmatterString()` helper that coerces `undefined`/`null`/non-string YAML values to a safe `string | undefined`. `SnapshotManager.saveSnapshot()` also guards its `sceneFilePath` and `label` parameters against non-string input. *(Issue #182)*
- **`getScenesGroupedBy()` no longer throws `t.startsWith is not a function`** — grouping by `act`, `chapter`, or `plotlines` crashed because non-string frontmatter values (numbers, `undefined`) reached `.startsWith()` without a type guard. The `field` argument is now coerced to a string before the `cf:` prefix check, and a previously-missing `plotlines` case has been added to the switch statement so scenes are grouped by their tags instead of falling through to `Unknown`. *(Issue #182)*

### New Features

- **Manuscript view remembers your cursor and scroll position** — switching away from the Manuscript view (to Codex, Plotgrid, etc.) and back, or restarting Obsidian, previously reset the cursor to the top of the document with no editor focused. The Manuscript view now captures the active editor's CM6 cursor selection and scroll position on focus loss, and after the next render eagerly mounts the previously-focused scene's editor, focuses it, and restores the exact cursor position so you resume typing right where you left off. State is also persisted to the project's `System/manuscript-state.json` so it survives an Obsidian restart. *(Discussion #183)*

## Version 1.10.32

### Bug Fixes

- **Additional Source Folders entries now survive view refreshes** — The Character, Location, and Codex views previously created their own manager instances and re-loaded only from the project Codex folder on every refresh, wiping out entries scanned from Additional Source Folders. The views now use the plugin's shared managers and call a single `reloadEntities()` entry point that re-applies Additional Source Folders after loading the project folder, so external characters/locations/codex entries stay visible. *(Reported by @franrodalg: external characters were scanned but never appeared in the Codex view.)*
- **Additional Source Folders now accepts absolute paths** — `scanExtraFolders` now converts absolute OS paths (e.g. `C:\Users\…\Folder` on Windows or `/Users/…/Folder` on macOS) to vault-relative paths before passing them to the vault adapter, which only understands paths relative to the vault root. A one-time migration on load converts any absolute paths already stored in settings. The settings UI also converts paths on add. Note that folders must still be **inside the vault** — Obsidian's API cannot access files outside it.
- **Romancing the Beat template corrected** — The beat sheet template previously used an incorrect 3-act / 16-beat structure. It now follows Gwen Hayes' actual four-phase, twenty-beat outline: Phase 1 (Setup), Phase 2 (Falling in Love), Phase 3 (Retreating from Love), and Phase 4 (Fighting for Love), with five beats per phase.

## Version 1.10.31

### New Features

- **Character count option for scene lengths** — A new **Count unit for scene lengths** setting under **Settings → Scene Cards** lets you choose whether scene cards, the Timeline, and the Inspector display scene length in **Words** (default) or **Characters**. Useful for prose writers — especially for those who track manuscript length in characters rather than words. The character count is stored in a new `charcount` frontmatter field alongside the existing `wordcount`, and applies the same exclusions (comments, checklists, markdown markup) as the word count.

### Bug Fixes

- **Corkboard notes no longer disappear** — The corkboard note editor could lose its text (while images survived) when a view refresh rebuilt the board mid-edit: the textarea's `blur`/outside-pointer handler would then write a stale empty body over the real note content. The editor now tracks whether it is still attached to the DOM, refuses to overwrite a non-empty body with an empty value from a detached textarea, and flushes the in-flight edit synchronously before marking itself detached. *(Reported: notes disappeared twice; images survived the second time.)*
- **Corkboard notes no longer appear as "Unassigned" scenes in Plotlines** — The Plotlines (Storyline) view now filters out corkboard sticky notes before grouping, matching the existing filter in the Timeline and Board views. Sticky notes are brainstorming aids, not story scenes, so they no longer pollute the "Unassigned" bucket.
- **Corkboard notes no longer steal sequence numbers from real scenes** — `SceneManager.createScene` no longer assigns a `sequence` number to corkboard notes, and `globalResequence` / `getNextSequence` now exclude notes from the sequence space. This eliminates the gaps in scene numbering caused by notes and fixes the symptom where Timeline reordering by number appeared not to change the numbers (notes were occupying slots in the numbering).
- **Plot Grid reset no longer resurrects the grid** — Resetting the grid could make it "disappear then reappear on its own" because a pending debounced save (holding the pre-reset state) fired after the reset. The reset handler now cancels any in-flight debounced save before clearing the grid.
- **Additional Source Folders now picks up linked notes** — `scanExtraFolders` now normalizes the folder path before the existence check, so paths like `/Test` or `Test\` (common on Windows) no longer cause the scan to abort silently. Adding or removing a folder in **Settings → Advanced → Additional Source Folders** now triggers an immediate re-scan and view refresh, so newly linked notes appear without requiring a project switch or reload. **External entries now survive view refreshes** — the Character, Location, and Codex views previously created their own manager instances and re-loaded only from the project Codex folder on every refresh, wiping out externally-scanned entries. The views now use the plugin's shared managers and call a single `reloadEntities()` entry point that re-applies Additional Source Folders after loading the project folder, so external characters/locations/codex entries stay visible. *(Reported by @franrodalg: external characters were detected on scan but never appeared in the Codex view.)*
- **Nested location dropdowns show the full ancestry** — The location autocomplete in the Inspector now displays the complete parent chain (e.g. `Forest > Old House > Scary Room`) instead of only the immediate parent, so deeply nested locations are distinguishable. Previously a three-level hierarchy collapsed to a single `Parent > Child` label, making it impossible to tell identically-named locations apart. The suggestion dropdown items also now wrap and carry a hover tooltip with the full label, so long names are no longer clipped.

## Version 1.10.30

### New Features

- **Persistent Storyline (Plotlines) view state** — The Plotlines view now remembers your chosen view mode (List/Subway), sort order, Arc Point filter, and scene-tag pill visibility between sessions, matching the persistence already in place for the Board, Timeline, and Research views.
- **Renaming a scene renames its linked notes file** — When you rename a scene, its companion `Scene Title - Notes.md` file is renamed to match, and the `notesFile` link is updated. *(Issue [#175](https://github.com/PixeroJan/obsidian-storyline/issues/175))*

### Bug Fixes

- **Empty custom fields no longer linger in frontmatter** — Clearing or deleting a Universal Field value through StoryLine now removes the entry from `universalFields` (and its mirrored top-level key) instead of leaving an empty `fieldId: ''` behind. *(Issue [#175](https://github.com/PixeroJan/obsidian-storyline/issues/175))*
- **Safer act/chapter adding on mobile** — `addActs` / `addChapters` now sanitize input, dedupe, and skip no-op writes, preventing the repeated-tap loop that could corrupt project frontmatter under sync. Project frontmatter parsing also tolerates single-number or comma-string `acts`/`chapters` values produced by sync conflicts. *(Issue [#176](https://github.com/PixeroJan/obsidian-storyline/issues/176))*
- **Plotline subway connector gradients** — Connectors between three or more plotlines now render a proper multi-stop gradient through every intermediate lane color instead of jumping straight from the top to the bottom lane. *(Issue [#177](https://github.com/PixeroJan/obsidian-storyline/issues/177))*
- **Corkboard note editor stays visible on iOS** — Tapping a corkboard note to edit it on iOS no longer pushes the note off-screen when the soft keyboard appears; the canvas pans to keep the note in the visible area. *(Issue [#178](https://github.com/PixeroJan/obsidian-storyline/issues/178))*

---

## Version 1.10.29

- Updated to use the latest Obsidian API conventions (replaced deprecated `document`, `instanceof`, `activeLeaf`, and `setDynamicTooltip` calls) for better compatibility with popout windows and future Obsidian versions.

---

## Version 1.10.28

### New Features

- **Location & world nicknames** — You can now add alternative names (nicknames/aliases) to locations and worlds, just like characters. The Link Scanner picks them up automatically, so writing a nickname in your prose will link to the right place.
- **Ctrl+Z / Ctrl+Y in StoryLine views** — Pressing Ctrl+Z (or Cmd+Z on Mac) now triggers StoryLine's own undo when a StoryLine view is active and you're not typing in a text field. No more accidentally undoing your vault files.
- **Plot Grid drag confirmation** — Dragging a cell onto another cell that already has content now asks for confirmation before overwriting. Cell moves can also be undone.
- **Filter states remembered** — Timeline swimlane mode, swimlane group-by, and Research panel tag/type filters are now saved between sessions.

### Bug Fixes

- **Location type dropdown** — Adding a custom location type no longer makes the Type field disappear. The new type is saved immediately before the view refreshes.
- **Research tag chips** — Clicking a tag chip in the Research panel no longer creates duplicate chips.
- **Research linked notes** — Linking a vault note to the Research panel no longer overwrites previously linked notes.
- **Timeline scroll position** — Selecting a scene in the Timeline no longer scrolls you back to the top.
- **Timeline date column** — The date column is wider and long weekday names now wrap instead of being cut off.

---

## Version 1.10.27

### New Features

- **Inactive scenes** *([#158](https://github.com/PixeroJan/obsidian-storyline/issues/158))* — Scenes can now be marked inactive from the Inspector or Board context menu. Inactive scenes stay in the project for planning, but are hidden from manuscript views, exports, Navigator, and stats by default, with Active / All / Inactive filters and an export opt-in when needed.

### Bug Fixes

- **Decimal scene order filename sync** *([#159](https://github.com/PixeroJan/obsidian-storyline/issues/159))* — Scene filename/title sync now recognizes decimal sequence prefixes such as `00-1.5`, preventing the prefix from being copied repeatedly into the generated title.

---

## Version 1.10.26

### Bug Fixes

- **Mobile compatibility** — Restored compatibility with the current public iOS App Store version of Obsidian while keeping scanner-safe warning buttons for delete/remove actions.

---

## Version 1.10.25

### Bug Fixes

- **Custom scene statuses in writing progress** *([#156](https://github.com/PixeroJan/obsidian-storyline/issues/156))* — Custom statuses can now be marked as counting as written, so profile progress bars include statuses such as Published or Live when you choose.

- **Safer scene notes files** *([#157](https://github.com/PixeroJan/obsidian-storyline/issues/157))* — Scene notes are now created as separate notes files when edited and use a clearer `Scene Title - Notes.md` filename to avoid conflicts with scene files and block references.

- **Scene title and filename sync** *([#155](https://github.com/PixeroJan/obsidian-storyline/issues/155))* — Renaming scene titles and scene files now stays better aligned, while setup/payoff references are updated when a manual scene filename rename changes the scene title.

---

## Version 1.10.24

### Bug Fixes

- This update prepares StoryLine for Obsidian community plugin review, with cleaner compatibility checks and a small Timeline ordering follow-up.

---

## Version 1.10.23

### Bug Fixes

- **CJK word-count fallback follow-up** *([#138](https://github.com/PixeroJan/obsidian-storyline/issues/138))* — Default Project Language now keeps projects without a `language:` field on the global fallback, updates active projects that still used the previous default, and applies Auto-detect from the actual scene body when recounting scene-card word counts.

- **Obsidian community scanner cleanup** — Raised the declared minimum Obsidian version to 1.13.0 for the supported destructive-button API and removed an unused scene-status import flagged by the scanner.

- **Timeline chronological ordering follow-up** *([#136](https://github.com/PixeroJan/obsidian-storyline/issues/136))* — Chronological Order now respects manual C-number ordering first, then Story Date/Time, then reading order, so drag-reordering and date edits both affect the Timeline view predictably.

---
## Version 1.10.22

### Changes

- **Timeline swimlanes by character and plotline** *([#154](https://github.com/PixeroJan/obsidian-storyline/issues/154))* — Swimlane mode can now group by scene characters or plotlines, and scenes with multiple values appear in each matching lane. This is scene-based, using existing scene character and tag fields.

- **Richer Plotlines subway popups** *([#148](https://github.com/PixeroJan/obsidian-storyline/issues/148))* — Hovering a subway-map scene now shows subtitle, synopsis, Arc Point status, plotlines, and story date/time when available.

- **More flexible custom sections** *([#151](https://github.com/PixeroJan/obsidian-storyline/issues/151))* — Custom-section fields can now use folder-sourced dropdown/multi-select options, move between user-created sections, and respect selected field placement more consistently.

---
## Version 1.10.19

### Changes

- **Timeline remembers your order choice** *([#140](https://github.com/PixeroJan/obsidian-storyline/issues/140))* — The Timeline starts in Reading Order the first time, then keeps the order you choose after that.
- **Cleaner Plotlines subway map** *([#137](https://github.com/PixeroJan/obsidian-storyline/discussions/137))* — Added a toolbar toggle to hide or show the plotline tag pills beneath scene nodes.
- **Plot Grid rows can fit their content** — Added a toolbar button that resizes visible row heights so linked scenes, notes, and tags are easier to see without changing column widths.
- **Project language fallback for word counts** *([#138](https://github.com/PixeroJan/obsidian-storyline/issues/138))* — The global Default Project Language is now pushed into the word-count tokenizer on load/save, so CJK defaults are respected when a project does not define its own language.
- **Automated style-check cleanup** — Cleaned up sidebar and notes styling so it follows plugin style rules while keeping the views looking and behaving the same.

### Bug Fixes

- **Plot Grid formatting and editing fixes** *([#142](https://github.com/PixeroJan/obsidian-storyline/issues/142), [#146](https://github.com/PixeroJan/obsidian-storyline/issues/146))* — Fixed the empty text-alignment dropdown, made linked-scene cell notes visible above scene previews, kept moved cell content and manual-content state together, prevented arrow keys from leaking out of active text editors, improved live cell updates from the inspector, and changed selection highlighting to an inset border so edge cells are fully outlined.
- **Plot Grid scene title clipping** *([#142](https://github.com/PixeroJan/obsidian-storyline/issues/142))* — Long linked-scene titles in grid cells now truncate instead of bleeding into adjacent cells.
- **PDF/HTML heading export** *([#145](https://github.com/PixeroJan/obsidian-storyline/issues/145))* — Manuscript body headings from H1 through H6 are now converted to real HTML/PDF headings instead of leaving H4-H6 as literal Markdown.

### Documentation

- Removed the Help section for project cover images because that UI is not currently available.

---
## Version 1.10.18

### New Features

- **Arc Points** *([#128](https://github.com/PixeroJan/obsidian-storyline/issues/128))* — Mark key turning points in your story as Arc Points. Toggle the checkbox in the Scene Details panel. Arc Points show a diamond badge on Board cards and appear as filled diamonds (◆) on the StoryLine subway map. Filter the Board and StoryLine views to show All, Scenes only, or Arc Points only. Arc Points are excluded from aggregate word counts by default (toggle in Settings → Scene Cards).
- **Live Markdown Notes** — The Notes tab in the Scene Details sidebar now renders as a full Obsidian Live Preview editor. Write with markdown formatting, wikilinks, and tags — just like a regular note file.
- **Research images** — Add image-type research posts with a built-in image picker. Image previews appear inline on expanded research cards.
- **Prologue & Epilogue support** — Act 0 displays as "Prologue", Act 99 as "Epilogue" across all views. Quick-select buttons in the Inspector let you set these with one click.
- **Beat sheet scene creation** — Applying a beat sheet template now optionally creates placeholder scenes from each beat, with correct act and chapter assignment. A custom structure builder lets you define your own act/chapter layout.
- **Setup/Payoff inline picker** — Linking setup and payoff scenes now uses an inline autocomplete dropdown instead of a separate modal. Type a scene title to search and select.
- **Chronological order sorts by story date** *([#136](https://github.com/PixeroJan/obsidian-storyline/issues/136))* — Switching the Timeline to Chronological Order now sorts scenes by their Story Date and Story Time fields automatically. Scenes without dates fall back to their sequence number.

### Bug Fixes

- **Notes edits no longer revert** — Switching between the Details and Notes tabs now correctly preserves edits. Both tabs read from the same external notes file in real time.

---
## Version 1.10.17

### New Features

- **Custom sections gain rich field types** *([#121](https://github.com/PixeroJan/obsidian-storyline/issues/121))* — Fields inside a user-defined custom section (on Codex entries, Characters, and World/Location sheets) can now be more than just a single-line text input. The **Add Field** dialog now lets you pick a **Type** (Text, Text block, Dropdown, Multi-select, Checkbox), set a **Placeholder**, and supply **Options** for dropdowns / multi-selects — the same widgets you already know from universal field templates. Existing custom sections still work unchanged; legacy plain-string field entries are auto-treated as Text.
- **Edit a custom field in place** — Each custom-section field now has a small **pencil** icon next to the move/delete chevrons. Click it to change the field's name, type, placeholder, or options without removing and re-adding. Field values are migrated automatically when you rename a field.
- **Synopsis on the Scene Details tab** — The Synopsis textarea now appears inline on the Details tab as well, not only on the standalone Synopsis tab/sidebar. 6 rows tall by default so a couple of sentences fit without scrolling.
- **Collapse view-tab labels on narrow toolbars** — When the StoryLine toolbar is too narrow to fit every view tab's label, the labels are now hidden automatically and only the icon (Corkboard, Timeline, Codex, …) is shown. Toggle off under **Settings → Display Options → Collapse view-tab labels when toolbar is narrow** if you prefer the labels to wrap.
- **Hide the "StoryLine" title row** — A new toggle under **Settings → Display Options → Hide "StoryLine" title above view tabs** hides the duplicated **StoryLine - Projectname** header at the top of every view, reclaiming ~30–45px of vertical space. Defaults to **on** for new installs (the project name is already visible in the tab title and project selector). Flip it back off under Display Options if you want the old layout.

### Bug Fixes

- **Custom-section field icons match the rest of StoryLine** — The Edit / Move-up / Move-down / Remove icons on each custom-section field row are now hover-only (matching how built-in field icons fade in on mouse-over) and sized exactly to 14×14 to line up with the standard field chevrons. Previously they were always visible and visibly larger than the rest of the form.
- **Project modal no longer auto-opens on mobile** — On iOS / iPadOS / Android, the "New StoryLine Project" dialog used to appear automatically when the vault file system hadn't finished syncing yet (common with iCloud / Dropbox / OneDrive), risking accidental duplicate projects. On mobile, StoryLine now shows a brief notice instead and waits for the user to invoke **Create new project** from the command palette once everything has loaded. Desktop behavior is unchanged.

---
## Version 1.10.16

### Changes

- **Cleaner POV display on scene cards** — The separate *POV: Name* line above the footer is gone. The POV character now appears as the **first pill** in the character row of each scene card, with the label *POV: <name>*. One row, less clutter.
- **Plot Grid: POV pill instead of cell markers** — Plot Grid cells no longer show a `✓` or `★ POV` at the top. Instead, the existing pill row inside each cell now lists characters first, then locations, and the POV character is hoisted to the very first slot with the label *POV: <name>* on an amber background. The cell background itself stays untouched. Existing grids are cleaned up automatically on next load — no manual sync needed.

### Bug Fixes

- **Plot Grid: section action buttons are now plain icons** — The Move-up / Move-down / Rename / Delete buttons on user-defined custom section headers, and the per-field reorder/remove buttons inside them, are now icon-only spans matching the rest of the app instead of native `<button>` elements with default browser chrome. Applies to Codex, Character, and World/Location custom sections.

---
## Version 1.10.15

### New Features

- **Toggle scene number on cards** *([#119](https://github.com/PixeroJan/obsidian-storyline/issues/119))* — A new **Show scene number on cards** setting under **Settings → Scene Cards** hides the sequence badge on Corkboard / Kanban / Navigator cards for users who don't want the number visible. Defaults to on.
- **Codex custom sections** *([#114](https://github.com/PixeroJan/obsidian-storyline/issues/114))* — Group custom fields under named sections (e.g. "Appearance", "Backstory") directly from the Codex editor. Use the **+ Add custom section** button at the bottom of an entry; sections can be renamed, deleted, and filled with their own fields. Section/field structure is stored per Codex category in the plugin settings; field values live in the entry's existing `custom` map (no schema change).
- **Custom sections for Characters and Locations** *([#120](https://github.com/PixeroJan/obsidian-storyline/issues/120))* — The same user-defined sections UX from the Codex is now available on the Character and World/Location detail views. Use **+ Add custom section** at the bottom of any character or location to group custom fields under named sections (e.g. "Appearance", "Backstory", "Climate"). Section structure is shared across all characters (resp. all worlds/locations) and saved in plugin settings; values are stored per entry in the existing `custom` map. The underlying renderer was extracted into a shared component (`components/CustomSectionsRenderer.ts`) so all three views share one implementation.
- **Reorder custom sections and fields anywhere in the form** *([#120](https://github.com/PixeroJan/obsidian-storyline/issues/120))* — Each custom section header now has **Move up / Move down** chevron buttons in addition to Rename and Delete, and every field row inside a section has up/down arrows next to the remove button. Custom sections can be moved through the **entire form** — above the first built-in section, between any two built-ins, or after the last one — not just within the custom-sections block. Each custom section stores an optional `position` slot (0..N) that's persisted in plugin settings; legacy sections without a position keep their current behaviour (rendered at the end). Applies to Codex, Character, and World/Location views.
- **Per-category Codex field templates** *([#115](https://github.com/PixeroJan/obsidian-storyline/issues/115))* — When you add a custom field, an **Apply to all entries in this category** toggle on the Add Custom Field dialog now seeds that field for every existing and future entry in the same category.
- **Notes & Synopsis tabs in Scene Details sidebar** *([#116](https://github.com/PixeroJan/obsidian-storyline/issues/116))* — The Scene Inspector now has dedicated **Notes** and **Synopsis** tabs, each filling the sidebar with a single full-height textarea so you can focus on one thing at a time.
- **Standalone Notes sidebar** *([#116](https://github.com/PixeroJan/obsidian-storyline/issues/116))* — A new **Scene Notes** sidebar view, openable via the command **"Open scene notes sidebar"**, mirrors the focused scene's notes in its own leaf so writers can keep notes visible alongside the manuscript without opening the full Inspector.
- **Dockable Synopsis, Details and Notes panes** *([#116](https://github.com/PixeroJan/obsidian-storyline/issues/116))* — Each Scene Inspector tab can now be popped out into its own Obsidian leaf. **Right-click any tab** in the inspector tabbar and choose **Open *<tab>* in own pane** — the tab opens as a standalone, dockable leaf you can drag to any pane edge, stack above/below another pane, or pop into its own window. Two new commands — **"Open scene synopsis sidebar"** and **"Open scene details in own pane"** — open the Synopsis and Details views directly. Each leaf follows the focused scene automatically, just like the existing Notes sidebar. The tabbar has been re-spaced for breathing room. The redundant **Info** tab has been removed (its contents were a strict subset of Details).
### Bug Fixes

- **Global flat scene sequencing** *([#118](https://github.com/PixeroJan/obsidian-storyline/issues/118))* — `sequence` is now a single, globally-unique counter across the whole project. The **Resequence all** button on the Board, drag-and-drop on the Board, and reading-order drag on the Timeline all renumber scenes 1..N flat (sorted by act → chapter → sequence) instead of restarting per-(act, chapter) group. `act` and `chapter` are never auto-overwritten by sequencing — chapter assignments are preserved. Previously `resequenceScenes()` silently set `chapter: i+1` on every scene during a merge, destroying chapter assignments.
- **Add Custom Field dialog lost the field name on first click** *([#115](https://github.com/PixeroJan/obsidian-storyline/issues/115))* — Typing a name and immediately pressing **Add** sometimes submitted with an empty value because the input's `change` event hadn't fired yet. The dialog now reads the input value directly at submit time.
- **Synopsis / Notes textareas didn't fill the inspector tab** *([#116](https://github.com/PixeroJan/obsidian-storyline/issues/116))* — Heights were collapsed to the default `rows` attribute; the new flex layout fills the tab height.
- **Delete button overflowed the inspector toolbar** *([#116](https://github.com/PixeroJan/obsidian-storyline/issues/116))* — Action buttons now wrap and labels can break onto multiple lines.
- **Snapshot list caused a layout jump while loading** *([#116](https://github.com/PixeroJan/obsidian-storyline/issues/116))* — The list now reserves a minimum height so async snapshot loading no longer shifts surrounding content.

---
## Version 1.10.14

### New Features

- **Scene Inspector "Info" panel** — A new lightweight planning tab in the Scene Details sidebar showing synopsis, status, POV, location, word count and notes at a glance — handy when you just want to skim or jot a quick note without scrolling through the full Inspector. Open the Scene Details sidebar and click the **Info** tab.
- **Scene card preview text** — Show a short preview beneath each scene card title. Pick what to display: **None**, **Synopsis**, **First lines of draft**, or **Conflict**. Set it under **Settings → Scene Cards → Scene card preview text**.
- **Navigator: Group by chapter** — A new "By chapter" option in the Navigator's sort dropdown groups scenes under collapsible chapter headers (acts hidden). Use it for chapter-driven outlines. Chapter headers now match the styling of act headers (uppercase).

### Bug Fixes

- **Hide frontmatter toggle was unreliable** — A leftover CSS rule kept the properties block hidden even when the toggle was turned off. The toggle now correctly shows and hides frontmatter on StoryLine notes only, and re-applies whenever you switch files. *Note:* If your vault has Obsidian's legacy "Properties in document" setting saved as `hidden` in `.obsidian/app.json`, properties stay hidden globally. That setting was removed from Obsidian's UI in 1.4 — flipping it requires editing the JSON directly.

---
## Version 1.10.13

### New Features

- **Checkbox custom field type** *([#107](https://github.com/PixeroJan/obsidian-storyline/issues/107))* — Universal fields on Scene, Character, Codex and Location sheets now support a new **Checkbox (yes/no)** input type alongside Text, Text block, Dropdown and Multi-select. Values are stored as proper booleans (`true` / `false`) in the note's frontmatter, so they round-trip cleanly via sync, git and Dataview queries.

### Bug Fixes

- **Codex view crashed with "clearPortaledDropdowns is not a function"** — Opening the Codex tab (or any custom category such as Items) made the whole StoryLine UI disappear with `TypeError: this.clearPortaledDropdowns is not a function`. The 1.10.12 fix for issue #102 (portaled dropdowns) added a `clearPortaledDropdowns()` *call* to `CodexView.renderView()` but the matching field (`_portaledDropdowns`) and method were only implemented on `CharacterView` and `LocationView`. The method has now been added to `CodexView` as well, and is also invoked from `onClose()` for symmetry.
- **"Hide frontmatter" silently overrode Obsidian's global Properties setting** *([#104](https://github.com/PixeroJan/obsidian-storyline/issues/104))* — When the StoryLine setting was enabled, the plugin called Obsidian's internal `setConfig('propertiesInDocument', 'hidden')` on every load, which flipped the user's **Editor → Properties in document** preference to *Hidden* for the entire vault — affecting non-StoryLine notes too. The setting now hides the properties block only on markdown files inside the StoryLine root folder, via a scoped CSS class on the markdown leaf. Your global Obsidian preference is left untouched.
- **Excessive vertical gap between acts in the Manuscript view** *([#105](https://github.com/PixeroJan/obsidian-storyline/issues/105))* — The last scene of an act contributed `32px + 32px` of bottom margin/padding, and the act divider then added another `48px + 24px` on top — compounding to ~140px of empty space between acts. The act divider margin has been reduced to `24px / 16px`, and scene blocks immediately preceding an act or chapter divider now drop their trailing space to `8px + 8px`, giving a much tighter rhythm without visually merging acts.
- **POV / Characters / Location autocomplete capped at 8 suggestions** *([#109](https://github.com/PixeroJan/obsidian-storyline/issues/109))* — With more than eight matching characters or locations, the suggestion dropdown silently hid the rest. The default visible-suggestions cap on the shared `InlineSuggest` component has been raised from 8 to 200. The dropdown already has a fixed `max-height` with internal scrolling, so longer lists are now fully reachable without overflowing the screen.

---
## Version 1.10.12

### New Features

- **Multi-language support** — replaced the English-only word splitter with BCP-47-aware tokenisation (`Intl.Segmenter` where available, with regex fallbacks). Word counts, reading time, dialogue %, stop-word filtering and PDF line-wrap now behave correctly for English, Swedish, Dutch, Danish, Norwegian, Finnish, Polish, Spanish, French, German, Italian, Portuguese, Russian, Chinese, Japanese, Korean, Thai, Arabic, Hebrew and Hindi. Per-project language is set via the `language:` frontmatter key on the project file, a Settings → Default project language dropdown (with `auto` detection), and Flesch readability is automatically marked **N/A** for non-Latin scripts where it doesn't apply. Inspired by [PR #90](https://github.com/PixeroJan/obsidian-storyline/pull/90) by @Firefox2100 — generalised to a script-profile registry so adding new locales is a one-line change.

### Bug Fixes

- **Snapshots counted as scenes everywhere** *([#100](https://github.com/PixeroJan/obsidian-storyline/issues/100))* — Saved snapshot files live in a `_snapshots/` subfolder next to each scene. The scene scanner recursed into those folders and registered every snapshot as a separate scene, inflating Manuscript, Corkboard, Kanban, Navigator, Plot Grid, Timeline and the project word count. `SceneManager.scanFolderAdapter` now skips the `_snapshots/` directory (and `addFile` rejects any path under it), so snapshots remain pure history and are never indexed as scenes.
- **PDF export ignored "Include scene titles" and "Number scenes"** *([#103](https://github.com/PixeroJan/obsidian-storyline/issues/103))* — The PDF (and HTML print) generator built its own manuscript HTML and always emitted `<h4>Scene title</h4>` headings regardless of the toggles on the Export dialog. `buildManuscriptHtml` now honours both `includeSceneTitles` and `numberScenesOnExport`, matching the existing Markdown and DOCX exports.
- **Multi-select dropdown drifted away from the input** *([#102](https://github.com/PixeroJan/obsidian-storyline/issues/102))* — On Codex / Character / Location custom fields, the autocomplete popup was positioned with `position: fixed` but lived inside a DOM ancestor that established a containing block (via `transform`, `filter`, `contain`, etc.). That turned "viewport coordinates" into "ancestor coordinates" and the menu rendered far below/beside the input. The dropdown is now portaled to `document.body`, so its `position: fixed` is once again truly viewport-relative; portaled popups are tracked per view and cleaned up on every re-render and on `onClose`.
- **Visible gap above the sticky toolbar on Codex pages** *([#98](https://github.com/PixeroJan/obsidian-storyline/issues/98))* — Scrolling the character editing page revealed a sliver of content showing through above the sticky toolbar. The toolbar now paints its background colour upward with a `::before` overlay (24px), covering any subpixel/padding gap between the toolbar and the top of the scroll container.

---
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
