/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-floating-promises, @typescript-eslint/no-misused-promises, @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/no-redundant-type-constituents, @typescript-eslint/no-unused-vars, no-unused-vars, no-useless-escape, no-control-regex, no-empty -- Obsidian's API surface and several untyped third-party libraries force dynamic dispatch; floating promises are intentional in DOM/event handlers; matching enable at end of file */
/**
 * ScrivenerImporter — import a .scriv project into StoryLine.
 *
 * Desktop-only (requires Node `fs` + `path`).
 * Pure-JS RTF→Markdown conversion (no Pandoc dependency).
 *
 * Pipeline:
 *  1. Parse project.scrivx (XML) → binder tree + metadata
 *  2. Walk binder: classify items as scenes, characters, locations, research
 *  3. Convert each RTF → Markdown
 *  4. Create a new StoryLine project with appropriate folders
 *  5. Write markdown files with YAML frontmatter
 */

import type SceneCardsPlugin from '../main';
import type { SceneStatus } from '../models/Scene';
import { makeCustomCodexCategory } from '../models/Codex';
import type { SeriesMetadata } from '../models/StoryLineProject';
import { App, Modal, Notice, Setting, normalizePath, stringifyYaml } from 'obsidian';
import { DEFAULT_STORYLINE_LOCALE, tokenizeWords } from '../utils/locale';

// Node modules — only available on desktop
const fs = ((window as unknown as { require?: (m: string) => unknown }).require)?.('fs') as typeof import('fs') | undefined;
const nodePath = ((window as unknown as { require?: (m: string) => unknown }).require)?.('path') as typeof import('path') | undefined;

// ────────────────────────────────────────────────────
//  Interfaces
// ────────────────────────────────────────────────────

interface BinderItem {
    uuid: string;
    title: string;
    type: string;            // 'Text', 'Folder', etc.
    binderType: BinderType;  // classified category
    children: BinderItem[];
    // Scrivener metadata
    synopsis?: string;
    labelTitle?: string;
    statusTitle?: string;
    keywords?: string[];
    includeInCompile?: boolean;
    /** Scrivener custom metadata → StoryLine custom fields */
    customMetadata?: Record<string, string>;
    /** For codex items: the generated category id (e.g. 'magic') */
    codexCategoryId?: string;
    /** For codex items: the display label (e.g. 'Magic') */
    codexCategoryLabel?: string;
    /**
     * Ancestor folder titles inside the manuscript, outermost first.
     * E.g. ['Part 1', 'Chapter 3'] for a scene nested two levels deep.
     * Populated during flattenBinder().
     */
    parentFolders?: string[];
    /**
     * For multi-book series imports: which book folder this item belongs to.
     * Set during the series-aware import flow.
     */
    bookTitle?: string;
    /**
     * The Scrivener folder this item came from — used to create sub-folders
     * when importing research/notes so items stay organised.
     */
    sourceFolder?: string;
    /** Scrivener icon filename (e.g. 'Outline.tiff') — used for auto-classification. */
    iconFileName?: string;
}

type BinderType = 'manuscript' | 'characters' | 'locations' | 'research' | 'notes' | 'trash' | 'codex' | 'unknown';

interface ImportResult {
    projectTitle: string;
    scenesImported: number;
    charactersImported: number;
    locationsImported: number;
    researchImported: number;
    notesImported: number;
    codexImported: number;
    filesImported: number;
    codexCategoriesCreated: string[];
    warnings: string[];
}

/** Known binary / non-RTF content extension groups. */
const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp', 'tiff', 'tif']);
const EMBEDDABLE_EXTENSIONS = new Set([...IMAGE_EXTENSIONS, 'pdf']);
const TEXT_EXTENSIONS = new Set(['txt', 'md', 'markdown', 'html', 'htm', 'xml', 'css', 'json', 'csv']);

/** How the user wants to classify an unknown folder. */
interface FolderClassification {
    type: 'codex' | 'notes' | 'research' | 'manuscript' | 'skip';
}

// ────────────────────────────────────────────────────
//  Folder classification modal
// ────────────────────────────────────────────────────

/**
 * Open a modal asking how to classify each unknown Scrivener folder.
 * Returns a Map of folder UUID → classification, or null if cancelled.
 */
function openFolderClassificationModal(
    app: App,
    folders: BinderItem[],
): Promise<Map<string, FolderClassification> | null> {
    return new Promise((resolve) => {
        const modal = new FolderClassificationModal(app, folders, resolve);
        modal.open();
    });
}

class FolderClassificationModal extends Modal {
    private folders: BinderItem[];
    private onResult: (result: Map<string, FolderClassification> | null) => void;
    private choices = new Map<string, FolderClassification>();
    private resolved = false;

    constructor(
        app: App,
        folders: BinderItem[],
        onResult: (result: Map<string, FolderClassification> | null) => void,
    ) {
        super(app);
        this.folders = folders;
        this.onResult = onResult;
        // Default everything to 'research'
        for (const f of folders) {
            this.choices.set(f.uuid, { type: 'research' });
        }
    }

    onOpen(): void {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('storyline-folder-classification-modal');

        contentEl.createEl('h3', { text: 'Classify Scrivener folders' });
        contentEl.createEl('p', {
            text: 'These folders were found in the Scrivener project but don\u2019t match a standard category. Choose how each should be imported:',
            cls: 'setting-item-description',
        });

        const options: Record<string, string> = {
            codex: 'Codex category',
            notes: 'Notes',
            research: 'Research',
            manuscript: 'Scenes (manuscript)',
            skip: 'Skip (don\u2019t import)',
        };

        for (const folder of this.folders) {
            const childCount = this.countLeafItems(folder);
            new Setting(contentEl)
                .setName(folder.title)
                .setDesc(`${childCount} item${childCount !== 1 ? 's' : ''}`)
                .addDropdown(dd => {
                    for (const [value, label] of Object.entries(options)) {
                        dd.addOption(value, label);
                    }
                    dd.setValue('research');
                    dd.onChange(value => {
                        this.choices.set(folder.uuid, { type: value as FolderClassification['type'] });
                    });
                });
        }

        const btnRow = contentEl.createDiv({ cls: 'story-line-button-row' });

        const cancelBtn = btnRow.createEl('button', { text: 'Cancel' });
        cancelBtn.addEventListener('click', () => {
            this.resolved = true;
            this.onResult(null);
            this.close();
        });

        const importBtn = btnRow.createEl('button', { text: 'Continue Import', cls: 'mod-cta' });
        importBtn.addEventListener('click', () => {
            this.resolved = true;
            this.onResult(this.choices);
            this.close();
        });
    }

    onClose(): void {
        if (!this.resolved) {
            this.onResult(null);
        }
    }

    private countLeafItems(item: BinderItem): number {
        let count = 0;
        const walk = (items: BinderItem[]) => {
            for (const child of items) {
                if (child.type !== 'Folder') count++;
                if (child.children.length) walk(child.children);
            }
        };
        walk(item.children);
        // Count the item itself if it's not a folder
        if (item.type !== 'Folder') count++;
        return count;
    }
}

// ────────────────────────────────────────────────────
//  Scrivener status → StoryLine status mapping
// ────────────────────────────────────────────────────

const STATUS_MAP: Record<string, SceneStatus> = {
    'to do': 'idea',
    'no status': 'idea',
    'outline': 'outlined',
    'first draft': 'draft',
    'second draft': 'written',
    'revised draft': 'revised',
    'final draft': 'final',
    'done': 'final',
};

function mapStatus(scrivStatus?: string): SceneStatus {
    if (!scrivStatus) return 'idea';
    const lower = scrivStatus.toLowerCase().trim();
    return STATUS_MAP[lower] ?? 'draft';
}

