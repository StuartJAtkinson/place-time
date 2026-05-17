import json
import os

UK_W, UK_E, UK_S, UK_N = -11.0, 3.0, 49.0, 62.0
UK_TERMS = {
    'england', 'britain', 'wales', 'scotland', 'ireland', 'northumbria', 'mercia',
    'wessex', 'deira', 'bernicia', 'york', 'anglia', 'kent', 'sussex', 'essex',
    'cornwall', 'united kingdom', 'great britain', 'saxon', 'viking', 'norman',
    'plantagenet', 'tudor', 'stuarts', 'hanover', 'danish', 'norse',
    'northumber', 'cumbria', 'lancashire', 'cheshire', 'yorkshire', 'elmet',
    'powys', 'gwynedd', 'dalriada', 'pictish', 'albanian', 'strathclyde'
}

def centroid_in_uk(geometry):
    if not geometry:
        return False
    try:
        coords = geometry.get('coordinates', [])
        if geometry['type'] == 'Polygon' and coords:
            ring = coords[0]
            lon = sum(p[0] for p in ring) / len(ring)
            lat = sum(p[1] for p in ring) / len(ring)
            return UK_W <= lon <= UK_E and UK_S <= lat <= UK_N
        elif geometry['type'] == 'MultiPolygon' and coords:
            ring = coords[0][0]
            lon = sum(p[0] for p in ring) / len(ring)
            lat = sum(p[1] for p in ring) / len(ring)
            return UK_W <= lon <= UK_E and UK_S <= lat <= UK_N
    except Exception:
        pass
    return False

def name_is_uk(name):
    if not name:
        return False
    lower = name.lower()
    return any(t in lower for t in UK_TERMS)

# Source file (extracted from cliopatria.geojson.zip in repo)
SRC = r'C:\Users\Stuart\AppData\Local\Temp\cliopatria_extracted\cliopatria_polities_only.geojson'
OUT = r'H:\place-time\data\historical\cliopatria-uk.geojson'
OUT_PUBLIC = r'H:\place-time\public\cliopatria-uk.geojson'

print('Loading Cliopatria (165 MB)...')
with open(SRC, encoding='utf-8') as f:
    d = json.load(f)

total = len(d['features'])
print(f'Total features: {total}')

uk_features = []
for feat in d['features']:
    props = feat.get('properties', {})
    if name_is_uk(props.get('Name', '')) or centroid_in_uk(feat.get('geometry')):
        uk_features.append(feat)

print(f'UK features: {len(uk_features)}')

out = {
    'type': 'FeatureCollection',
    'name': 'cliopatria_uk',
    'features': [
        {
            **f,
            'id': f'cliopatria:{i}',
            'properties': {
                **f.get('properties', {}),
                'layerId': 'historical:cliopatria-boundary',
                'source': 'Cliopatria / Seshat Global History Databank (CC-BY-NC)',
                'validFrom': f.get('properties', {}).get('FromYear'),
                'validTo': f.get('properties', {}).get('ToYear'),
            },
        }
        for i, f in enumerate(uk_features)
    ],
}

for outpath in [OUT, OUT_PUBLIC]:
    os.makedirs(os.path.dirname(outpath), exist_ok=True)
    with open(outpath, 'w', encoding='utf-8') as f:
        json.dump(out, f, indent=2)

print(f'Saved {len(uk_features)} UK polities to {OUT}')
print('\nSample:')
for feat in uk_features[:12]:
    p = feat['properties']
    print(f"  {p['Name']:45s} {p['FromYear']:6d} -- {p['ToYear']:6d}")
