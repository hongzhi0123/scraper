import { describe, it, expect, beforeEach } from 'vitest';
import * as cheerio from 'cheerio';
import { parseTable } from '../table.js';
import { ListConfig } from '../types.js';

describe('parseTable', () => {
  describe('basic table parsing', () => {
    it('should parse simple table', async () => {
      const html = `
        <table>
          <tr><th>Name</th><th>Age</th></tr>
          <tr><td>John</td><td>30</td></tr>
          <tr><td>Jane</td><td>25</td></tr>
        </table>
      `;
      const $ = cheerio.load(html);
      const config: ListConfig = {
        type: 'table',
        tableSelector: 'table',
        hasHeader: true,
        columns: [
          { header: 'Name', key: 'name' },
          { header: 'Age', key: 'age', transform: 'parseInt' }
        ]
      };

      const result = await parseTable($, config);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ name: 'John', age: 30 });
      expect(result[1]).toEqual({ name: 'Jane', age: 25 });
    });

    it('should handle table without headers', async () => {
      const html = `
        <table>
          <tr><td>John</td><td>30</td></tr>
          <tr><td>Jane</td><td>25</td></tr>
        </table>
      `;
      const $ = cheerio.load(html);
      const config: ListConfig = {
        type: 'table',
        tableSelector: 'table',
        hasHeader: false,
        columns: [
          { index: 0, key: 'name' },
          { index: 1, key: 'age', transform: 'parseInt' }
        ]
      };

      const result = await parseTable($, config);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ name: 'John', age: 30 });
    });

    it('should skip specified rows', async () => {
      const html = `
        <table>
          <tr><th>Header</th></tr>
          <tr><td>Skip me</td></tr>
          <tr><td>John</td></tr>
        </table>
      `;
      const $ = cheerio.load(html);
      const config: ListConfig = {
        type: 'table',
        tableSelector: 'table',
        hasHeader: true,
        skipRows: 1,
        columns: [
          { index: 0, key: 'name' }
        ]
      };

      const result = await parseTable($, config);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('John');
    });

    it('should return empty array for missing table', async () => {
      const html = `<div></div>`;
      const $ = cheerio.load(html);
      const config: ListConfig = {
        type: 'table',
        tableSelector: 'table',
        columns: []
      };

      const result = await parseTable($, config);
      expect(result).toEqual([]);
    });
  });

  describe('column mapping', () => {
    it('should find column by header text', async () => {
      const html = `
        <table>
          <tr><th>Full Name</th><th>Years Old</th></tr>
          <tr><td>John</td><td>30</td></tr>
        </table>
      `;
      const $ = cheerio.load(html);
      const config: ListConfig = {
        type: 'table',
        tableSelector: 'table',
        hasHeader: true,
        columns: [
          { header: 'Full Name', key: 'name' },
          { header: 'Years Old', key: 'age' }
        ]
      };

      const result = await parseTable($, config);
      expect(result[0]).toEqual({ name: 'John', age: '30' });
    });

    it('should handle column index', async () => {
      const html = `
        <table>
          <tr><td>John</td><td>john@example.com</td><td>30</td></tr>
        </table>
      `;
      const $ = cheerio.load(html);
      const config: ListConfig = {
        type: 'table',
        tableSelector: 'table',
        hasHeader: false,
        columns: [
          { index: 0, key: 'name' },
          { index: 2, key: 'age' }
        ]
      };

      const result = await parseTable($, config);
      expect(result[0]).toEqual({ name: 'John', age: '30' });
    });

    it('should handle negative indices (from right)', async () => {
      const html = `
        <table>
          <tr><td>John</td><td>john@example.com</td><td>30</td></tr>
        </table>
      `;
      const $ = cheerio.load(html);
      const config: ListConfig = {
        type: 'table',
        tableSelector: 'table',
        hasHeader: false,
        columns: [
          { index: -1, key: 'age' }, // last column
          { index: 0, key: 'name' }
        ]
      };

      const result = await parseTable($, config);
      expect(result[0]).toEqual({ name: 'John', age: '30' });
    });
  });

  describe('transforms', () => {
    it('should apply single transform', async () => {
      const html = `
        <table>
          <tr><th>Value</th></tr>
          <tr><td>$100.50</td></tr>
        </table>
      `;
      const $ = cheerio.load(html);
      const config: ListConfig = {
        type: 'table',
        tableSelector: 'table',
        hasHeader: true,
        columns: [
          { header: 'Value', key: 'amount', transform: 'parseFloat' }
        ]
      };

      const result = await parseTable($, config);
      expect(result[0].amount).toBe(100.5);
    });

    it('should apply parametrized transform', async () => {
      const html = `
        <table>
          <tr><th>Value</th></tr>
          <tr><td>10</td></tr>
        </table>
      `;
      const $ = cheerio.load(html);
      const config: ListConfig = {
        type: 'table',
        tableSelector: 'table',
        hasHeader: true,
        columns: [
          { header: 'Value', key: 'amount', transform: 'multiply(5)' }
        ]
      };

      const result = await parseTable($, config);
      expect(result[0].amount).toBe(50);
    });

    it('should handle transform errors gracefully', async () => {
      const html = `
        <table>
          <tr><th>Value</th></tr>
          <tr><td>notanumber</td></tr>
        </table>
      `;
      const $ = cheerio.load(html);
      const config: ListConfig = {
        type: 'table',
        tableSelector: 'table',
        hasHeader: true,
        columns: [
          { header: 'Value', key: 'value', transform: 'parseInt' }
        ]
      };

      const result = await parseTable($, config);
      // Should either return original or 0, not crash
      expect(result[0].value).toBeDefined();
    });
  });

  describe('detail links', () => {
    it('should extract detail URL from cell with link', async () => {
      const html = `
        <table>
          <tr><th>Name</th></tr>
          <tr><td><a href="/detail/123">John</a></td></tr>
        </table>
      `;
      const $ = cheerio.load(html);
      const config: ListConfig = {
        type: 'table',
        tableSelector: 'table',
        hasHeader: true,
        columns: [
          { header: 'Name', key: 'name', detailLink: true }
        ]
      };

      const result = await parseTable($, config, 'http://localhost:8000');
      expect(result[0].detailUrl).toBe('http://localhost:8000/detail/123');
    });

    it('should handle relative URLs in detail links', async () => {
      const html = `
        <table>
          <tr><th>Link</th></tr>
          <tr><td><a href="./detail">Go</a></td></tr>
        </table>
      `;
      const $ = cheerio.load(html);
      const config: ListConfig = {
        type: 'table',
        tableSelector: 'table',
        hasHeader: true,
        columns: [
          { header: 'Link', key: 'link', detailLink: true }
        ]
      };

      const result = await parseTable($, config, 'http://localhost:8000/page');
      expect(result[0].detailUrl).toBe('http://localhost:8000/detail');
    });

    it('should skip rows without data in required columns', async () => {
      const html = `
        <table>
          <tr><th>Name</th><th>Age</th></tr>
          <tr><td></td><td></td></tr>
          <tr><td>John</td><td>30</td></tr>
        </table>
      `;
      const $ = cheerio.load(html);
      const config: ListConfig = {
        type: 'table',
        tableSelector: 'table',
        hasHeader: true,
        columns: [
          { header: 'Name', key: 'name' },
          { header: 'Age', key: 'age' }
        ]
      };

      const result = await parseTable($, config);
      // Should skip empty row
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('John');
    });
  });

  describe('row filtering', () => {
    it('should filter rows by attribute', async () => {
      const html = `
        <table summary="Test Table">
          <tr class="active"><td><img src="john.jpg" alt="John"/></td><td class="numero">8</td><td>John</td></tr>
          <tr class="inactive"><td>Jane</td></tr>
        </table>
      `;
      const $ = cheerio.load(html);
      const config: ListConfig = {
        type: 'table',
        tableSelector: 'table[summary^="Test"]:first',
        columns: [
          { index: -1, key: 'name' }
        ],
        rowFilter: {
          selector: 'td:first-child img',
          attr: 'alt',
          value: 'John'
        }
      };

      const result = await parseTable($, config);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('John');
    });

//     it('should filter rows by data attribute', async () => {
//       const html = `
//         <table>
//           <tr><th>Name</th></tr>
//           <tr data-status="active"><td>John</td></tr>
//           <tr data-status="active"><td>Jane</td></tr>
//           <tr data-status="inactive"><td>Bob</td></tr>
//         </table>
//       `;
//       const $ = cheerio.load(html);
//       const config: ListConfig = {
//         type: 'table',
//         tableSelector: 'table',
//         hasHeader: true,
//         columns: [
//           { header: 'Name', key: 'name' }
//         ],
//         rowFilter: {
//           selector: 'tr',
//           attr: 'data-status',
//           value: 'active'
//         }
//       };

//       const result = await parseTable($, config);
//       expect(result).toHaveLength(2);
//     });
  });

  describe('whitespace normalization', () => {
    it('should normalize whitespace in cell values', async () => {
      const html = `
        <table>
          <tr><th>Name</th></tr>
          <tr><td>  John   Smith  </td></tr>
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

      const result = await parseTable($, config);
      expect(result[0].name).toBe('John Smith');
    });
  });
});
