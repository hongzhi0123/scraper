import { describe, it, expect } from 'vitest';
import * as cheerio from 'cheerio';
import { parseDiv } from '../div.js';
import { ListConfig } from '../types.js';

describe('parseDiv', () => {
  describe('div/card parsing', () => {
    it('should parse items from divs with item selector', async () => {
      const html = `
        <div class="item">
          <h2 class="title">Item 1</h2>
          <p class="price">$10.00</p>
        </div>
        <div class="item">
          <h2 class="title">Item 2</h2>
          <p class="price">$20.00</p>
        </div>
      `;
      const $ = cheerio.load(html);
      const config: ListConfig = {
        type: 'divs',
        tableSelector: '',
        itemSelector: '.item',
        columns: [
          { selector: '.title', key: 'title' },
          { selector: '.price', key: 'price', transform: 'parseFloat' }
        ]
      };

      const result = await parseDiv($, config, 'http://localhost');
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ title: 'Item 1', price: 10 });
      expect(result[1]).toEqual({ title: 'Item 2', price: 20 });
    });

    it('should extract detail links from divs', async () => {
      const html = `
        <div class="item">
          <h2 class="title"><a href="/product/1">Item 1</a></h2>
          <p class="price">$10.00</p>
        </div>
      `;
      const $ = cheerio.load(html);
      const config: ListConfig = {
        type: 'divs',
        tableSelector: '',
        itemSelector: '.item',
        columns: [
          { selector: '.title', key: 'title', detailLink: true },
          { selector: '.price', key: 'price' }
        ]
      };

      const result = await parseDiv($, config, 'http://localhost');
      expect(result[0].detailUrl).toBe('http://localhost/product/1');
    });

    it('should handle missing elements gracefully', async () => {
      const html = `
        <div class="item">
          <h2 class="title">Item 1</h2>
        </div>
      `;
      const $ = cheerio.load(html);
      const config: ListConfig = {
        type: 'divs',
        tableSelector: '',
        itemSelector: '.item',
        columns: [
          { selector: '.title', key: 'title' },
          { selector: '.price', key: 'price', optional: true }
        ]
      };

      const result = await parseDiv($, config, 'http://localhost');
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Item 1');
      expect(result[0].price).toBeUndefined();
    });

    it('should set empty string for missing non-optional elements', async () => {
      const html = `
        <div class="item">
          <h2 class="title">Item 1</h2>
        </div>
      `;
      const $ = cheerio.load(html);
      const config: ListConfig = {
        type: 'divs',
        tableSelector: '',
        itemSelector: '.item',
        columns: [
          { selector: '.title', key: 'title' },
          { selector: '.price', key: 'price' }
        ]
      };

      const result = await parseDiv($, config, 'http://localhost');
      expect(result[0].price).toBe('');
    });

    it('should apply transforms to div columns', async () => {
      const html = `
        <div class="item">
          <span class="value">$50.50</span>
        </div>
      `;
      const $ = cheerio.load(html);
      const config: ListConfig = {
        type: 'divs',
        tableSelector: '',
        itemSelector: '.item',
        columns: [
          { selector: '.value', key: 'amount', transform: 'parseFloat' }
        ]
      };

      const result = await parseDiv($, config, 'http://localhost');
      expect(result[0].amount).toBe(50.5);
    });

    it('should handle parameterized transforms in divs', async () => {
      const html = `
        <div class="item">
          <span class="quantity">5</span>
        </div>
      `;
      const $ = cheerio.load(html);
      const config: ListConfig = {
        type: 'divs',
        tableSelector: '',
        itemSelector: '.item',
        columns: [
          { selector: '.quantity', key: 'total', transform: 'multiply(10)' }
        ]
      };

      const result = await parseDiv($, config, 'http://localhost');
      expect(result[0].total).toBe(50);
    });

    it('should handle transform errors gracefully in divs', async () => {
      const html = `
        <div class="item">
          <span class="value">not-a-number</span>
        </div>
      `;
      const $ = cheerio.load(html);
      const config: ListConfig = {
        type: 'divs',
        tableSelector: '',
        itemSelector: '.item',
        columns: [
          { selector: '.value', key: 'amount', transform: 'parseInt' }
        ]
      };

      const result = await parseDiv($, config, 'http://localhost');
      expect(result).toHaveLength(1);
      expect(result[0].amount).toBeDefined();
    });
  });

  describe('complex scenarios', () => {
    it('should parse nested data structures', async () => {
      const html = `
        <div class="product">
          <div class="info">
            <h3 class="name">Product A</h3>
            <span class="rating">4.5</span>
          </div>
          <a href="/product/123" class="link">Details</a>
        </div>
      `;
      const $ = cheerio.load(html);
      const config: ListConfig = {
        type: 'divs',
        tableSelector: '',
        itemSelector: '.product',
        columns: [
          { selector: '.info .name', key: 'name' },
          { selector: '.info .rating', key: 'rating', transform: 'parseFloat' },
          { selector: '.link', key: 'label', detailLink: true }
        ]
      };

      const result = await parseDiv($, config, 'http://localhost');
      expect(result[0]).toMatchObject({
        name: 'Product A',
        rating: 4.5,
        detailUrl: 'http://localhost/product/123'
      });
    });

    it('should handle whitespace normalization', async () => {
      const html = `
        <div class="item">
          <span class="title">
            Multi
            line
            text
          </span>
        </div>
      `;
      const $ = cheerio.load(html);
      const config: ListConfig = {
        type: 'divs',
        tableSelector: '',
        itemSelector: '.item',
        columns: [
          { selector: '.title', key: 'title' }
        ]
      };

      const result = await parseDiv($, config, 'http://localhost');
      expect(result[0].title).toBe('Multi line text');
    });

    it('should handle empty item list', async () => {
      const html = `<div></div>`;
      const $ = cheerio.load(html);
      const config: ListConfig = {
        type: 'divs',
        tableSelector: '',
        itemSelector: '.nonexistent',
        columns: [
          { selector: '.title', key: 'title' }
        ]
      };

      const result = await parseDiv($, config, 'http://localhost');
      expect(result).toEqual([]);
    });
  });

  describe('link handling', () => {
    it('should extract link from element that is a link', async () => {
      const html = `
        <div class="item">
          <a href="/base/page/1" class="name">Link Text</a>
        </div>
      `;
      const $ = cheerio.load(html);
      const config: ListConfig = {
        type: 'divs',
        tableSelector: '',
        itemSelector: '.item',
        columns: [
          { selector: '.name', key: 'title', detailLink: true }
        ]
      };

      const result = await parseDiv($, config, 'http://localhost/base');
      expect(result[0].detailUrl).toBe('http://localhost/base/page/1');
    });

    it('should extract link from nested element inside a link', async () => {
      const html = `
        <div class="item">
          <a href="/base/page/2">
            <span class="name">Nested Link Text</span>
          </a>
        </div>
      `;
      const $ = cheerio.load(html);
      const config: ListConfig = {
        type: 'divs',
        tableSelector: '',
        itemSelector: '.item',
        columns: [
          { selector: 'span.name', key: 'title', detailLink: false },
          { selector: 'a', key: 'dummy', detailLink: true }
        ]
      };

      const result = await parseDiv($, config, 'http://localhost/base');
      expect(result[0].title).toBe('Nested Link Text');
      expect(result[0].detailUrl).toBe('http://localhost/base/page/2');
    });

    it('should not set detailUrl if no link found', async () => {
      const html = `
        <div class="item">
          <span class="name">No Link Here</span>
        </div>
      `;
      const $ = cheerio.load(html);
      const config: ListConfig = {
        type: 'divs',
        tableSelector: '',
        itemSelector: '.item',
        columns: [
          { selector: '.name', key: 'title', detailLink: true }
        ]
      };

      const result = await parseDiv($, config, 'http://localhost');
      expect(result[0].detailUrl).toBeUndefined();
    });
  });
});
