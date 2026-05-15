export declare const DEFAULT_UNIVERSE_AGE_YEARS = 13800000000;
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
export declare const DEFAULT_CONFIG: TimescaleConfig;
/**
 * Calculate position on the timescale.
 * T = years before present (positive = past, 0 = present, negative = future)
 * For T > 0: log_base(T) / log_base(anchor_years) — compressed
 * For T <= 0: linear extension from position 0
 */
export declare function position(config: TimescaleConfig, T: number): number;
/**
 * Reverse: given a position, return years before present.
 * For position >= 0: inverse log scale
 * For position < 0: linear from present
 */
export declare function yearsBeforePresent(config: TimescaleConfig, pos: number): number;
/**
 * Convert a calendar year (AD/BC) to position using the timescale config.
 * year > config.presentYear → negative (future)
 * year < config.presentYear → positive (past)
 */
export declare function yearToPosition(config: TimescaleConfig, year: number): number;
/**
 * Convert position back to calendar year.
 */
export declare function positionToYear(config: TimescaleConfig, pos: number): number;
export interface GeologicalEpoch {
    name: string;
    positionStart: number;
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
export declare const GEOLOGICAL_EPOCHS: GeologicalEpoch[];
export declare const POLITICAL_EPOCHS: PoliticalEpoch[];
/**
 * Find which geological epoch(s) are active at a given position.
 */
export declare function geologicalEpochAtPosition(pos: number): GeologicalEpoch | null;
/**
 * Find which political epoch is active at a given position.
 */
export declare function politicalEpochAtPosition(pos: number): PoliticalEpoch | null;
/**
 * Find which geological epoch contains a given year (AD).
 */
export declare function geologicalEpochAtYear(year: number): GeologicalEpoch | null;
/**
 * Find which political epoch contains a given year (AD).
 */
export declare function politicalEpochAtYear(year: number): PoliticalEpoch | null;
/**
 * Get all geological epochs whose position range overlaps a given range.
 */
export declare function geologicalEpochsInRange(posMin: number, posMax: number): GeologicalEpoch[];
/**
 * Get all political epochs whose position range overlaps a given range.
 */
export declare function politicalEpochsInRange(posMin: number, posMax: number): PoliticalEpoch[];
export declare const CATEGORY_COLOURS: Record<string, string>;
export interface TimescaleExport {
    config: TimescaleConfig;
    geologicalEpochs: GeologicalEpoch[];
    politicalEpochs: PoliticalEpoch[];
    categoryColours: Record<string, string>;
}
export declare function buildExport(): TimescaleExport;
//# sourceMappingURL=timescale.d.ts.map