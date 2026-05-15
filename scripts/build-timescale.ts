// Build timescale export JSON from source data
// Run: npx tsx scripts/build-timescale.ts

import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '../public/data');
mkdirSync(OUT_DIR, { recursive: true });

interface TimescaleExport {
  config: {
    presentYear: number;
    anchorYearsBeforePresent: number;
    logBase: number;
    futureYearsPerUnit: number;
  };
  geologicalEpochs: Array<{
    name: string; positionStart: number; positionEnd: number;
    description: string; rank: string; colour: string; fiveTownsRelevance?: string;
  }>;
  politicalEpochs: Array<{
    name: string; positionStart: number; positionEnd: number;
    description: string; fiveTownsRelevance?: string;
  }>;
  categoryColours: Record<string, string>;
}

const UNIVERSE_AGE = 13_800_000_000;
const log10 = (n: number) => Math.log10(n);
const p = (T: number) => T > 0 ? log10(T) / log10(UNIVERSE_AGE) : T === 0 ? 0 : Math.abs(T) / 100;

const geologicalEpochs = [
  { name: 'Hadean', pos: p(4_540_000_000), end: p(4_000_000_000), desc: 'Molten Earth, Moon formation, first crust', rank: 'eon', colour: 'FF6B6B', relevance: 'Earth accretes, no rocks from this period survive' },
  { name: 'Archean', pos: p(4_000_000_000), end: p(2_500_000_000), desc: 'First life: cyanobacteria, Stromatolites', rank: 'eon', colour: 'C9A227', relevance: 'No direct Five Towns record' },
  { name: 'Proterozoic', pos: p(2_500_000_000), end: p(538_800_000), desc: 'Great Oxidation Event, Snowball Earth, first eukaryotes', rank: 'eon', colour: '7FB069', relevance: 'Basement rocks may underlie area at depth' },
  { name: 'Cambrian', pos: p(538_800_000), end: p(485_400_000), desc: 'Cambrian Explosion — rapid animal diversification', rank: 'period', colour: '2E86AB', relevance: 'No Five Towns outcrops — area beneath sea' },
  { name: 'Carboniferous', pos: p(358_900_000), end: p(298_900_000), desc: 'Coal Age — Yorkshire Coal Measures deposited', rank: 'period', colour: '3D3D3D', relevance: '⭐ PRIMARY: Coal Measures underlie Five Towns at depth' },
  { name: 'Permian', pos: p(298_900_000), end: p(251_902_000), desc: 'Desert environments, Magnesian Limestone', rank: 'period', colour: 'FF6B35', relevance: '⭐ Yorkshire Magnesian Limestone surface geology east of Five Towns' },
  { name: 'Jurassic', pos: p(201_400_000), end: p(145_000_000), desc: 'Dinosaur era, Yorkshire coast limestone and clays', rank: 'period', colour: '2ECC71', relevance: '⭐ Jurassic Oxfordian limestone — dinosaur fossils at Whitby, Scarborough' },
  { name: 'Quaternary', pos: p(2_580_000), end: 0, desc: 'Ice Age — Pleistocene glaciations, Devensian, Holocene', rank: 'period', colour: 'DFE6E9', relevance: '⭐ Devensian glaciation deposited Yorkshire till; post-glacial peat' },
];

const politicalEpochs = [
  { name: 'Roman Britain', pos: p(1963), end: p(1536), desc: 'Roman conquest 43 AD, roads, forts, 400-year occupation', relevance: '⭐ Roman Causennae at Pontefract — Roman road passes through' },
  { name: 'Norman-Medieval', pos: p(934), end: p(1485), desc: 'Norman Conquest, feudal system, castles, monasteries', relevance: '⭐ Doomsday Book 1086: Tanshelf (Pontefract), Leoperce (Castleford)' },
  { name: 'Victorian', pos: p(84), end: p(4), desc: 'Industrial peak, railways, mining towns', relevance: '⭐ Victorian: Coal mines at peak; Featherstone, Knottingley, Pontefract; railways connect all five towns' },
  { name: 'Modern', pos: p(4), end: 0, desc: 'Post-war reconstruction, deindustrialisation, mining decline', relevance: "1984 miners' strike: Featherstone violence; pit closures; economic transformation" },
];

const categoryColours: Record<string, string> = {
  bigbang: 'FF00FF', stellar: 'FFD700', geological: '8B4513', biological: '228B22',
  human: 'FF6347', historical: '4169E1', political: '9932CC', modern: '20B2AA',
  hadean: 'FF6B6B', archean: 'C9A227', proterozoic: '7FB069', cambrian: '2E86AB',
  carboniferous: '3D3D3D', permian: 'FF6B35', jurassic: '2ECC71', quaternary: 'DFE6E9',
};

const exportData: TimescaleExport = {
  config: { presentYear: 2000, anchorYearsBeforePresent: UNIVERSE_AGE, logBase: 10, futureYearsPerUnit: 100 },
  geologicalEpochs: geologicalEpochs.map(e => ({ name: e.name, positionStart: e.pos, positionEnd: e.end, description: e.desc, rank: e.rank, colour: e.colour, fiveTownsRelevance: e.relevance })),
  politicalEpochs: politicalEpochs.map(e => ({ name: e.name, positionStart: e.pos, positionEnd: e.end, description: e.desc, fiveTownsRelevance: e.relevance })),
  categoryColours,
};

const outPath = join(OUT_DIR, 'timescale-export.json');
writeFileSync(outPath, JSON.stringify(exportData, null, 2), 'utf-8');
console.log(`Written to ${outPath}`);
console.log(`${geologicalEpochs.length} geological epochs, ${politicalEpochs.length} political epochs`);