// ────────────────────────────────────────────────────
//  RTF → Markdown converter (pure JS, prose-focused)
// ────────────────────────────────────────────────────

/**
 * Windows-1252 (CP1252) → Unicode mapping for bytes 0x80–0x9F.
 * These bytes are C1 control characters in ISO 8859-1 / Unicode but CP1252
 * maps them to printable glyphs (smart quotes, dashes, etc.).
 */
const CP1252_MAP: Record<number, number> = {
    0x80: 0x20AC, // €
    0x82: 0x201A, // ‚
    0x83: 0x0192, // ƒ
    0x84: 0x201E, // „
    0x85: 0x2026, // …
    0x86: 0x2020, // †
    0x87: 0x2021, // ‡
    0x88: 0x02C6, // ˆ
    0x89: 0x2030, // ‰
    0x8A: 0x0160, // Š
    0x8B: 0x2039, // ‹
    0x8C: 0x0152, // Œ
    0x8E: 0x017D, // Ž
    0x91: 0x2018, // '
    0x92: 0x2019, // '
    0x93: 0x201C, // "
    0x94: 0x201D, // "
    0x95: 0x2022, // •
    0x96: 0x2013, // –
    0x97: 0x2014, // —
    0x98: 0x02DC, // ˜
    0x99: 0x2122, // ™
    0x9A: 0x0161, // š
    0x9B: 0x203A, // ›
    0x9C: 0x0153, // œ
    0x9E: 0x017E, // ž
    0x9F: 0x0178, // Ÿ
};

/** Decode a byte value from RTF \'XX as CP1252 (the default RTF code page). */
function cp1252ToChar(byte: number): string {
    const mapped = CP1252_MAP[byte];
    return String.fromCharCode(mapped !== undefined ? mapped : byte);
}

function rtfToMarkdown(rtf: string): string {
    if (!rtf || !rtf.startsWith('{\\rtf')) return rtf || '';

    let result = '';
    let bold = false;
    let italic = false;
    let ucValue = 1;  // \uc — number of ANSI replacement bytes after each \uN
    let i = 0;
    const len = rtf.length;

    // Strip the outer {\rtf1 ... } wrapper
    // We walk character-by-character, interpreting control words

    const skipGroup = (): void => {
        let depth = 1;
        i++; // skip the opening brace
        while (i < len && depth > 0) {
            if (rtf[i] === '{') depth++;
            else if (rtf[i] === '}') depth--;
            i++;
        }
    };

    const readControlWord = (): { word: string; param: string } => {
        let word = '';
        let param = '';
        i++; // skip backslash
        // Read alphabetic chars
        while (i < len && /[a-zA-Z]/.test(rtf[i])) {
            word += rtf[i];
            i++;
        }
        // Read optional numeric parameter (may include leading minus)
        if (i < len && (rtf[i] === '-' || /[0-9]/.test(rtf[i]))) {
            if (rtf[i] === '-') { param += '-'; i++; }
            while (i < len && /[0-9]/.test(rtf[i])) {
                param += rtf[i];
                i++;
            }
        }
        // A space delimiter is consumed but not part of the output
        if (i < len && rtf[i] === ' ') i++;
        return { word, param };
    };

    const closeFormatting = (): string => {
        let s = '';
        if (italic) { s += '*'; italic = false; }
        if (bold) { s += '**'; bold = false; }
        return s;
    };

    while (i < len) {
        const ch = rtf[i];

        if (ch === '{') {
            // Check for ignorable groups
            const peek = rtf.substring(i, i + 30);
            if (peek.match(/^\{\\(fonttbl|colortbl|stylesheet|info|pict|object|header|footer|footnote|field|fldinst|datafield|themedata|colorschememapping|latentstyles|datastore|xmlnstbl|listtable|listoverridetable|pgdsctbl|rsidtbl)/)) {
                skipGroup();
                continue;
            }
            if (peek.startsWith('{\\*\\')) {
                skipGroup();
                continue;
            }
            // Otherwise just skip the brace
            i++;
            continue;
        }

        if (ch === '}') {
            i++;
            continue;
        }

        if (ch === '\\') {
            // Check for escaped special chars
            if (i + 1 < len) {
                const next = rtf[i + 1];
                if (next === '\\') { result += '\\'; i += 2; continue; }
                if (next === '{') { result += '{'; i += 2; continue; }
                if (next === '}') { result += '}'; i += 2; continue; }
                if (next === '~') { result += '\u00A0'; i += 2; continue; }  // non-breaking space
                if (next === '-') { result += '\u00AD'; i += 2; continue; }  // soft hyphen
                if (next === '_') { result += '\u2014'; i += 2; continue; }  // em-dash
                if (next === '\n' || next === '\r') { result += '\n'; i += 2; continue; }

                // Hex escape: \'XX — interpreted as CP1252 (RTF default code page)
                if (next === '\'') {
                    const hex = rtf.substring(i + 2, i + 4);
                    const code = parseInt(hex, 16);
                    if (!isNaN(code)) result += cp1252ToChar(code);
                    i += 4;
                    continue;
                }
            }

            const { word, param } = readControlWord();

            switch (word) {
                case 'par':
                case 'line':
                    result += closeFormatting() + '\n\n';
                    break;
                case 'tab':
                    result += '\t';
                    break;
                case 'b':
                    if (param === '0') {
                        if (bold) { result += '**'; bold = false; }
                    } else {
                        if (!bold) { result += '**'; bold = true; }
                    }
                    break;
                case 'i':
                    if (param === '0') {
                        if (italic) { result += '*'; italic = false; }
                    } else {
                        if (!italic) { result += '*'; italic = true; }
                    }
                    break;
                case 'u': {
                    // Unicode escape: \uN followed by replacement char(s) to skip.
                    // The number of replacement bytes is set by \ucN (default 1).
                    const code = parseInt(param, 10);
                    if (!isNaN(code)) {
                        result += code < 0 ? String.fromCharCode(code + 65536) : String.fromCharCode(code);
                    }
                    // Skip the ANSI replacement character(s).
                    // Common patterns: a plain char, or \'XX hex escape(s).
                    let toSkip = ucValue; // ucValue tracks \uc parameter (default 1)
                    while (toSkip > 0 && i < len) {
                        if (rtf[i] === '\\' && i + 1 < len && rtf[i + 1] === '\'') {
                            // Skip \'XX hex escape (4 chars: \, ', hex, hex)
                            i += 4;
                        } else if (rtf[i] !== '\\' && rtf[i] !== '{' && rtf[i] !== '}') {
                            // Skip a plain replacement character
                            i++;
                        } else {
                            break; // Don't skip control words or group markers
                        }
                        toSkip--;
                    }
                    break;
                }
                case 'uc': {
                    // \ucN — sets how many ANSI replacement bytes follow each \uN
                    const n = parseInt(param, 10);
                    if (!isNaN(n)) ucValue = n;
                    break;
                }
                case 'lquote': result += '\u2018'; break;
                case 'rquote': result += '\u2019'; break;
                case 'ldblquote': result += '\u201C'; break;
                case 'rdblquote': result += '\u201D'; break;
                case 'emdash': result += '\u2014'; break;
                case 'endash': result += '\u2013'; break;
                case 'bullet': result += '\u2022'; break;
                // Plain — reset formatting
                case 'plain':
                case 'pard':
                    result += closeFormatting();
                    break;
                // Object attachment placeholder — produces box char, skip it
                case 'objattph':
                    break;
                // Ignore everything else quietly
                default:
                    break;
            }
            continue;
        }

        // Plain text character
        if (ch === '\r' || ch === '\n') {
            i++;
            continue; // RTF line breaks in source are not meaningful
        }

        result += ch;
        i++;
    }

    result += closeFormatting();

    // Clean up: normalize line breaks, collapse excessive blank lines
    return result
        .replace(/\r\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}


// ────────────────────────────────────────────────────
//  XML helpers (lightweight, no DOMParser dependency)
// ────────────────────────────────────────────────────

function getTagContent(xml: string, tag: string): string {
    const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i');
    const m = xml.match(re);
    return m ? m[1].trim() : '';
}

/**
 * Depth-aware version of getTagContent for tags that may be nested
 * inside children with the same tag name (e.g. `<Children>`).
 */
function getTagContentNested(xml: string, tag: string): string {
    const openRe = new RegExp(`<${tag}[^>]*>`, 'i');
    const openMatch = openRe.exec(xml);
    if (!openMatch) return '';

    const startContent = openMatch.index + openMatch[0].length;
    const openStr = `<${tag}`;
    const closeStr = `</${tag}>`;
    let depth = 1;
    let i = startContent;

    while (i < xml.length && depth > 0) {
        if (xml.substring(i, i + openStr.length).toLowerCase() === openStr.toLowerCase()) {
            const nextChar = xml[i + openStr.length];
            if (nextChar === ' ' || nextChar === '>' || nextChar === '/') {
                const gt = xml.indexOf('>', i);
                if (gt !== -1 && xml[gt - 1] === '/') {
                    i = gt + 1;
                } else {
                    depth++;
                    i = gt !== -1 ? gt + 1 : i + 1;
                }
                continue;
            }
        }
        if (xml.substring(i, i + closeStr.length).toLowerCase() === closeStr.toLowerCase()) {
            depth--;
            if (depth === 0) {
                return xml.substring(startContent, i).trim();
            }
            i += closeStr.length;
            continue;
        }
        i++;
    }
    return '';
}

function getAllTags(xml: string, tag: string): string[] {
    const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'gi');
    const matches: string[] = [];
    let m: RegExpExecArray | null;
    while ((m = re.exec(xml)) !== null) {
        matches.push(m[1].trim());
    }
    return matches;
}
// ────────────────────────────────────────────────────
//  Scrivx parser
// ────────────────────────────────────────────────────

function parseScrivx(xml: string): {
    title: string;
    binder: BinderItem[];
    labelTitles: Map<string, string>;
    statusTitles: Map<string, string>;
    customMetaFieldNames: Map<string, string>;
} {
    // Project title from <ProjectTitle> or infer from Binder
    const projectTitle = getTagContent(xml, 'ProjectTitle') || 'Imported Project';

    // Label definitions: <LabelSettings><ListItem ID="N" Name="..."/>
    const labelTitles = new Map<string, string>();
    const labelSection = getTagContent(xml, 'LabelSettings');
    if (labelSection) {
        const re = /<ListItem[^>]*\sID="(\d+)"[^>]*\sName="([^"]*)"/gi;
        let m: RegExpExecArray | null;
        while ((m = re.exec(labelSection)) !== null) {
            labelTitles.set(m[1], m[2]);
        }
    }

    // Status definitions
    const statusTitles = new Map<string, string>();
    const statusSection = getTagContent(xml, 'StatusSettings');
    if (statusSection) {
        const re = /<ListItem[^>]*\sID="(\d+)"[^>]*\sName="([^"]*)"/gi;
        let m: RegExpExecArray | null;
        while ((m = re.exec(statusSection)) !== null) {
            statusTitles.set(m[1], m[2]);
        }
    }

    // Custom metadata field definitions:
    // <CustomMetaDataSettings><MetaDataField><ID>...<Title>...
    const customMetaFieldNames = new Map<string, string>();
    const customMetaSection = getTagContent(xml, 'CustomMetaDataSettings');
    if (customMetaSection) {
        const fields = getAllTags(customMetaSection, 'MetaDataField');
        for (const fieldXml of fields) {
            const id = getTagContent(fieldXml, 'ID');
            const label = getTagContent(fieldXml, 'Title') || getTagContent(fieldXml, 'Name');
            if (id && label) customMetaFieldNames.set(id, label);
        }
    }

    // Parse Binder tree
    const binderXml = getTagContent(xml, 'Binder');
    const binder = parseBinder(binderXml, labelTitles, statusTitles, customMetaFieldNames);

    return { title: projectTitle, binder, labelTitles, statusTitles, customMetaFieldNames };
}

