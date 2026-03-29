import * as cheerio from 'cheerio';
import { PageConfig, ScrapedRow, TransformFunction, TRANSFORMS } from './types.js';
import { parseTable } from './table.js';
import { normalize, randomDelay } from './utils.js';
import { AxiosInstance } from 'axios';

export async function fetchDetail(
    detailUrl: string,
    detailConfig: PageConfig,
    client: AxiosInstance
): Promise<Partial<ScrapedRow>> {
    console.log(`  → Detail: ${detailUrl}`);
    const result: Partial<ScrapedRow> = {};

    await randomDelay(500, 1500); // polite delay
    const resp = await client.get(detailUrl);
    const $ = cheerio.load(resp.data);

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
            if (field.transform) {
                const fn = TRANSFORMS[field.transform] as TransformFunction | undefined;
                if (fn) {
                    try { result[field.key] = fn(result[field.key] as string); } catch { }
                }
            }
        }
    }

    // 2) parse tables (if any)
    if (detailConfig.tables) {
        for (const tcfg of detailConfig.tables) {
            // parseTable returns ScrapedRow[]
            const parsed = await parseTable($, tcfg.config, detailUrl);
            // store under a key derived from the table config (use tcfg.key or tableSelector)
            const key = tcfg.key || tcfg.config.tableSelector;
            // attach table as an array
            result[key] = parsed as ScrapedRow[];
        }
    };

    return result;
}