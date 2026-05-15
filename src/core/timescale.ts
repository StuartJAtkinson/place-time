// Place-Time: Universal Timescale System
// Logarithmic compression from anchor event → present, linear extension into future
// Default: Big Bang (anchor=-T) → year 2000 (present=0) → future
// Fully configurable: any anchor year, any present year, any log base

export const DEFAULT_UNIVERSE_AGE_YEARS = 13_800_000_000;

export interface TimescaleConfig {
  /** Year treated as "present" (position = 0). Default: 2000. */
  presentYear: number;
  /** Years before presentYear that the anchor event occurred. Default: 13.8B. */
  anchorYearsBeforePresent: number;
  /** Logarithmic base. Default: 10 (log10). */
  logBase?: number;
  /** Future extension: years per position unit. Default: 100. */
  futureYearsPerUnit?: number;
}

export const DEFAULT_CONFIG: TimescaleConfig = {
  presentYear: 2000,
  anchorYearsBeforePresent: DEFAULT_UNIVERSE_AGE_YEARS,
  logBase: 10,
  futureYearsPerUnit: 100,
};

/**
 * Calculate position on the timescale.
 * T = years before present (positive = past, 0 = present, negative = future)
 * For T > 0: log_base(T) / log_base(anchor_years) — compressed
 * For T <= 0: linear extension from position 0
 */
export function position(config: TimescaleConfig, T: number): number {
  const base = config.logBase ?? 10;
  const anchor = config.anchorYearsBeforePresent;
  if (T > 0) {
    return Math.log(T) / Math.log(base) / (Math.log(anchor) / Math.log(base));
  }
  // T = 0 → position 0 (present anchor)
  // T < 0 → linear future extension
  const futurePerUnit = config.futureYearsPerUnit ?? 100;
  return Math.abs(T) / futurePerUnit;
}

/**
 * Reverse: given a position, return years before present.
 * For position >= 0: inverse log scale
 * For position < 0: linear from present
 */
export function yearsBeforePresent(config: TimescaleConfig, pos: number): number {
  const base = config.logBase ?? 10;
  const anchor = config.anchorYearsBeforePresent;
  if (pos >= 0) {
    return Math.pow(base, pos * Math.log(anchor) / Math.log(base));
  }
  const futurePerUnit = config.futureYearsPerUnit ?? 100;
  return -pos * futurePerUnit;
}

/**
 * Convert a calendar year (AD/BC) to position using the timescale config.
 * year > config.presentYear → negative (future)
 * year < config.presentYear → positive (past)
 */
export function yearToPosition(config: TimescaleConfig, year: number): number {
  return position(config, config.presentYear - year);
}

/**
 * Convert position back to calendar year.
 */
export function positionToYear(config: TimescaleConfig, pos: number): number {
  return config.presentYear - yearsBeforePresent(config, pos);
}

// ─── Geological Timescale (ICS International Chronostratigraphic Chart) ──────
// Position ranges derived from ICS 2024/2023 approved boundaries
// https://engineering.purdue.edu/Stratigraphy/charts

export interface GeologicalEpoch {
  name: string;
  positionStart: number; // on the timescale (relative to config.presentYear)
  positionEnd: number;
  description: string;
  /** ICS rank: eon > era > period > epoch > age */
  rank: 'eon' | 'era' | 'period' | 'epoch' | 'age';
  /** Colour for visualisation (hex) */
  colour: string;
  /** Relevant to Five Towns Yorkshire area */
  fiveTownsRelevance?: string;
}

export interface PoliticalEpoch {
  name: string;
  positionStart: number;
  positionEnd: number;
  description: string;
  fiveTownsRelevance?: string;
}

// ─── Default Geological Column (Phanerozoic focus with Precambrian) ────────────
// Positions computed for DEFAULT_CONFIG (presentYear=2000, anchor=-13.8B)

function p(yearsBefore2000: number): number {
  return position(DEFAULT_CONFIG, yearsBefore2000);
}