/**
 * Extract the body (inner XML) of each top-level occurrence of `<tagName ...>...</tagName>`
 * using depth tracking so nested elements with the same tag name are handled correctly.
 */
function findTopLevelElements(xml: string, tagName: string): Array<{ attrs: string; body: string }> {
    const results: Array<{ attrs: string; body: string }> = [];
    const openRe = new RegExp(`<${tagName}\\b([^>]*)(?:>|/>)`, 'gi');
    let openMatch: RegExpExecArray | null;

    while ((openMatch = openRe.exec(xml)) !== null) {
        const attrs = openMatch[1];

        // Self-closing tag: <BinderItem ... />
        if (openMatch[0].endsWith('/>')) {
            results.push({ attrs, body: '' });
            continue;
        }

        // Walk forward from after the opening tag, tracking depth
        const startContent = openMatch.index + openMatch[0].length;
        let depth = 1;
        let i = startContent;
        const closeTag = `</${tagName}>`;
        const openTag = `<${tagName}`;

        while (i < xml.length && depth > 0) {
            // Check for nested opening tag
            if (xml.startsWith(openTag, i) && (xml[i + openTag.length] === ' ' || xml[i + openTag.length] === '>' || xml[i + openTag.length] === '/')) {
                // Check for self-closing
                const gt = xml.indexOf('>', i);
                if (gt !== -1 && xml[gt - 1] === '/') {
                    // self-closing, no depth change
                    i = gt + 1;
                } else {
                    depth++;
                    i = gt !== -1 ? gt + 1 : i + 1;
                }
                continue;
            }
            // Check for closing tag
            if (xml.startsWith(closeTag, i)) {
                depth--;
                if (depth === 0) {
                    results.push({ attrs, body: xml.substring(startContent, i) });
                    // Advance openRe past this entire element
                    openRe.lastIndex = i + closeTag.length;
                    break;
                }
                i += closeTag.length;
                continue;
            }
            i++;
        }
    }
    return results;
}

