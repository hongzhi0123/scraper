// Built-in transforms
export const TRANSFORMS: Record<string, (v: string) => any> = {
    parseInt: (v: string) => parseInt(v.trim(), 10),
    parseFloat: (v: string) => parseFloat(v.trim()),
    trim: (v: string) => v.trim(),
    lowercase: (v: string) => v.trim().toLowerCase(),
};

export type TransformName = keyof typeof TRANSFORMS; // 'parseInt' | 'parseFloat' | ...

export interface ColumnMapping {
    header?: string;     // Match by header text (case-insensitive, trimmed)
    index?: number;      // Or match by column index (0-based)
    key: string;         // Output JSON key
    transform?: TransformName; // ← Restrict to valid transform names (value: string) => any; // Optional transform
}

export interface PaginationConfig {
    /** CSS selector for the <a> element that links to the next page */
    nextPageSelector: string;

    /**
     * Optional: attribute that contains the URL.
     * Default: "href"
     */
    hrefAttr?: string;
}

export interface SiteConfig {
    url: string;
    tableSelector: string; // CSS selector for the table
    hasHeader: boolean;    // Does the first row contain headers?
    columns: ColumnMapping[];
    skipRows?: number;     // Skip first N rows (e.g. title rows)

    /** NEW: Pagination */
    pagination?: PaginationConfig;
}

export interface ScrapedRow {
    [key: string]: any;
}