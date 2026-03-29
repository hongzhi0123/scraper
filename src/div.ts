import * as cheerio from 'cheerio';
import { ListConfig, ScrapedRow } from './types.js';
import { normalize, transformValue } from './utils.js';

export async function parseDiv(
    $: cheerio.CheerioAPI,
    config: ListConfig,
    baseUrl: string
): Promise<ScrapedRow[]> {
    const items = $(config.itemSelector).toArray();
    const results: ScrapedRow[] = [];

    for (const item of items) {
        const $item = $(item);
        const row: ScrapedRow = {};

        for (const col of config.columns) {
            const el = $item.find(col.selector ?? '').first();
            let value = normalize(el.text());

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

            row[col.key ?? ''] = value || (col.optional ? undefined : '');
        }

        results.push(row);
    }

    return results;
}
