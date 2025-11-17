import axios from 'axios';
import { ColumnMapping } from './types.js';

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

export async function fetchHtml(url: string): Promise<string> {
    const response = await axios.get(url, {
        timeout: 10000,
        headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    return response.data;
}
