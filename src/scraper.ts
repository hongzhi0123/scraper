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
    const allRows: ScrapedRow[] = [];
    let currentUrl: string = config.url;
    let page = 1;

    while (true) {
        console.log(`Scraping page ${page}: ${currentUrl}`);
        const html = await fetchHtml(currentUrl);
        const $ = cheerio.load(html);

        const table = $(config.tableSelector);
        if (!table.length) {
            console.warn(`Table not found on page ${page}, stopping.`);
            break;
        }

        // === Extract rows (same logic as before) ===
        const rows = table.find('tr').toArray();
        if (rows.length === 0) break;

        let startRow = config.skipRows || 0;
        let headerRow: string[] = [];

        if (config.hasHeader && startRow < rows.length) {
            headerRow = $(rows[startRow])
                .find('th, td')
                .map((_, el) => normalize($(el).text()))
                .get();
            startRow++;
        } else {
            // Generate fallback headers from column count
            const maxCols = Math.max(...rows.slice(startRow).map(r => $(r).find('td, th').length));
            headerRow = Array.from({ length: maxCols }, (_, i) => `col${i}`);
        }

        // Resolve column indices
        const columnIndices = config.columns
            .map(col => ({ ...col, index: findColumnIndex(headerRow, col) }))
            .filter(col => col.index !== null) as (ColumnMapping & { index: number })[];

        // Warn on missing columns (once per site)
        if (page === 1) {
            for (const col of config.columns) {
                if (!columnIndices.some(c => c.key === col.key)) {
                    console.warn(`Column not found:`, col.header ?? col.index);
                }
            }
        }

        // === Extract data rows ===
        for (let i = startRow; i < rows.length; i++) {
            const tds = $(rows[i]).find('td, th').toArray();
            if (tds.length === 0) continue;

            const row: ScrapedRow = {};
            for (const col of columnIndices) {
                const cell = tds[col.index];
                const value = cell ? $(cell).text() : '';
                let transformed = normalize(value);

                if (col.transform) {
                    const fn = TRANSFORMS[col.transform];
                    if (fn) {
                        try { transformed = fn(value); }
                        catch { transformed = value; }
                    }
                }
                row[col.key] = transformed;
            }

            if (Object.values(row).some(v => v !== '' && v !== null)) {
                allRows.push(row);
            }
        }

        // === Pagination: Find next page ===
        if (!config.pagination) break;

        const nextLink = $(config.pagination.nextPageSelector).first();
        if (!nextLink.length) {
            console.log(`No next page found (selector: ${config.pagination.nextPageSelector})`);
            break;
        }

        const hrefAttr = config.pagination.hrefAttr || 'href';
        let nextHref = nextLink.attr(hrefAttr);
        if (!nextHref) {
            console.log(`Next link has no ${hrefAttr} attribute`);
            break;
        }

        // Resolve relative URLs
        try {
            const baseUrl = new URL(currentUrl);
            nextHref = new URL(nextHref, baseUrl).href;
        } catch (e) {
            console.warn(`Invalid next URL: ${nextHref}`);
            break;
        }

        if (nextHref === currentUrl) {
            console.log(`Next URL same as current – avoiding loop`);
            break;
        }

        currentUrl = nextHref;
        page++;

        // Optional: delay to be polite
        await new Promise(r => setTimeout(r, 500));
    }

    return allRows;
}

export { scrapeSite };