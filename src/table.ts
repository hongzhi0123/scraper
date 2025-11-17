import * as cheerio from 'cheerio';
import { ColumnMapping, TransformName, RowFilter, TRANSFORMS, TableConfig, ScrapedRow } from './types.js';
import { findColumnIndex, normalize } from './utils.js';

// parse a table from a cheerio instance, return plain data rows
export async function parseTable($: cheerio.CheerioAPI, config: TableConfig, baseUrl?: string): Promise<ScrapedRow[]> {
    const table = $(config.tableSelector);
    if (!table.length) return [];

    // === Extract rows ===
    const rows = table.find('tr').toArray();
    if (rows.length === 0) return [];

    let startRow = config.skipRows || 0;
    let headerRow: string[] = [];

    // === Extract headers ===
    if (config.hasHeader && startRow < rows.length) {
        headerRow = $(rows[startRow])
            .find('th, td')
            .map((_, el) => normalize($(el).text()))
            .get();
        startRow++;
    } else {
        const maxCols = Math.max(...rows.slice(startRow).map(r => $(r).find('td, th').length));
        headerRow = Array.from({ length: maxCols }, (_, i) => `col${i}`);
    }

    // === Resolve column indices ===
    const columnIndices = config.columns
        .map(col => ({ ...col, index: findColumnIndex(headerRow, col) }))
        .filter(col => col.index !== null) as (ColumnMapping & { index: number })[];

    // === Filter rows ===
    let tableRows = rows.slice(startRow);

    if (config.rowFilter && 'selector' in config.rowFilter) {
        const { selector, attr, value /*, text*/ } = config.rowFilter;
        tableRows = tableRows.filter(row => {
            const $row = $(row);
            const el = $row.find(selector).first();
            if (!el.length) return false;
            // if (text !== undefined) return normalize(el.text()) === text;
            return el.attr(attr) === value;
        });
    }

    // === Extract data ===
    const dataRows: ScrapedRow[] = [];

    for (const row of tableRows) {
        const cells = $(row).find('td, th').toArray();
        const dataRow: ScrapedRow = {};

        for (const col of columnIndices) {
            let cellIndex = col.index;

            // Support negative indices (from the right)
            if (cellIndex < 0) {
                cellIndex = cells.length + cellIndex; // -1 → length-1, -2 → length-2, etc.
                if (cellIndex < 0) continue; // out of bounds → skip (or set empty)
            }

            let cell = cells[cellIndex];
            let value = cell ? normalize($(cell).text()) : '';

            // === EXTRACT DETAIL LINK FROM THIS CELL ===
            if (col.detailLink) {
                const $link = $(cell).find('a').first();
                if ($link.length) {
                    let href = $link.attr('href');
                    if (href) {
                        dataRow['detailUrl'] = new URL(href, baseUrl).href;
                    }
                }
            }

            // Transform
            if (col.transform && TRANSFORMS[col.transform]) {
                try { value = TRANSFORMS[col.transform](value); } catch { }
            }

            dataRow[col.key] = value;
        }

        if (Object.values(dataRow).some(v => v !== '' && v !== null)) {
            dataRows.push(dataRow);
        }
    }

    return dataRows;
}