function parseBinder(
    xml: string,
    labelTitles: Map<string, string>,
    statusTitles: Map<string, string>,
    customMetaFieldNames: Map<string, string>,
): BinderItem[] {
    const items: BinderItem[] = [];

    // Use depth-tracking parser to correctly handle nested BinderItem elements
    const elements = findTopLevelElements(xml, 'BinderItem');

    for (const { attrs, body } of elements) {

        const uuid = (attrs.match(/UUID="([^"]*)"/) || attrs.match(/ID="([^"]*)"/))?.[1] || '';
        const type = (attrs.match(/Type="([^"]*)"/))?.[1] || 'Text';

        const title = getTagContent(body, 'Title') || 'Untitled';

        // Classify based on the Scrivener binder type attribute or title
        let binderType: BinderType = 'unknown';
        const typeAttr = type.toLowerCase();
        const titleLower = title.toLowerCase();

        if (typeAttr === 'draftfolder' || typeAttr === 'manuscript' || titleLower === 'draft' || titleLower === 'manuscript') {
            binderType = 'manuscript';
        } else if (typeAttr === 'researchfolder' || titleLower === 'research') {
            binderType = 'research';
        } else if (typeAttr === 'trashfolder' || titleLower === 'trash') {
            binderType = 'trash';
        } else if (titleLower === 'characters' || titleLower === 'character sketches') {
            binderType = 'characters';
        } else if (titleLower === 'places' || titleLower === 'locations' || titleLower === 'settings') {
            binderType = 'locations';
        } else if (titleLower === 'notes' || titleLower === 'front matter' || titleLower === 'back matter') {
            binderType = 'notes';
        }

        // Metadata
        const metadataXml = getTagContent(body, 'MetaData') || body;
        const synopsis = getTagContent(metadataXml, 'Synopsis') || undefined;
        const labelId = getTagContent(metadataXml, 'LabelID');
        const statusId = getTagContent(metadataXml, 'StatusID');
        const includeStr = getTagContent(metadataXml, 'IncludeInCompile');

        const iconFileName = getTagContent(metadataXml, 'IconFileName') || undefined;

        const keywordsXml = getTagContent(metadataXml, 'Keywords');
        const keywords = keywordsXml ? getAllTags(keywordsXml, 'string') : undefined;

        // Custom metadata: <CustomMetaData><MetaDataItem><FieldID>...<Value>...
        let customMetadata: Record<string, string> | undefined;
        const customMetaXml = getTagContent(metadataXml, 'CustomMetaData');
        if (customMetaXml) {
            const metaItems = getAllTags(customMetaXml, 'MetaDataItem');
            for (const miXml of metaItems) {
                const fieldId = getTagContent(miXml, 'FieldID');
                const value = getTagContent(miXml, 'Value');
                if (fieldId && value) {
                    const label = customMetaFieldNames.get(fieldId) || fieldId;
                    customMetadata ??= {};
                    customMetadata[label] = value;
                }
            }
        }

        // Children — use depth-aware extraction since <Children> can be nested
        const childrenXml = getTagContentNested(body, 'Children');
        const children = childrenXml ? parseBinder(childrenXml, labelTitles, statusTitles, customMetaFieldNames) : [];

        // Inherit binderType recursively for all descendants of known containers.
        // This ensures grandchildren (e.g. scenes inside sub-folders of the
        // manuscript folder) are correctly classified even when intermediate
        // folders weren't individually recognised.
        // For research/notes containers, also set sourceFolder so child items
        // are grouped into sub-folders during import.
        if (binderType !== 'unknown') {
            const propagateType = (list: BinderItem[], folder?: string) => {
                for (const child of list) {
                    if (child.binderType === 'unknown') {
                        child.binderType = binderType;
                    }
                    // Track sub-folder for research/notes children
                    if (folder && !child.sourceFolder && (binderType === 'research' || binderType === 'notes')) {
                        child.sourceFolder = folder;
                    }
                    // If this child is itself a Folder, its children belong to its title
                    const nextFolder = child.type === 'Folder' ? child.title : folder;
                    if (child.children.length) propagateType(child.children, nextFolder);
                }
            };
            // For the top-level research/notes container, children that are
            // sub-folders use their own title; direct Text items get no sub-folder.
            propagateType(children);
        }

        items.push({
            uuid,
            title,
            type,
            binderType,
            children,
            synopsis,
            labelTitle: labelId ? labelTitles.get(labelId) : undefined,
            statusTitle: statusId ? statusTitles.get(statusId) : undefined,
            keywords,
            includeInCompile: includeStr ? includeStr.toLowerCase() === 'yes' : undefined,
            customMetadata,
            iconFileName,
        });
    }

    return items;
}


/** Map known Scrivener icon filenames to StoryLine import categories. */
const SCRIVENER_ICON_MAP: Record<string, BinderType> = {
    'Outline.tiff': 'research',
    'Notes (White Notepad).tiff': 'notes',
    'Characters (Character Sheet).tiff': 'characters',
    'Locations (Location Sheet).tiff': 'locations',
    'Filing Cabinet.tiff': 'notes',
    'Inbox.tiff': 'research',
    'Information.tiff': 'research',
};

/** Icons on DraftFolder sub-folders that indicate the folder is NOT a book. */
const NON_BOOK_ICONS = new Set([
    'Filing Cabinet.tiff',
    'Inbox.tiff',
]);

// ────────────────────────────────────────────────────
//  Main importer class
// ────────────────────────────────────────────────────

export class ScrivenerImporter {
    private app: App;
    private plugin: SceneCardsPlugin;

    constructor(app: App, plugin: SceneCardsPlugin) {
        this.app = app;
        this.plugin = plugin;
    }

    /** Check if we are running on desktop (Node.js available). */
    static isAvailable(): boolean {
        return !!(fs && nodePath);
    }

