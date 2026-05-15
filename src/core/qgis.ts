// QGIS Layer Resource (.qlr) generator
// Outputs QLR XML files that load GeoJSON bundles with proper styling

import type { Layer, GeoFeature, LayerStyle } from './types.js';
import { writeFileSync } from 'fs';
import { join } from 'path';

export interface QlrLayerOptions {
  layer: Layer;
  dataPath: string; // relative path from .qlr to data file
  crs?: string;
}

/**
 * Generate a QGIS Layer Resource (.qlr) XML file for a single layer.
 * QLR files are XML documents that describe a layer source and its styling,
 * allowing one-click project restore in QGIS.
 */
export function generateQlrLayer(opts: QlrLayerOptions): string {
  const { layer, dataPath, crs = 'EPSG:4326' } = opts;
  const style: LayerStyle = (layer.style ?? defaultStyleForLayer(layer.id))!;

  if (!layer.features[0]) {
    throw new Error(`Layer ${layer.id} has no features`);
  }

  const { fillColor, strokeColor, strokeWidth, fillOpacity } = style;

  return `<?xml version="1.0" encoding="UTF-8"?>
<maplayers>
  <maplayer geometry="${geometryType(layer.features[0])}" minScale="0" maxScale="1e+08" symbologyReference="0" type="vector" hasZ="0" hasM="0">
    <id>${layer.id}</id>
    <datasource>${escapeXml(dataPath)}</datasource>
    <provider>ogr</provider>
    <layername>${escapeXml(layer.name)}</layername>
    <description>${escapeXml(layer.description)}</description>
    <srs>
      <spatialrefsys nativeData="COORD_REF_SYS=1,CRS_ID=1,PROJ=0,ELLIPSOID=1,PROJ=+proj=longlat +datum=WGS84 +no_defs,CS=2,AXIS=Longitude,EAST,0,AXIS=Latitude,NORTH,0">
        <proj>+proj=longlat +datum=WGS84 +no_defs</proj>
        <srsid>3457</srsid>
        <srid>4326</srid>
        <authid>EPSG:4326</authid>
        <description>WGS 84</description>
        <projectionacronym>longlat</projectionacronym>
        <ellipsoidacronym>WGS84</ellipsoidacronym>
      </spatialrefsys>
    </srs>
    <renderer-v2 symbollevels="0" type="singleSymbol" enableorderby="0">
      <symbols>
        <symbol alpha="1" type="fill" name="0">
          <layer enabled="1" pass="0" class="SimpleFill" locked="0">
            <prop k="border_width_map_unit_scale" v="3x:0,0,0,0,0,0"/>
            <prop k="color" v="${fillColor ?? '200,200,200,255'}"/>
            <prop k="joinstyle" v="bevel"/>
            <prop k="offset" v="0,0"/>
            <prop k="offset_map_unit_scale" v="3x:0,0,0,0,0,0"/>
            <prop k="offset_unit" v="MM"/>
            <prop k="style" v="solid"/>
            <prop k="border_color" v="${strokeColor ?? '100,100,100,255'}"/>
            <prop k="border_width" v="${(strokeWidth ?? 0.5).toString()}"/>
            <prop k="border_width_unit" v="MM"/>
          </layer>
        </symbol>
      </symbols>
    </renderer-v2>
    <blendMode>0</blendMode>
    <layerOpacity>${fillOpacity ?? 0.3}</layerOpacity>
    <customproperties>
      <property key="layer_credits" value="${escapeXml(layer.source)}"/>
    </customproperties>
  </maplayer>
</maplayers>`;
}

function geometryType(feature: GeoFeature | undefined): string {
  if (!feature) return 'Polygon';
  if (feature.geometry.type === 'MultiPolygon') return 'MultiPolygon';
  return 'Polygon';
}

function defaultStyleForLayer(layerId: string): Layer['style'] {
  if (layerId.startsWith('geology:')) {
    return { fillColor: '180,120,60,255', fillOpacity: 0.4, strokeColor: '80,60,30,255', strokeWidth: 0.5 };
  }
  if (layerId.startsWith('admin:')) {
    return { fillColor: '100,150,100,255', fillOpacity: 0.3, strokeColor: '50,100,50,255', strokeWidth: 0.8 };
  }
  if (layerId.startsWith('political:')) {
    return { fillColor: '150,100,150,255', fillOpacity: 0.3, strokeColor: '80,50,80,255', strokeWidth: 1.0 };
  }
  if (layerId.startsWith('hydrology:')) {
    return { fillColor: '100,180,220,255', fillOpacity: 0.5, strokeColor: '50,100,180,255', strokeWidth: 0.3 };
  }
  return { fillColor: '200,200,200,255', fillOpacity: 0.3, strokeColor: '100,100,100,255', strokeWidth: 0.5 };
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Write a .qlr file for a layer to disk.
 */
export function writeQlrFile(opts: QlrLayerOptions, outputPath: string): void {
  const qlr = generateQlrLayer(opts);
  writeFileSync(outputPath, qlr, 'utf-8');
}

/**
 * Generate a QLR project file containing all registered layers.
 */
export function generateQlrProject(layers: Layer[], dataDir: string, outputPath: string): void {
  const projectLines = [`<?xml version="1.0" encoding="UTF-8"?>`];
  projectLines.push(`<maplayers>`);

  for (const layer of layers) {
    const relPath = `data/${layer.id}.geojson`;
    const qlr = generateQlrLayer({ layer, dataPath: relPath });
    // Extract just the maplayer element
    const match = qlr.match(/<maplayer[\s\S]*?<\/maplayer>/);
    if (match) {
      projectLines.push(match[0]);
    }
  }

  projectLines.push(`</maplayers>`);

  const projectXml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE qgis-project>
<qgis project version="3.38">
  <layer-tree-group expanded="1" checked="Qt::PartiallyChecked" name="">
${layers.map((l, i) => `    <layer-tree-layer ${i === 0 ? 'checked="Qt::Checked" ' : ''}id="${l.id}" name="${escapeXml(l.name)}" source="${escapeXml(`data/${l.id}.geojson`)}" providerKey="ogr"/>`).join('\n')}
  </layer-tree-group>
  <legend update="0">
${layers.map((l, i) => `    <legendlayer open="true" checked="Qt::Checked" name="${escapeXml(l.name)}" drawingOrder="-1"><filegroup open="true" hidden="false"><legendlayerfile isInOverview="0" layerid="${l.id}" absScale="0" relScale="1"/></filegroup></legendlayer>`).join('\n')}
  </legend>
  ${projectLines.join('\n')}
</qgis-project>`;

  writeFileSync(outputPath, projectXml, 'utf-8');
}