'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { BoardGroup, BoardItem } from '@/services/board-groups';

// ── Cache ─────────────────────────────────────────────────────────────────────
const CACHE_KEY = 'zeon_geocode_v3';
function loadCache(): Record<string, [number, number] | null> {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}'); } catch { return {}; }
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function saveCache(c: any) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(c)); } catch { /* noop */ }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function parseCoords(s: string): [number, number] | null {
  const m = s.match(/^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/);
  return m ? [parseFloat(m[1]), parseFloat(m[2])] : null;
}

function hasPlusCode(s: string): boolean {
  return /[23456789CFGHJMPQRVWX]{2,8}\+[23456789CFGHJMPQRVWX]*/i.test(s);
}

async function nominatim(query: string): Promise<[number, number] | null> {
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
      { headers: { 'Accept-Language': 'en' } }
    );
    const d = await r.json();
    if (d[0]) return [parseFloat(d[0].lat), parseFloat(d[0].lon)];
    return null;
  } catch { return null; }
}

function decodePlusCode(location: string, refLat: number, refLng: number): [number, number] | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const olcMod = require('open-location-code');
    // Support both module patterns
    const olc = olcMod.OpenLocationCode ? new olcMod.OpenLocationCode() : olcMod;

    const token = location.split(/\s+/).find((t: string) => t.includes('+'));
    if (!token) return null;

    let fullCode = token;
    const isShort = token.split('+')[0].length < 8;
    if (isShort) {
      fullCode = olc.recoverNearest
        ? olc.recoverNearest(token, refLat, refLng)
        : olcMod.recoverNearest(token, refLat, refLng);
    }

    const isValid = olc.isValid ? olc.isValid(fullCode) : olcMod.isValid(fullCode);
    if (!isValid) return null;

    const area = olc.decode ? olc.decode(fullCode) : olcMod.decode(fullCode);
    const lat = area.latitudeCenter;
    const lng = area.longitudeCenter;
    // Must be within India
    if (lat < 6 || lat > 37 || lng < 68 || lng > 98) return null;
    return [lat, lng];
  } catch { return null; }
}

// ── Resolve a single item to coordinates ─────────────────────────────────────
// Strategy:
//   1. Direct "lat,lng" → parse immediately
//   2. Plus Code → decode using city coordinates as reference (accurate on-land)
//   3. Plain address → Nominatim search
async function resolveItem(
  item: BoardItem,
  cityCache: Record<string, [number, number] | null>,
  itemCache: Record<string, [number, number] | null>,
): Promise<[number, number] | null> {
  const cacheKey = item.id;
  if (itemCache[cacheKey] !== undefined) return itemCache[cacheKey];

  const location = item.location?.trim() ?? '';

  // 1. Raw coordinates
  if (location) {
    const coords = parseCoords(location);
    if (coords) { itemCache[cacheKey] = coords; return coords; }
  }

  // 2. Plus Code — resolve city first to get a precise reference point
  if (location && hasPlusCode(location)) {
    const cityQuery = [item.city, item.state].filter(Boolean).join(', ') || 'Kerala, India';
    if (!cityCache[cityQuery]) {
      await new Promise(r => setTimeout(r, 300)); // Nominatim rate limit
      cityCache[cityQuery] = await nominatim(cityQuery);
    }
    const cityCoords = cityCache[cityQuery];
    if (cityCoords) {
      const decoded = decodePlusCode(location, cityCoords[0], cityCoords[1]);
      if (decoded) { itemCache[cacheKey] = decoded; return decoded; }
    }
    // Plus Code decode failed → fall back to city coords
    if (cityCoords) { itemCache[cacheKey] = cityCoords; return cityCoords; }
  }

  // 3. No location — geocode by city + state
  const cityQuery = [item.city, item.state].filter(Boolean).join(', ');
  if (cityQuery) {
    if (!cityCache[cityQuery]) {
      await new Promise(r => setTimeout(r, 300));
      cityCache[cityQuery] = await nominatim(cityQuery);
    }
    if (cityCache[cityQuery]) { itemCache[cacheKey] = cityCache[cityQuery]; return cityCache[cityQuery]; }
  }

  itemCache[cacheKey] = null;
  return null;
}

// ── Status colors ─────────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  'Commissioned': '#00C875',
  'Proposed':     '#FDAB3D',
  'Identified':   '#0073EA',
  'In Progress':  '#A25DDC',
  'Rejected':     '#E2445C',
};
function statusColor(s?: string | null) {
  return s ? (STATUS_COLORS[s] ?? '#0073EA') : '#676879';
}

interface PlottedItem { item: BoardItem; lat: number; lng: number; }

