/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-floating-promises, @typescript-eslint/no-misused-promises, @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/no-redundant-type-constituents, @typescript-eslint/no-unused-vars, no-unused-vars, no-useless-escape, no-control-regex, no-empty -- Obsidian's API surface and several untyped third-party libraries force dynamic dispatch; floating promises are intentional in DOM/event handlers; matching enable at end of file */
export type StoryLineLocale = 'en' | 'zh' | 'ja' | 'ko';

export const DEFAULT_STORYLINE_LOCALE: StoryLineLocale = 'en';
export const SUPPORTED_STORYLINE_LOCALES: StoryLineLocale[] = ['en', 'zh', 'ja', 'ko'];

const CJK_LOCALES = new Set<StoryLineLocale>(['zh', 'ja', 'ko']);

export function normalizeStoryLineLocale(value: unknown): StoryLineLocale {
    const raw = String(value || '').trim().toLowerCase().replace('_', '-');
    const base = raw.split('-')[0];
    return SUPPORTED_STORYLINE_LOCALES.includes(base as StoryLineLocale)
        ? base as StoryLineLocale
        : DEFAULT_STORYLINE_LOCALE;
}

export function isCjkStoryLineLocale(locale: StoryLineLocale): boolean {
    return CJK_LOCALES.has(locale);
}

export function getReadingWordsPerMinute(locale: StoryLineLocale): number {
    return isCjkStoryLineLocale(locale) ? 400 : 250;
}

export function tokenizeWords(text: string, locale: StoryLineLocale = DEFAULT_STORYLINE_LOCALE): string[] {
    if (!text) return [];
    if (!isCjkStoryLineLocale(locale)) {
        return text.split(/\s+/).filter(w => w.length > 0);
    }

    const segmenterCtor = (Intl as unknown as { Segmenter?: new (locale?: string, options?: { granularity: 'word' }) => { segment(input: string): Iterable<{ segment: string; isWordLike?: boolean }> } }).Segmenter;
    if (segmenterCtor) {
        const segmenter = new segmenterCtor(locale, { granularity: 'word' });
        return Array.from(segmenter.segment(text))
            .filter(part => part.isWordLike === true)
            .map(part => part.segment.trim())
            .filter(Boolean);
    }

    return text.match(/[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF\u3040-\u30FF\uAC00-\uD7AF]|[A-Za-z0-9]+(?:['\u2019-][A-Za-z0-9]+)*/g) || [];
}
/* eslint-enable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-floating-promises, @typescript-eslint/no-misused-promises, @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/no-redundant-type-constituents, @typescript-eslint/no-unused-vars, no-unused-vars, no-useless-escape, no-control-regex, no-empty -- end of file-wide suppression block opened at line 1 */
