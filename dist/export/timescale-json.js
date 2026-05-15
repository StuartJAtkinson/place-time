// Timescale Data Export — JSON-serialisable event list
// Derived from src/core/timescale.ts — use this for web UI and QGIS attribute joins
import { COSMIC_TIMESCALE, UNIVERSE_AGE_YEARS } from '../src/core/timescale.js';
// Export as plain JSON-compatible array for web UI
const timescaleData = COSMIC_TIMESCALE.map(e => ({
    name: e.name,
    yearBefore2000: e.yearBefore2000,
    yearAD: e.yearAD,
    position: e.position,
    category: e.category,
    detail: e.detail,
}));
// Write the JSON file
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, 'data/timescale');
const PUBLIC_DIR = join(__dirname, 'public/data/timescale');
// Ensure directories exist
[DATA_DIR, PUBLIC_DIR].forEach(dir => {
    try {
        const { mkdirSync } = require('fs');
        if (!mkdirSync)
            require('fs').mkdirSync(dir, { recursive: true });
    }
    catch {
        // already exists
    }
});
writeFileSync(join(DATA_DIR, 'timescale-events.json'), JSON.stringify(timescaleData, null, 2), 'utf-8');
writeFileSync(join(PUBLIC_DIR, 'timescale-events.json'), JSON.stringify(timescaleData, null, 2), 'utf-8');
console.log(`Wrote ${timescaleData.length} events to ${DATA_DIR}`);
console.log('Metadata:');
console.log(`  Universe age: ${UNIVERSE_AGE_YEARS.toLocaleString()} years`);
console.log(`  Big Bang position: 0.0`);
console.log(`  Year 2000 anchor position: 1.0`);
console.log(`  Future: linear extension from position 1.0`);
console.log('\nCategory colours:');
const categories = [...new Set(timescaleData.map(e => e.category))];
categories.forEach(c => console.log(`  ${c}`));
export { timescaleData };
//# sourceMappingURL=timescale-json.js.map