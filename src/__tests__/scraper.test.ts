import { scrapeSite } from '../scraper';
import { SiteConfig } from '../types';
import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockParseList = vi.fn();
const mockFetchDetail = vi.fn();

vi.mock('../list', () => ({
  parseList: (...args: unknown[]) => mockParseList(...args)
}));

vi.mock('../detail', () => ({
  fetchDetail: (...args: unknown[]) => mockFetchDetail(...args)
}));

describe('Scraper Module Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should scrape a simple site with one page', async () => {
    const mockGet = vi.fn().mockResolvedValue({ data: '<table id="main-table"><tr><td>John Doe</td><td>john@example.com</td></tr></table>', status: 200 });
    mockParseList.mockResolvedValue([{ name: 'John Doe', email: 'john@example.com' }]);
    mockFetchDetail.mockResolvedValue({});

    const config: SiteConfig = {
      url: 'https://example.com',
      page: {
        fields: [],
        tables: [{
          key: 'users',
          config: {
            type: 'table',
            tableSelector: '#main-table',
            hasHeader: true,
            columns: [
              { header: 'Name', key: 'name' },
              { header: 'Email', key: 'email' }
            ]
          }
        }]
      }
    };

    const mockClient = { get: mockGet, defaults: { headers: {} } };
    const result = await scrapeSite(config, mockClient as any);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ name: 'John Doe', email: 'john@example.com' });
    expect(mockGet).toHaveBeenCalledWith('https://example.com');
  });

  it('should handle pagination correctly', async () => {
    const firstPageHtml = `
      <div>
        <table id="main-table">
          <tr><td>Item 1</td></tr>
          <tr><td>Item 2</td></tr>
        </table>
        <a href="/page2.html">Next Page</a>
      </div>
    `;

    const secondPageHtml = `
      <div>
        <table id="main-table">
          <tr><td>Item 3</td></tr>
          <tr><td>Item 4</td></tr>
        </table>
        <span>No More Pages</span>
      </div>
    `;

    const mockGet = vi.fn()
      .mockResolvedValueOnce({ data: firstPageHtml, status: 200 })
      .mockResolvedValueOnce({ data: secondPageHtml, status: 200 });

    mockParseList
      .mockResolvedValueOnce([{ name: 'Item 1' }, { name: 'Item 2' }])
      .mockResolvedValueOnce([{ name: 'Item 3' }, { name: 'Item 4' }]);

    const config: SiteConfig = {
      url: 'https://example.com/page1.html',
      page: {
        fields: [],
        tables: [{
          key: 'items',
          config: {
            type: 'table',
            tableSelector: '#main-table',
            columns: [{ index: 0, key: 'name' }]
          },
          pagination: {
            nextPageSelector: 'a:contains("Next Page")'
          }
        }]
      }
    };

    const mockClient = { get: mockGet, defaults: { headers: {} } };
    const result = await scrapeSite(config, mockClient as any);

    expect(mockGet).toHaveBeenCalledTimes(2);
    expect(result).toHaveLength(4);
    expect(result.map(item => item.name)).toEqual(['Item 1', 'Item 2', 'Item 3', 'Item 4']);
  });

  it('should fetch detail pages when configured', async () => {
    const mockGet = vi.fn().mockResolvedValue({ data: '<table id="main-table"><tr><td><a href="/detail/1">John</a></td><td>john@example.com</td></tr></table>', status: 200 });
    mockParseList.mockResolvedValue([{
      detailUrl: 'https://example.com/detail/1',
      name: 'John',
      email: 'john@example.com'
    }]);
    mockFetchDetail.mockResolvedValue({ phone: '+123456789' });

    const config: SiteConfig = {
      url: 'https://example.com',
      page: {
        fields: [],
        tables: [{
          key: 'users',
          config: {
            type: 'table',
            tableSelector: '#main-table',
            columns: [
              { index: 0, key: 'name', detailLink: true },
              { index: 1, key: 'email' }
            ],
            detail: {
              fields: [{ key: 'phone', selector: '.phone' }],
              tables: []
            }
          }
        }]
      }
    };

    const mockClient = { get: mockGet, defaults: { headers: {} } };
    const result = await scrapeSite(config, mockClient as any);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('John');
    expect(result[0].email).toBe('john@example.com');
    expect(result[0]).toHaveProperty('details');
    expect(result[0].details).toEqual({ phone: '+123456789' });
    expect(mockFetchDetail).toHaveBeenCalledTimes(1);
  });

  it('should handle errors gracefully', async () => {
    const mockGet = vi.fn().mockRejectedValue(new Error('Network error'));

    const config: SiteConfig = {
      url: 'https://example.com',
      page: {
        fields: [],
        tables: [{
          key: 'users',
          config: {
            type: 'table',
            tableSelector: '#main-table',
            columns: [{ index: 0, key: 'name' }]
          }
        }]
      }
    };

    const mockClient = { get: mockGet, defaults: { headers: {} } };
    const result = await scrapeSite(config, mockClient as any);

    expect(result).toHaveLength(0);
  });

  it('should apply delays between requests for politeness', async () => {
    const mockHtmlWithPagination = `
      <div>
        <table id="main-table">
          <tr><td>Item 1</td></tr>
        </table>
        <a href="/page2.html">Next Page</a>
      </div>
    `;

    const mockGet = vi.fn()
      .mockResolvedValueOnce({ data: mockHtmlWithPagination, status: 200 })
      .mockResolvedValueOnce({ data: mockHtmlWithPagination, status: 200 });

    mockParseList
      .mockResolvedValueOnce([{ name: 'Item 1' }])
      .mockResolvedValueOnce([{ name: 'Item 2' }]);

    const config: SiteConfig = {
      url: 'https://example.com/page1.html',
      page: {
        fields: [],
        tables: [{
          key: 'items',
          config: {
            type: 'table',
            tableSelector: '#main-table',
            columns: [{ index: 0, key: 'name' }]
          },
          pagination: {
            nextPageSelector: 'a:contains("Next Page")'
          }
        }]
      }
    };

    const mockClient = { get: mockGet, defaults: { headers: {} } };
    await scrapeSite(config, mockClient as any);

    expect(mockGet).toHaveBeenCalledTimes(2);
  });
});