export const GEOLOGICAL_EPOCHS: GeologicalEpoch[] = [
  // ── PRECAMBRIAN ──────────────────────────────────────────────────────────────
  {
    name: 'Hadean',
    positionStart: p(4_540_000_000),
    positionEnd: p(4_000_000_000),
    rank: 'eon',
    colour: 'FF6B6B',
    description: 'Molten Earth, Moon formation, first crust',
    fiveTownsRelevance: 'Earth accretes, no rocks from this period survive',
  },
  {
    name: 'Archean',
    positionStart: p(4_000_000_000),
    positionEnd: p(2_500_000_000),
    rank: 'eon',
    colour: 'C9A227',
    description: 'First life: cyanobacteria, Stromatolites, banded iron formations',
    fiveTownsRelevance: 'No direct Five Towns record — rocks from this age largely absent/eroded',
  },
  {
    name: 'Proterozoic',
    positionStart: p(2_500_000_000),
    positionEnd: p(538_800_000),
    rank: 'eon',
    colour: '7FB069',
    description: 'Great Oxidation Event, Snowball Earth, first eukaryotes, multicellular life',
    fiveTownsRelevance: 'Basement rocks may underlie area at great depth',
  },
  {
    name: 'Cambrian',
    positionStart: p(538_800_000),
    positionEnd: p(485_400_000),
    rank: 'period',
    colour: '2E86AB',
    description: 'Cambrian Explosion — rapid diversification of animal phyla',
    fiveTownsRelevance: 'No Five Towns outcrops — area was beneath sea',
  },
  {
    name: 'Ordovician',
    positionStart: p(485_400_000),
    positionEnd: p(443_800_000),
    rank: 'period',
    colour: '3D8B37',
    description: 'Marine invertebrates, first fish, Volcanic activity',
    fiveTownsRelevance: 'Deep sedimentary basement may include Ordovician strata',
  },
  {
    name: 'Silurian',
    positionStart: p(443_800_000),
    positionEnd: p(419_200_000),
    rank: 'period',
    colour: '8B5CF6',
    description: 'First land plants, jawless fish, marine reef ecosystems',
    fiveTownsRelevance: 'No local outcrop — area was deep marine',
  },
  {
    name: 'Devonian',
    positionStart: p(419_200_000),
    positionEnd: p(358_900_000),
    rank: 'period',
    colour: 'FF7F50',
    description: 'Age of Fishes, first amphibians, forests spread',
    fiveTownsRelevance: 'Some NE England Devonian sandstone (Old Red Sandstone)',
  },
  {
    name: 'Carboniferous',
    positionStart: p(358_900_000),
    positionEnd: p(298_900_000),
    rank: 'period',
    colour: '3D3D3D',
    description: 'Coal Age — Yorkshire Coal Measures deposited in deltaic swamps',
    fiveTownsRelevance: '⭐ PRIMARY: Coal Measures underlie Five Towns at depth — source of industry, place names, modern topography',
  },
  {
    name: 'Permian',
    positionStart: p(298_900_000),
    positionEnd: p(251_902_000),
    rank: 'period',
    colour: 'FF6B35',
    description: 'Desert environments, Permian extinction (96% species), Zechstein sea in UK',
    fiveTownsRelevance: '⭐ Yorkshire Magnesian Limestone (Permian) — surface geology east of Five Towns',
  },
  {
    name: 'Triassic',
    positionStart: p(251_902_000),
    positionEnd: p(201_400_000),
    rank: 'period',
    colour: 'FF4757',
    description: 'Rifting Pangea, deserts, first dinosaurs,cetaceans',
    fiveTownsRelevance: 'Triassic sandstone beneath drift cover in parts of area',
  },
  {
    name: 'Jurassic',
    positionStart: p(201_400_000),
    positionEnd: p(145_000_000),
    rank: 'period',
    colour: '2ECC71',
    description: 'Dinosaur era, warm climate, seas transgress across UK',
    fiveTownsRelevance: '⭐ Jurassic Oxfordian limestone and clays at Yorkshire coast — dinosaur fossils (Whitby, Scarborough)',
  },
  {
    name: 'Cretaceous',
    positionStart: p(145_000_000),
    positionEnd: p(66_000_000),
    rank: 'period',
    colour: 'F9CA24',
    description: 'Chalk seas, angiosperms (flowering plants), K-Pg extinction',
    fiveTownsRelevance: 'Chalk downs south of Yorkshire — Yorkshire chalk not well developed',
  },
  {
    name: 'Paleogene',
    positionStart: p(66_000_000),
    positionEnd: p(23_030_000),
    rank: 'period',
    colour: 'A29BFE',
    description: 'Mammals diversify, Alpine orogeny begins, UK tilts',
    fiveTownsRelevance: 'Alpine orogeny leads to uplift of Pennines — begins modern topography',
  },
  {
    name: 'Neogene',
    positionStart: p(23_030_000),
    positionEnd: p(2_580_000),
    rank: 'period',
    colour: '81ECEC',
    description: 'Grasslands spread, hominin evolution, cooler climate',
    fiveTownsRelevance: 'Uplifted Pennine landscape — modern drainage patterns established',
  },
  {
    name: 'Quaternary',
    positionStart: p(2_580_000),
    positionEnd: 0,
    rank: 'period',
    colour: 'DFE6E9',
    description: 'Ice Age — Pleistocene glaciations, Devensian, Holocene',
    fiveTownsRelevance: '⭐ PRIMARY: Devensian glaciation deposited Yorkshire till; glaciofluvial sand and gravel; post-glacial peat',
  },
];

