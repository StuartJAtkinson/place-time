import type { Layer } from './types.js';
export interface QlrLayerOptions {
    layer: Layer;
    dataPath: string;
    crs?: string;
}
/**
 * Generate a QGIS Layer Resource (.qlr) XML file for a single layer.
 * QLR files are XML documents that describe a layer source and its styling,
 * allowing one-click project restore in QGIS.
 */
export declare function generateQlrLayer(opts: QlrLayerOptions): string;
/**
 * Write a .qlr file for a layer to disk.
 */
export declare function writeQlrFile(opts: QlrLayerOptions, outputPath: string): void;
/**
 * Generate a QLR project file containing all registered layers.
 */
export declare function generateQlrProject(layers: Layer[], dataDir: string, outputPath: string): void;
//# sourceMappingURL=qgis.d.ts.map