// ── MapView ───────────────────────────────────────────────────────────────────
export default function MapView({ groups }: { groups: BoardGroup[] }) {
  const mapRef      = useRef<HTMLDivElement>(null);
  const leafletMap  = useRef<import('leaflet').Map | null>(null);
  const [plotted,   setPlotted]   = useState<PlottedItem[]>([]);
  const [geocoding, setGeocoding] = useState(true);
  const [progress,  setProgress]  = useState(0);
  const [total,     setTotal]     = useState(0);
  const [selected,  setSelected]  = useState<BoardItem | null>(null);

  const allItems = groups.flatMap(g => g.items);

  // ── Geocode ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const stored = loadCache() as unknown as { cities?: Record<string, [number, number] | null>; items?: Record<string, [number, number] | null> };
    const cityCache: Record<string, [number, number] | null> = stored.cities ?? {};
    const itemCache: Record<string, [number, number] | null> = stored.items ?? {};
    const items = groups.flatMap(g => g.items);
    setTotal(items.length);
    setProgress(0);
    setGeocoding(true);

    (async () => {
      const results: PlottedItem[] = [];
      let done = 0;
      for (const item of items) {
        if (cancelled) break;
        const coords = await resolveItem(item, cityCache, itemCache);
        done++;
        if (!cancelled) setProgress(done);
        if (coords) results.push({ item, lat: coords[0], lng: coords[1] });
      }
      saveCache({ cities: cityCache as unknown as Record<string, [number, number] | null>, items: itemCache });
      if (!cancelled) { setPlotted(results); setGeocoding(false); }
    })();

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups]);

  // ── Build Leaflet map ───────────────────────────────────────────────────────
  useEffect(() => {
    if (geocoding || !mapRef.current || plotted.length === 0) return;
    if (leafletMap.current) { leafletMap.current.remove(); leafletMap.current = null; }

    import('leaflet').then(L => {
      if (!mapRef.current) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const map = L.map(mapRef.current, { zoomControl: true });
      leafletMap.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      const bounds: [number, number][] = [];

      plotted.forEach(({ item, lat, lng }) => {
        const color = statusColor(item.status);
        const icon = L.divIcon({
          className: '',
          html: `<div style="width:12px;height:12px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.4);cursor:pointer"></div>`,
          iconSize: [12, 12], iconAnchor: [6, 6],
        });
        const marker = L.marker([lat, lng], { icon }).addTo(map);
        bounds.push([lat, lng]);
        marker.on('click', () => setSelected(item));
        marker.bindTooltip(`<b>${item.name}</b><br/>${item.city ?? ''}${item.status ? ' · ' + item.status : ''}`, {
          direction: 'top', offset: [0, -8],
        });
      });

      if (bounds.length) map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
    });

    return () => { if (leafletMap.current) { leafletMap.current.remove(); leafletMap.current = null; } };
  }, [geocoding, plotted]);

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />

      {/* Loading */}
      {geocoding && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 100, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.93)', fontFamily: 'Roboto, sans-serif', gap: 14 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#323338' }}>Plotting locations…</div>
          <div style={{ width: 260, height: 6, background: '#E6E9EF', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ height: '100%', background: '#0073EA', borderRadius: 99, width: total ? `${(progress / total) * 100}%` : '0%', transition: 'width 0.2s' }} />
          </div>
          <div style={{ fontSize: 13, color: '#676879' }}>{progress} / {total} items</div>
        </div>
      )}

      {/* Map canvas */}
      <div ref={mapRef} style={{ flex: 1, height: '100%' }} />

      {/* Legend */}
      {!geocoding && (
        <div style={{ position: 'absolute', bottom: 24, left: 24, zIndex: 500, background: '#fff', borderRadius: 8, padding: '10px 14px', boxShadow: '0 2px 12px rgba(0,0,0,0.15)', fontFamily: 'Roboto, sans-serif', fontSize: 12 }}>
          <div style={{ fontWeight: 600, color: '#323338', marginBottom: 6 }}>{plotted.length} of {allItems.length} plotted</div>
          {Object.entries(STATUS_COLORS).map(([label, color]) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, border: '1px solid #fff', boxShadow: '0 0 0 1px rgba(0,0,0,0.15)' }} />
              <span style={{ color: '#676879' }}>{label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Detail panel */}
      {selected && (
        <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 500, width: 300, background: '#fff', borderRadius: 10, boxShadow: '0 4px 24px rgba(0,0,0,0.18)', fontFamily: 'Roboto, sans-serif', overflow: 'hidden' }}>
          <div style={{ padding: '12px 14px', borderBottom: '3px solid ' + statusColor(selected.status), display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#323338' }}>{selected.name}</div>
              {selected.propertyType && <div style={{ fontSize: 11, color: '#676879', marginTop: 2 }}>{selected.propertyType}</div>}
            </div>
            <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 16, color: '#676879' }}>✕</button>
          </div>
          <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {([
              ['Status',     selected.status],
              ['Priority',   selected.priority],
              ['City',       selected.city],
              ['State',      selected.state],
              ['Investment', selected.investment],
              ['Owner',      selected.owner],
              ['Phone',      selected.phone],
              ['Parking',    selected.availableParking],
              ['Rating',     selected.googleRating != null ? `${selected.googleRating} ★` : null],
              ['Notes',      selected.notes],
            ] as [string, string | null | undefined][]).filter(([, v]) => v).map(([label, value]) => (
              <div key={label} style={{ display: 'flex', gap: 8, fontSize: 12 }}>
                <span style={{ color: '#676879', width: 70, flexShrink: 0 }}>{label}</span>
                <span style={{ color: '#323338', fontWeight: 500, flex: 1 }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
