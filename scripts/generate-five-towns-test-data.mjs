// Generate Five Towns hex grid test data for QGIS verification
import * as h3 from 'h3-js';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// Five Towns approximate centre
const LAT = 53.7;
const LNG = -1.3;
const FIVE_TOWNS = [
  { name: "Pontefract", lat: 53.699, lng: -1.312 },
  { name: "Knottingley", lat: 53.712, lng: -1.253 },
  { name: "Featherstone", lat: 53.681, lng: -1.289 },
  { name: "Castleford", lat: 53.727, lng: -1.283 },
  { name: "Normanton", lat: 53.703, lng: -1.223 },
];

// Generate hex grid at res 8 (~8.7km hexes, town-scale) covering Five Towns
const centre = h3.latLngToCell(LAT, LNG, 8);
const ring1 = h3.gridDisk(centre, 1);
const ring2 = h3.gridDisk(centre, 2);
const allCells = [...ring2];

console.log(`Generating hex grid: centre=${centre}, ring1=${ring1.length} cells, ring2=${ring2.length} cells`);

// Generate hex polygons for the grid
function h3ToGeoJSON(cells, properties = {}) {
  return {
    type: 'FeatureCollection',
    features: cells.map(cell => {
      const boundary = h3.cellToBoundary(cell);
      const coords = boundary.map(([lat, lng]) => [lng, lat]); // [lng, lat] for GeoJSON
      return {
        type: 'Feature',
        properties: { h3_index: cell, ...properties },
        geometry: { type: 'Polygon', coordinates: [coords] }
      };
    })
  };
}

const outDir = join(__dirname, '../public/data');

// Write hex grid at res 8 (town-scale, ~0.73 km2 per hex)
const hexGrid = h3ToGeoJSON(allCells, { layer: 'hex-grid', resolution: 8 });
writeFileSync(join(outDir, 'five-towns-hex-grid.geojson'), JSON.stringify(hexGrid, null, 2));
console.log(`Written: public/data/five-towns-hex-grid.geojson (${allCells.length} hexes)`);

// Write Five Towns point locations
const places = {
  type: 'FeatureCollection',
  features: FIVE_TOWNS.map(t => ({
    type: 'Feature',
    properties: { name: t.name, lat: t.lat, lng: t.lng },
    geometry: { type: 'Point', coordinates: [t.lng, t.lat] }
  }))
};
writeFileSync(join(outDir, 'five-towns-places.geojson'), JSON.stringify(places, null, 2));
console.log(`Written: public/data/five-towns-places.geojson (${FIVE_TOWNS.length} places)`);

// Generate QLR files
function qlrFor(layerId, name, dataPath, fillColor, strokeColor = '100,100,100,255') {
  return `<?xml version="1.0" encoding="UTF-8"?>
<maplayers>
  <maplayer geometry="Polygon" minScale="0" maxScale="1e+08" symbologyReference="0" type="vector" hasZ="0" hasM="0">
    <id>${layerId}</id>
    <datasource>${dataPath}</datasource>
    <provider>ogr</provider>
    <layername>${name}</layername>
    <description>Hex grid at H3 resolution 8 (~0.73 km2 cells)</description>
    <srs><spatialrefsys nativeData="COORD_REF_SYS=1,CRS_ID=1,PROJ=0,ELLIPSOID=1,PROJ=+proj=longlat +datum=WGS84 +no_defs,CS=2,AXIS=Longitude,EAST,0,AXIS=Latitude,NORTH,0"><proj>+proj=longlat +datum=WGS84 +no_defs</proj><srsid>3457</srsid><srid>4326</srid><authid>EPSG:4326</authid><description>WGS 84</description><projectionacronym>longlat</projectionacronym><ellipsoidacronym>WGS84</ellipsoidacronym></spatialrefsys></srs>
    <renderer-v2 symbollevels="0" type="singleSymbol" enableorderby="0">
      <symbols><symbol alpha="1" type="fill" name="0">
        <layer enabled="1" pass="0" class="SimpleFill" locked="0">
          <prop k="color" v="${fillColor}"/>
          <prop k="joinstyle" v="bevel"/>
          <prop k="offset" v="0,0"/>
          <prop k="style" v="solid"/>
          <prop k="border_color" v="${strokeColor}"/>
          <prop k="border_width" v="0.3"/>
          <prop k="border_width_unit" v="MM"/>
        </layer>
      </symbol></symbols>
    </renderer-v2>
    <blendMode>0</blendMode>
    <layerOpacity>0.4</layerOpacity>
  </maplayer>
</maplayers>`;
}

writeFileSync(join(outDir, 'five-towns-hex-grid.qlr'), qlrFor('hex-grid', 'Five Towns Hex Grid (res 8)', 'five-towns-hex-grid.geojson', '200,180,120,255'));
writeFileSync(join(outDir, 'five-towns-places.qlr'), qlrFor('places', 'Five Towns Places', 'five-towns-places.geojson', '180,60,60,255', '100,40,40,255'));
console.log('Written: public/data/five-towns-hex-grid.qlr');
console.log('Written: public/data/five-towns-places.qlr');
console.log('Done!');