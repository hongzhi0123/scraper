import axios from 'axios';
import * as cheerio from 'cheerio';
import { SiteConfig, ScrapedRow, ColumnMapping, TRANSFORMS } from './types.js';

const __dirname = import.meta.dirname;
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"; // Ignore TLS errors

async function fetchHtml(url: string): Promise<string> {
    const response = await axios.get(url, {
        timeout: 10000,
        headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    return response.data;
}

function normalize(text: string): string {
    return text.replace(/\s+/g, ' ').trim();
}

function findColumnIndex(headers: string[], mapping: ColumnMapping): number | null {
    if (mapping.index !== undefined) return mapping.index;
    if (mapping.header !== undefined) {
        const normHeader = normalize(mapping.header);
        for (let i = 0; i < headers.length; i++) {
            if (normalize(headers[i]) === normHeader) return i;
        }
    }
    return null;
}

async function scrapeSite(config: SiteConfig): Promise<ScrapedRow[]> {
    console.log(`Scraping: ${config.url}`);
    const html = await fetchHtml(config.url);
    const $ = cheerio.load(html);

    const table = $(config.tableSelector);
    if (!table.length) {
        throw new Error(`Table not found with selector: ${config.tableSelector}`);
    }

    const rows = table.find('tr').toArray();
    if (rows.length === 0) return [];

    let startRow = config.skipRows || 0;
    let headerRow: string[] = [];

    // Extract headers if present
    if (config.hasHeader && startRow < rows.length) {
        headerRow = $(rows[startRow])
            .find('th, td')
            .map((_, el) => normalize($(el).text()))
            .get();
        startRow++;
    } else {
        // Generate fallback headers from column count
        const maxCols = Math.max(...rows.slice(startRow).map(row => $(row).find('td, th').length));
        headerRow = Array.from({ length: maxCols }, (_, i) => `col${i}`);
    }

    // Resolve column indices
    const columnIndices = config.columns.map(col => {
        const idx = findColumnIndex(headerRow, col);
        if (idx === null) {
            console.warn(`Warning: Column not found:`, col);
        }
        return { ...col, index: idx };
    }).filter(col => col.index !== null) as (ColumnMapping & { index: number })[];

    const results: ScrapedRow[] = [];

    for (let i = startRow; i < rows.length; i++) {
        const tds = $(rows[i]).find('td, th').toArray();
        if (tds.length === 0) continue;

        const row: ScrapedRow = {};

        for (const col of columnIndices) {
            const cell = tds[col.index];
            let value = cell ? $(cell).text() : '';

            let transformed = normalize(value);

            if (col.transform && TRANSFORMS[col.transform]) {
                try {
                    transformed = TRANSFORMS[col.transform](value);
                } catch (e) {
                    transformed = value; // fallback
                }
            } else if (col.transform) {
                console.warn(`Unknown transform: ${col.transform}`);
            }

            row[col.key] = transformed;
        }

        // Only add row if it has data
        if (Object.values(row).some(v => v !== '' && v !== null)) {
            results.push(row);
        }
    }

    return results;
}

export { scrapeSite };