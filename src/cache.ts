import * as fs from 'fs';
import * as path from 'path';
import { AxiosInstance } from 'axios';

const __dirname = import.meta.dirname;
const DEFAULT_CACHE_DIR = path.join(__dirname, '../cache');

/**
 * Derives a meaningful filename from a URL.
 * e.g. "https://example.com/companies/page/2?type=ais" → "example.com/companies/page_2_ais.html"
 */
function urlToFilename(url: string): string {
    const parsed = new URL(url);
    
    // Create path from hostname and pathname
    const pathParts = [
        parsed.hostname,
        ...parsed.pathname.split('/').filter(Boolean),
    ];
    
    // Process the filename (last part) to include query parameters
    let fileName = pathParts.length > 0 ? pathParts[pathParts.length - 1] : 'index';
    
    // If there are query parameters, append them to the filename
    if (parsed.search) {
        const queryParams = parsed.search.slice(1).replace(/[&=]/g, '_');
        fileName = `${fileName}_${queryParams}`;
    }
    
    // Add .html extension
    fileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_') + '.html';
    
    // Reconstruct the path with sanitized parts except the last one (filename)
    const dirParts = pathParts.slice(0, -1).map(part => part.replace(/[^a-zA-Z0-9._-]/g, '_'));
    
    // Join the directory parts and add the filename
    const fullPath = path.join(...dirParts, fileName);
    
    return fullPath;
}

/**
 * Creates a caching wrapper around an Axios client.
 *
 *   useCache = true  → read from cache only (for tests), throw if not cached
 *   useCache = false → always fetch from network and save to cache
 */
export function createCachingClient(
    client: AxiosInstance,
    options: { useCache?: boolean; cacheDir?: string } = {}
): AxiosInstance {
    const cacheDir = options.cacheDir ?? DEFAULT_CACHE_DIR;
    const useCache = options.useCache ?? false;

    if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
    }

    const originalGet = client.get.bind(client);

    client.get = (async function cachedGet(url: string, config?: Record<string, unknown>) {
        const relativePath = urlToFilename(url);
        const filepath = path.join(cacheDir, relativePath);

        // Ensure parent directory exists
        const parentDir = path.dirname(filepath);
        if (!fs.existsSync(parentDir)) {
            fs.mkdirSync(parentDir, { recursive: true });
        }

        if (useCache) {
            if (fs.existsSync(filepath)) {
                console.log(`  [cache] ${relativePath}`);
                const data = fs.readFileSync(filepath, 'utf-8');
                return { data, status: 200, headers: {} };
            }
            throw new Error(`Cache miss: no cached file for ${url} (expected ${filepath})`);
        }

        const response = await originalGet(url, config);
        fs.writeFileSync(filepath, response.data, 'utf-8');
        console.log(`  [saved] ${relativePath}`);
        return response;
    }) as AxiosInstance['get'];

    return client;
}