import { AxiosInstance } from 'axios';
import * as cheerio from 'cheerio';
import { SiteConfig, ScrapedRow } from './types.js';
import { parseTable } from './table.js';
import { fetchDetail } from './detail.js';
import { randomDelay } from './utils.js';
import { parseList } from './list.js';

const __dirname = import.meta.dirname;
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"; // Ignore TLS errors

async function scrapeSite(config: SiteConfig, client: AxiosInstance): Promise<ScrapedRow[]> {
    const allRows: ScrapedRow[] = [];
    let currentUrl: string | null = config.url;
    let page = 1;

    while (currentUrl) {
        console.log(`Scraping page ${page}: ${currentUrl}`);

        let html: string;
        try {
            const response = await client.get(currentUrl);
            html = response.data;
        } catch (err: any) {
            console.error(`Failed to fetch ${currentUrl}:`, err?.message ?? err);
            break;
        }
        const $ = cheerio.load(html);

        const table = config.page.tables[0];
        const pageRows = await parseList($, table.config, currentUrl);
        const objectRows = pageRows.filter((r): r is ScrapedRow => typeof r === 'object' && r !== null);
        allRows.push(...objectRows);

        if (table.config.detail) {
            for (const dataRow of objectRows) {
                const detailUrl = dataRow.detailUrl as string | undefined;
                if (detailUrl) {
                    try {
                        const detailObj = await fetchDetail(detailUrl, table.config.detail, client);
                        dataRow.details = detailObj;
                    } catch (err: any) {
                        console.warn('Failed to fetch detail for', detailUrl, err?.message ?? err);
                        dataRow.details = [];
                    }
                }
            }
        }

        if (table.pagination) {
            const nextPageUrl = getNextPageUrl($, table.pagination.nextPageSelector, currentUrl);

            if (!nextPageUrl) break;

            // Optional: delay to be polite
            await randomDelay(1000, 5000);
            // Set dynamic headers
            client.defaults.headers['Referer'] = currentUrl;

            currentUrl = nextPageUrl;
            page++;
        } else {
            break;
        }
    }

    return allRows;
}

function getNextPageUrl($: cheerio.CheerioAPI, nextPageSelector: string, baseUrl: string): string | undefined {
    let nextPageUrl: string | undefined = undefined;

    const nextPageLink = $(nextPageSelector).first();
    if (nextPageLink.length) {
        nextPageUrl = nextPageLink.attr('href');
        if (nextPageUrl) {
            // Resolve relative URLs
            try {
                nextPageUrl = new URL(nextPageUrl, baseUrl).toString();
            } catch (e) {
                console.warn(`Invalid next URL: ${nextPageUrl}`);
                throw e;
            }

            if (nextPageUrl !== baseUrl) {
                return nextPageUrl;
            } else {
                console.log(`Next URL same as current – avoiding loop`);
            }
        } else {
            console.log(`Next page link does not have attribute ${nextPageUrl}`);
        }
    } else {
        console.log(`No next page found (selector: ${nextPageSelector})`);
    }

    return undefined;
}

export { scrapeSite };