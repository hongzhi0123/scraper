import * as fs from 'fs';
import * as path from 'path';
import { ScrapedRow, SiteConfig } from './types.js';
import { scrapeSite } from './scraper.js';

const __dirname = import.meta.dirname;
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"; // Ignore TLS errors

// Main function
async function main() {
  const configDir = path.join(__dirname, '../config');
  const files = fs.readdirSync(configDir).filter(f => f.endsWith('.json'));

  const allResults: Record<string, ScrapedRow[]> = {};

  for (const file of files) {
    const configPath = path.join(configDir, file);
    const config: SiteConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const siteName = path.basename(file, '.json');

    try {
      const data = await scrapeSite(config);
      allResults[siteName] = data;
      console.log(`✓ ${siteName}: ${data.length} rows`);
    } catch (err) {
      console.error(`✗ ${siteName}:`, (err as Error).message);
      allResults[siteName] = [];
    }
  }

  // Save output
  const outputPath = path.join(__dirname, '../results/output.json');
  fs.writeFileSync(outputPath, JSON.stringify(allResults, null, 2));
  console.log(`\nResults saved to ${outputPath}`);
}

main().catch(console.error);