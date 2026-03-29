import * as cheerio from 'cheerio';
import { ColumnMapping, ListConfig, ScrapedRow, ScrapedRowData } from './types.js';
import { findColumnIndex, normalize, transformValue } from './utils.js';

// parse a table from a cheerio instance, return plain data rows
export async function parseTable($: cheerio.CheerioAPI, config: ListConfig, baseUrl?: string): Promise<ScrapedRowData[]> {
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
    const dataRows: ScrapedRowData[] = [];

    for (const row of tableRows) {
        const cells = $(row).find('td, th').toArray();

        // If there's exactly one resolved column and it has no key, use scalar form
        const singleItemNoKey = columnIndices.length === 1 && (columnIndices[0].key === undefined || columnIndices[0].key === '');

        if (singleItemNoKey) {
            const col = columnIndices[0];
            let cellIndex = col.index;

            if (cellIndex < 0) {
                cellIndex = cells.length + cellIndex;
                if (cellIndex < 0) continue;
            }

            const cell = cells[cellIndex];
            let value = cell ? normalize($(cell).text()) : '';

            if (col.transform) {
                try { value = transformValue(value, col.transform); } catch { }
            }

            dataRows.push(value);
            continue;
        }

        // Object form
        const dataRow: ScrapedRow = {};
        let isEmpty = true;

        for (const col of columnIndices) {
            let cellIndex = col.index;

            if (cellIndex < 0) {
                cellIndex = cells.length + cellIndex;
                if (cellIndex < 0) continue;
            }

            const cell = cells[cellIndex];
            let value = cell ? normalize($(cell).text()) : '';

            if (col.detailLink) {
                const $link = $(cell).find('a').first();
                if ($link.length) {
                    const href = $link.attr('href');
                    if (href) dataRow['detailUrl'] = new URL(href, baseUrl).href;
                }
            }

            if (col.transform) {
                try { value = transformValue(value, col.transform); } catch { }
            }

            const key = (col.key === undefined || col.key === '') ? String(cellIndex) : col.key;
            dataRow[key] = value;
            if (value !== '' && value !== null) isEmpty = false;
        }

        if (!isEmpty) {
            dataRows.push(dataRow);
        }
    }

    return dataRows;
}