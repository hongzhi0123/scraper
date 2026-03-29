// Built-in transforms
export const TRANSFORMS = {
    parseInt: (v: string) => parseInt(v.replace(/[^\d-]/g, '') || '0', 10),
    parseFloat: (v: string) => parseFloat(v.replace(/[^\d.,-]/g, '').replace(',', '.') || '0'),

    trim: (v: string) => v.trim(),
    lowercase: (v: string) => v.toLowerCase(),
    uppercase: (v: string) => v.toUpperCase(),

    // NEW: with parameters
    multiply: (v: string | number, factor: number) => {
        const num = typeof v === 'string' ? parseFloat(v.replace(/[^\d.-]/g, '') || '0') : v;
        return num * factor;
    },

    divide: (v: string | number, divisor: number) => {
        const num = typeof v === 'string' ? parseFloat(v.replace(/[^\d.-]/g, '') || '0') : v;
        return divisor !== 0 ? num / divisor : 0;
    },

    dateFormat: (v: string, format: string) => {
        // simple example – in real project use dayjs or date-fns
        const date = new Date(v);
        if (isNaN(date.getTime())) return v;

        const map: Record<string, string> = {
            'YYYY': date.getFullYear().toString(),
            'MM': String(date.getMonth() + 1).padStart(2, '0'),
            'DD': String(date.getDate()).padStart(2, '0'),
        };
        return format.replace(/YYYY|MM|DD/g, m => map[m]);
    },

    replace: (v: string, search: string, replacement: string) =>
        v.replace(new RegExp(search, 'g'), replacement),

    prefix: (v: string, prefix: string) => prefix + v,
    suffix: (v: string, suffix: string) => v + suffix,
};

export type TransformName = keyof typeof TRANSFORMS; // 'parseInt' | 'parseFloat' | ...
// Callable signature for dynamic dispatch (used in transformValue)
export type TransformFunction = (value: string | number, ...args: (string | number)[]) => string | number;


export type ListType = 'table' | 'divs';

export interface DivColumn {
    selector: string;        // CSS selector inside the item
    key: string;
    transform?: string;
    detailLink?: boolean;
    optional?: boolean;
}

export interface ColumnMapping {
    selector?: string;
    header?: string;     // Match by header text (case-insensitive, trimmed)
    index?: number;      // Or match by column index (0-based)
    key?: string;         // Output JSON key
    transform?: string; // ← Restrict to valid transform names (value: string) => any; // Optional transform
    detailLink?: boolean; // Whether this column contains the detail page link
    optional?: boolean;
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

export interface ListConfig {
    type: ListType;

    // For tables
    tableSelector: string;
    hasHeader?: boolean;
    skipRows?: number;
    columns: ColumnMapping[];
    rowFilter?: RowFilter;
    detail?: PageConfig;

    // For divs
    itemSelector?: string;
}

export interface PageConfig {
    fields: { key: string; selector: string; attr?: string; transform?: TransformName }[];
    tables: {
        key: string;
        config: ListConfig;
        pagination?: PaginationConfig;
    }[]
}

export interface SiteConfig {
    url: string;
    page: PageConfig;
}

export type ScrapedValue = string | number;

export type ScrapedRow = {
    [key: string]: ScrapedValue | ScrapedRow[] | ScrapedRow | undefined;
}

// ScrapedObj can be either a ScrapedRow (keyed object) or a scalar value (single-column mode)
export type ScrapedObj = ScrapedRow | ScrapedValue;