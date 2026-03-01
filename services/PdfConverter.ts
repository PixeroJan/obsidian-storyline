/**
 * StoryLine PDF Converter
 *
 * Pure JavaScript PDF generation using pdf-lib.
 * Works on desktop AND mobile (no DOM/Electron/canvas dependencies).
 *
 * All types and classes are prefixed with "SL" to avoid naming collisions.
 */

import {
    PDFDocument,
    PDFPage,
    PDFFont,
    StandardFonts,
    rgb,
    PageSizes,
} from 'pdf-lib';

// ── Settings interface ─────────────────────────────────────────

export interface SLPdfSettings {
    fontFamily: 'Helvetica' | 'TimesRoman' | 'Courier';
    fontSize: number;            // base body font size in pt
    pageSize: 'A4' | 'A5' | 'A3' | 'Letter' | 'Legal';
    marginTop: number;           // pt
    marginBottom: number;
    marginLeft: number;
    marginRight: number;
    lineSpacing: number;         // multiplier (1.0 = single, 1.5, 2.0 = double)
    includeMetadata: boolean;    // include frontmatter
    includePageNumbers: boolean;
    headerFontSize: number;      // for the project title on page 1
}

export const SL_DEFAULT_PDF_SETTINGS: SLPdfSettings = {
    fontFamily: 'Helvetica',
    fontSize: 11,
    pageSize: 'A4',
    marginTop: 72,       // 1 inch
    marginBottom: 72,
    marginLeft: 72,
    marginRight: 72,
    lineSpacing: 1.4,
    includeMetadata: false,
    includePageNumbers: true,
    headerFontSize: 24,
};

// ── Internal types ─────────────────────────────────────────────

interface TextRun {
    text: string;
    bold: boolean;
    italic: boolean;
}

interface PdfFonts {
    regular: PDFFont;
    bold: PDFFont;
    italic: PDFFont;
    boldItalic: PDFFont;
}

// ── Converter class ────────────────────────────────────────────

export class SLMarkdownToPdfConverter {
    private settings: SLPdfSettings;

    constructor(settings?: Partial<SLPdfSettings>) {
        this.settings = { ...SL_DEFAULT_PDF_SETTINGS, ...settings };
    }

