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
    switch (locale) {
        case 'zh': return 160;
        case 'ja': return 190;
        case 'ko': return 250;
        default: return 250;
    }
}

export function getReadingCharactersPerMinute(locale: StoryLineLocale): number {
    switch (locale) {
        case 'zh': return 260;
        case 'ja': return 360;
        case 'ko': return 500;
        default: return 0;
    }
}

export function countReadingCharacters(text: string): number {
    return (text.match(/[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF\u3040-\u30FF\uAC00-\uD7AF]/g) || []).length;
}

export function hasCjkCharacters(text: string): boolean {
    return /[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF\u3040-\u30FF\uAC00-\uD7AF]/.test(text);
}

export function getDialogueQuotePairs(locale: StoryLineLocale): [string, string][] {
    switch (locale) {
        case 'zh':
            return [['\u201c', '\u201d'], ['\u300c', '\u300d'], ['\u300e', '\u300f'], ['"', '"']];
        case 'ja':
            return [['\u300c', '\u300d'], ['\u300e', '\u300f'], ['\u201c', '\u201d'], ['"', '"']];
        case 'ko':
            return [['\u201c', '\u201d'], ['\u300c', '\u300d'], ['\u300e', '\u300f'], ['"', '"']];
        default:
            return [['"', '"'], ['\u201c', '\u201d']];
    }
}

export function countDialogueCharacters(text: string, locale: StoryLineLocale): number {
    let total = 0;
    for (const [open, close] of getDialogueQuotePairs(locale)) {
        let start = 0;
        while (start < text.length) {
            const openAt = text.indexOf(open, start);
            if (openAt < 0) break;
            const contentStart = openAt + open.length;
            const closeAt = text.indexOf(close, contentStart);
            if (closeAt < 0) break;
            total += Math.max(0, closeAt - contentStart);
            start = closeAt + close.length;
        }
    }
    return total;
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

const EN_STOP_WORDS = new Set([
    'the','and','was','for','that','with','his','her','had','not','but','you','are',
    'from','they','she','been','have','him','has','this','were','said','each','its',
    'who','which','their','will','would','could','than','them','then','into','more',
    'some','when','what','there','about','just','like','all','out','did','one','over',
    'how','back','down','only','very','after','before','even','also','other','our',
    'own','still','being','your','too','here','those','both','does','where','most',
    'much','through','while','now','way','may','any','well','between','another',
    'because','such','never','went','came','made','around','long','time','know',
    'looked','thought','should','going','come','take','make',
]);

const ZH_STOP_WORDS = new Set([
    '的','了','和','是','在','我','有','不','也','就','都','而','及','与','與','着','著',
    '或','一个','沒有','没有','这','這','那','你','他','她','它','们','們','我们','我們',
    '你们','你們','他们','他們','她们','她們','这个','這個','那个','那個','这里','這裡',
    '那里','那裡','什么','什麼','这样','這樣','这些','這些','那些','因为','因為','所以',
    '如果','但是','并','並','或者','以及','对','對','到','为','為','上','下','中','来',
    '來','去','会','會','要','能','很','还','還','被','把','从','從','以','于','於','之',
]);

const JA_STOP_WORDS = new Set([
    'の','に','は','を','が','と','で','て','た','だ','です','ます','いる','ある','する',
    'ない','こと','これ','それ','あれ','この','その','あの','ここ','そこ','あそこ',
    '私','僕','彼','彼女','もの','よう','ため','から','まで','より','へ','も','や','か',
    'な','ね','よ','ぞ','ぜ','わ','ば','なら','そして','しかし','また','もう','まだ',
]);

const KO_STOP_WORDS = new Set([
    '은','는','이','가','을','를','에','에서','으로','로','와','과','하고','도','만','의',
    '에게','한테','께','부터','까지','보다','처럼','그리고','그러나','하지만','또','더',
    '나','너','그','그녀','우리','저','것','수','등','들','하다','있다','없다','이다',
]);

export function getStopWords(locale: StoryLineLocale): Set<string> {
    switch (locale) {
        case 'zh': return ZH_STOP_WORDS;
        case 'ja': return JA_STOP_WORDS;
        case 'ko': return KO_STOP_WORDS;
        default: return EN_STOP_WORDS;
    }
}

export function normalizeAnalysisToken(word: string, locale: StoryLineLocale): string {
    return isCjkStoryLineLocale(locale)
        ? word.trim()
        : word.replace(/^[^a-z]+|[^a-z]+$/g, '');
}

export function isSignificantWord(word: string, locale: StoryLineLocale, stopWords = getStopWords(locale)): boolean {
    const w = normalizeAnalysisToken(word, locale);
    if (!w || stopWords.has(w)) return false;
    return isCjkStoryLineLocale(locale) ? w.length > 0 : w.length > 2;
}
/* eslint-enable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-floating-promises, @typescript-eslint/no-misused-promises, @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/no-redundant-type-constituents, @typescript-eslint/no-unused-vars, no-unused-vars, no-useless-escape, no-control-regex, no-empty -- end of file-wide suppression block opened at line 1 */
