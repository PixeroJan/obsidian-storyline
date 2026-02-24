# StoryLine — Obsidian Plugin for Writers

**Version 1.1.0** · By Jan Sandström

StoryLine transforms your Obsidian vault into a complete book planning and writing tool. Organize scenes, build characters, manage locations, track plotlines, and monitor your progress — all inside Obsidian.

---

## Quick Start

1. Install the plugin and enable it in Obsidian settings.
2. Click the StoryLine ribbon icon  in the left sidebar to open the plugin.
3. You'll be prompted to create your first project — give it a name and start writing.

---

## Views

### Board View

Kanban-style scene cards organized by act, chapter, or status. Drag & drop scenes between columns. Color-coded by status, POV, emotion, or tag. Multi-select for bulk edits.

![Board View](screenshots/01.Board.jpg)

---

### Plotgrid View

Spreadsheet-style grid for mapping scenes against plotlines, themes, or story threads. Each cell can hold free text, formatting, colors, and linked scene cards. Double-click any cell to edit. Sticky headers keep row and column labels visible while scrolling.

![Plotgrid View](screenshots/02.Plotgrid.jpg)

---

### Timeline View

Chronological scene timeline with visual markers for intensity, status, and duration. Supports swimlane grouping by act, chapter, POV, or location.

![Timeline View — Overview](screenshots/03.Timeline.jpg)

![Timeline View — Swimlanes](screenshots/04.Timeline.jpg)

---

### Plotlines View

Track plotlines across your scenes with two view modes: a transit-style **subway map** (default) and a classic **list view**. The subway map uses flat SVG lanes with gradient connectors between shared scenes, act dividers, and scene labels with tag pills. Drag to pan large stories. Assign per-tag colors directly from the plotline header using the palette button or right-click context menu.

![Plotlines — Subway Map](screenshots/05.Plotlines-subway.jpg)

![Plotlines — List View](screenshots/05.Plotlines.jpg)

---

### Characters View

Rich character profiles with collapsible sections: basic info, physical traits, personality, backstory, relationships, character arc, and custom fields. **Portrait images** — click to add a character image (import from computer or choose from vault). Portraits display on overview cards (64×64 px) and in the detail editor (96×96 px). Includes a force-directed relationship map and a story graph showing how characters connect to scenes, locations, and props.

![Characters — Profile](screenshots/06.Characters.jpg)

![Characters — Relationship Map](screenshots/07.Characters.jpg)

![Characters — Story Graph](screenshots/08.Characters.jpg)

![Characters — Additional View](screenshots/09.Characters.jpg)

---

### Locations View

Hierarchical worldbuilding with worlds as top-level containers and locations nested underneath. Each location has fields for atmosphere, significance, and narrative role. **Portrait images** — add images to worlds and locations; thumbnails appear in the tree view and larger portraits in the detail editor.

![Locations — Overview](screenshots/10.Locations.jpg)

![Locations — Detail](screenshots/11.Locations.jpg)

---

### Stats View

Dashboard with word counts, writing progress, pacing analysis (average scene length by act, word count distribution), plot hole detection, and a built-in writing sprint timer.

![Stats — Overview](screenshots/12.Stats.jpg)

![Stats — Pacing Analysis](screenshots/13.Stats.jpg)

![Stats — Plot Hole Detection](screenshots/14.Stats.jpg)

![Stats — Writing Sprint](screenshots/15.Stats.jpg)

---

## Export

Four export formats: Markdown, JSON, CSV, and PDF (via HTML). Export either an outline (metadata + stats) or a full manuscript.

![Export](screenshots/16.Export.jpg)

---

## Key Features

- **Scene Management** — Full metadata, six-stage status pipeline, drag-and-drop, multi-select bulk edits, notes, snapshots, and reusable templates.
- **Timeline Modes** — Ten non-linear narrative modes: flashback, flash-forward, parallel, frame, simultaneous, time skip, dream, mythic, circular, and linear.
- **Beat Sheet Templates** — Save the Cat, Three-Act, Hero's Journey — scaffold your acts with named beats.
- **Relationship Map** — Interactive force-directed graph with six color-coded relationship types.
- **Story Graph** — Visualize how scenes connect to characters, locations, and props via `#tags` and `[[wikilinks]]`.
- **Link Scanner** — Auto-detects `[[wikilinks]]` in scene text and classifies them as characters, locations, or other.
- **Tag Type Overrides** — Right-click any tag to reclassify it (prop, location, character, other).
- **Filtering & Presets** — Filter by status, character, location, tag, or free text. Save presets for quick reuse.
- **Setup / Payoff Tracking** — Link foreshadowing and resolution scenes. Warns about unresolved setups.
- **Plot Hole Detection** — Automated validation across six categories.
- **Pacing Analysis** — Bar charts and histograms for scene length and distribution.
- **Writing Sprint** — Built-in countdown timer for focused writing sessions.
- **Color Coding** — Color by status, POV, emotion, act, or tag. **16 built-in color schemes** (4 Catppuccin + 12 mood-based palettes) or custom. Per-tag overrides from Plotlines view or Settings. Dark/light mode aware.
- **Plotline Subway Map** — Transit-style SVG visualization with gradient connectors, act dividers, scene labels, and drag-to-pan.
- **Portrait Images** — Add images to characters and locations. Import from computer or choose from vault.
- **Undo / Redo** — `Ctrl+Z` / `Ctrl+Shift+Z` with a 50-action stack.

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+1–7` | Switch between views |
| `Ctrl+Shift+N` | Quick-add a new scene |
| `Ctrl+Shift+E` | Export project |
| `Ctrl+Z` / `Ctrl+Shift+Z` | Undo / Redo |

---

## Project Structure

```
StoryLine/
  My Novel.md              ← Project file (Markdown + YAML frontmatter)
  My Novel/
    Scenes/                ← Scene files (Markdown + frontmatter)
    Characters/            ← Character profiles (Markdown + frontmatter)
    Locations/             ← Location & world profiles (Markdown + frontmatter)
    Exports/               ← Exported files
```

All files are standard Markdown with YAML frontmatter. Edit them directly in Obsidian or through StoryLine's UI.

---

## Multiple Projects

Create, switch, and fork projects from the command palette. Each project gets its own folder structure. The last-used project is remembered across sessions.

---

*For detailed documentation of every feature, field, and option, see the full [README](README.md).*

---

MIT License
