import * as cheerio from 'cheerio';
import { parseTable } from "./table.js";
import { parseDivs } from "./div.js";
import { ListConfig, ScrapedRow } from "./types.js";

export async function parseList(
    $: cheerio.CheerioAPI,
    config: ListConfig,
    baseUrl: string
): Promise<ScrapedRow[]> {
    if (config.type === 'divs') {
        return parseDivs($, config, baseUrl);
    }
    // Default: table parser
    return parseTable($, config, baseUrl) as Promise<ScrapedRow[]>;
}