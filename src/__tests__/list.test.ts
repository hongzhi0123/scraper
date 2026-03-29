import { describe, it, expect } from 'vitest';
import * as cheerio from 'cheerio';
import { parseList } from '../list.js';
import { ListConfig } from '../types.js';

describe('parseList', () => {
  describe('table delegation', () => {
    it('should delegate to parseTable when type is table or not specified', async () => {
      const html = `
        <table>
          <tr><th>Name</th></tr>
          <tr><td>John</td></tr>
        </table>
      `;
      const $ = cheerio.load(html);
      const config: ListConfig = {
        type: 'table',
        tableSelector: 'table',
        hasHeader: true,
        columns: [
          { header: 'Name', key: 'name' }
        ]
      };

      const result = await parseList($, config, 'http://localhost');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('John');
    });

    it('should delegate to parseTable when type is undefined', async () => {
      const html = `
        <table>
          <tr><th>Value</th></tr>
          <tr><td>100</td></tr>
        </table>
      `;
      const $ = cheerio.load(html);
      const config: any = {
        // type not specified
        tableSelector: 'table',
        hasHeader: true,
        columns: [
          { header: 'Value', key: 'value' }
        ]
      };

      const result = await parseList($, config, 'http://localhost');
      expect(result).toHaveLength(1);
      expect(result[0].value).toBe('100');
    });
  });
});
