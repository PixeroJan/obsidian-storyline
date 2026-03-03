# StoryLine — Changelog

---

## Version 1.3.2

### New Features

- **Story Navigator** — A compact sidebar panel for quick scene navigation. Search and filter scenes by title, sort by five modes (sequence, status, recent, words, title), filter by plotline with color-coded dots and scene counts, group by act with collapsible sections, pin scenes for quick access, and track progress with a bottom bar. Auto-opens when a project loads (configurable in settings) or via the command palette.

- **Sticky Note Themes** — Six built-in color themes for corkboard sticky notes: Classic, Pastel, Earth, Jewel, Neon, and Mono. Each provides 14 colors. Includes HSL sliders (hue shift, saturation, lightness) for fine-tuning and per-note color overrides via right-click.

- **Plotline HSL Sliders** — Fine-tune your entire plotline color palette with hue shift, saturation, and lightness sliders. Real-time swatch preview. Adjustments stack on top of the active scheme and per-tag overrides.

- **Per-Project Color Overrides** — Optionally save color scheme, HSL adjustments, and sticky note theme per project. Toggle "Use project-specific colors" in settings so each book can have its own look. Settings are stored in the project's `System/plotlines.json` and load automatically when switching projects.

### Improvements

- **Corkboard smoothness** — Improved drag performance with `requestAnimationFrame`, added inertia on release, and smoother zoom transitions.

- **Character elaboration fields** — Expanded character profile sections with additional detail fields.

### Bug Fixes

- **Scene split placement** — Split scene now correctly preserves the sequence number for the first half instead of overwriting it.

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