// ─── Political / Human Geography Epochs ───────────────────────────────────────
// Derived from British and Yorkshire historical periodisation

export const POLITICAL_EPOCHS: PoliticalEpoch[] = [
  {
    name: 'Palaeolithic',
    positionStart: p(300_000),
    positionEnd: p(10_000),
    description: 'Palaeolithic hunter-gatherers, Doggerland exposed, ice sheets retreat',
    fiveTownsRelevance: 'Palaeolithic handaxes found in Yorkshire river gravels — no fixed settlement',
  },
  {
    name: 'Mesolithic',
    positionStart: p(10_000),
    positionEnd: p(6_000),
    description: 'Mesolithic hunter-gatherers, Doggerland still exposed, microlithic tools',
    fiveTownsRelevance: 'Mesolithic sites in Yorkshire — Five Towns area was lake/marsh edge',
  },
  {
    name: 'Neolithic',
    positionStart: p(6_000),
    positionEnd: p(4_500),
    description: 'Agriculture, permanent settlements, causewayed enclosures, megalithic tombs',
    fiveTownsRelevance: 'Neolithic axe factories in Yorkshire Pennines — trade networks',
  },
  {
    name: 'Bronze Age',
    positionStart: p(4_500),
    positionEnd: p(2_800),
    description: 'Bronze working, stone circles, round barrows, hillforts emerge',
    fiveTownsRelevance: 'Bronze Age barrows in West Yorkshire — some in Five Towns vicinity',
  },
  {
    name: 'Iron Age',
    positionStart: p(2_800),
    positionEnd: p(1963),
    description: 'Celtic Britain, hillforts, tribal territories, La Tène culture',
    fiveTownsRelevance: 'Iron Age tribal territory — Brigantes controlled Yorkshire',
  },
  {
    name: 'Roman Britain',
    positionStart: p(1963),
    positionEnd: p(1536),
    description: 'Roman conquest 43 AD, roads, forts, villas, 400-year occupation',
    fiveTownsRelevance: '⭐ Roman Causennae at Pontefract — Roman road (York to Lincoln) passes through',
  },
  {
    name: 'Anglo-Saxon',
    positionStart: p(1400),
    positionEnd: p(1066),
    description: 'Angles, Saxons, Jutes settle, English kingdoms, Christianisation',
    fiveTownsRelevance: 'Anglo-Saxon kingdoms: Northumbria, Mercia — Five Towns on boundary',
  },
  {
    name: 'Norman-Medieval',
    positionStart: p(934),
    positionEnd: p(1485),
    description: 'Norman Conquest, feudal system, castles, monasteries, Black Death',
    fiveTownsRelevance: '⭐ Doomsday Book 1086: Tanshelf (Pontefract), Leoperce (Castleford); Pontefract Castle built',
  },
  {
    name: 'Tudor-Stuart',
    positionStart: p(500),
    positionEnd: p(350),
    description: 'Dissolution of monasteries, Reformation, English Civil War',
    fiveTownsRelevance: 'Pontefract Castle: Royalist stronghold, three sieges 1644–45; Dissolution seizures',
  },
  {
    name: 'Georgian',
    positionStart: p(300),
    positionEnd: p(120),
    description: 'Industrial Revolution begins,Enclosure, urban growth, Parliament reform',
    fiveTownsRelevance: '⭐ Georgian: Five Towns emerge as coal-mining and textile centre; turnpike roads',
  },
  {
    name: 'Victorian',
    positionStart: p(84),
    positionEnd: p(4),
    description: 'Industrial peak, railways, mining towns, Empire, working-class identity',
    fiveTownsRelevance: '⭐ Victorian: Coal mines at peak; Featherstone, Knottingley, Pontefract; railways connect all five towns; severe poverty',
  },
  {
    name: 'Modern',
    positionStart: p(4),
    positionEnd: 0,
    description: 'Post-war reconstruction, deindustrialisation, mining decline, austerity',
    fiveTownsRelevance: '1984–85 miners\' strike: Featherstone violence; pit closures; economic transformation',
  },
  {
    name: 'Future',
    positionStart: 0,
    positionEnd: Infinity,
    description: 'Projected — linear extension from present year',
    fiveTownsRelevance: 'TBD',
  },
];

