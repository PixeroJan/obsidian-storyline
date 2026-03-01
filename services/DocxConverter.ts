/**
 * StoryLine DOCX Converter
 * 
 * Adapted from the ToWord Obsidian plugin (MIT License) by PixeroJan.
 * https://github.com/PixeroJan/obsidian-toword
 * 
 * All types and classes are prefixed with "SL" to avoid naming collisions
 * if both StoryLine and ToWord are installed simultaneously.
 */

import { zip, strToU8 } from 'fflate';
import MarkdownIt from 'markdown-it';
import { full as markdownItEmoji } from 'markdown-it-emoji';
import markdownItMark from 'markdown-it-mark';
import hljs from 'highlight.js';

// ── Settings interface (StoryLine-scoped) ──────────────────────

export interface SLDocxSettings {
    defaultFontFamily: string;
    defaultFontSize: number;
    includeMetadata: boolean;
    preserveFormatting: boolean;
    useObsidianAppearance: boolean;
    includeFilenameAsHeader: boolean;
    pageSize: 'A4' | 'A5' | 'A3' | 'Letter' | 'Legal' | 'Tabloid';
    chunkingThreshold: number;
    enablePreprocessing: boolean;
}

export const SL_DEFAULT_DOCX_SETTINGS: SLDocxSettings = {
    defaultFontFamily: 'Calibri',
    defaultFontSize: 11,
    includeMetadata: false,
    preserveFormatting: true,
    useObsidianAppearance: true,
    includeFilenameAsHeader: false,
    pageSize: 'A4',
    chunkingThreshold: 100000,
    enablePreprocessing: false,
};

// ── Internal interfaces ────────────────────────────────────────

interface SLTextStyle {
    bold?: boolean;
    italic?: boolean;
    strikethrough?: boolean;
    code?: boolean;
    highlight?: boolean;
    underline?: boolean;
    color?: string;
    superScript?: boolean;
    subScript?: boolean;
    backgroundColor?: string;
    codeBlock?: boolean;
}

export interface SLObsidianFontSettings {
    textFont: string;
    monospaceFont: string;
    baseFontSize: number;
    lineHeight: number;
    sizeMultiplier: number;
    headingSizes: number[];
    headingFonts: string[];
    headingColors: string[];
}

interface SLDocumentElement {
    type: 'paragraph' | 'heading' | 'list' | 'codeblock' | 'table' | 'break' | 'blockquote' | 'tasklist' | 'horizontal-rule' | 'image';
    content?: string;
    level?: number;
    style?: SLTextStyle;
    children?: SLDocumentElement[];
    rows?: string[][];
    alignments?: string[];
    language?: string;
    listType?: 'ordered' | 'unordered';
    items?: string[];
    tasks?: Array<{ checked: boolean; text: string }>;
    quoteLevel?: number;
    imageData?: ArrayBuffer;
    imageAlt?: string;
    imageWidth?: number;
    imageHeight?: number;
}

// ── Converter class ────────────────────────────────────────────

export class SLMarkdownToDocxConverter {
    private settings: SLDocxSettings;
    private obsidianFonts: SLObsidianFontSettings | null = null;
    private filename: string = '';
    private resourceLoader?: (link: string) => Promise<ArrayBuffer | null>;
    private footnoteDefinitions: Map<string, string> = new Map();
    private footnotes: { [key: string]: string } = {};
    private usedFootnotes: string[] = [];
    private imageCounter: number = 0;
    private imageRelationships: Array<{id: string, data: ArrayBuffer, extension: string}> = [];
    private md: MarkdownIt;

    constructor(settings: SLDocxSettings) {
        this.settings = settings;
        this.md = new MarkdownIt({ html: true, linkify: false, typographer: false, breaks: false });
        this.md.use(markdownItEmoji);
        this.md.use(markdownItMark);
    }

    updateSettings(settings: SLDocxSettings): void {
        this.settings = settings;
    }

    // ── Chunked processing for large documents ──

    private splitMarkdownByHeadings(markdown: string, maxChunkSize: number = 50000): string[] {
        const chunks: string[] = [];
        const lines = markdown.split('\n');

        let currentChunk: string[] = [];
        let currentSize = 0;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const lineSize = line.length + 1;

            const isHeading = /^#{1,3}\s/.test(line.trim());

            if (isHeading && currentSize > maxChunkSize * 0.7 && currentChunk.length > 0) {
                chunks.push(currentChunk.join('\n'));
                currentChunk = [line];
                currentSize = lineSize;
            } else {
                currentChunk.push(line);
                currentSize += lineSize;

                if (currentSize > maxChunkSize) {
                    chunks.push(currentChunk.join('\n'));
                    currentChunk = [];
                    currentSize = 0;
                }
            }
        }

        if (currentChunk.length > 0) {
            chunks.push(currentChunk.join('\n'));
        }

