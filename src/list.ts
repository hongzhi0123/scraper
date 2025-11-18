import * as cheerio from 'cheerio';
import { parseTable } from "./table.js";
import { DivColumn, ListConfig, ScrapedRow, TRANSFORMS } from "./types.js";
import { normalize, transformValue } from './utils.js';

export async function parseList(
    $: cheerio.CheerioAPI,
    config: ListConfig,
    baseUrl: string
): Promise<ScrapedRow[]> {
    if (config.type === 'table' || !config.type) {
        // Reuse existing table parser
        return parseTable($, config as any, baseUrl);
    }

    // === DIVS / CARDS MODE ===
    const items = $(config.itemSelector).toArray();
    const results: ScrapedRow[] = [];

    for (const item of items) {
        const $item = $(item);
        const row: ScrapedRow = {};
        let detailUrl: string | null = null;

        for (const col of config.columns as DivColumn[]) {
            const el = $item.find(col.selector).first();
            let value = normalize(el.text());

            // Extract detail link if flagged
            if (col.detailLink) {
                const $a = el.is('a') ? el : el.find('a').first();
                if ($a.length) {
                    const href = $a.attr('href');
                    if (href) row['detailUrl'] = new URL(href, baseUrl).href;
                }
            }

            if (col.transform) {
                try { value = transformValue(value, col.transform); } catch { }
            }

            row[col.key] = value || (col.optional ? undefined : '');
        }

        // // Attach detail data if needed
        // if (detailUrl && siteConfig.detail) {
        //     // fetch detail and merge (same as before)
        // }

        results.push(row);
    }

    return results;
}