import * as cheerio from 'cheerio';
import { ListConfig, ScrapedRow, ScrapedRowData } from './types.js';
import { parseTable } from './table.js';
import { parseDiv } from './div.js';

export async function parseList(
    $: cheerio.CheerioAPI,
    config: ListConfig,
    baseUrl: string
): Promise<ScrapedRowData[]> {
    if (config.type === 'table' || !config.type) {
        return parseTable($, config, baseUrl);
    }
    return parseDiv($, config, baseUrl);
}