        return chunks.filter(chunk => chunk.trim().length > 0);
    }

    private async processChunkedConversion(
        markdown: string,
        title: string,
        obsidianFonts?: SLObsidianFontSettings | null,
        resourceLoader?: (link: string) => Promise<ArrayBuffer | null>,
    ): Promise<Blob> {
        this.obsidianFonts = obsidianFonts || null;
        this.filename = title;
        this.resourceLoader = resourceLoader;

        const { content: cleanedMarkdown, definitions } = this.extractFootnotes(markdown);
        this.footnoteDefinitions = definitions;

        this.footnotes = {};
        this.usedFootnotes = [];
        this.imageCounter = 0;
        this.imageRelationships = [];
        definitions.forEach((value, key) => {
            this.footnotes[key] = value;
        });

        const chunks = this.splitMarkdownByHeadings(cleanedMarkdown);
        let allElements: SLDocumentElement[] = [];

        if (this.settings.includeFilenameAsHeader) {
            allElements.push({ type: 'heading', level: 1, content: title });
        }

        for (let i = 0; i < chunks.length; i++) {
            try {
                const chunkElements = await this.parseMarkdownToElements(chunks[i]);
                allElements = allElements.concat(chunkElements);
                await new Promise(resolve => setTimeout(resolve, 10));
            } catch (error) {
                console.error(`StoryLine DOCX: Error processing chunk ${i + 1}:`, error);
            }
        }

        const hasExistingFootnotes = allElements.some(element =>
            element.type === 'heading' &&
            element.content &&
            /^footnotes?$/i.test(element.content.trim())
        );

        if (this.usedFootnotes.length > 0 && !hasExistingFootnotes) {
            allElements.push({ type: 'break' });
            allElements.push({ type: 'heading', level: 2, content: 'Footnotes' });

            for (let i = 0; i < this.usedFootnotes.length; i++) {
                const footnoteLabel = this.usedFootnotes[i];
                const footnoteText = this.footnoteDefinitions.get(footnoteLabel) || `[Missing footnote: ${footnoteLabel}]`;
                allElements.push({ type: 'paragraph', content: `${i + 1}. ${footnoteText}` });
            }
        }

        const docxBlob = await this.generateDocx(allElements, title);
        this.resourceLoader = undefined;
        return docxBlob;
    }

    // ── Main conversion entry point ──

    async convert(
        markdown: string,
        title: string,
        obsidianFonts?: SLObsidianFontSettings | null,
        resourceLoader?: (link: string) => Promise<ArrayBuffer | null>,
    ): Promise<Blob> {
        const cleanedMarkdown = this.settings.enablePreprocessing ? this.preprocessMarkdown(markdown) : markdown;
        const threshold = this.settings.chunkingThreshold || 100000;

        if (cleanedMarkdown.length > threshold) {
            return this.processChunkedConversion(cleanedMarkdown, title, obsidianFonts, resourceLoader);
        }

        return this.processNormalConversion(cleanedMarkdown, title, obsidianFonts, resourceLoader);
    }

    // ── Preprocessing ──

    private preprocessMarkdown(markdown: string): string {
        let cleaned = markdown;

        // Convert Obsidian wikilinks to standard markdown links
        cleaned = cleaned.replace(/\[\[([^\]]+)\]\]/g, (match, content, offset, string) => {
            if (offset > 0 && string[offset - 1] === '!') return match;
            if (content.includes('http://') || content.includes('https://') || content.includes('://')) return match;
            if (content.includes('#')) {
                const [file, section] = content.split('#', 2);
                return `[${content}](${file.trim()}.md#${section.trim().replace(/\s+/g, '-').toLowerCase()})`;
            }
            return `[${content}](${content.trim()}.md)`;
        });

        // Convert Obsidian callouts to standard blockquotes
        cleaned = cleaned.replace(/^>\s*\[!(\w+)\](\s*(.+))?$/gm, (_match, type, _titlePart, title) => {
            const calloutTitle = title ? ` ${title.trim()}` : '';
            return `> **${type.toUpperCase()}:${calloutTitle}**`;
        });

        // Process reference-style links
        const referenceDefinitions = new Map<string, string>();
        cleaned = cleaned.replace(/^\s*\[([^\]]+)\]:\s*(.+)$/gm, (_match, ref, url) => {
            referenceDefinitions.set(ref.toLowerCase(), url.trim());
            return '';
        });
        cleaned = cleaned.replace(/\[([^\]]+)\]\[([^\]]+)\]/g, (match, text, ref) => {
            const url = referenceDefinitions.get(ref.toLowerCase());
            return url ? `[${text}](${url})` : match;
        });

        // Convert math notation to plain text
        cleaned = cleaned.replace(/\$\$([^$]+?)\$\$/g, (_match, math) => {
            return `\n\n**[Math Formula]**: ${math.trim()}\n\n`;
        });
        cleaned = cleaned.replace(/\$([^$\n]+?)\$/g, (_match, math) => {
            return `**[Math]**: ${math.trim()}`;
        });

        // Convert auto-links and email links
        cleaned = cleaned.replace(/<(https?:\/\/[^>\s]+)>/g, '[$1]($1)');
        cleaned = cleaned.replace(/<([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})>/g, '[$1](mailto:$1)');

        // Convert setext-style headings
        cleaned = cleaned.replace(/^(.+)\n={3,}$/gm, '# $1');
        cleaned = cleaned.replace(/^(.+)\n-{3,}$/gm, '## $1');

        // Preserve escaping
        cleaned = cleaned.replace(/\\([*_`~=\[\]\\])/g, '\\$1');

        // Fix YAML frontmatter
        if (cleaned.startsWith('---')) {
            const lines = cleaned.split('\n');
            let frontmatterEnd = -1;
            for (let i = 1; i < lines.length; i++) {
                if (lines[i].trim() === '---') {
                    frontmatterEnd = i;
                    break;
                }
            }
            if (frontmatterEnd === -1) {
                const firstEmptyLine = lines.findIndex((line, index) => index > 0 && line.trim() === '');
                if (firstEmptyLine > 0) {
                    lines.splice(firstEmptyLine, 0, '---');
                    cleaned = lines.join('\n');
                }
            }
        }

        // Clean up invisible/problematic characters
        cleaned = cleaned
            .replace(/^\uFEFF/, '')
            .replace(/\u00A0/g, ' ')
            .replace(/\u200B/g, '')
            .replace(/[\u201C\u201D]/g, '"')
            .replace(/[\u2018\u2019]/g, "'");

        // Fix unclosed HTML tags
        cleaned = cleaned
            .replace(/<br(?!\s*\/?>)/g, '<br />')
            .replace(/<(div|span|p)([^>]*)>(?![^<]*<\/\1>)/g, '<$1$2></$1>');

        // Fix malformed tables
        cleaned = this.fixMalformedTables(cleaned);

        return cleaned;
    }

    private fixMalformedTables(markdown: string): string {
        const lines = markdown.split('\n');
        const result: string[] = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            result.push(line);

            if (line.includes('|') && line.trim().startsWith('|') && line.trim().endsWith('|')) {
                const nextLine = lines[i + 1];
                if (nextLine && !nextLine.match(/^\s*\|[\s\-:]*\|/)) {
                    const columns = line.split('|').length - 2;
                    if (columns > 0) {
                        const separator = '|' + ' --- |'.repeat(columns);
                        result.push(separator);
                    }
                }
            }
        }

        return result.join('\n');
    }

    // ── Normal (non-chunked) conversion ──

    private async processNormalConversion(
        markdown: string,
        title: string,
        obsidianFonts?: SLObsidianFontSettings | null,
        resourceLoader?: (link: string) => Promise<ArrayBuffer | null>,
    ): Promise<Blob> {
        this.obsidianFonts = obsidianFonts || null;
        this.filename = title;
        this.resourceLoader = resourceLoader;

        const { content: cleanedMarkdown, definitions } = this.extractFootnotes(markdown);
        this.footnoteDefinitions = definitions;

        this.footnotes = {};
        this.usedFootnotes = [];
        this.imageCounter = 0;
        this.imageRelationships = [];
        definitions.forEach((value, key) => {
            this.footnotes[key] = value;
        });

        const elements = await this.parseMarkdownToElements(cleanedMarkdown);

        if (this.settings.includeFilenameAsHeader) {
            elements.unshift({ type: 'heading', level: 1, content: title });
        }

        const hasExistingFootnotes = elements.some(element =>
            element.type === 'heading' &&
            element.content &&
            /^footnotes?$/i.test(element.content.trim())
        );

        if (this.usedFootnotes.length > 0 && !hasExistingFootnotes) {
            elements.push({ type: 'break' });
            elements.push({ type: 'heading', level: 2, content: 'Footnotes' });

            for (let i = 0; i < this.usedFootnotes.length; i++) {
                const footnoteLabel = this.usedFootnotes[i];
                const footnoteText = this.footnoteDefinitions.get(footnoteLabel) || `[Missing footnote: ${footnoteLabel}]`;
                elements.push({ type: 'paragraph', content: `${i + 1}. ${footnoteText}` });
            }
        }

        const docxBlob = await this.generateDocx(elements, title);
        this.resourceLoader = undefined;
        return docxBlob;
    }

    // ── DOCX generation ──

    private generateDocx(elements: SLDocumentElement[], title: string): Promise<Blob> {
        const documentXml = this.getDocumentXml(elements);

        const files: { [path: string]: Uint8Array } = {};

        files['[Content_Types].xml'] = strToU8(this.getContentTypesXml());
        files['_rels/.rels'] = strToU8(this.getRelsXml());
        files['word/_rels/document.xml.rels'] = strToU8(this.getDocumentRelsXml());
        files['word/styles.xml'] = strToU8(this.getStylesXml());
        files['word/numbering.xml'] = strToU8(this.getNumberingXml());
        files['word/document.xml'] = strToU8(documentXml);

        this.imageRelationships.forEach(rel => {
            const filename = `word/media/image${rel.id.replace('rId', '')}.${rel.extension}`;
            files[filename] = rel.data instanceof Uint8Array ? rel.data : new Uint8Array(rel.data);
        });

        return new Promise((resolve, reject) => {
            zip(files, { level: 6 }, (err, data) => {
                if (err) {
                    console.error('StoryLine DOCX: ZIP creation failed:', err);
                    reject(err);
                } else {
                    const blob = new Blob([new Uint8Array(data)], {
                        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                    });
                    resolve(blob);
                }
            });
        });
    }

    // ── XML helpers ──

    private getContentTypesXml(): string {
        let imageTypes = '';
        const extensions = new Set(this.imageRelationships.map(rel => rel.extension));
        extensions.forEach(ext => {
            let contentType = '';
            switch (ext) {
                case 'png': contentType = 'image/png'; break;
                case 'jpeg':
                case 'jpg': contentType = 'image/jpeg'; break;
                case 'gif': contentType = 'image/gif'; break;
                default: contentType = 'image/png';
            }
            imageTypes += `  <Default Extension="${ext}" ContentType="${contentType}"/>\n`;
        });

        return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
${imageTypes}  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>
</Types>`;
    }

    private getRelsXml(): string {
        return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;
    }

    private getDocumentRelsXml(): string {
        let imageRels = '';
        this.imageRelationships.forEach(rel => {
            const target = `media/image${rel.id.replace('rId', '')}.${rel.extension}`;
            imageRels += `  <Relationship Id="${rel.id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="${target}"/>\n`;
        });

        return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>
${imageRels}</Relationships>`;
    }

    private getNumberingXml(): string {
        return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:abstractNum w:abstractNumId="0">
    <w:nsid w:val="0001"/>
    <w:multiLevelType w:val="singleLevel"/>
    <w:lvl w:ilvl="0">
      <w:start w:val="1"/>
      <w:numFmt w:val="bullet"/>
      <w:lvlText w:val="\u2022"/>
      <w:lvlJc w:val="left"/>
      <w:pPr>
        <w:ind w:left="720" w:hanging="360"/>
      </w:pPr>
    </w:lvl>
    <w:lvl w:ilvl="1">
      <w:start w:val="1"/>
      <w:numFmt w:val="bullet"/>
      <w:lvlText w:val="\u25E6"/>
      <w:lvlJc w:val="left"/>
      <w:pPr>
        <w:ind w:left="1440" w:hanging="360"/>
      </w:pPr>
    </w:lvl>
  </w:abstractNum>
  <w:abstractNum w:abstractNumId="1">
    <w:nsid w:val="0002"/>
    <w:multiLevelType w:val="singleLevel"/>
    <w:lvl w:ilvl="0">
      <w:start w:val="1"/>
      <w:numFmt w:val="decimal"/>
      <w:lvlText w:val="%1."/>
      <w:lvlJc w:val="left"/>
      <w:pPr>
        <w:ind w:left="720" w:hanging="360"/>
      </w:pPr>
    </w:lvl>
    <w:lvl w:ilvl="1">
      <w:start w:val="1"/>
      <w:numFmt w:val="lowerLetter"/>
      <w:lvlText w:val="%2."/>
      <w:lvlJc w:val="left"/>
      <w:pPr>
        <w:ind w:left="1440" w:hanging="360"/>
      </w:pPr>
    </w:lvl>
  </w:abstractNum>
  <w:num w:numId="1">
    <w:abstractNumId w:val="0"/>
  </w:num>
  <w:num w:numId="2">
    <w:abstractNumId w:val="1"/>
  </w:num>
</w:numbering>`;
    }

    private getStylesXml(): string {
        const fontFamily = this.getFontFamily();
        const fontSize = this.getFontSize() * 2; // Half-points

        return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="${fontFamily}" w:hAnsi="${fontFamily}" w:cs="${fontFamily}"/>
        <w:sz w:val="${fontSize}"/>
        <w:szCs w:val="${fontSize}"/>
        <w:lang w:val="en-US"/>
      </w:rPr>
    </w:rPrDefault>
    <w:pPrDefault>
      <w:pPr>
        <w:spacing w:after="120" w:line="276" w:lineRule="auto"/>
      </w:pPr>
    </w:pPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:qFormat/>
    <w:rPr>
      <w:rFonts w:ascii="${fontFamily}" w:hAnsi="${fontFamily}" w:cs="${fontFamily}"/>
      <w:sz w:val="${fontSize}"/>
      <w:szCs w:val="${fontSize}"/>
    </w:rPr>
  </w:style>
  ${this.generateHeadingStyles()}
  ${this.generateCodeStyle()}
</w:styles>`;
    }

    private generateHeadingStyles(): string {
        const fontFamily = this.getFontFamily();
        let styles = '';

        for (let i = 1; i <= 6; i++) {
            const headingSize = this.getHeadingSize(i);
            const sizeInHalfPoints = headingSize * 2;

            styles += `
  <w:style w:type="paragraph" w:styleId="Heading${i}">
    <w:name w:val="heading ${i}"/>
    <w:basedOn w:val="Normal"/>
    <w:next w:val="Normal"/>
    <w:link w:val="Heading${i}Char"/>
    <w:uiPriority w:val="9"/>
    <w:qFormat/>
    <w:pPr>
      <w:keepNext/>
      <w:keepLines/>
      <w:spacing w:before="240" w:after="120"/>
      <w:outlineLvl w:val="${i - 1}"/>
    </w:pPr>
    <w:rPr>
      <w:rFonts w:ascii="${fontFamily}" w:hAnsi="${fontFamily}" w:cs="${fontFamily}"/>
      <w:b/>
      <w:bCs/>
      <w:sz w:val="${sizeInHalfPoints}"/>
      <w:szCs w:val="${sizeInHalfPoints}"/>
    </w:rPr>
  </w:style>`;
        }

        return styles;
    }

    private generateCodeStyle(): string {
        const codeFont = this.getCodeFont();
        const fontSize = this.getFontSize() * 2;

        return `
  <w:style w:type="character" w:styleId="CodeChar">
    <w:name w:val="Code"/>
    <w:rPr>
      <w:rFonts w:ascii="${codeFont}" w:hAnsi="${codeFont}" w:cs="${codeFont}"/>
      <w:b/>
      <w:sz w:val="${fontSize}"/>
      <w:szCs w:val="${fontSize}"/>
      <w:shd w:val="clear" w:color="auto" w:fill="F5F5F5"/>
    </w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="CodeBlock">
    <w:name w:val="Code Block"/>
    <w:basedOn w:val="Normal"/>
    <w:rPr>
      <w:rFonts w:ascii="${codeFont}" w:hAnsi="${codeFont}" w:cs="${codeFont}"/>
      <w:sz w:val="${Math.round(fontSize * 0.9)}"/>
      <w:szCs w:val="${Math.round(fontSize * 0.9)}"/>
      <w:color w:val="2F3337"/>
    </w:rPr>
    <w:pPr>
      <w:shd w:val="clear" w:color="auto" w:fill="F8F8F8"/>
      <w:spacing w:before="120" w:after="120" w:line="276" w:lineRule="auto"/>
      <w:ind w:left="240" w:right="240"/>
      <w:contextualSpacing/>
      <w:bdr>
        <w:top w:val="single" w:sz="4" w:space="1" w:color="E1E4E8"/>
        <w:left w:val="single" w:sz="4" w:space="1" w:color="E1E4E8"/>
        <w:bottom w:val="single" w:sz="4" w:space="1" w:color="E1E4E8"/>
        <w:right w:val="single" w:sz="4" w:space="1" w:color="E1E4E8"/>
      </w:bdr>
    </w:pPr>
  </w:style>`;
    }

    // ── Document XML ──

    private getDocumentXml(elements: SLDocumentElement[]): string {
        const pageSize = this.getPageSize();

        let content = '';
        for (const element of elements) {
            content += this.elementToXml(element);
        }

        return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" 
            xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
            xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
            xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    ${content}
    <w:sectPr>
      <w:pgSz w:w="${pageSize.width}" w:h="${pageSize.height}"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/>
    </w:sectPr>
  </w:body>
</w:document>`;
    }

    // ── Element to XML ──

    private elementToXml(element: SLDocumentElement): string {
        try {
            switch (element.type) {
                case 'heading': return this.headingToXml(element);
                case 'paragraph': return this.paragraphToXml(element);
                case 'codeblock': return this.codeBlockToXml(element);
                case 'list': return this.listToXml(element);
                case 'table': return this.tableToXml(element);
                case 'blockquote': return this.blockquoteToXml(element);
                case 'tasklist': return this.taskListToXml(element);
                case 'horizontal-rule': return this.horizontalRuleToXml();
                case 'image': return this.imageToXml(element);
                case 'break': return '<w:p><w:pPr></w:pPr></w:p>';
                default: return '';
            }
        } catch (error) {
            console.error('StoryLine DOCX: Error converting element to XML:', element.type, error);
            return `<w:p><w:pPr></w:pPr><w:r><w:t>[Error processing ${element.type}]</w:t></w:r></w:p>`;
        }
    }

    private headingToXml(element: SLDocumentElement): string {
        const styleId = `Heading${element.level || 1}`;
        let content;
        if (this.settings.preserveFormatting) {
            content = this.parseInlineFormatting(element.content || '');
        } else {
            content = `<w:r><w:t>${this.escapeXml(element.content || '')}</w:t></w:r>`;
        }
        return `<w:p>\n  <w:pPr>\n    <w:pStyle w:val="${styleId}"/>\n  </w:pPr>\n  ${content}\n</w:p>`;
    }

    private paragraphToXml(element: SLDocumentElement): string {
        const text = this.escapeXml(element.content || '');
        if (!this.settings.preserveFormatting) {
            return `<w:p>\n  <w:pPr></w:pPr>\n  <w:r>\n    <w:t>${text}</w:t>\n  </w:r>\n</w:p>`;
        }
        const runs = this.parseInlineFormatting(element.content || '');
        return `<w:p>\n  <w:pPr></w:pPr>\n  ${runs}\n</w:p>`;
    }

    private codeBlockToXml(element: SLDocumentElement): string {
        const content = element.content || '';
        const language = element.language || '';

        let highlightedHtml = '';
        if (language) {
            try {
                const result = hljs.highlight(content, { language: language, ignoreIllegals: true });
                highlightedHtml = result.value;
            } catch {
                highlightedHtml = this.escapeXml(content);
            }
        } else {
            highlightedHtml = this.escapeXml(content);
        }

        const lines = content.split('\n');
        let xml = '';

        if (highlightedHtml.includes('<span class=')) {
            const highlightedLines = highlightedHtml.split('\n');
            for (let i = 0; i < highlightedLines.length; i++) {
                const lineXml = this.convertHighlightedToWord(highlightedLines[i]);
                xml += `<w:p>\n  <w:pPr>\n    <w:pStyle w:val="CodeBlock"/>\n    <w:spacing w:line="240" w:lineRule="auto"/>\n    <w:contextualSpacing/>\n  </w:pPr>\n  ${lineXml}\n</w:p>`;
            }
        } else {
            for (let i = 0; i < lines.length; i++) {
                const escapedLine = this.escapeXml(lines[i]);
                xml += `<w:p>\n  <w:pPr>\n    <w:pStyle w:val="CodeBlock"/>\n    <w:spacing w:line="240" w:lineRule="auto"/>\n    <w:contextualSpacing/>\n  </w:pPr>\n  <w:r><w:rPr><w:rFonts w:ascii="Courier New" w:hAnsi="Courier New" w:cs="Courier New"/><w:b/><w:color w:val="2F3337"/></w:rPr><w:t xml:space="preserve">${escapedLine}</w:t></w:r>\n</w:p>`;
            }
        }

        return xml;
    }

    private convertHighlightedToWord(highlightedHtml: string): string {
        if (!highlightedHtml.includes('<span class=')) {
            return `<w:r><w:rPr><w:rFonts w:ascii="Courier New" w:hAnsi="Courier New" w:cs="Courier New"/><w:b/><w:color w:val="2F3337"/></w:rPr><w:t xml:space="preserve">${this.escapeXml(highlightedHtml)}</w:t></w:r>`;
        }

        const colorMap: { [key: string]: string } = {
            'hljs-keyword': '0000FF', 'hljs-built_in': '0000FF', 'hljs-literal': '0000FF',
            'hljs-string': 'D14', 'hljs-regexp': 'D14',
            'hljs-comment': '008000', 'hljs-doctag': '008000',
            'hljs-number': '800080',
            'hljs-function': 'B07219', 'hljs-title': 'B07219', 'hljs-title function_': 'B07219', 'hljs-title class_': 'B07219',
            'hljs-variable': '36BCF7', 'hljs-variable language_': '36BCF7', 'hljs-attr': '36BCF7', 'hljs-property': '36BCF7', 'hljs-params': '36BCF7',
            'hljs-type': '267F99', 'hljs-class': '267F99',
            'hljs-tag': 'D14', 'hljs-name': 'D14', 'hljs-selector-tag': 'D14',
            'hljs-meta': 'B07219', 'hljs-meta-string': 'D14',
            'hljs-punctuation': '2F3337', 'hljs-operator': '2F3337',
        };

        return this.parseHtmlToWordXml(highlightedHtml, colorMap);
    }

    private parseHtmlToWordXml(html: string, colorMap: { [key: string]: string }): string {
        let result = '';
        let pos = 0;

        while (pos < html.length) {
            const spanStart = html.indexOf('<span', pos);

            if (spanStart === -1) {
                const remainingText = html.substring(pos);
                if (remainingText) {
                    result += `<w:r><w:rPr><w:rFonts w:ascii="Courier New" w:hAnsi="Courier New" w:cs="Courier New"/><w:b/><w:color w:val="2F3337"/></w:rPr><w:t xml:space="preserve">${this.escapeXmlForCode(remainingText)}</w:t></w:r>`;
                }
                break;
            }

            if (spanStart > pos) {
                const beforeText = html.substring(pos, spanStart);
                if (beforeText) {
                    result += `<w:r><w:rPr><w:rFonts w:ascii="Courier New" w:hAnsi="Courier New" w:cs="Courier New"/><w:b/><w:color w:val="2F3337"/></w:rPr><w:t xml:space="preserve">${this.escapeXmlForCode(beforeText)}</w:t></w:r>`;
                }
            }

            const classStart = html.indexOf('class="', spanStart);
            if (classStart === -1) { pos = spanStart + 5; continue; }

            const classValueStart = classStart + 7;
            const classValueEnd = html.indexOf('"', classValueStart);
            if (classValueEnd === -1) { pos = spanStart + 5; continue; }

            const className = html.substring(classValueStart, classValueEnd);

            const tagEnd = html.indexOf('>', classValueEnd);
            if (tagEnd === -1) { pos = spanStart + 5; continue; }

            const spanContent = this.extractSpanContent(html, tagEnd + 1);
            if (!spanContent) { pos = spanStart + 5; continue; }

            const color = colorMap[className] || '000000';

            if (spanContent.content.includes('<span')) {
                const nestedResult = this.parseHtmlToWordXml(spanContent.content, colorMap);
                result += nestedResult;
            } else {
                result += `<w:r><w:rPr><w:rFonts w:ascii="Courier New" w:hAnsi="Courier New" w:cs="Courier New"/><w:b/><w:color w:val="${color}"/></w:rPr><w:t xml:space="preserve">${this.escapeXmlForCode(spanContent.content)}</w:t></w:r>`;
            }

            pos = spanContent.endPos;
        }

        return result;
    }

    private extractSpanContent(html: string, startPos: number): { content: string; endPos: number } | null {
        let depth = 1;
        let pos = startPos;

        while (pos < html.length && depth > 0) {
            const nextOpen = html.indexOf('<span', pos);
            const nextClose = html.indexOf('</span>', pos);

            if (nextClose === -1) return null;

            if (nextOpen !== -1 && nextOpen < nextClose) {
                depth++;
                pos = nextOpen + 5;
            } else {
                depth--;
                if (depth === 0) {
                    const content = html.substring(startPos, nextClose);
                    return { content, endPos: nextClose + 7 };
                }
                pos = nextClose + 7;
            }
        }

        return null;
    }

    private listToXml(element: SLDocumentElement): string {
        let xml = '';
        const items = element.items || [];
        const children = element.children || [];

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const childElement = children[i];
            const level = Math.min(childElement?.level || 0, 8);
            const runs = this.parseInlineFormatting(item);

            const leftIndent = 720 + (level * 540);
            const hanging = level === 0 ? 360 : 270;

            xml += `<w:p>\n  <w:pPr>\n    <w:ind w:left="${leftIndent}" w:hanging="${hanging}"/>\n    <w:numPr>\n      <w:ilvl w:val="${level}"/>\n      <w:numId w:val="${element.listType === 'ordered' ? '2' : '1'}"/>\n    </w:numPr>\n    <w:spacing w:before="60" w:after="60"/>\n  </w:pPr>\n  ${runs}\n</w:p>`;
        }

        return xml;
    }

    private tableToXml(element: SLDocumentElement): string {
        const rows = element.rows || [];
        const alignments = element.alignments || [];

        if (rows.length === 0) return '';

        let tableXml = '<w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/><w:tblW w:w="5000" w:type="pct"/></w:tblPr>';

        for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
            const row = rows[rowIndex];
            const isHeader = rowIndex === 0;

            tableXml += '<w:tr>';
            for (let colIndex = 0; colIndex < row.length; colIndex++) {
                const cell = row[colIndex];
                const alignment = alignments[colIndex] || 'left';
                const cellRuns = this.parseInlineFormatting(cell);

                let justification = 'left';
                if (alignment === 'center') justification = 'center';
                if (alignment === 'right') justification = 'right';

                tableXml += `<w:tc>\n  <w:tcPr>\n    <w:tcW w:w="1800" w:type="dxa"/>\n    ${isHeader ? '<w:shd w:val="clear" w:color="auto" w:fill="E7E6E6"/>' : ''}\n  </w:tcPr>\n  <w:p>\n    <w:pPr>\n      <w:jc w:val="${justification}"/>\n    </w:pPr>\n    ${isHeader ? cellRuns.replace(/<w:rPr>/, '<w:rPr><w:b/>') : cellRuns}\n  </w:p>\n</w:tc>`;
            }
            tableXml += '</w:tr>';
        }

        tableXml += '</w:tbl>';
        return tableXml;
    }

    private blockquoteToXml(element: SLDocumentElement): string {
        const content = element.content || '';
        const runs = this.parseInlineFormatting(content);
        const indentValue = 720 * (element.quoteLevel || 1);

        // Check if this is a callout
        const calloutMatch = content.match(/^\*\*(\w+):\s*(.*?)\*\*(.*)$/);
        if (calloutMatch) {
            const [, type, title, remaining] = calloutMatch;
            const calloutType = type.toLowerCase();

            const calloutColors: { [key: string]: { bg: string; border: string } } = {
                note: { bg: 'E7F3FF', border: '2196F3' },
                tip: { bg: 'E8F5E8', border: '4CAF50' },
                warning: { bg: 'FFF8E1', border: 'FF9800' },
                error: { bg: 'FFEBEE', border: 'F44336' },
                success: { bg: 'E8F5E8', border: '4CAF50' },
                info: { bg: 'E3F2FD', border: '2196F3' },
            };

            const colors = calloutColors[calloutType] || calloutColors.note;
            const titleText = title ? title.trim() : '';
            const contentText = remaining ? remaining.trim() : '';

            const calloutPProps = `\n    <w:ind w:left="${indentValue}"/>\n    <w:shd w:val="clear" w:color="auto" w:fill="${colors.bg}"/>\n    <w:pBdr>\n      <w:left w:val="single" w:sz="18" w:space="4" w:color="${colors.border}"/>\n      <w:top w:val="single" w:sz="6" w:space="4" w:color="${colors.border}"/>\n      <w:right w:val="single" w:sz="6" w:space="4" w:color="${colors.border}"/>\n      <w:bottom w:val="single" w:sz="6" w:space="4" w:color="${colors.border}"/>\n    </w:pBdr>\n    <w:spacing w:before="60" w:after="60"/>`;

            let xml = `<w:p>\n  <w:pPr>${calloutPProps}\n  </w:pPr>\n  <w:r>\n    <w:rPr>\n      <w:b/>\n      <w:color w:val="${colors.border}"/>\n    </w:rPr>\n    <w:t>${type.toUpperCase()}:${titleText ? ' ' + titleText : ''}</w:t>\n  </w:r>\n</w:p>`;

            if (contentText) {
                const contentLines = contentText.split('\n');
                for (const line of contentLines) {
                    const trimmed = line.trim();
                    if (trimmed) {
                        xml += `<w:p>\n  <w:pPr>${calloutPProps}\n  </w:pPr>\n  ${this.parseInlineFormatting(trimmed)}\n</w:p>`;
                    } else {
                        xml += `<w:p>\n  <w:pPr>${calloutPProps}\n  </w:pPr>\n  <w:r><w:t> </w:t></w:r>\n</w:p>`;
                    }
                }
            }

            return xml;
        }

        // Regular blockquote
        return `<w:p>\n  <w:pPr>\n    <w:ind w:left="${indentValue}"/>\n    <w:pBdr>\n      <w:left w:val="single" w:sz="12" w:space="1" w:color="CCCCCC"/>\n    </w:pBdr>\n  </w:pPr>\n  ${runs}\n</w:p>`;
    }

    private taskListToXml(element: SLDocumentElement): string {
        const tasks = element.tasks || [];
        let xml = '';

        for (const task of tasks) {
            const checkbox = task.checked ? '\u2611' : '\u2610';
            const taskRuns = this.parseInlineFormatting(task.text);
            xml += `<w:p>\n  <w:pPr>\n    <w:ind w:left="720" w:hanging="360"/>\n    <w:numPr>\n      <w:ilvl w:val="0"/>\n      <w:numId w:val="1"/>\n    </w:numPr>\n    <w:spacing w:before="60" w:after="60"/>\n  </w:pPr>\n  <w:r>\n    <w:t>${checkbox}  </w:t>\n  </w:r>\n  ${taskRuns}\n</w:p>`;
        }

        return xml;
    }

    private horizontalRuleToXml(): string {
        return `<w:p>\n  <w:pPr>\n    <w:pBdr>\n      <w:bottom w:val="single" w:sz="8" w:space="1" w:color="000000"/>\n    </w:pBdr>\n    <w:spacing w:before="120" w:after="120"/>\n  </w:pPr>\n  <w:r>\n    <w:t></w:t>\n  </w:r>\n</w:p>`;
    }

    private imageToXml(element: SLDocumentElement): string {
        if (!element.imageData) {
            const alt = element.imageAlt || 'Image not found';
            return `<w:p>\n  <w:pPr>\n    <w:jc w:val="center"/>\n  </w:pPr>\n  <w:r>\n    <w:t>[Image not found: ${this.escapeXml(alt)}]</w:t>\n  </w:r>\n</w:p>`;
        }

        this.imageCounter++;
        const relationshipId = `rId${this.imageCounter + 10}`;

        let extension = 'png';
        const imageData = element.imageData;

        if (imageData.byteLength >= 4) {
            const view = new Uint8Array(imageData, 0, 4);
            if (view[0] === 0xFF && view[1] === 0xD8) extension = 'jpeg';
            else if (view[0] === 0x89 && view[1] === 0x50 && view[2] === 0x4E && view[3] === 0x47) extension = 'png';
            else if (view[0] === 0x47 && view[1] === 0x49 && view[2] === 0x46) extension = 'gif';
        }

        this.imageRelationships.push({ id: relationshipId, data: imageData, extension });

        const dimensions = this.getImageDimensions(imageData);
        let originalWidth = dimensions.width;
        let originalHeight = dimensions.height;

        if (!originalWidth || !originalHeight) {
            originalWidth = 400;
            originalHeight = 300;
        }

        let finalWidth: number;
        let finalHeight: number;

        if (element.imageWidth || element.imageHeight) {
            if (element.imageWidth && element.imageHeight) {
                finalWidth = element.imageWidth;
                finalHeight = element.imageHeight;
            } else if (element.imageWidth) {
                const ratio = originalHeight / originalWidth;
                finalWidth = element.imageWidth;
                finalHeight = Math.round(element.imageWidth * ratio);
            } else {
                const ratio = originalWidth / originalHeight;
                finalHeight = element.imageHeight!;
                finalWidth = Math.round(element.imageHeight! * ratio);
            }
        } else {
            finalWidth = originalWidth;
            finalHeight = originalHeight;

            if (originalWidth > 600) {
                const ratio = originalHeight / originalWidth;
                finalWidth = 600;
                finalHeight = Math.round(600 * ratio);
            }
            if (finalHeight > 450) {
                const ratio = finalWidth / finalHeight;
                finalHeight = 450;
                finalWidth = Math.round(450 * ratio);
            }
            if (finalWidth < 100) {
                const ratio = finalHeight / finalWidth;
                finalWidth = 100;
                finalHeight = Math.round(100 * ratio);
            }
        }

        const emuWidth = Math.round(finalWidth * 9525);
        const emuHeight = Math.round(finalHeight * 9525);
        const alt = element.imageAlt || 'Image';

        return `<w:p>
  <w:pPr>
    <w:jc w:val="center"/>
  </w:pPr>
  <w:r>
    <w:drawing>
      <wp:inline distT="0" distB="0" distL="0" distR="0">
        <wp:extent cx="${emuWidth}" cy="${emuHeight}"/>
        <wp:effectExtent l="0" t="0" r="0" b="0"/>
        <wp:docPr id="${this.imageCounter}" name="${this.escapeXml(alt)}"/>
        <wp:cNvGraphicFramePr>
          <a:graphicFrameLocks noChangeAspect="1"/>
        </wp:cNvGraphicFramePr>
        <a:graphic>
          <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
            <pic:pic>
              <pic:nvPicPr>
                <pic:cNvPr id="${this.imageCounter}" name="${this.escapeXml(alt)}"/>
                <pic:cNvPicPr/>
              </pic:nvPicPr>
              <pic:blipFill>
                <a:blip r:embed="${relationshipId}"/>
                <a:stretch>
                  <a:fillRect/>
                </a:stretch>
              </pic:blipFill>
              <pic:spPr>
                <a:xfrm>
                  <a:off x="0" y="0"/>
                  <a:ext cx="${emuWidth}" cy="${emuHeight}"/>
                </a:xfrm>
                <a:prstGeom prst="rect">
                  <a:avLst/>
                </a:prstGeom>
              </pic:spPr>
            </pic:pic>
          </a:graphicData>
        </a:graphic>
      </wp:inline>
    </w:drawing>
  </w:r>
</w:p>`;
    }

    // ── Inline formatting ──

    private parseInlineFormatting(text: string): string {
        if (!this.settings.preserveFormatting) {
            const escapedText = this.escapeXml(text);
            return `<w:r><w:t>${escapedText}</w:t></w:r>`;
        }

        let result = text;

        // Emojis
        result = this.convertEmojis(result);

        // Clean up block-level HTML
        result = result.replace(/<\/?div[^>]*>/g, '');
        result = result.replace(/<\/?p[^>]*>/g, '');
        result = result.replace(/<br\s*\/?>/g, ' ');

        // Code first
        result = result.replace(/`([^`\n]+?)`/g, '|||CODE|||$1|||/CODE|||');

        // Bold+italic combos
        result = result.replace(/\*\*\*([^*\n]+?)\*\*\*/g, '|||BOLDITALIC|||$1|||/BOLDITALIC|||');
        result = result.replace(/___([^_\n]+?)___/g, '|||BOLDITALIC|||$1|||/BOLDITALIC|||');

        // Nested bold with italic inside
        result = result.replace(/\*\*([^*]*?\*[^*]+?\*[^*]*?)\*\*/g, (_match, content) => {
            const processed = content.replace(/\*([^*]+?)\*/g, '<ITALIC>$1</ITALIC>');
            return `|||BOLD|||${processed}|||/BOLD|||`;
        });

        // Nested italic with bold inside
        result = result.replace(/\*([^*]*?\*\*[^*]+?\*\*[^*]*?)\*/g, (_match, content) => {
            const processed = content.replace(/\*\*([^*]+?)\*\*/g, '<BOLD>$1</BOLD>');
            return `|||ITALIC|||${processed}|||/ITALIC|||`;
        });

        // Regular bold/italic
        result = result.replace(/\*\*([^*\n]+?)\*\*/g, '|||BOLD|||$1|||/BOLD|||');
        result = result.replace(/\*([^*\n]+?)\*/g, '|||ITALIC|||$1|||/ITALIC|||');

        // Underscore variants
        result = result.replace(/__([^_\n]+?)__/g, '|||BOLD|||$1|||/BOLD|||');
        result = result.replace(/_([^_\n]+?)_/g, '|||ITALIC|||$1|||/ITALIC|||');

        // Other formatting
        result = result.replace(/~~([^~\n]+?)~~/g, '|||STRIKE|||$1|||/STRIKE|||');
        result = result.replace(/==([^=\n]+?)==/g, '|||HIGHLIGHT|||$1|||/HIGHLIGHT|||');
        result = result.replace(/\^([^\^\s\n]+?)\^/g, '|||SUPER|||$1|||/SUPER|||');
        result = result.replace(/~([^~\s\n]+?)~/g, '|||SUB|||$1|||/SUB|||');

        // HTML formatting tags
        result = result.replace(/<b>([^<]+?)<\/b>/g, '|||BOLD|||$1|||/BOLD|||');
        result = result.replace(/<strong>([^<]+?)<\/strong>/g, '|||BOLD|||$1|||/BOLD|||');
        result = result.replace(/<i>([^<]+?)<\/i>/g, '|||ITALIC|||$1|||/ITALIC|||');
        result = result.replace(/<em>([^<]+?)<\/em>/g, '|||ITALIC|||$1|||/ITALIC|||');
        result = result.replace(/<u>([^<]+?)<\/u>/g, '|||UNDERLINE|||$1|||/UNDERLINE|||');
        result = result.replace(/<mark>([^<]+?)<\/mark>/g, '|||HIGHLIGHT|||$1|||/HIGHLIGHT|||');
        result = result.replace(/<sup>([^<]+?)<\/sup>/g, '|||SUPER|||$1|||/SUPER|||');
        result = result.replace(/<sub>([^<]+?)<\/sub>/g, '|||SUB|||$1|||/SUB|||');
        result = result.replace(/<code>([^<]+?)<\/code>/g, '|||CODE|||$1|||/CODE|||');

        // Footnote references
        result = result.replace(/\[\^([^\]]+)\]/g, (_match, footnoteLabel) => {
            if (!this.usedFootnotes.includes(footnoteLabel)) {
                this.usedFootnotes.push(footnoteLabel);
            }
            const footnoteIndex = this.usedFootnotes.indexOf(footnoteLabel) + 1;
            return `|||SUPER|||${footnoteIndex}|||/SUPER|||`;
        });

        // Links
        result = result.replace(/\[([^\]]+)\]\(([^\s)]+)(?:\s+"[^"]*")?\)/g, '|||LINK|||$1|||DATA:$2|||/LINK|||');

        return this.convertMarkersToWordXml(result);
    }

    private convertMarkersToWordXml(text: string): string {
        let result = text;

        // CODE
        result = result.replace(/\|\|\|CODE\|\|\|([^|]*?)\|\|\|\/CODE\|\|\|/g,
            '<w:r><w:rPr><w:rFonts w:ascii="Courier New" w:hAnsi="Courier New" w:cs="Courier New"/><w:b/></w:rPr><w:t xml:space="preserve">$1</w:t></w:r>');

        // BOLDITALIC
        result = result.replace(/\|\|\|BOLDITALIC\|\|\|([^|]*?)\|\|\|\/BOLDITALIC\|\|\|/g,
            '<w:r><w:rPr><w:b/><w:i/></w:rPr><w:t xml:space="preserve">$1</w:t></w:r>');

        // SUPER, SUB, STRIKE, HIGHLIGHT, UNDERLINE
        result = result.replace(/\|\|\|SUPER\|\|\|([^|]*?)\|\|\|\/SUPER\|\|\|/g,
            '<w:r><w:rPr><w:vertAlign w:val="superscript"/></w:rPr><w:t xml:space="preserve">$1</w:t></w:r>');
        result = result.replace(/\|\|\|SUB\|\|\|([^|]*?)\|\|\|\/SUB\|\|\|/g,
            '<w:r><w:rPr><w:vertAlign w:val="subscript"/></w:rPr><w:t xml:space="preserve">$1</w:t></w:r>');
        result = result.replace(/\|\|\|STRIKE\|\|\|([^|]*?)\|\|\|\/STRIKE\|\|\|/g,
            '<w:r><w:rPr><w:strike/></w:rPr><w:t xml:space="preserve">$1</w:t></w:r>');
        result = result.replace(/\|\|\|HIGHLIGHT\|\|\|([^|]*?)\|\|\|\/HIGHLIGHT\|\|\|/g,
            '<w:r><w:rPr><w:highlight w:val="yellow"/></w:rPr><w:t xml:space="preserve">$1</w:t></w:r>');
        result = result.replace(/\|\|\|UNDERLINE\|\|\|([^|]*?)\|\|\|\/UNDERLINE\|\|\|/g,
            '<w:r><w:rPr><w:u w:val="single"/></w:rPr><w:t xml:space="preserve">$1</w:t></w:r>');

        // ITALIC with nested BOLD
        result = result.replace(/\|\|\|ITALIC\|\|\|(.*?)\|\|\|\/ITALIC\|\|\|/g, (_match, content) => {
            if (content.includes('<BOLD>')) {
                return content.replace(/<BOLD>([^<]+?)<\/BOLD>/g,
                    '<w:r><w:rPr><w:b/><w:i/></w:rPr><w:t xml:space="preserve">$1</w:t></w:r>');
            } else {
                const escapedContent = this.escapeXml(content);
                return `<w:r><w:rPr><w:i/></w:rPr><w:t xml:space="preserve">${escapedContent}</w:t></w:r>`;
            }
        });

        // BOLD with nested ITALIC
        result = result.replace(/\|\|\|BOLD\|\|\|(.*?)\|\|\|\/BOLD\|\|\|/g, (_match, content) => {
            if (content.includes('<ITALIC>')) {
                return content.replace(/<ITALIC>([^<]+?)<\/ITALIC>/g,
                    '<w:r><w:rPr><w:b/><w:i/></w:rPr><w:t xml:space="preserve">$1</w:t></w:r>');
            } else {
                const escapedContent = this.escapeXml(content);
                return `<w:r><w:rPr><w:b/></w:rPr><w:t xml:space="preserve">${escapedContent}</w:t></w:r>`;
            }
        });

        // LINK
        result = result.replace(/\|\|\|LINK\|\|\|([^|]*?)\|\|\|DATA:([^|]*?)\|\|\|\/LINK\|\|\|/g,
            '<w:hyperlink><w:r><w:rPr><w:color w:val="0000FF"/><w:u w:val="single"/></w:rPr><w:t xml:space="preserve">$1</w:t></w:r></w:hyperlink>');

        // Remaining plain text
        const parts = result.split(/(<w:r>.*?<\/w:r>|<w:hyperlink>.*?<\/w:hyperlink>)/);
        let finalResult = '';

        for (const part of parts) {
            if (part && !part.startsWith('<w:r>') && !part.startsWith('<w:hyperlink>')) {
                if (part.trim()) {
                    const escapedText = this.escapeXml(part);
                    finalResult += `<w:r><w:t xml:space="preserve">${escapedText}</w:t></w:r>`;
                }
            } else {
                finalResult += part;
            }
        }

        return finalResult || `<w:r><w:t xml:space="preserve">${this.escapeXml(text)}</w:t></w:r>`;
    }

    // ── Markdown parsing ──

    private async parseMarkdownToElements(markdown: string): Promise<SLDocumentElement[]> {
        const elements: SLDocumentElement[] = [];
        const lines = markdown.split('\n');

        let i = 0;
        let inCodeBlock = false;
        let codeBlockContent: string[] = [];
        let codeBlockLanguage: string | null = null;
        let inTable = false;
        let tableRows: string[][] = [];
        let tableAlignments: string[] = [];

        while (i < lines.length) {
            const line = lines[i];

            // Code blocks
            const fenceMatch = line.trim().match(/^(```|~~~)(.*)$/);
            if (fenceMatch) {
                if (inCodeBlock) {
                    elements.push({
                        type: 'codeblock',
                        content: codeBlockContent.join('\n'),
                        language: codeBlockLanguage || undefined,
                    });
                    codeBlockContent = [];
                    codeBlockLanguage = null;
                    inCodeBlock = false;
                } else {
                    inCodeBlock = true;
                    codeBlockLanguage = fenceMatch[2]?.trim() || null;
                }
                i++;
                continue;
            }

            if (inCodeBlock) {
                codeBlockContent.push(line);
                i++;
                continue;
            }

            const trimmedLine = line.trim();

            // Horizontal rules
            const cleanLine = trimmedLine.replace(/\s/g, '');
            if ((cleanLine.match(/^-{3,}$/) || cleanLine.match(/^\*{3,}$/) || cleanLine.match(/^_{3,}$/)) && trimmedLine.length >= 3) {
                elements.push({ type: 'horizontal-rule' });
                i++;
                continue;
            }

            // Headings
            if (trimmedLine.startsWith('#')) {
                const level = trimmedLine.match(/^#+/)?.[0].length || 1;
                const content = trimmedLine.replace(/^#+\s*/, '').trim();
                if (content) {
                    elements.push({ type: 'heading', content, level: Math.min(level, 6) });
                }
                i++;
                continue;
            }

            // Task lists
            if (trimmedLine.match(/^[-*+]\s+\[[ x]\]\s+/)) {
                const checked = trimmedLine.includes('[x]');
                const content = trimmedLine.replace(/^[-*+]\s+\[[ x]\]\s+/, '').trim();
                const lastElement = elements[elements.length - 1];
                if (lastElement && lastElement.type === 'tasklist' && lastElement.tasks) {
                    lastElement.tasks.push({ checked, text: content });
                } else {
                    elements.push({ type: 'tasklist', tasks: [{ checked, text: content }] });
                }
                i++;
                continue;
            }

            // Unordered lists
            if (trimmedLine.match(/^[-*+]\s+/)) {
                const content = trimmedLine.replace(/^[-*+]\s+/, '').trim();
                const lastElement = elements[elements.length - 1];
                if (lastElement && lastElement.type === 'list' && lastElement.listType === 'unordered' && lastElement.items) {
                    lastElement.items.push(content);
                } else {
                    elements.push({ type: 'list', listType: 'unordered', items: [content] });
                }
                i++;
                continue;
            }

            // Ordered lists
            if (trimmedLine.match(/^\d+\.\s+/)) {
                const content = trimmedLine.replace(/^\d+\.\s+/, '').trim();
                const lastElement = elements[elements.length - 1];
                if (lastElement && lastElement.type === 'list' && lastElement.listType === 'ordered' && lastElement.items) {
                    lastElement.items.push(content);
                } else {
                    elements.push({ type: 'list', listType: 'ordered', items: [content] });
                }
                i++;
                continue;
            }

            // Blockquotes
            if (trimmedLine.startsWith('>')) {
                const content = trimmedLine.replace(/^>\s*/, '').trim();
                const lastElement = elements[elements.length - 1];
                if (lastElement && lastElement.type === 'blockquote' && lastElement.content) {
                    lastElement.content += '\n' + content;
                } else {
                    elements.push({ type: 'blockquote', content });
                }
                i++;
                continue;
            }

            // Tables
            if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
                if (!inTable) {
                    inTable = true;
                    tableRows = [];
                    tableAlignments = [];
                }
                const cells = line.split('|').slice(1, -1).map(cell => cell.trim());
                if (cells.every(cell => /^:?-+:?$/.test(cell))) {
                    tableAlignments = cells.map(cell => {
                        if (cell.startsWith(':') && cell.endsWith(':')) return 'center';
                        if (cell.endsWith(':')) return 'right';
                        return 'left';
                    });
                } else {
                    tableRows.push(cells);
                }
                i++;
                continue;
            } else if (inTable) {
                elements.push({ type: 'table', rows: tableRows, alignments: tableAlignments });
                inTable = false;
                tableRows = [];
                tableAlignments = [];
            }

            // Standard images
            const standardImageMatch = trimmedLine.match(/^!\[([^\]]*)\]\(([^\s\|]+)(?:\s*\|(\d+)(?:x(\d+))?)?\s*(?:"[^"]*")?\)$/);
            if (standardImageMatch) {
                const alt = standardImageMatch[1];
                const url = standardImageMatch[2];
                const customWidth = standardImageMatch[3] ? parseInt(standardImageMatch[3]) : undefined;
                const customHeight = standardImageMatch[4] ? parseInt(standardImageMatch[4]) : undefined;

                let imageData = null;
                if (url.startsWith('http://') || url.startsWith('https://')) {
                    try {
                        const response = await fetch(url);
                        if (response.ok) imageData = await response.arrayBuffer();
                    } catch (error) {
                        console.error('StoryLine DOCX: Error fetching external image:', error);
                    }
                } else if (this.resourceLoader) {
                    try {
                        imageData = await this.resourceLoader(url);
                    } catch (error) {
                        console.error(`StoryLine DOCX: Error loading local image ${url}:`, error);
                    }
                }

                elements.push({
                    type: 'image',
                    imageAlt: alt,
                    imageData: imageData || undefined,
                    imageWidth: customWidth,
                    imageHeight: customHeight,
                });
                i++;
                continue;
            }

            // Obsidian embedded images
            const wikiImageMatch = trimmedLine.match(/^!\[\[([^\]]+?)\]\](?:\s*<!--\s*pdf-scale:([\d.]+)\s*-->)?/);
            if (wikiImageMatch) {
                const fullPath = wikiImageMatch[1];
                const parts = fullPath.split('|');
                const fileName = parts[0];
                let customWidth: number | undefined;
                let customHeight: number | undefined;

                if (parts[1]) {
                    const sizeMatch = parts[1].match(/^(\d+)(?:x(\d+))?$/);
                    if (sizeMatch) {
                        customWidth = parseInt(sizeMatch[1]);
                        customHeight = sizeMatch[2] ? parseInt(sizeMatch[2]) : undefined;
                    }
                }

                const isPDF = fileName.toLowerCase().endsWith('.pdf');
                if (isPDF) { i++; continue; }

                let fileData = null;
                if (this.resourceLoader) {
                    try {
                        fileData = await this.resourceLoader(fileName);
                    } catch (error) {
                        console.error(`StoryLine DOCX: Error loading file ${fileName}:`, error);
                    }
                }

                elements.push({
                    type: 'image',
                    imageAlt: fileName,
                    imageData: fileData || undefined,
                    imageWidth: customWidth,
                    imageHeight: customHeight,
                });
                i++;
                continue;
            }

            // Empty lines
            if (trimmedLine === '') {
                elements.push({ type: 'break' });
                i++;
                continue;
            }

            // HTML collapsible sections
            if (trimmedLine.match(/^<details/i)) {
                let detailsContent = '';
                let summaryText = 'Details';
                let j = i;
                let depth = 0;

                while (j < lines.length) {
                    const currentLine = lines[j];
                    if (currentLine.includes('<details')) depth++;
                    if (currentLine.includes('</details>')) depth--;

                    const summaryMatch = currentLine.match(/<summary[^>]*>(.*?)<\/summary>/i);
                    if (summaryMatch) summaryText = summaryMatch[1].trim();

                    detailsContent += currentLine + '\n';
                    j++;

                    if (depth === 0) break;
                }

                const cleanContent = detailsContent
                    .replace(/<\/?details[^>]*>/gi, '')
                    .replace(/<\/?summary[^>]*>/gi, '')
                    .trim();

                elements.push({ type: 'paragraph', content: `\u25BC ${summaryText}` });

                if (cleanContent) {
                    const innerElements = await this.parseMarkdownToElements(cleanContent);
                    elements.push(...innerElements);
                }

                i = j;
                continue;
            }

            // Regular paragraphs
            elements.push({ type: 'paragraph', content: line });
            i++;
        }

        // Handle remaining table
        if (inTable) {
            elements.push({ type: 'table', rows: tableRows, alignments: tableAlignments });
        }

        return elements;
    }

    // ── Font helpers ──

    private getFontFamily(): string {
        if (this.settings.useObsidianAppearance && this.obsidianFonts) {
            return this.obsidianFonts.textFont || this.settings.defaultFontFamily;
        }
        return this.settings.defaultFontFamily;
    }

    private getFontSize(): number {
        if (this.settings.useObsidianAppearance && this.obsidianFonts) {
            return this.obsidianFonts.baseFontSize || this.settings.defaultFontSize;
        }
        return this.settings.defaultFontSize;
    }

    private getCodeFont(): string {
        if (this.settings.useObsidianAppearance && this.obsidianFonts) {
            let font = this.obsidianFonts.monospaceFont;
            if (!font || font === 'undefined' || font === '??' || font.includes('??')) {
                font = 'Courier New';
            }
            return font;
        }
        return 'Courier New';
    }

    private getHeadingSize(level: number): number {
        const baseFontSize = this.getFontSize();
        const multipliers = [2.0, 1.6, 1.4, 1.2, 1.1, 1.0];

        if (this.settings.useObsidianAppearance && this.obsidianFonts) {
            const obsidianSize = this.obsidianFonts.headingSizes[level - 1];
            if (obsidianSize) return obsidianSize;
        }

        return Math.round(baseFontSize * multipliers[level - 1]);
    }

    private getPageSize(): { width: number; height: number } {
        const sizes = {
            'A4': { width: 11906, height: 16838 },
            'A5': { width: 8391, height: 11906 },
            'A3': { width: 16838, height: 23811 },
            'Letter': { width: 12240, height: 15840 },
            'Legal': { width: 12240, height: 20160 },
            'Tabloid': { width: 15840, height: 24480 },
        };
        return sizes[this.settings.pageSize] || sizes['A4'];
    }

    // ── XML utilities ──

    private escapeXml(text: string): string {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }

    private escapeXmlForCode(text: string): string {
        const decoded = this.decodeHtmlEntities(text);
        return decoded
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    private decodeHtmlEntities(text: string): string {
        return text
            .replace(/&#x27;/g, "'")
            .replace(/&#x22;/g, '"')
            .replace(/&quot;/g, '"')
            .replace(/&apos;/g, "'")
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&');
    }

    private extractFootnotes(markdown: string): { content: string; definitions: Map<string, string> } {
        const lines = markdown.split('\n');
        const filteredLines: string[] = [];
        const definitions = new Map<string, string>();

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const match = line.match(/^\[\^([^\]]+)\]:\s*(.*)$/);
            if (match) {
                const label = match[1].trim();
                const definitionParts: string[] = [];
                if (match[2]) definitionParts.push(match[2].trim());

                let j = i + 1;
                while (j < lines.length && /^\s{2,}.+/.test(lines[j])) {
                    definitionParts.push(lines[j].trim());
                    j++;
                }

                definitions.set(label, definitionParts.join(' ').trim());
                i = j - 1;
            } else {
                filteredLines.push(line);
            }
        }

        return { content: filteredLines.join('\n'), definitions };
    }

    private getImageDimensions(imageData: ArrayBuffer): { width: number; height: number } {
        try {
            const view = new Uint8Array(imageData);

            // PNG
            if (view[0] === 0x89 && view[1] === 0x50 && view[2] === 0x4E && view[3] === 0x47) {
                if (imageData.byteLength >= 24) {
                    const width = (view[16] << 24) | (view[17] << 16) | (view[18] << 8) | view[19];
                    const height = (view[20] << 24) | (view[21] << 16) | (view[22] << 8) | view[23];
                    if (width > 0 && height > 0 && width < 10000 && height < 10000) {
                        return { width, height };
                    }
                }
            }

            // JPEG
            if (view[0] === 0xFF && view[1] === 0xD8) {
                let offset = 2;
                while (offset < view.length - 8) {
                    if (view[offset] === 0xFF) {
                        const marker = view[offset + 1];
                        if ((marker >= 0xC0 && marker <= 0xC3) || (marker >= 0xC5 && marker <= 0xC7) ||
                            (marker >= 0xC9 && marker <= 0xCB) || (marker >= 0xCD && marker <= 0xCF)) {
                            const height = (view[offset + 5] << 8) | view[offset + 6];
                            const width = (view[offset + 7] << 8) | view[offset + 8];
                            if (width > 0 && height > 0 && width < 10000 && height < 10000) {
                                return { width, height };
                            }
                        }
                        const segmentLength = (view[offset + 2] << 8) | view[offset + 3];
                        offset += segmentLength + 2;
                    } else {
                        offset++;
                    }
                }
            }

            // GIF
            if (view[0] === 0x47 && view[1] === 0x49 && view[2] === 0x46) {
                if (imageData.byteLength >= 10) {
                    const width = view[6] | (view[7] << 8);
                    const height = view[8] | (view[9] << 8);
                    if (width > 0 && height > 0 && width < 10000 && height < 10000) {
                        return { width, height };
                    }
                }
            }

            // SVG
            try {
                const text = new TextDecoder('utf-8').decode(imageData);
                if (text.includes('<svg') && text.includes('</svg>')) {
                    const svgMatch = text.match(/<svg[^>]*width=['"]?(\d+)['"]?[^>]*height=['"]?(\d+)['"]?[^>]*>/i) ||
                        text.match(/<svg[^>]*height=['"]?(\d+)['"]?[^>]*width=['"]?(\d+)['"]?[^>]*>/i);
                    if (svgMatch) {
                        const width = parseInt(svgMatch[1]);
                        const height = parseInt(svgMatch[2]);
                        if (width > 0 && height > 0 && width < 10000 && height < 10000) {
                            return { width, height };
                        }
                    }
                    const viewBoxMatch = text.match(/viewBox=['"]?[^'"]*?\s+(\d+)\s+(\d+)['"]?/i);
                    if (viewBoxMatch) {
                        const width = parseInt(viewBoxMatch[1]);
                        const height = parseInt(viewBoxMatch[2]);
                        if (width > 0 && height > 0 && width < 10000 && height < 10000) {
                            return { width, height };
                        }
                    }
                    return { width: 300, height: 200 };
                }
            } catch {
                // Not a text-based SVG
            }
        } catch (error) {
            console.warn('StoryLine DOCX: Error reading image dimensions:', error);
        }

        return { width: 0, height: 0 };
    }

    private convertEmojis(text: string): string {
        const emojiMap: Record<string, string> = {
            ':smile:': '\uD83D\uDE0A', ':grin:': '\uD83D\uDE01', ':wink:': '\uD83D\uDE09',
            ':heart:': '\u2764\uFE0F', ':thumbsup:': '\uD83D\uDC4D', ':thumbsdown:': '\uD83D\uDC4E',
            ':fire:': '\uD83D\uDD25', ':star:': '\u2B50', ':rocket:': '\uD83D\uDE80',
            ':check:': '\u2705', ':x:': '\u274C', ':warning:': '\u26A0\uFE0F',
            ':info:': '\u2139\uFE0F', ':bulb:': '\uD83D\uDCA1', ':book:': '\uD83D\uDCD6',
            ':computer:': '\uD83D\uDCBB', ':phone:': '\uD83D\uDCF1', ':email:': '\uD83D\uDCE7',
            ':calendar:': '\uD83D\uDCC5', ':clock:': '\uD83D\uDD50', ':money:': '\uD83D\uDCB0',
            ':key:': '\uD83D\uDD11', ':lock:': '\uD83D\uDD12', ':unlock:': '\uD83D\uDD13',
        };

        let result = text;
        for (const [shortcode, emoji] of Object.entries(emojiMap)) {
            result = result.replace(new RegExp(this.escapeRegex(shortcode), 'g'), emoji);
        }
        return result;
    }

    private escapeRegex(string: string): string {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
}
