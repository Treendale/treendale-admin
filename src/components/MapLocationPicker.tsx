import { useEffect, useRef, useState } from 'react';
import { Search, ExternalLink, Loader2, MapPin, Check } from 'lucide-react';

declare const window: any;

interface MapLocationPickerProps {
  latitude?: number;
  longitude?: number;
  address?: string;
  onChange: (coords: { latitude: number; longitude: number; address?: string }) => void;
  onApplyAddress?: (address: string) => void;
}

export default function MapLocationPicker({
  latitude = -33.2847,
  longitude = 115.7196,
  address = '',
  onChange,
  onApplyAddress,
}: MapLocationPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);

  const [mapMode, setMapMode] = useState<'roadmap' | 'satellite'>('roadmap');
  const [searchQuery, setSearchQuery] = useState(address || '');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [detectedAddress, setDetectedAddress] = useState<string>('');
  const [geocodingAddress, setGeocodingAddress] = useState(false);
  const [appliedNotice, setAppliedNotice] = useState(false);

  const curLat = latitude ?? -33.2847;
  const curLng = longitude ?? 115.7196;

  // Google Maps Tile URLs (No API Key Required)
  const getGoogleTileUrl = (mode: 'roadmap' | 'satellite') => {
    // lyrs=m : Roadmap (Standard Google Maps)
    // lyrs=y : Hybrid (Satellite + Road Names & Labels)
    return mode === 'satellite'
      ? 'https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}'
      : 'https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}';
  };

  // Reverse geocode to find real street address from coordinates
  async function fetchAddressFromCoords(lat: number, lng: number) {
    setGeocodingAddress(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await res.json();
      if (data && data.display_name) {
        // Clean display name to a readable street address
        const parts = data.display_name.split(', ');
        // Take first 4 parts or up to country
        const shortAddr = parts.slice(0, Math.min(parts.length, 4)).join(', ');
        setDetectedAddress(shortAddr || data.display_name);
      }
    } catch {
      // Ignore network errors for reverse geocoding
    } finally {
      setGeocodingAddress(false);
    }
  }

  // Switch Google Maps Layer (Roadmap vs Satellite)
  function handleModeChange(newMode: 'roadmap' | 'satellite') {
    setMapMode(newMode);
    const L = window.L;
    const map = mapInstanceRef.current;
    if (L && map && tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
      const newLayer = L.tileLayer(getGoogleTileUrl(newMode), {
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        attribution: '© Google Maps',
      });
      newLayer.addTo(map);
      tileLayerRef.current = newLayer;
    }
  }

  // Initialize or re-center Google Map
  useEffect(() => {
    let checkInterval: any = null;

    function initMap() {
      const L = window.L;
      if (!L || !mapContainerRef.current) return false;

      // Authentic Google Maps Red Pin SVG Icon
      const pinIcon = L.divIcon({
        className: 'google-map-pin',
        html: `
          <div style="
            position: relative;
            transform: translate(-50%, -100%);
            display: flex;
            flex-direction: column;
            align-items: center;
            filter: drop-shadow(0 4px 8px rgba(0,0,0,0.45));
            cursor: grab;
          ">
            <div style="
              background: #EA4335;
              color: white;
              width: 36px;
              height: 36px;
              border-radius: 50% 50% 50% 0;
              transform: rotate(-45deg);
              display: flex;
              align-items: center;
              justify-content: center;
              border: 2px solid #FFFFFF;
            ">
              <div style="
                width: 12px;
                height: 12px;
                background: #FFFFFF;
                border-radius: 50%;
                transform: rotate(45deg);
              "></div>
            </div>
            <div style="
              width: 8px;
              height: 4px;
              background: rgba(0,0,0,0.35);
              border-radius: 50%;
              margin-top: 1px;
            "></div>
          </div>
        `,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });

      if (!mapInstanceRef.current) {
        // Create Leaflet map powered by Google Maps Roadmap tiles
        const map = L.map(mapContainerRef.current, {
          center: [curLat, curLng],
          zoom: 17,
          scrollWheelZoom: true,
        });

        const googleTiles = L.tileLayer(getGoogleTileUrl('roadmap'), {
          maxZoom: 20,
          subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
          attribution: '© Google Maps',
        }).addTo(map);

        tileLayerRef.current = googleTiles;

        const marker = L.marker([curLat, curLng], {
          icon: pinIcon,
          draggable: true,
        }).addTo(map);

        marker.on('dragend', () => {
          const pos = marker.getLatLng();
          const lat = Number(pos.lat.toFixed(6));
          const lng = Number(pos.lng.toFixed(6));
          onChange({ latitude: lat, longitude: lng });
          fetchAddressFromCoords(lat, lng);
        });

        map.on('click', (e: any) => {
          marker.setLatLng(e.latlng);
          const lat = Number(e.latlng.lat.toFixed(6));
          const lng = Number(e.latlng.lng.toFixed(6));
          onChange({ latitude: lat, longitude: lng });
          fetchAddressFromCoords(lat, lng);
        });

        mapInstanceRef.current = map;
        markerRef.current = marker;

        // Initial reverse geocode if no address yet
        fetchAddressFromCoords(curLat, curLng);
      } else {
        // Update marker position if changed externally
        const marker = markerRef.current;
        const map = mapInstanceRef.current;
        if (marker && map) {
          const currentPos = marker.getLatLng();
          if (Math.abs(currentPos.lat - curLat) > 0.0001 || Math.abs(currentPos.lng - curLng) > 0.0001) {
            marker.setLatLng([curLat, curLng]);
            map.panTo([curLat, curLng]);
          }
        }
      }

      return true;
    }

    if (!initMap()) {
      checkInterval = setInterval(() => {
        if (initMap()) clearInterval(checkInterval);
      }, 150);
    }

    return () => {
      if (checkInterval) clearInterval(checkInterval);
    };
  }, [curLat, curLng]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Search Address on Map
  async function handleSearch(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    setSearchError('');

    try {
      let q = searchQuery.trim();
      if (!/australia|wa|\b6\d{3}\b/i.test(q)) {
        q += ', WA, Australia';
      }

      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await res.json();

      if (data && data.length > 0) {
        const newLat = parseFloat(data[0].lat);
        const newLng = parseFloat(data[0].lon);

        if (mapInstanceRef.current && markerRef.current) {
          mapInstanceRef.current.flyTo([newLat, newLng], 17);
          markerRef.current.setLatLng([newLat, newLng]);
        }

        const formattedLat = Number(newLat.toFixed(6));
        const formattedLng = Number(newLng.toFixed(6));
        const detected = data[0].display_name ? data[0].display_name.split(', ').slice(0, 4).join(', ') : '';

        onChange({
          latitude: formattedLat,
          longitude: formattedLng,
          address: detected || searchQuery,
        });

        if (detected) setDetectedAddress(detected);
      } else {
        setSearchError('Address not found. Try adding suburb (e.g. Australind) or postal code 6233.');
      }
    } catch {
      setSearchError('Search failed. You can also drag the pin directly on the Google Map.');
    } finally {
      setSearching(false);
    }
  }

  function applyDetectedAddress() {
    if (detectedAddress && onApplyAddress) {
      onApplyAddress(detectedAddress);
      setAppliedNotice(true);
      setTimeout(() => setAppliedNotice(false), 2500);
    }
  }

  return (
    <div className="space-y-3">
      {/* Search & Mode Bar */}
      <form onSubmit={handleSearch} className="flex gap-2 items-center flex-wrap">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-cocoa/40 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            className="input text-xs pl-9 pr-2 py-2"
            placeholder="Search address or landmark on Google Maps..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button
          type="submit"
          disabled={searching || !searchQuery.trim()}
          className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5"
        >
          {searching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
          Find on Map
        </button>
      </form>

      {searchError && (
        <p className="text-xs text-red-500 font-medium">{searchError}</p>
      )}

      {/* Interactive Google Map Box */}
      <div className="rounded-xl overflow-hidden border-2 border-admin-border shadow-sm relative">
        <div
          ref={mapContainerRef}
          style={{ height: '340px', width: '100%', zIndex: 1 }}
          className="bg-admin-bg cursor-crosshair"
        />

        {/* Top-Right: Google Maps Layer Switcher */}
        <div className="absolute top-2.5 right-2.5 z-10 flex bg-white/95 backdrop-blur-md rounded-lg border border-admin-border shadow-sm overflow-hidden text-xs font-medium">
          <button
            type="button"
            onClick={() => handleModeChange('roadmap')}
            className={`px-3 py-1.5 flex items-center gap-1 transition-colors ${
              mapMode === 'roadmap' ? 'bg-[#EA4335] text-white font-bold' : 'text-cocoa hover:bg-gray-100'
            }`}
          >
            🗺️ Google Map
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('satellite')}
            className={`px-3 py-1.5 flex items-center gap-1 transition-colors ${
              mapMode === 'satellite' ? 'bg-[#EA4335] text-white font-bold' : 'text-cocoa hover:bg-gray-100'
            }`}
          >
            🛰️ Satellite
          </button>
        </div>

        {/* Top-Left: Instructions */}
        <div className="absolute top-2.5 left-2.5 z-10 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-lg border border-admin-border/80 shadow-sm flex items-center gap-1.5 text-xs text-cocoa font-medium pointer-events-none">
          <MapPin className="w-3.5 h-3.5 text-[#EA4335] flex-shrink-0" />
          <span>Click anywhere or drag Google pin to set exact spot</span>
        </div>

        {/* Bottom-Left: Coordinates */}
        <div className="absolute bottom-2.5 left-2.5 z-10 bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-md border border-admin-border/80 shadow-sm text-[11px] text-cocoa/80 font-mono pointer-events-none">
          📍 {curLat.toFixed(5)}, {curLng.toFixed(5)}
        </div>
      </div>

      {/* Detected Address Bar with 1-Click Sync */}
      {detectedAddress && (
        <div className="bg-admin-bg border border-admin-border rounded-xl p-3 flex items-center justify-between gap-3 text-xs flex-wrap">
          <div className="min-w-0 flex-1">
            <span className="text-cocoa/50 font-medium flex items-center gap-1.5 text-[11px]">
              Pinpoint Address Detected:
              {geocodingAddress && <Loader2 className="w-3 h-3 animate-spin text-brand-500" />}
            </span>
            <p className="font-semibold text-cocoa truncate">{detectedAddress}</p>
          </div>
          {onApplyAddress && (
            <button
              type="button"
              onClick={applyDetectedAddress}
              className="px-3 py-1.5 rounded-lg bg-white border border-admin-border hover:bg-brand-50 hover:text-brand-600 font-semibold text-cocoa transition-all flex items-center gap-1 flex-shrink-0 active:scale-95"
            >
              {appliedNotice ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700 font-bold">Applied to Address!</span>
                </>
              ) : (
                <>
                  <MapPin className="w-3.5 h-3.5 text-brand-600" />
                  <span>Sync to Street Address</span>
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* Verification Links */}
      <div className="flex items-center justify-between text-xs pt-0.5 flex-wrap gap-2">
        <span className="text-cocoa/50">
          This exact pin will be used in customer confirmations and navigation.
        </span>
        <div className="flex items-center gap-3">
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${curLat},${curLng}`}
            target="_blank"
            rel="noreferrer"
            className="text-brand-600 hover:text-brand-500 font-semibold inline-flex items-center gap-1 transition-colors"
          >
            Preview in Google Maps <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <span className="text-cocoa/20">|</span>
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${curLat},${curLng}&travelmode=driving`}
            target="_blank"
            rel="noreferrer"
            className="text-brand-600 hover:text-brand-500 font-semibold inline-flex items-center gap-1 transition-colors"
          >
            Test Driving Directions <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}