    async convert(markdown: string, title: string): Promise<Uint8Array> {
        // Sanitize entire input upfront to prevent WinAnsi encoding errors
        const safeMarkdown = this.sanitizeForWinAnsi(markdown);
        const safeTitle = this.sanitizeForWinAnsi(title);

        const doc = await PDFDocument.create();

        // Set document metadata
        doc.setTitle(safeTitle);
        doc.setCreator('StoryLine for Obsidian');
        doc.setProducer('pdf-lib');

        // Load fonts based on the chosen family
        const fonts = await this.loadFonts(doc);

        const pageSize = this.getPageDimensions();
        const { marginTop, marginBottom, marginLeft, marginRight } = this.settings;
        const contentWidth = pageSize[0] - marginLeft - marginRight;
        const pageContentHeight = pageSize[1] - marginTop - marginBottom;

        // Parse markdown into drawable blocks
        const blocks = this.parseMarkdown(safeMarkdown);

        // Render blocks across pages
        let page = doc.addPage(pageSize);
        let y = pageSize[1] - marginTop;
        let pageNumber = 1;

        for (const block of blocks) {
            switch (block.type) {
                case 'heading': {
                    const fontSize = this.headingSize(block.level ?? 1);
                    const font = fonts.bold;
                    const lineHeight = fontSize * this.settings.lineSpacing;
                    const spaceBefore = fontSize * 0.8;
                    const spaceAfter = fontSize * 0.4;

                    // Check if heading + at least one line after fits
                    if (y - spaceBefore - lineHeight - spaceAfter < marginBottom + this.settings.fontSize * this.settings.lineSpacing) {
                        if (this.settings.includePageNumbers) {
                            this.drawPageNumber(page, fonts.regular, pageNumber, pageSize);
                        }
                        page = doc.addPage(pageSize);
                        y = pageSize[1] - marginTop;
                        pageNumber++;
                    }

                    y -= spaceBefore;

                    const headingText = block.text ?? '';
                    const wrappedLines = this.wrapText(headingText, font, fontSize, contentWidth);
                    for (const line of wrappedLines) {
                        if (y - lineHeight < marginBottom) {
                            if (this.settings.includePageNumbers) {
                                this.drawPageNumber(page, fonts.regular, pageNumber, pageSize);
                            }
                            page = doc.addPage(pageSize);
                            y = pageSize[1] - marginTop;
                            pageNumber++;
                        }
                        page.drawText(this.safeText(line), {
                            x: marginLeft,
                            y: y - fontSize,
                            size: fontSize,
                            font,
                            color: rgb(0, 0, 0),
                        });
                        y -= lineHeight;
                    }

                    y -= spaceAfter;
                    break;
                }

                case 'paragraph': {
                    const fontSize = this.settings.fontSize;
                    const lineHeight = fontSize * this.settings.lineSpacing;
                    const spaceAfter = fontSize * 0.5;

                    const runs = block.runs ?? [{ text: block.text ?? '', bold: false, italic: false }];

                    // Render paragraph with inline formatting
                    const lines = this.wrapRuns(runs, fonts, fontSize, contentWidth);

                    for (const lineRuns of lines) {
                        if (y - lineHeight < marginBottom) {
                            if (this.settings.includePageNumbers) {
                                this.drawPageNumber(page, fonts.regular, pageNumber, pageSize);
                            }
                            page = doc.addPage(pageSize);
                            y = pageSize[1] - marginTop;
                            pageNumber++;
                        }

                        let x = marginLeft;
                        for (const run of lineRuns) {
                            const font = this.pickFont(fonts, run.bold, run.italic);
                            const safeRunText = this.safeText(run.text);
                            page.drawText(safeRunText, {
                                x,
                                y: y - fontSize,
                                size: fontSize,
                                font,
                                color: rgb(0, 0, 0),
                            });
                            x += font.widthOfTextAtSize(safeRunText, fontSize);
                        }
                        y -= lineHeight;
                    }

                    y -= spaceAfter;
                    break;
                }

                case 'hr': {
                    const hrSpace = this.settings.fontSize * 0.8;
                    if (y - hrSpace * 2 < marginBottom) {
                        if (this.settings.includePageNumbers) {
                            this.drawPageNumber(page, fonts.regular, pageNumber, pageSize);
                        }
                        page = doc.addPage(pageSize);
                        y = pageSize[1] - marginTop;
                        pageNumber++;
                    }
                    y -= hrSpace;
                    page.drawLine({
                        start: { x: marginLeft, y },
                        end: { x: marginLeft + contentWidth, y },
                        thickness: 0.5,
                        color: rgb(0.7, 0.7, 0.7),
                    });
                    y -= hrSpace;
                    break;
                }

                case 'blank': {
                    y -= this.settings.fontSize * this.settings.lineSpacing * 0.5;
                    break;
                }
            }

            // Page overflow safety
            if (y < marginBottom) {
                if (this.settings.includePageNumbers) {
                    this.drawPageNumber(page, fonts.regular, pageNumber, pageSize);
                }
                page = doc.addPage(pageSize);
                y = pageSize[1] - marginTop;
                pageNumber++;
            }
        }

        // Draw page number on last page
        if (this.settings.includePageNumbers) {
            this.drawPageNumber(page, fonts.regular, pageNumber, pageSize);
        }

        return doc.save();
    }

    // ── Markdown parser ────────────────────────────────────────

    private parseMarkdown(md: string): Block[] {
        const lines = md.split('\n');
        const blocks: Block[] = [];
        let i = 0;

        while (i < lines.length) {
            const line = lines[i];

            // Heading
            const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
            if (headingMatch) {
                blocks.push({
                    type: 'heading',
                    level: headingMatch[1].length,
                    text: this.cleanInline(headingMatch[2]),
                });
                i++;
                continue;
            }

            // Horizontal rule
            if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(line.trim())) {
                blocks.push({ type: 'hr' });
                i++;
                continue;
            }

            // Blank line
            if (line.trim() === '') {
                blocks.push({ type: 'blank' });
                i++;
                continue;
            }

            // Paragraph — collect contiguous non-empty, non-heading, non-hr lines
            const paraLines: string[] = [];
            while (i < lines.length) {
                const l = lines[i];
                if (l.trim() === '') break;
                if (/^#{1,6}\s+/.test(l)) break;
                if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(l.trim())) break;
                paraLines.push(l);
                i++;
            }

            if (paraLines.length > 0) {
                const joined = paraLines.join(' ');
                const cleaned = this.cleanInline(joined);
                const runs = this.parseInlineRuns(cleaned);
                blocks.push({ type: 'paragraph', text: cleaned, runs });
            }
        }

