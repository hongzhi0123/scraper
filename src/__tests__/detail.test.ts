import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as cheerio from 'cheerio';
import { fetchDetail } from '../detail.js';
import { PageConfig } from '../types.js';
import axios from 'axios';

// Mock axios
vi.mock('axios');
const mockedAxios = axios as any;

describe('fetchDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('field extraction', () => {
    it('should extract simple text fields', async () => {
      const html = `
        <div class="company">
          <h1 class="name">Acme Corp</h1>
          <p class="address">123 Main St</p>
        </div>
      `;
      
      mockedAxios.create.mockReturnValue({
        get: vi.fn().mockResolvedValue({ data: html })
      });

      const config: PageConfig = {
        fields: [
          { key: 'name', selector: '.name' },
          { key: 'address', selector: '.address' }
        ],
        tables: []
      };

      const client = mockedAxios.create();
      const result = await fetchDetail('http://example.com/detail/1', config, client);

      expect(result).toMatchObject({
        name: 'Acme Corp',
        address: '123 Main St'
      });
    });

    it('should extract attribute values', async () => {
      const html = `
        <div>
          <img class="logo" src="/images/logo.png" alt="Company Logo">
        </div>
      `;
      
      mockedAxios.create.mockReturnValue({
        get: vi.fn().mockResolvedValue({ data: html })
      });

      const config: PageConfig = {
        fields: [
          { key: 'logoUrl', selector: '.logo', attr: 'src' }
        ],
        tables: []
      };

      const client = mockedAxios.create();
      const result = await fetchDetail('http://example.com/detail/1', config, client);

      expect(result.logoUrl).toBe('/images/logo.png');
    });

    it('should apply transforms to fields', async () => {
      const html = `
        <div>
          <span class="revenue">$1,234,567</span>
        </div>
      `;
      
      mockedAxios.create.mockReturnValue({
        get: vi.fn().mockResolvedValue({ data: html })
      });

      const config: PageConfig = {
        fields: [
          { key: 'revenue', selector: '.revenue', transform: 'parseInt' }
        ],
        tables: []
      };

      const client = mockedAxios.create();
      const result = await fetchDetail('http://example.com/detail/1', config, client);

      expect(result.revenue).toBe(1234567);
    });

    it('should set empty string for missing fields', async () => {
      const html = `<div></div>`;
      
      mockedAxios.create.mockReturnValue({
        get: vi.fn().mockResolvedValue({ data: html })
      });

      const config: PageConfig = {
        fields: [
          { key: 'name', selector: '.missing' }
        ],
        tables: []
      };

      const client = mockedAxios.create();
      const result = await fetchDetail('http://example.com/detail/1', config, client);

      expect(result.name).toBe('');
    });

    it('should normalize text in fields', async () => {
      const html = `
        <div>
          <p class="description">
            Multi
            line
            description
          </p>
        </div>
      `;
      
      mockedAxios.create.mockReturnValue({
        get: vi.fn().mockResolvedValue({ data: html })
      });

      const config: PageConfig = {
        fields: [
          { key: 'description', selector: '.description' }
        ],
        tables: []
      };

      const client = mockedAxios.create();
      const result = await fetchDetail('http://example.com/detail/1', config, client);

      expect(result.description).toBe('Multi line description');
    });
  });

  describe('table extraction', () => {
    it('should extract tables from detail page', async () => {
      const html = `
        <div>
          <h1>Company Details</h1>
          <table class="officers">
            <tr><th>Name</th><th>Title</th></tr>
            <tr><td>John Doe</td><td>CEO</td></tr>
          </table>
        </div>
      `;
      
      mockedAxios.create.mockReturnValue({
        get: vi.fn().mockResolvedValue({ data: html })
      });

      const config: PageConfig = {
        fields: [],
        tables: [
          {
            key: 'officers',
            config: {
              type: 'table',
              tableSelector: '.officers',
              hasHeader: true,
              columns: [
                { header: 'Name', key: 'name' },
                { header: 'Title', key: 'title' }
              ]
            }
          }
        ]
      };

      const client = mockedAxios.create();
      const result = await fetchDetail('http://example.com/detail/1', config, client);

      expect(result.officers).toBeDefined();
      expect(Array.isArray(result.officers)).toBe(true);
      expect(result.officers).toHaveLength(1);
      expect(result.officers[0]).toMatchObject({
        name: 'John Doe',
        title: 'CEO'
      });
    });

    it('should extract multiple tables', async () => {
      const html = `
        <div>
          <table class="addresses">
            <tr><th>City</th></tr>
            <tr><td>New York</td></tr>
          </table>
          <table class="contacts">
            <tr><th>Email</th></tr>
            <tr><td>info@example.com</td></tr>
          </table>
        </div>
      `;
      
      mockedAxios.create.mockReturnValue({
        get: vi.fn().mockResolvedValue({ data: html })
      });

      const config: PageConfig = {
        fields: [],
        tables: [
          {
            key: 'addresses',
            config: {
              type: 'table',
              tableSelector: '.addresses',
              hasHeader: true,
              columns: [
                { header: 'City', key: 'city' }
              ]
            }
          },
          {
            key: 'contacts',
            config: {
              type: 'table',
              tableSelector: '.contacts',
              hasHeader: true,
              columns: [
                { header: 'Email', key: 'email' }
              ]
            }
          }
        ]
      };

      const client = mockedAxios.create();
      const result = await fetchDetail('http://example.com/detail/1', config, client);

      expect(result.addresses).toHaveLength(1);
      expect(result.contacts).toHaveLength(1);
    });
  });

  describe('combined fields and tables', () => {
    it('should extract both fields and tables', async () => {
      const html = `
        <div class="company">
          <h1 class="name">Acme Corp</h1>
          <table class="locations">
            <tr><th>City</th></tr>
            <tr><td>New York</td></tr>
          </table>
        </div>
      `;
      
      mockedAxios.create.mockReturnValue({
        get: vi.fn().mockResolvedValue({ data: html })
      });

      const config: PageConfig = {
        fields: [
          { key: 'name', selector: '.name' }
        ],
        tables: [
          {
            key: 'locations',
            config: {
              type: 'table',
              tableSelector: '.locations',
              hasHeader: true,
              columns: [
                { header: 'City', key: 'city' }
              ]
            }
          }
        ]
      };

      const client = mockedAxios.create();
      const result = await fetchDetail('http://example.com/detail/1', config, client);

      expect(result.name).toBe('Acme Corp');
      expect(result.locations).toHaveLength(1);
      expect(result.locations[0].city).toBe('New York');
    });
  });

  describe('error handling', () => {
    it('should handle missing fields gracefully', async () => {
      const html = `<div><span class="available">Value</span></div>`;
      
      mockedAxios.create.mockReturnValue({
        get: vi.fn().mockResolvedValue({ data: html })
      });

      const config: PageConfig = {
        fields: [
          { key: 'available', selector: '.available' },
          { key: 'missing', selector: '.notfound' }
        ],
        tables: []
      };

      const client = mockedAxios.create();
      const result = await fetchDetail('http://example.com/detail/1', config, client);

      expect(result.available).toBe('Value');
      expect(result.missing).toBe('');
    });

    it('should handle transform errors in fields', async () => {
      const html = `<div><span class="value">not-a-number</span></div>`;
      
      mockedAxios.create.mockReturnValue({
        get: vi.fn().mockResolvedValue({ data: html })
      });

      const config: PageConfig = {
        fields: [
          { key: 'value', selector: '.value', transform: 'parseInt' }
        ],
        tables: []
      };

      const client = mockedAxios.create();
      const result = await fetchDetail('http://example.com/detail/1', config, client);

      // Should not crash, should have some value
      expect(result.value).toBeDefined();
    });

    it('should return empty result if request fails', async () => {
      mockedAxios.create.mockReturnValue({
        get: vi.fn().mockRejectedValue(new Error('Network error'))
      });

      const config: PageConfig = {
        fields: [{ key: 'name', selector: '.name' }],
        tables: []
      };

      const client = mockedAxios.create();
      
      await expect(
        fetchDetail('http://example.com/detail/1', config, client)
      ).rejects.toThrow();
    });
  });

  describe('URL handling', () => {
    it('should correctly parse multiple tables from detail page', async () => {
      const html = `
        <div>
          <h1>Product Details</h1>
          <table class="specs">
            <tr><th>Property</th><th>Value</th></tr>
            <tr><td>Weight</td><td>500g</td></tr>
          </table>
          <table class="reviews">
            <tr><th>Reviewer</th><th>Rating</th></tr>
            <tr><td>John</td><td>5</td></tr>
          </table>
        </div>
      `;
      
      mockedAxios.create.mockReturnValue({
        get: vi.fn().mockResolvedValue({ data: html })
      });

      const config: PageConfig = {
        fields: [],
        tables: [
          {
            key: 'specs',
            config: {
              type: 'table',
              tableSelector: '.specs',
              hasHeader: true,
              columns: [
                { header: 'Property', key: 'property' },
                { header: 'Value', key: 'value' }
              ]
            }
          },
          {
            key: 'reviews',
            config: {
              type: 'table',
              tableSelector: '.reviews',
              hasHeader: true,
              columns: [
                { header: 'Reviewer', key: 'reviewer' },
                { header: 'Rating', key: 'rating', transform: 'parseInt' }
              ]
            }
          }
        ]
      };

      const client = mockedAxios.create();
      const result = await fetchDetail('http://example.com/product/123', config, client);

      expect(result.specs).toHaveLength(1);
      expect(result.specs[0]).toMatchObject({ property: 'Weight', value: '500g' });
      expect(result.reviews).toHaveLength(1);
      expect(result.reviews[0]).toMatchObject({ reviewer: 'John', rating: 5 });
    });
  });
});
