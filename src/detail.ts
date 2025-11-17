import * as cheerio from 'cheerio';
import { PageConfig, ScrapedRow, TableConfig, TRANSFORMS } from './types.js';
import { parseTable } from './table.js';
import { fetchHtml, normalize } from './utils.js';

export async function fetchDetail(
    detailUrl: string,
    detailConfig: PageConfig
): Promise<Partial<ScrapedRow>> {
    const result: Partial<ScrapedRow> = {};
    const html = await fetchHtml(detailUrl);
    const $ = cheerio.load(html);

    // 1) extract simple attributes (if provided in config)
    if (detailConfig.fields) {
        for (const field of detailConfig.fields) {
            const el = $(field.selector).first();
            if (!el.length) { result[field.key] = ''; continue; }
            if (field.attr) {
                result[field.key] = el.attr(field.attr) ?? '';
            } else {
                result[field.key] = normalize(el.text());
            }
            if (field.transform && TRANSFORMS[field.transform]) {
                try { result[field.key] = TRANSFORMS[field.transform](result[field.key] as string); } catch { }
            }
        }
    }

    // 2) parse tables (if any)
    if (detailConfig.tables) {
        for (const tcfg of detailConfig.tables) {
            // parseTable returns ScrapedRow[]
            const parsed = await parseTable($, tcfg.config, detailUrl);
            // store under a key derived from the table config (use tcfg.key or tableSelector)
            const key = (tcfg as any).key || tcfg.config.tableSelector;
            // attach table as an array
            result[key] = parsed;
        }
    };

    return result;
}