// ─── Epoch lookup utilities ───────────────────────────────────────────────────

/**
 * Find which geological epoch(s) are active at a given position.
 */
export function geologicalEpochAtPosition(pos: number): GeologicalEpoch | null {
  return GEOLOGICAL_EPOCHS.find(e => pos >= e.positionStart && pos < e.positionEnd) ?? null;
}

/**
 * Find which political epoch is active at a given position.
 */
export function politicalEpochAtPosition(pos: number): PoliticalEpoch | null {
  return POLITICAL_EPOCHS.find(e => pos >= e.positionStart && pos < e.positionEnd) ?? null;
}

/**
 * Find which geological epoch contains a given year (AD).
 */
export function geologicalEpochAtYear(year: number): GeologicalEpoch | null {
  return geologicalEpochAtPosition(yearToPosition(DEFAULT_CONFIG, year));
}

/**
 * Find which political epoch contains a given year (AD).
 */
export function politicalEpochAtYear(year: number): PoliticalEpoch | null {
  return politicalEpochAtPosition(yearToPosition(DEFAULT_CONFIG, year));
}

/**
 * Get all geological epochs whose position range overlaps a given range.
 */
export function geologicalEpochsInRange(
  posMin: number,
  posMax: number
): GeologicalEpoch[] {
  return GEOLOGICAL_EPOCHS.filter(e => posMax >= e.positionStart && posMin < e.positionEnd);
}

/**
 * Get all political epochs whose position range overlaps a given range.
 */
export function politicalEpochsInRange(
  posMin: number,
  posMax: number
): PoliticalEpoch[] {
  return POLITICAL_EPOCHS.filter(e => posMax >= e.positionStart && posMin < e.positionEnd);
}

// ─── Category colours for web UI / QGIS styling ─────────────────────────────────

export const CATEGORY_COLOURS: Record<string, string> = {
  bigbang: 'FF00FF',
  stellar: 'FFD700',
  geological: '8B4513',
  biological: '228B22',
  human: 'FF6347',
  historical: '4169E1',
  political: '9932CC',
  modern: '20B2AA',
  future: 'C0C0C0',
  // Geological periods
  hadean: 'FF6B6B',
  archean: 'C9A227',
  proterozoic: '7FB069',
  cambrian: '2E86AB',
  ordovician: '3D8B37',
  silurian: '8B5CF6',
  devonian: 'FF7F50',
  carboniferous: '3D3D3D',
  permian: 'FF6B35',
  triassic: 'FF4757',
  jurassic: '2ECC71',
  cretaceous: 'F9CA24',
  paleogene: 'A29BFE',
  neogene: '81ECEC',
  quaternary: 'DFE6E9',
};

// ─── JSON export for web UI ────────────────────────────────────────────────────

export interface TimescaleExport {
  config: TimescaleConfig;
  geologicalEpochs: GeologicalEpoch[];
  politicalEpochs: PoliticalEpoch[];
  categoryColours: Record<string, string>;
}

export function buildExport(): TimescaleExport {
  return {
    config: DEFAULT_CONFIG,
    geologicalEpochs: GEOLOGICAL_EPOCHS,
    politicalEpochs: POLITICAL_EPOCHS,
    categoryColours: CATEGORY_COLOURS,
  };
}