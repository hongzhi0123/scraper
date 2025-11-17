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
    detailLink?: boolean; // Whether this column contains the detail page link
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

export interface RowFilter {
    selector: string;     // CSS selector relative to <tr>
    attr: string;         // e.g. "alt", "class", "data-*"
    value: string;        // exact match
}

export interface TableConfig {
    tableSelector: string;
    hasHeader?: boolean;
    skipRows?: number;
    columns: ColumnMapping[];
    rowFilter?: RowFilter;
    detail?: PageConfig;
    
}

export interface PageConfig {
    fields: { key: string; selector: string; attr?: string; transform?: TransformName }[];
    tables: {
        key: string;
        config: TableConfig;
        pagination?: PaginationConfig;
    }[]
}

export interface SiteConfig {
    url: string;
    page: PageConfig;
}

export interface ScrapedRow {
    [key: string]: any;
}