export const TRANSFORMS: Record<string, (...args: any[]) => any> = {
    parseInt: (v: string) => parseInt(v.replace(/[^\d-]/g, '') || '0', 10),
    parseFloat: (v: string) => parseFloat(v.replace(/[^\d.,-]/g, '').replace(',', '.') || '0'),

    trim: (v: string) => v.trim(),
    lowercase: (v: string) => v.toLowerCase(),
    uppercase: (v: string) => v.toUpperCase(),

    multiply: (v: string | number, factor: number) => {
        const num = typeof v === 'string' ? parseFloat(v.replace(/[^\d.-]/g, '') || '0') : v;
        return num * factor;
    },

    divide: (v: string | number, divisor: number) => {
        const num = typeof v === 'string' ? parseFloat(v.replace(/[^\d.-]/g, '') || '0') : v;
        return divisor !== 0 ? num / divisor : 0;
    },

    dateFormat: (v: string, format: string) => {
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
} as const;

export type TransformName = keyof typeof TRANSFORMS;
export type TransformFunction = (...args: any[]) => any;

export type ListType = 'table' | 'divs';

export interface BaseColumn {
    selector?: string;
    key?: string;
    transform?: string;
    detailLink?: boolean;
    optional?: boolean;
}

export interface ColumnMapping extends BaseColumn {
    header?: string;
    index?: number;
}

export interface PaginationConfig {
    nextPageSelector: string;
    hrefAttr?: string;
}

export interface RowFilter {
    selector: string;
    attr: string;
    value: string;
}

export interface ListConfig {
    type: ListType;

    tableSelector: string;
    hasHeader?: boolean;
    skipRows?: number;
    columns: ColumnMapping[];
    rowFilter?: RowFilter;
    detail?: PageConfig;

    itemSelector?: string;
}

export interface PageConfig {
    parser?: string;
    fields: { key: string; selector: string; attr?: string; transform?: string }[];
    tables: {
        key: string;
        config: ListConfig;
        pagination?: PaginationConfig;
    }[];
}

export interface SiteConfig {
    url: string;
    page: PageConfig;
}

export type ScrapedRow = Record<string, unknown>;

export type ScrapedRowData = ScrapedRow | string | number | null;