        return blocks;
    }

    /**
     * Strip Obsidian tags, wikilinks, and other non-printable markdown artifacts.
     */
    private cleanInline(text: string): string {
        let s = text;
        // Strip Obsidian tags (#tag)
        s = s.replace(/(?<=\s|^)#([\w\-\/]+)/g, '$1');
        // Strip wikilinks [[Display|Alias]] → Alias, [[Note]] → Note
        s = s.replace(/\[\[([^\]]+)\]\]/g, (_m, inner: string) => {
            if (inner.includes('|')) return inner.split('|').pop()!.trim();
            if (inner.includes('/')) return inner.split('/').pop()!.trim();
            return inner.trim();
        });
        // Strip image embeds ![[image]]
        s = s.replace(/!\[\[([^\]]+)\]\]/g, '');
        // Strip Markdown image syntax ![alt](url)
        s = s.replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1');
        // Strip highlight markers ==text== → text
        s = s.replace(/==(.+?)==/g, '$1');
        // Strip strikethrough ~~text~~ → text
        s = s.replace(/~~(.+?)~~/g, '$1');
        // Strip inline code backticks but keep text
        s = s.replace(/`([^`]+)`/g, '$1');
        // Sanitize for WinAnsi encoding (standard PDF fonts)
        s = this.sanitizeForWinAnsi(s);
        return s.trim();
    }

    /**
     * Replace characters outside the WinAnsi (Windows-1252) encoding
     * with their closest ASCII equivalents so pdf-lib's standard fonts
     * can render them without crashing.
     */
    private sanitizeForWinAnsi(text: string): string {
        let s = text;

        // Dashes
        s = s.replace(/\u2014/g, '--');   // em dash → --
        s = s.replace(/\u2013/g, '-');    // en dash → -
        s = s.replace(/\u2012/g, '-');    // figure dash
        s = s.replace(/\u2015/g, '--');   // horizontal bar

        // Quotes
        s = s.replace(/[\u2018\u2019\u201A\u201B]/g, "'"); // curly single quotes
        s = s.replace(/[\u201C\u201D\u201E\u201F]/g, '"'); // curly double quotes
        s = s.replace(/\u2039/g, '<');    // single left angle quote
        s = s.replace(/\u203A/g, '>');    // single right angle quote
        s = s.replace(/\u00AB/g, '<<');   // left double angle quote «
        s = s.replace(/\u00BB/g, '>>');   // right double angle quote »

        // Ellipsis
        s = s.replace(/\u2026/g, '...');

        // Spaces
        s = s.replace(/[\u00A0\u2007\u202F]/g, ' ');  // non-breaking spaces
        s = s.replace(/[\u2000-\u200B]/g, ' ');        // various unicode spaces
        s = s.replace(/\u200C/g, '');    // zero-width non-joiner
        s = s.replace(/\u200D/g, '');    // zero-width joiner
        s = s.replace(/\uFEFF/g, '');    // BOM

        // Bullets & symbols
        s = s.replace(/\u2022/g, '-');    // bullet
        s = s.replace(/\u2023/g, '>');    // triangular bullet
        s = s.replace(/\u2043/g, '-');    // hyphen bullet
        s = s.replace(/\u25E6/g, 'o');    // white bullet
        s = s.replace(/\u2219/g, '-');    // bullet operator

        // Arrows
        s = s.replace(/\u2190/g, '<-');   // left arrow
        s = s.replace(/\u2192/g, '->');   // right arrow
        s = s.replace(/\u2194/g, '<->');  // left-right arrow
        s = s.replace(/\u21D2/g, '=>');   // double right arrow

        // Math & misc
        s = s.replace(/\u2212/g, '-');    // minus sign
        s = s.replace(/\u00D7/g, 'x');   // multiplication sign
        s = s.replace(/\u00F7/g, '/');    // division sign
        s = s.replace(/\u2248/g, '~');    // almost equal
        s = s.replace(/\u2260/g, '!=');   // not equal
        s = s.replace(/\u2264/g, '<=');   // less than or equal
        s = s.replace(/\u2265/g, '>=');   // greater than or equal
        s = s.replace(/\u221E/g, 'inf'); // infinity
        s = s.replace(/\u2122/g, '(TM)'); // trademark
        s = s.replace(/\u00A9/g, '(c)');  // copyright
        s = s.replace(/\u00AE/g, '(R)');  // registered

        // Strip control characters (U+0000-U+001F except \n \r \t, and U+007F-U+009F)
        // The U+0080-U+009F range is C1 control characters in Unicode — NOT the same
        // as Windows-1252 byte 0x80-0x9F. pdf-lib cannot encode them.
        s = s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '');

        // Final filter: only keep printable ASCII + Latin-1 Supplement
        // 0x20-0x7E = printable ASCII (includes accented chars like å ä ö ñ ü)
        // 0xA0-0xFF = Latin-1 Supplement (non-breaking space through ÿ)
        // Plus \n \r \t for whitespace handling
        s = s.replace(/[^\x20-\x7E\xA0-\xFF\n\r\t]/g, '');

        return s;
    }

    /**
     * Last-resort safety wrapper: strip any character that could crash
     * pdf-lib's WinAnsi encoder. Called right before drawText/widthOfTextAtSize.
     */
    private safeText(text: string): string {
        // Fast path — pure ASCII is always safe
        if (/^[\x20-\x7E]*$/.test(text)) return text;
        return this.sanitizeForWinAnsi(text);
    }

    /**
     * Parse inline markdown formatting into TextRuns for bold/italic rendering.
     */
    private parseInlineRuns(text: string): TextRun[] {
        const runs: TextRun[] = [];
        // Regex to match **bold**, *italic*, ***bolditalic***
        const pattern = /(\*{1,3})((?:(?!\1).)+?)\1/g;
        let lastIndex = 0;
        let match: RegExpExecArray | null;

        while ((match = pattern.exec(text)) !== null) {
            // Text before this match
            if (match.index > lastIndex) {
                const before = text.slice(lastIndex, match.index);
                if (before) runs.push({ text: before, bold: false, italic: false });
            }

            const stars = match[1].length;
            const content = match[2];
            runs.push({
                text: content,
                bold: stars >= 2,
                italic: stars === 1 || stars === 3,
            });

            lastIndex = match.index + match[0].length;
        }

        // Remaining text
        if (lastIndex < text.length) {
            const remaining = text.slice(lastIndex);
            if (remaining) runs.push({ text: remaining, bold: false, italic: false });
        }

        if (runs.length === 0) {
            runs.push({ text, bold: false, italic: false });
        }

        return runs;
    }

    // ── Text wrapping ──────────────────────────────────────────

    /** Wrap plain text into lines that fit within maxWidth */
    private wrapText(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
        const safeInput = this.safeText(text);
        const words = safeInput.split(/\s+/);
        const lines: string[] = [];
        let currentLine = '';

        for (const word of words) {
            if (!word) continue;
            const testLine = currentLine ? `${currentLine} ${word}` : word;
            const width = font.widthOfTextAtSize(testLine, fontSize);
            if (width > maxWidth && currentLine) {
                lines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        }
        if (currentLine) lines.push(currentLine);
        if (lines.length === 0) lines.push('');
        return lines;
    }

    /** Wrap runs of formatted text into visual lines */
    private wrapRuns(runs: TextRun[], fonts: PdfFonts, fontSize: number, maxWidth: number): TextRun[][] {
        const lines: TextRun[][] = [];
        let currentLine: TextRun[] = [];
        let lineWidth = 0;

        for (const run of runs) {
            const font = this.pickFont(fonts, run.bold, run.italic);
            const words = this.safeText(run.text).split(/( +)/); // keep spaces as separate tokens

            for (const word of words) {
                if (!word) continue;
                const wordWidth = font.widthOfTextAtSize(word, fontSize);

                if (lineWidth + wordWidth > maxWidth && currentLine.length > 0) {
                    // Trim trailing space from last run on the line
                    if (currentLine.length > 0) {
                        const last = currentLine[currentLine.length - 1];
                        last.text = last.text.replace(/ +$/, '');
                    }
                    lines.push(currentLine);
                    currentLine = [];
                    lineWidth = 0;

                    // Skip leading space on new line
                    if (word.trim() === '') continue;
                }

                // Merge with previous run if same formatting
                if (currentLine.length > 0) {
                    const prev = currentLine[currentLine.length - 1];
                    if (prev.bold === run.bold && prev.italic === run.italic) {
                        prev.text += word;
                        lineWidth += wordWidth;
                        continue;
                    }
                }

                currentLine.push({ text: word, bold: run.bold, italic: run.italic });
                lineWidth += wordWidth;
            }
        }

        if (currentLine.length > 0) {
            lines.push(currentLine);
        }
        if (lines.length === 0) {
            lines.push([{ text: '', bold: false, italic: false }]);
        }

        return lines;
    }

    // ── Font helpers ───────────────────────────────────────────

    private async loadFonts(doc: PDFDocument): Promise<PdfFonts> {
        const family = this.settings.fontFamily;

        let regular: StandardFonts;
        let bold: StandardFonts;
        let italic: StandardFonts;
        let boldItalic: StandardFonts;

        switch (family) {
            case 'TimesRoman':
                regular = StandardFonts.TimesRoman;
                bold = StandardFonts.TimesRomanBold;
                italic = StandardFonts.TimesRomanItalic;
                boldItalic = StandardFonts.TimesRomanBoldItalic;
                break;
            case 'Courier':
                regular = StandardFonts.Courier;
                bold = StandardFonts.CourierBold;
                italic = StandardFonts.CourierOblique;
                boldItalic = StandardFonts.CourierBoldOblique;
                break;
            case 'Helvetica':
            default:
                regular = StandardFonts.Helvetica;
                bold = StandardFonts.HelveticaBold;
                italic = StandardFonts.HelveticaOblique;
                boldItalic = StandardFonts.HelveticaBoldOblique;
                break;
        }

        return {
            regular: await doc.embedFont(regular),
            bold: await doc.embedFont(bold),
            italic: await doc.embedFont(italic),
            boldItalic: await doc.embedFont(boldItalic),
        };
    }

    private pickFont(fonts: PdfFonts, bold: boolean, italic: boolean): PDFFont {
        if (bold && italic) return fonts.boldItalic;
        if (bold) return fonts.bold;
        if (italic) return fonts.italic;
        return fonts.regular;
    }

    private headingSize(level: number): number {
        const multipliers = [2.0, 1.6, 1.3, 1.1, 1.0, 0.9];
        const m = multipliers[Math.min(level - 1, 5)];
        return Math.round(this.settings.fontSize * m);
    }

    // ── Page helpers ───────────────────────────────────────────

    private getPageDimensions(): [number, number] {
        switch (this.settings.pageSize) {
            case 'A3': return PageSizes.A3;
            case 'A5': return PageSizes.A5;
            case 'Letter': return PageSizes.Letter;
            case 'Legal': return PageSizes.Legal;
            case 'A4':
            default: return PageSizes.A4;
        }
    }

    private drawPageNumber(page: PDFPage, font: PDFFont, num: number, pageSize: [number, number]): void {
        const text = String(num);
        const fontSize = 9;
        const textWidth = font.widthOfTextAtSize(text, fontSize);
        page.drawText(text, {
            x: (pageSize[0] - textWidth) / 2,
            y: this.settings.marginBottom / 2,
            size: fontSize,
            font,
            color: rgb(0.5, 0.5, 0.5),
        });
    }
}

// ── Block type ─────────────────────────────────────────────────

interface Block {
    type: 'heading' | 'paragraph' | 'hr' | 'blank';
    level?: number;
    text?: string;
    runs?: TextRun[];
}
