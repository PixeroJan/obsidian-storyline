/** Types and display metadata for StoryLine research posts. */

export type ResearchType = 'note' | 'webclip' | 'image' | 'question';

export interface ResearchPost {
    /** Vault-relative path of the research note or linked file. */
    filePath: string;
    /** Display title. */
    title: string;
    /** Research post kind. */
    researchType: ResearchType;
    /** User-assigned tags. */
    tags: string[];
    /** Markdown body or linked-file description. */
    body: string;
    /** Source URL for web clips. */
    sourceUrl?: string;
    /** Whether a question has been resolved. */
    resolved?: boolean;
    /** ISO creation timestamp. */
    created: string;
    /** ISO modification timestamp. */
    modified: string;
    /** True when the post represents a note linked from elsewhere in the vault. */
    isLinked?: boolean;
    /** Relative Research subfolder used for display grouping. */
    subfolder?: string;
}

export const RESEARCH_TYPE_CONFIG: Record<ResearchType, { label: string; icon: string }> = {
    note: { label: 'Notes', icon: 'file-text' },
    webclip: { label: 'Web Clips', icon: 'globe' },
    image: { label: 'Images', icon: 'image' },
    question: { label: 'Questions', icon: 'help-circle' },
};
