import axios, { AxiosInstance } from 'axios';
import { ColumnMapping } from './types.js';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';

const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, Bookmarks, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Safari/605.1.15',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
];

export function randomUserAgent() {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

export function randomDelay(min = 800, max = 2500) {
    return new Promise(r => setTimeout(r, Math.random() * (max - min) + min));
}

export function normalize(text: string): string {
    return text.replace(/\s+/g, ' ').trim();
}

export function findColumnIndex(headers: string[], mapping: ColumnMapping): number | null {
    if (mapping.index !== undefined) return mapping.index;
    if (mapping.header !== undefined) {
        const norm = normalize(mapping.header);
        return headers.findIndex(h => normalize(h) === norm);
    }
    return null;
}

// export async function fetchHtml(url: string): Promise<string> {
//     const response = await axios.get(url, {
//         timeout: 10000,
//         headers: { 'User-Agent': 'Mozilla/5.0' },
//     });
//     return response.data;
// }

export function getClient(): AxiosInstance {
    const jar = new CookieJar();
    const client: AxiosInstance = wrapper(
        axios.create({
            jar,
            timeout: 15000,
            headers: {
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
            },
            maxRedirects: 5,
        })
    );

    client.defaults.headers['User-Agent'] = USER_AGENTS[0]; //randomUserAgent();

    return client;
}