    /**
     * Import a .scriv project.
     * @param scrivPath Absolute path to the .scriv folder on disk.
     */
    async import(scrivPath: string): Promise<ImportResult> {
        if (!fs || !nodePath) {
            throw new Error('Scrivener import is only available on desktop.');
        }

        const warnings: string[] = [];

        // ── 0. Detect unsupported Scrivener 1.x Mac format ──
        const entries = fs.readdirSync(scrivPath);
        if (entries.some((f: string) => f === 'binder.scrivproj')) {
            throw new Error(
                'This is a Scrivener 1.x (Mac) project which uses an unsupported format. '
                + 'Please open it in Scrivener 3 and let it convert, then try importing again.',
            );
        }

        // ── 1. Locate and read project.scrivx ──
        const scrivxFile = entries.find((f: string) => f.endsWith('.scrivx'));
        if (!scrivxFile) {
            throw new Error('No .scrivx file found in the selected folder.');
        }
        const scrivxPath = nodePath.join(scrivPath, scrivxFile);
        let scrivxContent = fs.readFileSync(scrivxPath, 'utf-8');

        // If the .scrivx is a mobile stub (Scrivener iOS sync), use Mobile/binder.mob instead
        if (scrivxContent.includes('MobileStub="Yes"') || !/<Binder[\s>]/i.test(scrivxContent)) {
            const mobPath = nodePath.join(scrivPath, 'Mobile', 'binder.mob');
            if (fs.existsSync(mobPath)) {
                scrivxContent = fs.readFileSync(mobPath, 'utf-8');
            } else {
                throw new Error(
                    'This appears to be a Scrivener iOS mobile stub with no binder data. '
                    + 'Open it in Scrivener desktop first to sync the full project, then try again.',
                );
            }
        }

        // ── 2. Parse binder tree ──
        const parsed = parseScrivx(scrivxContent);
        // Prefer .scriv folder name over XML <ProjectTitle> (which is often absent)
        const folderName = nodePath.basename(scrivPath).replace(/\.scriv$/i, '');
        const projectTitle = folderName || parsed.title;
        const binder = parsed.binder;

        // ── 2b. Ask user about unknown folders ──
        const unknownFolders = this.getUnknownFolders(binder);
        if (unknownFolders.length > 0) {
            const choices = await openFolderClassificationModal(this.app, unknownFolders);
            if (!choices) {
                // User cancelled
                throw new Error('Import cancelled.');
            }
            this.applyFolderClassifications(binder, choices);
        }

        // ── 3. Detect multi-book (series) vs single-book ──
        const safeName = projectTitle.replace(/[\\/:*?"<>|]/g, '-');
        const manuscriptRoots = binder.filter(it => it.binderType === 'manuscript');
        const draftFolder = manuscriptRoots[0];

        // Collect direct sub-folders of the DraftFolder
        const allDraftSubFolders = draftFolder
            ? draftFolder.children.filter(c => c.type === 'Folder' && c.children.length > 0)
            : [];

        // Exclude folders whose Scrivener icon indicates they're not actual books
        // (e.g. "Utkast" with Filing Cabinet icon = old drafts/archive)
        const bookFolders = allDraftSubFolders.filter(
            c => !c.iconFileName || !NON_BOOK_ICONS.has(c.iconFileName),
        );

        // Reclassify excluded non-book folders as research
        for (const folder of allDraftSubFolders) {
            if (folder.iconFileName && NON_BOOK_ICONS.has(folder.iconFileName)) {
                this.reclassifySubtree(folder, 'research', folder.title);
            }
        }

        const isSeries = bookFolders.length >= 2;

        // In series mode: reclassify non-chapter sub-folders within books
        // based on their Scrivener icon (Outline → research, Notes → notes, etc.)
        if (isSeries) {
            for (const book of bookFolders) {
                this.reclassifyBookSubfolders(book);
            }
        }

        const result: ImportResult = {
            projectTitle: safeName,
            scenesImported: 0,
            charactersImported: 0,
            locationsImported: 0,
            researchImported: 0,
            notesImported: 0,
            codexImported: 0,
            filesImported: 0,
            codexCategoriesCreated: [],
            warnings,
        };

        // folders holds the targets for non-scene items (characters, research, etc.)
        // For series: shared codex at series level, notes/research in first book
        // For single book: everything in the one project
        let folders: {
            sceneFolder: string;      // only used in single-book mode
            characterFolder: string;
            locationFolder: string;
            codexFolder: string;
            researchFolder: string;
            notesFolder: string;
        };

        // bookSceneFolders maps book title → scene folder path (series mode)
        const bookSceneFolders = new Map<string, string>();
        // bookSceneCounters tracks per-book scene numbering
        const bookSceneCounters = new Map<string, number>();
        // Per-book research and notes folders (series mode)
        const bookResearchFolders = new Map<string, string>();
        const bookNotesFolders = new Map<string, string>();

        let lastProject: Awaited<ReturnType<typeof this.plugin.sceneManager.createProject>>;

        if (isSeries) {
            // ── 3a. Create series structure ──
            const root = this.plugin.settings.storyLineRoot;
            const seriesFolder = normalizePath(`${root}/${safeName}`);
            const adapter = this.app.vault.adapter;

            // Create series folder
            if (!await adapter.exists(seriesFolder)) {
                await adapter.mkdir(seriesFolder);
            }

            // Create shared Codex at series level
            const seriesCodexFolder = normalizePath(`${seriesFolder}/Codex`);
            const seriesCharFolder = normalizePath(`${seriesCodexFolder}/Characters`);
            const seriesLocFolder = normalizePath(`${seriesCodexFolder}/Locations`);
            for (const f of [seriesCodexFolder, seriesCharFolder, seriesLocFolder]) {
                if (!await adapter.exists(f)) await adapter.mkdir(f);
            }

            // Write series.json
            const now = new Date().toISOString().split('T')[0];
            const bookNames = bookFolders.map(bf =>
                (bf.title || 'Untitled').replace(/[\\/:*?"<>|]/g, '-')
            );
            const meta: SeriesMetadata = {
                name: projectTitle,
                bookOrder: bookNames,
                created: now,
            };
            const metaPath = normalizePath(`${seriesFolder}/series.json`);
            await adapter.write(metaPath, JSON.stringify(meta, null, 2));

            // Create one project per book
            let firstProject: typeof lastProject | null = null;
            for (const bookItem of bookFolders) {
                const bookName = (bookItem.title || 'Untitled').replace(/[\\/:*?"<>|]/g, '-');
                const bookProject = await this.plugin.sceneManager.createProject(bookName, '', seriesFolder);

                // Set seriesId and save
                bookProject.seriesId = safeName;
                await this.plugin.sceneManager.saveProjectFrontmatter(bookProject);

                bookSceneFolders.set(bookItem.title, bookProject.sceneFolder);
                bookSceneCounters.set(bookItem.title, 0);
                bookResearchFolders.set(bookItem.title, bookProject.researchFolder);
                bookNotesFolders.set(bookItem.title, bookProject.notesFolder);

                // Tag all descendants of this book folder with bookTitle
                const tagBook = (items: BinderItem[], title: string) => {
                    for (const it of items) {
                        it.bookTitle = title;
                        if (it.children.length) tagBook(it.children, title);
                    }
                };
                tagBook(bookItem.children, bookItem.title);

                if (!firstProject) firstProject = bookProject;
                lastProject = bookProject;
            }

            // Non-scene items go to shared codex / first book's folders
            folders = {
                sceneFolder: firstProject!.sceneFolder,  // fallback for loose manuscript items
                characterFolder: seriesCharFolder,
                locationFolder: seriesLocFolder,
                codexFolder: seriesCodexFolder,
                researchFolder: firstProject!.researchFolder,
                notesFolder: firstProject!.notesFolder,
            };

            new Notice(`Creating series "${projectTitle}" with ${bookFolders.length} books…`, 3000);
        } else {
            // ── 3b. Single-book project ──
            const project = await this.plugin.sceneManager.createProject(safeName);
            lastProject = project;
            folders = {
                sceneFolder: project.sceneFolder,
                characterFolder: project.characterFolder,
                locationFolder: project.locationFolder,
                codexFolder: project.codexFolder,
                researchFolder: project.researchFolder,
                notesFolder: project.notesFolder,
            };
        }

        // ── 3c. Register custom Codex categories before importing items ──
        const codexCategories = this.collectCodexCategories(binder);
        for (const { id, label } of codexCategories) {
            await this.registerCodexCategory(id, label, folders.codexFolder);
            result.codexCategoriesCreated.push(label);
        }

        // ── 4. Walk the binder and import items ──
        const flatItems = this.flattenBinder(binder);
        const isContainer = (t: string) => /^(Folder|DraftFolder|ResearchFolder|TrashFolder)$/i.test(t);
        const total = flatItems.filter(it => !isContainer(it.type) && it.children.length === 0 && it.binderType !== 'trash').length;
        let processed = 0;
        let sceneIndex = 0;  // running counter for single-book scene ordering

        for (const item of flatItems) {
            // Skip container folders, trash, and items with children (logical containers)
            if (item.binderType === 'trash') continue;
            if (isContainer(item.type) || item.children.length > 0) continue;

            processed++;
            if (processed % 10 === 0) {
                new Notice(`Importing… ${processed}/${total}`, 2000);
            }
            // Allow UI to breathe
            if (processed % 5 === 0) {
                await new Promise(r => window.setTimeout(r, 0));
            }

            // Read content — may be RTF, plain text, image, PDF, or other binary
            const contentFile = this.findContentFile(scrivPath, item.uuid);
            let mdBody = '';
            let binarySourcePath: string | null = null;

            if (contentFile) {
                const ext = contentFile.ext.toLowerCase();
                if (ext === 'rtf') {
                    const rtfContent = fs.readFileSync(contentFile.path, 'utf-8');
                    mdBody = rtfToMarkdown(rtfContent);
                } else if (TEXT_EXTENSIONS.has(ext)) {
                    mdBody = fs.readFileSync(contentFile.path, 'utf-8');
                } else {
                    // Binary file (image, PDF, etc.) — will be copied into vault
                    binarySourcePath = contentFile.path;
                }
            } else {
                warnings.push(`No content file found for "${item.title}" (UUID: ${item.uuid})`);
            }

            const safeTitle = (item.title || 'Untitled').replace(/[\\/:*?"<>|]/g, '-');

            try {
                // Binary files (images, PDFs, etc.) are copied to the target folder
                // with a markdown note wrapping them (embed or link).
                if (binarySourcePath) {
                    // In series mode, resolve per-book research/notes folders for the item
                    const binaryFolders = (isSeries && item.bookTitle)
                        ? {
                            ...folders,
                            researchFolder: bookResearchFolders.get(item.bookTitle) || folders.researchFolder,
                            notesFolder: bookNotesFolders.get(item.bookTitle) || folders.notesFolder,
                        }
                        : folders;
                    const targetFolder = this.folderForType(item.binderType, binaryFolders, item);
                    await this.importBinaryFile(targetFolder, safeTitle, binarySourcePath, item);
                    result.filesImported++;
                } else {
                    switch (item.binderType) {
                        case 'manuscript': {
                            // In series mode, route to the correct book's scene folder
                            let targetSceneFolder = folders.sceneFolder;
                            let idx: number;
                            if (isSeries && item.bookTitle && bookSceneFolders.has(item.bookTitle)) {
                                targetSceneFolder = bookSceneFolders.get(item.bookTitle)!;
                                const count = (bookSceneCounters.get(item.bookTitle) || 0) + 1;
                                bookSceneCounters.set(item.bookTitle, count);
                                idx = count;
                            } else {
                                sceneIndex++;
                                idx = sceneIndex;
                            }
                            await this.importScene(targetSceneFolder, safeTitle, mdBody, item, idx);
                            result.scenesImported++;
                            break;
                        }
                        case 'characters':
                            await this.importCharacter(folders.characterFolder, safeTitle, mdBody, item);
                            result.charactersImported++;
                            break;
                        case 'locations':
                            await this.importLocation(folders.locationFolder, safeTitle, mdBody, item);
                            result.locationsImported++;
                            break;
                        case 'research': {
                            let targetResearchFolder = folders.researchFolder;
                            if (isSeries && item.bookTitle && bookResearchFolders.has(item.bookTitle)) {
                                targetResearchFolder = bookResearchFolders.get(item.bookTitle)!;
                            }
                            await this.importResearch(targetResearchFolder, safeTitle, mdBody, item);
                            result.researchImported++;
                            break;
                        }
                        case 'codex':
                            if (item.codexCategoryId && item.codexCategoryLabel) {
                                await this.importCodexEntry(
                                    folders.codexFolder, item.codexCategoryId,
                                    item.codexCategoryLabel, safeTitle, mdBody, item,
                                );
                                result.codexImported++;
                            } else {
                                await this.importNote(folders.notesFolder, safeTitle, mdBody, item);
                                result.notesImported++;
                            }
                            break;
                        case 'notes': {
                            let targetNotesFolder = folders.notesFolder;
                            if (isSeries && item.bookTitle && bookNotesFolders.has(item.bookTitle)) {
                                targetNotesFolder = bookNotesFolders.get(item.bookTitle)!;
                            }
                            await this.importNote(targetNotesFolder, safeTitle, mdBody, item);
                            result.notesImported++;
                            break;
                        }
                        default:
                            await this.importNote(folders.notesFolder, safeTitle, mdBody, item);
                            result.notesImported++;
                            break;
                    }
                }
            } catch (err: unknown) {
                warnings.push(`Failed to import "${item.title}": ${(err instanceof Error ? err.message : String(err))}`);
            }
        }

        // ── 5. Refresh ──
        await this.plugin.sceneManager.setActiveProject(lastProject!);
        this.plugin.refreshOpenViews();

        return result;
    }

    // ────────────────────────────────────
    //  Helpers
    // ────────────────────────────────────

    /**
     * Reclassify sub-folders inside a book folder based on their Scrivener icon.
     * E.g. an "Outline" folder (Outline.tiff) → research, not scenes.
     * Also catches direct Text items titled "Synopsis" inside book folders.
     */
    private reclassifyBookSubfolders(bookFolder: BinderItem): void {
        for (const child of bookFolder.children) {
            if (child.type === 'Folder' && child.iconFileName) {
                const mapped = SCRIVENER_ICON_MAP[child.iconFileName];
                if (mapped && mapped !== 'manuscript') {
                    this.reclassifySubtree(child, mapped, child.title);
                }
            }
            // Direct Text items with "Synopsis" in the title → research
            if (child.type === 'Text' && /synopsis/i.test(child.title) && child.binderType === 'manuscript') {
                child.binderType = 'research';
                child.sourceFolder = 'Synopsis';
            }
        }
    }

    /**
     * Recursively reclassify a folder and its descendants to a new binder type.
     * Child folders with their own recognised Scrivener icon get that type instead.
     */
    private reclassifySubtree(item: BinderItem, newType: BinderType, sourceFolder: string): void {
        item.binderType = newType;
        if (newType === 'research' || newType === 'notes') {
            item.sourceFolder = sourceFolder;
        }
        for (const child of item.children) {
            // Check if child folder has its own icon suggesting a more specific type
            let childType = newType;
            let childSource = sourceFolder;
            if (child.type === 'Folder' && child.iconFileName) {
                const mapped = SCRIVENER_ICON_MAP[child.iconFileName];
                if (mapped) {
                    childType = mapped;
                    childSource = child.title;
                }
            }
            this.reclassifySubtree(child, childType, childSource);
        }
    }

    /**
     * Flatten the binder tree into a list.
     * For manuscript items, tracks the ancestor folder titles so scenes can
     * record their part/chapter hierarchy in frontmatter.
     */
    private flattenBinder(items: BinderItem[]): BinderItem[] {
        const flat: BinderItem[] = [];
        const walk = (list: BinderItem[], ancestorFolders: string[]) => {
            for (const item of list) {
                item.parentFolders = ancestorFolders;
                flat.push(item);
                if (item.children.length) {
                    // Only accumulate folder titles inside manuscript sections
                    const nextAncestors = (item.binderType === 'manuscript' && item.type === 'Folder')
                        ? [...ancestorFolders, item.title]
                        : ancestorFolders;
                    walk(item.children, nextAncestors);
                }
            }
        };
        walk(items, []);
        return flat;
    }

    /**
     * Collect top-level binder folders that have binderType 'unknown'.
     * These need user classification before import.
     */
    private getUnknownFolders(binder: BinderItem[]): BinderItem[] {
        return binder.filter(item =>
            item.binderType === 'unknown' &&
            (item.type === 'Folder' || item.children.length > 0)
        );
    }

    /**
     * Apply user-chosen classifications to the binder tree.
     * Each choice maps a folder title to a target type.
     */
    private applyFolderClassifications(
        binder: BinderItem[],
        choices: Map<string, FolderClassification>,
    ): void {
        for (const item of binder) {
            if (item.binderType !== 'unknown') continue;
            const choice = choices.get(item.uuid);
            if (!choice) continue;

            if (choice.type === 'codex') {
                const label = item.title || 'Misc';
                const id = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
                item.binderType = 'codex';
                item.codexCategoryId = id;
                item.codexCategoryLabel = label;
                const markChildren = (children: BinderItem[]) => {
                    for (const child of children) {
                        child.binderType = 'codex';
                        child.codexCategoryId = id;
                        child.codexCategoryLabel = label;
                        if (child.children.length) markChildren(child.children);
                    }
                };
                markChildren(item.children);
            } else if (choice.type === 'skip') {
                // Mark as trash so it's skipped during import
                item.binderType = 'trash';
                const markTrash = (children: BinderItem[]) => {
                    for (const child of children) {
                        child.binderType = 'trash';
                        if (child.children.length) markTrash(child.children);
                    }
                };
                markTrash(item.children);
            } else {
                // notes, research, manuscript
                const bt = choice.type as BinderType;
                item.binderType = bt;
                // For research/notes: set sourceFolder to the containing folder title
                // so items are grouped into sub-folders during import
                const folderTitle = (bt === 'research' || bt === 'notes') ? item.title : undefined;
                const propagate = (children: BinderItem[], folder?: string) => {
                    for (const child of children) {
                        if (child.binderType === 'unknown') child.binderType = bt;
                        if (folder && !child.sourceFolder) child.sourceFolder = folder;
                        const nextFolder = child.type === 'Folder' ? child.title : folder;
                        if (child.children.length) propagate(child.children, nextFolder);
                    }
                };
                propagate(item.children, folderTitle);
            }
        }
    }

    /** Collect unique custom Codex categories found in the binder. */
    private collectCodexCategories(binder: BinderItem[]): Array<{ id: string; label: string }> {
        const seen = new Map<string, string>();
        const walk = (items: BinderItem[]) => {
            for (const item of items) {
                if (item.binderType === 'codex' && item.codexCategoryId && item.codexCategoryLabel) {
                    if (!seen.has(item.codexCategoryId)) {
                        seen.set(item.codexCategoryId, item.codexCategoryLabel);
                    }
                }
                if (item.children.length) walk(item.children);
            }
        };
        walk(binder);
        return Array.from(seen.entries()).map(([id, label]) => ({ id, label }));
    }

    /**
     * Register a custom Codex category in plugin settings (if not already there)
     * and create its folder under the Codex directory.
     */
    private async registerCodexCategory(id: string, label: string, codexFolder: string): Promise<void> {
        const settings = this.plugin.settings;

        // Add to custom categories list if not present
        if (!settings.codexCustomCategories) settings.codexCustomCategories = [];
        if (!settings.codexCustomCategories.some((c: { id: string }) => c.id === id)) {
            settings.codexCustomCategories.push({ id, label, icon: 'file-text' });
        }

        // Enable the category
        if (!settings.codexEnabledCategories) settings.codexEnabledCategories = [];
        if (!settings.codexEnabledCategories.includes(id)) {
            settings.codexEnabledCategories.push(id);
        }

        await this.plugin.saveSettings();

        // Create the folder
        const catFolder = normalizePath(`${codexFolder}/${label}`);
        await this.ensureFolder(catFolder);

        // Re-initialize CodexManager so it knows the new category
        const customDefs = settings.codexCustomCategories.map(
            (cc: { id: string; label: string; icon: string }) => makeCustomCodexCategory(cc.id, cc.label, cc.icon)
        );
        this.plugin.codexManager.initCategories(settings.codexEnabledCategories, customDefs);
    }

    /**
     * Find the content file for a given UUID in the .scriv bundle.
     * Returns the absolute path + extension, or null if nothing found.
     * Supports Scrivener 3 (Files/Data/<UUID>/) and Scrivener 2 (Files/Docs/) layouts.
     */
    private findContentFile(scrivPath: string, uuid: string): { path: string; ext: string } | null {
        if (!fs || !nodePath || !uuid) return null;

        // Try each known data directory: Scrivener 3 desktop, Scrivener iOS/mobile-sync, Scrivener 2
        // Some projects only have Mobile/Data (no Files/Data) when synced from iOS.
        const dataDirs = [
            nodePath.join(scrivPath, 'Files', 'Data'),
            nodePath.join(scrivPath, 'Mobile', 'Data'),
        ];

        for (const dataDir of dataDirs) {
            // Try exact match first, then case-insensitive scan
            let targetDir: string | null = null;
            const exactDir = nodePath.join(dataDir, uuid);
            if (fs.existsSync(exactDir) && fs.statSync(exactDir).isDirectory()) {
                targetDir = exactDir;
            } else if (fs.existsSync(dataDir)) {
                // Scan for case-insensitive UUID match
                const uuidLower = uuid.toLowerCase();
                try {
                    const dirs = fs.readdirSync(dataDir) as string[];
                    const match = dirs.find((d: string) => d.toLowerCase() === uuidLower);
                    if (match) {
                        const candidate = nodePath.join(dataDir, match);
                        if (fs.statSync(candidate).isDirectory()) {
                            targetDir = candidate;
                        }
                    }
                } catch { /* ignore scan errors */ }
            }

            if (targetDir) {
                try {
                    const files = fs.readdirSync(targetDir) as string[];
                    // Prefer content.rtf, then any content.* file, then first non-system file
                    const contentFile = files.find((f: string) => f.toLowerCase() === 'content.rtf')
                        || files.find((f: string) => f.toLowerCase().startsWith('content.'))
                        || files.find((f: string) => !f.startsWith('.') && f.toLowerCase() !== 'snapshot.xml' && f.toLowerCase() !== 'search.indexes');
                    if (contentFile) {
                        const ext = contentFile.includes('.') ? contentFile.split('.').pop()! : '';
                        return { path: nodePath.join(targetDir, contentFile), ext };
                    }
                } catch { /* ignore read errors */ }
            }
        }

        // Scrivener 2: Files/Docs/<uuid>.rtf (or other extensions)
        const v2Dir = nodePath.join(scrivPath, 'Files', 'Docs');
        if (fs.existsSync(v2Dir)) {
            try {
                const v2Files = fs.readdirSync(v2Dir) as string[];
                const uuidLower = uuid.toLowerCase();
                const match = v2Files.find((f: string) => {
                    const name = f.substring(0, f.lastIndexOf('.'));
                    return name.toLowerCase() === uuidLower;
                });
                if (match) {
                    const ext = match.includes('.') ? match.split('.').pop()! : '';
                    return { path: nodePath.join(v2Dir, match), ext };
                }
            } catch { /* ignore read errors */ }
        }

        return null;
    }

    /** Ensure a vault folder exists. */
    private async ensureFolder(path: string): Promise<void> {
        const normalized = normalizePath(path);
        if (!this.app.vault.getAbstractFileByPath(normalized)) {
            await this.app.vault.createFolder(normalized);
        }
    }

    /** Deduplicate file path if it already exists. */
    private async uniquePath(filePath: string): Promise<string> {
        let candidate = filePath;
        let n = 1;
        while (this.app.vault.getAbstractFileByPath(candidate)) {
            const ext = filePath.lastIndexOf('.');
            const base = ext > 0 ? filePath.substring(0, ext) : filePath;
            const extension = ext > 0 ? filePath.substring(ext) : '';
            candidate = `${base} ${n}${extension}`;
            n++;
        }
        return candidate;
    }

    // ────────────────────────────────────
    //  Import by category
    // ────────────────────────────────────

    private async importScene(
        sceneFolder: string,
        title: string,
        body: string,
        item: BinderItem,
        index: number = 0,
    ): Promise<void> {
        await this.ensureFolder(sceneFolder);
        const now = new Date().toISOString().split('T')[0];
        const fm: Record<string, unknown> = {
            type: 'scene',
            title,
            status: mapStatus(item.statusTitle),
            created: now,
            modified: now,
        };

        if (item.synopsis) fm.subtitle = item.synopsis;
        if (item.labelTitle) fm.tags = [item.labelTitle];
        if (item.keywords?.length) {
            fm.tags = [...((fm.tags as string[] | undefined) || []), ...item.keywords];
        }

        // Preserve Scrivener folder hierarchy as part/chapter
        if (item.parentFolders && item.parentFolders.length > 0) {
            if (item.parentFolders.length >= 2) {
                // Parts → Chapters → Scenes structure
                fm.part = item.parentFolders[0];
                fm.chapter = item.parentFolders[1];
            } else {
                // Chapters → Scenes (single folder level)
                fm.chapter = item.parentFolders[0];
            }
        }

        // Flag non-compiled items (planning docs, outlines, etc.)
        if (item.includeInCompile === false) {
            fm.compile = false;
        }

        const locale = this.plugin.sceneManager?.activeProject?.locale ?? DEFAULT_STORYLINE_LOCALE;
        const wordcount = tokenizeWords(body, locale).length;
        fm.wordcount = wordcount;

        fm.order = index;

        const content = `---\n${stringifyYaml(fm)}---\n\n${body}`;
        const prefix = index > 0 ? String(index).padStart(3, '0') + ' - ' : '';
        const filePath = await this.uniquePath(normalizePath(`${sceneFolder}/${prefix}${title}.md`));
        await this.app.vault.create(filePath, content);
    }

    private async importCharacter(
        charFolder: string,
        name: string,
        body: string,
        item: BinderItem,
    ): Promise<void> {
        await this.ensureFolder(charFolder);
        const now = new Date().toISOString().split('T')[0];
        const fm: Record<string, unknown> = {
            type: 'character',
            name,
            created: now,
            modified: now,
        };

        if (item.synopsis) fm.tagline = item.synopsis;
        if (item.keywords?.length) fm.tags = item.keywords;
        if (item.customMetadata && Object.keys(item.customMetadata).length > 0) {
            fm.custom = item.customMetadata;
        }

        const content = `---\n${stringifyYaml(fm)}---\n\n${body}`;
        const filePath = await this.uniquePath(normalizePath(`${charFolder}/${name}.md`));
        await this.app.vault.create(filePath, content);
    }

    private async importLocation(
        locFolder: string,
        name: string,
        body: string,
        item: BinderItem,
    ): Promise<void> {
        await this.ensureFolder(locFolder);
        const now = new Date().toISOString().split('T')[0];
        const fm: Record<string, unknown> = {
            type: 'location',
            name,
            created: now,
            modified: now,
        };

        if (item.synopsis) fm.description = item.synopsis;
        if (item.keywords?.length) fm.tags = item.keywords;
        if (item.customMetadata && Object.keys(item.customMetadata).length > 0) {
            fm.custom = item.customMetadata;
        }

        const content = `---\n${stringifyYaml(fm)}---\n\n${body}`;
        const filePath = await this.uniquePath(normalizePath(`${locFolder}/${name}.md`));
        await this.app.vault.create(filePath, content);
    }

    private async importResearch(
        researchFolder: string,
        title: string,
        body: string,
        item: BinderItem,
    ): Promise<void> {
        // If the item came from a named Scrivener folder, create a sub-folder
        const targetFolder = item.sourceFolder
            ? normalizePath(`${researchFolder}/${item.sourceFolder.replace(/[\/\/:*?"<>|]/g, '-')}`)
            : researchFolder;
        await this.ensureFolder(targetFolder);
        const now = new Date().toISOString().split('T')[0];
        const fm: Record<string, unknown> = {
            type: 'research',
            researchType: 'note',
            title,
            created: now,
            modified: now,
        };

        if (item.keywords?.length) fm.tags = item.keywords;
        if (item.customMetadata && Object.keys(item.customMetadata).length > 0) {
            fm.custom = item.customMetadata;
        }

        const content = `---\n${stringifyYaml(fm)}---\n\n${body}`;
        const filePath = await this.uniquePath(normalizePath(`${targetFolder}/${title}.md`));
        await this.app.vault.create(filePath, content);
    }

    private async importNote(
        notesFolder: string,
        title: string,
        body: string,
        item: BinderItem,
    ): Promise<void> {
        const targetFolder = item.sourceFolder
            ? normalizePath(`${notesFolder}/${item.sourceFolder.replace(/[\\/:*?"<>|]/g, '-')}`)
            : notesFolder;
        await this.ensureFolder(targetFolder);
        const content = `# ${title}\n\n${body}`;
        const filePath = await this.uniquePath(normalizePath(`${targetFolder}/${title}.md`));
        await this.app.vault.create(filePath, content);
    }

    /** Determine the vault folder for an item based on its binder type. */
    private folderForType(
        binderType: BinderType,
        folders: { sceneFolder: string; characterFolder: string; locationFolder: string; codexFolder: string; researchFolder: string; notesFolder: string },
        item: BinderItem,
    ): string {
        const subfolder = item.sourceFolder?.replace(/[\\/:*?"<>|]/g, '-');
        switch (binderType) {
            case 'manuscript': return folders.sceneFolder;
            case 'characters': return folders.characterFolder;
            case 'locations': return folders.locationFolder;
            case 'research':
                return subfolder
                    ? normalizePath(`${folders.researchFolder}/${subfolder}`)
                    : folders.researchFolder;
            case 'codex':
                if (item.codexCategoryId && item.codexCategoryLabel) {
                    return normalizePath(`${folders.codexFolder}/${item.codexCategoryLabel}`);
                }
                return subfolder
                    ? normalizePath(`${folders.notesFolder}/${subfolder}`)
                    : folders.notesFolder;
            default:
                return subfolder
                    ? normalizePath(`${folders.notesFolder}/${subfolder}`)
                    : folders.notesFolder;
        }
    }

    /**
     * Import a binary file (image, PDF, etc.) into the vault.
     * Creates the binary file + a companion .md note embedding or linking it.
     */
    private async importBinaryFile(
        targetFolder: string,
        title: string,
        sourcePath: string,
        item: BinderItem,
    ): Promise<void> {
        if (!fs || !nodePath) return;
        await this.ensureFolder(targetFolder);

        const ext = sourcePath.includes('.') ? sourcePath.split('.').pop()!.toLowerCase() : 'bin';
        const safeFileName = `${title}.${ext}`;

        // Copy binary into vault
        const binaryVaultPath = await this.uniquePath(normalizePath(`${targetFolder}/${safeFileName}`));
        const data = fs.readFileSync(sourcePath);
        await this.app.vault.createBinary(binaryVaultPath, data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength));

        // For images and PDFs: create a companion markdown note that embeds/links it
        if (EMBEDDABLE_EXTENSIONS.has(ext)) {
            const now = new Date().toISOString().split('T')[0];
            const fm: Record<string, unknown> = {
                type: 'research',
                researchType: IMAGE_EXTENSIONS.has(ext) ? 'image' : 'file',
                title,
                created: now,
                modified: now,
            };
            if (item.synopsis) fm.description = item.synopsis;
            if (item.keywords?.length) fm.tags = item.keywords;

            const fileName = binaryVaultPath.split('/').pop() || safeFileName;
            const embed = `![[${fileName}]]`;
            const content = `---\n${stringifyYaml(fm)}---\n\n${embed}\n`;
            const notePath = await this.uniquePath(normalizePath(`${targetFolder}/${title}.md`));
            await this.app.vault.create(notePath, content);
        }
    }

    private async importCodexEntry(
        codexFolder: string,
        categoryId: string,
        categoryLabel: string,
        name: string,
        body: string,
        item: BinderItem,
    ): Promise<void> {
        const catFolder = normalizePath(`${codexFolder}/${categoryLabel}`);
        await this.ensureFolder(catFolder);
        const now = new Date().toISOString().split('T')[0];
        const fm: Record<string, unknown> = {
            type: categoryId,
            name,
            created: now,
            modified: now,
        };

        if (item.synopsis) fm.description = item.synopsis;
        if (item.keywords?.length) fm.tags = item.keywords;
        if (item.customMetadata && Object.keys(item.customMetadata).length > 0) {
            fm.custom = item.customMetadata;
        }

        const content = `---\n${stringifyYaml(fm)}---\n\n${body}`;
        const filePath = await this.uniquePath(normalizePath(`${catFolder}/${name}.md`));
        await this.app.vault.create(filePath, content);
    }
}
/* eslint-enable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-floating-promises, @typescript-eslint/no-misused-promises, @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/no-redundant-type-constituents, @typescript-eslint/no-unused-vars, no-unused-vars, no-useless-escape, no-control-regex, no-empty -- end of file-wide suppression block opened at line 1 */
