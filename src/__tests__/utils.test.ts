import { describe, it, expect } from 'vitest';
import { TRANSFORMS } from '../types.js';
import { normalize, findColumnIndex, transformValue } from '../utils.js';

describe('transforms', () => {
  describe('parseInt', () => {
    // it('should parse integer from string with currency', () => {
    //   expect(TRANSFORMS.parseInt('€1,234.56')).toBe(1234.56);
    // });

    it('should parse negative numbers', () => {
      expect(TRANSFORMS.parseInt('-500')).toBe(-500);
    });

    it('should handle empty string', () => {
      expect(TRANSFORMS.parseInt('')).toBe(0);
    });

    it('should handle whitespace', () => {
      expect(TRANSFORMS.parseInt('  42  ')).toBe(42);
    });
  });

  describe('parseFloat', () => {
    it('should parse float with comma as decimal separator', () => {
      expect(TRANSFORMS.parseFloat('99,99')).toBe(99.99);
    });

    it('should parse float with dot as decimal separator', () => {
      expect(TRANSFORMS.parseFloat('99.99')).toBe(99.99);
    });

    it('should strip currency symbols', () => {
      expect(TRANSFORMS.parseFloat('$100.50')).toBe(100.5);
    });

    it('should handle empty string', () => {
      expect(TRANSFORMS.parseFloat('')).toBe(0);
    });

    it('should handle negative floats', () => {
      expect(TRANSFORMS.parseFloat('-42.5')).toBe(-42.5);
    });
  });

  describe('string transforms', () => {
    it('trim should remove whitespace', () => {
      expect(TRANSFORMS.trim('  hello world  ')).toBe('hello world');
    });

    it('lowercase should convert to lowercase', () => {
      expect(TRANSFORMS.lowercase('HELLO')).toBe('hello');
    });

    it('uppercase should convert to uppercase', () => {
      expect(TRANSFORMS.uppercase('hello')).toBe('HELLO');
    });

    it('prefix should add prefix', () => {
      expect(TRANSFORMS.prefix('world', 'hello ')).toBe('hello world');
    });

    it('suffix should add suffix', () => {
      expect(TRANSFORMS.suffix('hello', ' world')).toBe('hello world');
    });

    it('replace should replace text with regex', () => {
      expect(TRANSFORMS.replace('hello world', 'world', 'universe')).toBe('hello universe');
    });
  });

  describe('multiply', () => {
    it('should multiply numeric string', () => {
      expect(TRANSFORMS.multiply('10', 5)).toBe(50);
    });

    it('should multiply number', () => {
      expect(TRANSFORMS.multiply(10, 5)).toBe(50);
    });

    it('should strip currency and multiply', () => {
      expect(TRANSFORMS.multiply('$100.50', 2)).toBe(201);
    });

    it('should handle decimals', () => {
      expect(TRANSFORMS.multiply('10.5', 2)).toBe(21);
    });
  });

  describe('divide', () => {
    it('should divide numeric string', () => {
      expect(TRANSFORMS.divide('100', 5)).toBe(20);
    });

    it('should divide number', () => {
      expect(TRANSFORMS.divide(100, 5)).toBe(20);
    });

    it('should return 0 for division by zero', () => {
      expect(TRANSFORMS.divide('100', 0)).toBe(0);
    });

    it('should handle decimals', () => {
      expect(TRANSFORMS.divide('21', 2)).toBe(10.5);
    });
  });

  describe('dateFormat', () => {
    it('should format date with YYYY-MM-DD', () => {
      const result = TRANSFORMS.dateFormat('2024-03-28', 'YYYY-MM-DD');
      expect(result).toBe('2024-03-28');
    });

    it('should format date with DD/MM/YYYY', () => {
      const result = TRANSFORMS.dateFormat('2024-03-28', 'DD/MM/YYYY');
      expect(result).toBe('28/03/2024');
    });

    it('should handle invalid date', () => {
      const result = TRANSFORMS.dateFormat('not-a-date', 'YYYY-MM-DD');
      expect(result).toBe('not-a-date');
    });

    it('should pad month and day with zeros', () => {
      const result = TRANSFORMS.dateFormat('2024-01-05', 'YYYY-MM-DD');
      expect(result).toBe('2024-01-05');
    });
  });
});

describe('normalize', () => {
  it('should trim whitespace', () => {
    expect(normalize('  hello  ')).toBe('hello');
  });

  it('should collapse multiple spaces', () => {
    expect(normalize('hello   world')).toBe('hello world');
  });

  it('should handle tabs and newlines', () => {
    expect(normalize('hello\t\nworld')).toBe('hello world');
  });

  it('should handle empty string', () => {
    expect(normalize('')).toBe('');
  });

  it('should handle only whitespace', () => {
    expect(normalize('   \t\n  ')).toBe('');
  });
});

describe('findColumnIndex', () => {
  const headers = ['Name', 'Age', 'City', 'Country'];

  it('should find column by index', () => {
    expect(findColumnIndex(headers, { index: 1, key: 'age' })).toBe(1);
  });

  it('should find column by header name exact match', () => {
    expect(findColumnIndex(headers, { header: 'Age', key: 'age' })).toBe(1);
  });

  it('should find column by header name case-insensitive', () => {
    expect(findColumnIndex(headers, { header: 'age', key: 'age' })).toBe(1);
    expect(findColumnIndex(headers, { header: 'AGE', key: 'age' })).toBe(1);
  });

  it('should find column by header name trimmed', () => {
    expect(findColumnIndex(headers, { header: '  Age  ', key: 'age' })).toBe(1);
  });

  it('should return null if not found', () => {
    expect(findColumnIndex(headers, { header: 'NotExists', key: 'notexists' })).toBe(-1);
  });

  it('should prefer index over header', () => {
    expect(findColumnIndex(headers, { index: 2, header: 'Age', key: 'city' })).toBe(2);
  });

  it('should return null if neither index nor header provided', () => {
    expect(findColumnIndex(headers, { key: 'something' })).toBe(null);
  });
});

describe('transformValue', () => {
  it('should apply simple transform', () => {
    expect(transformValue('HELLO', 'lowercase')).toBe('hello');
  });

  it('should apply transform with parameters', () => {
    expect(transformValue('10', 'multiply(5)')).toBe(50);
  });

  it('should apply transform with string parameters', () => {
    expect(transformValue('hello', 'prefix("say: ")')).toBe('say: hello');
  });

  it('should apply transform with multiple parameters', () => {
    expect(transformValue('hello world', 'replace("world", "universe")')).toBe('hello universe');
  });

  it('should handle unknown transform gracefully', () => {
    const result = transformValue('test', 'unknownTransform');
    expect(result).toBe('test'); // should return original value
  });

  it('should handle transform error gracefully', () => {
    // Try a transform that might fail
    const result = transformValue('not-a-number', 'parseInt');
    expect(typeof result).toBe('number'); // should still return a number or original
  });

  it('should parse quoted string parameters', () => {
    expect(transformValue('hello', 'suffix(" world")')).toBe('hello world');
  });

  it('should parse numeric parameters', () => {
    expect(transformValue('100', 'divide(5)')).toBe(20);
  });
});
