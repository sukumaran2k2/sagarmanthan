import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  MapPin, Maximize2, Minimize2, Layers, Navigation, Copy, 
  Check, ExternalLink, Globe, Compass, ZoomIn, ZoomOut,
  LocateFixed, Loader2, AlertCircle
} from 'lucide-react';

const REGION_COORDINATES = {
  'Tamil Nadu': [13.0827, 80.2707],
  'Maharashtra': [18.9220, 72.8347],
  'Gujarat': [22.2587, 71.1924],
  'Andhra Pradesh': [17.6868, 83.2185],
  'Kerala': [9.9312, 76.2673],
  'Karnataka': [12.9141, 74.8560],
  'Odisha': [20.2961, 85.8245],
  'West Bengal': [22.5726, 88.3639],
  'Goa': [15.2993, 74.1240],
  'Puducherry': [11.9416, 79.8083],
  'Andaman and Nicobar Islands': [11.6234, 92.7265],
  'Lakshadweep': [10.5667, 72.6417],
  'Daman and Diu': [20.4283, 72.8397],
  'Dadra and Nagar Haveli': [20.1809, 73.0169],
  'Delhi': [28.6139, 77.2090],
  'Uttar Pradesh': [26.8467, 80.9462],
  'Bihar': [25.5941, 85.1376],
  'Assam': [26.1445, 91.7362],
  'Madhya Pradesh': [23.2599, 77.4126],
  'Telangana': [17.3850, 78.4867],
  'Rajasthan': [26.9124, 75.7873],
  'Punjab': [31.1471, 75.3412],
  'Haryana': [29.0588, 76.0856],
  'Jharkhand': [23.6102, 85.2799],
  'Chhattisgarh': [21.2787, 81.8661],
  'Uttarakhand': [30.0668, 79.0193],
  'Himachal Pradesh': [31.1048, 77.1734],
  'Jammu and Kashmir': [33.7782, 76.5762],
  'Ladakh': [34.1526, 77.5771],
  'Tripura': [23.8315, 91.2868],
  'Meghalaya': [25.5788, 91.8933],
  'Manipur': [24.6637, 93.9063],
  'Nagaland': [25.6751, 94.1086],
  'Mizoram': [23.1645, 92.9376],
  'Arunachal Pradesh': [27.0844, 93.6053],
  'Sikkim': [27.5330, 88.5122],
  'Chandigarh': [30.7333, 76.7794],
  'Chennai': [13.0827, 80.2707],
  'Mumbai': [18.9220, 72.8347],
  'Navi Mumbai': [18.9500, 72.9500],
  'Kolkata': [22.5726, 88.3639],
  'Haldia': [22.0667, 88.0667],
  'Paradip': [20.3167, 86.6167],
  'Visakhapatnam': [17.6868, 83.2185],
  'Vizag': [17.6868, 83.2185],
  'Kakinada': [16.9891, 82.2475],
  'Kamarajar': [13.2611, 80.3278],
  'Ennore': [13.2611, 80.3278],
  'Thoothukudi': [8.7642, 78.1348],
  'Tuticorin': [8.7642, 78.1348],
  'Cochin': [9.9312, 76.2673],
  'Kochi': [9.9312, 76.2673],
  'Mangaluru': [12.9141, 74.8560],
  'Mangalore': [12.9141, 74.8560],
  'Mormugao': [15.4167, 73.8000],
  'Kandla': [23.0167, 70.2167],
  'Deendayal': [23.0167, 70.2167],
  'Mundra': [22.8333, 69.7000],
  'Pipavav': [20.9167, 71.5000],
  'Hazira': [21.1167, 72.6500],
  'Dahej': [21.7000, 72.5833],
  'Dhamra': [20.8000, 86.9667],
  'Gopalpur': [19.2667, 84.9000],
  'Port Blair': [11.6234, 92.7265],
  'Varanasi': [25.3176, 82.9739],
  'Sahibganj': [25.2425, 87.6433],
  'Patna': [25.5941, 85.1376],
  'Guwahati': [26.1445, 91.7362],
  'Dhubri': [26.0207, 89.9742],
  'Pandu': [26.1667, 91.6833],
};

const TILE_LAYERS = {
  osm: {
    name: 'Standard Map',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  },
  satellite: {
    name: 'Satellite View',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP',
    maxZoom: 18,
  },
};

function resolveCoordinates(stateName, districtName, explicitLat, explicitLng) {
  if (
    explicitLat !== undefined && 
    explicitLat !== null && 
    explicitLng !== undefined && 
    explicitLng !== null && 
    !isNaN(Number(explicitLat)) && 
    !isNaN(Number(explicitLng)) &&
    Number(explicitLat) !== 0 &&
    Number(explicitLng) !== 0
  ) {
    return [Number(explicitLat), Number(explicitLng)];
  }

  if (districtName) {
    const cleanDist = String(districtName).trim();
    for (const [key, coords] of Object.entries(REGION_COORDINATES)) {
      if (cleanDist.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(cleanDist.toLowerCase())) {
        return coords;
      }
    }
  }

  if (stateName) {
    const cleanState = String(stateName).trim();
    for (const [key, coords] of Object.entries(REGION_COORDINATES)) {
      if (cleanState.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(cleanState.toLowerCase())) {
        return coords;
      }
    }
  }

  return [20.5937, 78.9629];
}

export default function ProjectLocationMap({
  project = {},
  stateName = 'Tamil Nadu',
  districtName = 'Chennai',
  talukName = 'Purasawalkam',
  villageName = 'VOC Nagar',
  projectName = 'Project Location',
  stageName = 'Under Implementation',
  cost = null,
  height = '180px',
  className = '',
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const tileLayerRef = useRef(null);
  const markerRef = useRef(null);
  const userLocMarkerRef = useRef(null);
  
  const [activeLayer, setActiveLayer] = useState('osm');
  const [showLayerMenu, setShowLayerMenu] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const explicitLat = project?.latitude ?? project?.lat ?? project?.raw?.latitude;
  const explicitLng = project?.longitude ?? project?.lng ?? project?.raw?.longitude;
  const coordinates = resolveCoordinates(stateName, districtName, explicitLat, explicitLng);
  const createPulseIcon = useCallback(() => {
    return L.divIcon({
      className: 'sagarmanthan-leaflet-marker',
      html: `
        <div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;">
          <div style="
            position: absolute;
            width: 30px;
            height: 30px;
            border-radius: 50%;
            background: rgba(15, 65, 122, 0.4);
            animation: sagarmanthan-pulse 2s infinite ease-in-out;
          "></div>
          <div style="
            position: absolute;
            width: 26px;
            height: 26px;
            border-radius: 50%;
            background: linear-gradient(135deg, #0f417a 0%, #0284c7 100%);
            border: 2px solid #ffffff;
            box-shadow: 0 3px 8px rgba(0, 0, 0, 0.4);
            display: flex;
            align-items: center;
            justify-content: center;
            color: #ffffff;
          ">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="5" r="3"></circle>
              <line x1="12" y1="22" x2="12" y2="8"></line>
              <path d="M5 12H2a10 10 0 0 0 20 0h-3"></path>
            </svg>
          </div>
          <div style="
            position: absolute;
            bottom: -5px;
            left: 50%;
            transform: translateX(-50%);
            width: 0;
            height: 0;
            border-left: 4px solid transparent;
            border-right: 4px solid transparent;
            border-top: 5px solid #0f417a;
          "></div>
        </div>
      `,
      iconSize: [34, 40],
      iconAnchor: [17, 40],
      popupAnchor: [0, -40],
    });
  }, []);
  const createUserLocationIcon = useCallback(() => {
    return L.divIcon({
      className: 'sagarmanthan-user-marker',
      html: `
        <div style="position: relative; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;">
          <div style="
            position: absolute;
            width: 26px;
            height: 26px;
            border-radius: 50%;
            background: rgba(16, 185, 129, 0.4);
            animation: sagarmanthan-pulse 1.6s infinite ease-in-out;
          "></div>
          <div style="
            position: absolute;
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background: #10b981;
            border: 2.5px solid #ffffff;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
          "></div>
        </div>
      `,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
      popupAnchor: [0, -14],
    });
  }, []);
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: coordinates,
        zoom: 11,
        zoomControl: false,
        attributionControl: false,
      });

      const selectedTile = TILE_LAYERS[activeLayer] || TILE_LAYERS.osm;
      const tile = L.tileLayer(selectedTile.url, {
        attribution: selectedTile.attribution,
        maxZoom: selectedTile.maxZoom,
      }).addTo(map);

      tileLayerRef.current = tile;

      const icon = createPulseIcon();
      const marker = L.marker(coordinates, { icon }).addTo(map);

      const costText = cost ? `₹ ${Number(cost).toLocaleString('en-IN', { minimumFractionDigits: 2 })} Cr` : '';
      const popupHtml = `
        <div style="font-family: inherit; font-size: 11px; line-height: 1.4; min-width: 170px; max-width: 220px;">
          <div style="font-weight: 800; color: #0f417a; margin-bottom: 3px; border-bottom: 1px solid #e2e8f0; padding-bottom: 3px;">
            ${projectName || 'Project Location'}
          </div>
          <div style="color: #475569; font-size: 10px; margin-bottom: 2px;">
            <strong>State:</strong> ${stateName || '-'}<br/>
            <strong>District:</strong> ${districtName || '-'}<br/>
            <strong>Taluk:</strong> ${talukName || '-'}<br/>
            <strong>Village:</strong> ${villageName || '-'}
          </div>
          ${costText ? `<div style="color: #059669; font-weight: 700; font-size: 10.5px; margin-top: 3px;">Cost: ${costText}</div>` : ''}
          <div style="color: #64748b; font-size: 9px; margin-top: 3px; font-family: monospace;">
            ${coordinates[0].toFixed(4)}°N, ${coordinates[1].toFixed(4)}°E
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml);
      markerRef.current = marker;
      mapInstanceRef.current = map;
      setTimeout(() => {
        map.invalidateSize();
      }, 200);
    } else {
      const map = mapInstanceRef.current;
      map.flyTo(coordinates, 11, { duration: 1.0 });
      if (markerRef.current) {
        markerRef.current.setLatLng(coordinates);
      }
    }
  }, [coordinates, createPulseIcon, projectName, stateName, districtName, talukName, villageName, cost]);
  useEffect(() => {
    if (!mapContainerRef.current) return;
    const resizeObserver = new ResizeObserver(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    });
    resizeObserver.observe(mapContainerRef.current);
    return () => resizeObserver.disconnect();
  }, []);
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const selectedTile = TILE_LAYERS[activeLayer] || TILE_LAYERS.osm;
    const newTile = L.tileLayer(selectedTile.url, {
      attribution: selectedTile.attribution,
      maxZoom: selectedTile.maxZoom,
    }).addTo(map);

    tileLayerRef.current = newTile;
  }, [activeLayer]);

  const handleResetCenter = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo(coordinates, 11, { duration: 0.8 });
      markerRef.current?.openPopup();
    }
  };

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const { latitude, longitude } = pos.coords;
        const map = mapInstanceRef.current;
        if (!map) return;

        map.flyTo([latitude, longitude], 13, { duration: 1.2 });

        if (userLocMarkerRef.current) {
          userLocMarkerRef.current.setLatLng([latitude, longitude]);
        } else {
          const userIcon = createUserLocationIcon();
          const uMarker = L.marker([latitude, longitude], { icon: userIcon }).addTo(map);
          uMarker.bindPopup('<strong style="color: #059669;">📍 You Are Here</strong><br/><span style="font-size:10px; color:#64748b;">Current Live GPS Position</span>');
          userLocMarkerRef.current = uMarker;
        }
        userLocMarkerRef.current.openPopup();
      },
      (err) => {
        setIsLocating(false);
        console.warn('Geolocation error:', err);
        alert('Could not retrieve current location. Please ensure location permissions are enabled.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleCopyCoords = () => {
    const text = `${coordinates[0].toFixed(6)}, ${coordinates[1].toFixed(6)}`;
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${coordinates[0]},${coordinates[1]}`;
  const osmUrl = `https://www.openstreetmap.org/?mlat=${coordinates[0]}&mlon=${coordinates[1]}#map=13/${coordinates[0]}/${coordinates[1]}`;

  return (
    <>
      <style>{`
        @keyframes sagarmanthan-pulse {
          0% { transform: scale(0.85); opacity: 0.9; }
          50% { transform: scale(1.45); opacity: 0.2; }
          100% { transform: scale(0.85); opacity: 0.9; }
        }
        .sagarmanthan-leaflet-marker,
        .sagarmanthan-user-marker {
          background: transparent !important;
          border: none !important;
        }
        .sagarmanthan-inline-map-wrapper {
          position: relative !important;
          overflow: hidden !important;
          isolation: isolate !important;
          contain: paint !important;
          border-radius: 12px !important;
        }
        .sagarmanthan-inline-map-wrapper .leaflet-container {
          z-index: 1 !important;
          width: 100% !important;
          height: 100% !important;
          font-family: inherit !important;
          overflow: hidden !important;
        }
        .sagarmanthan-inline-map-wrapper .leaflet-pane {
          z-index: 2 !important;
        }
        .sagarmanthan-inline-map-wrapper .leaflet-top,
        .sagarmanthan-inline-map-wrapper .leaflet-bottom {
          z-index: 5 !important;
        }
        .leaflet-popup-content-wrapper {
          border-radius: 10px !important;
          box-shadow: 0 8px 20px -3px rgba(0, 0, 0, 0.3) !important;
          border: 1px solid #e2e8f0 !important;
          padding: 2px !important;
        }
        .dark .leaflet-popup-content-wrapper {
          background: #0f172a !important;
          border-color: #334155 !important;
          color: #f1f5f9 !important;
        }
        .dark .leaflet-popup-tip {
          background: #0f172a !important;
        }
      `}</style>

      <div 
        className={`sagarmanthan-inline-map-wrapper w-full border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 ${className}`}
        style={{ 
          height: height || '100%', 
          minHeight: typeof height === 'string' && height.endsWith('%') ? undefined : height, 
          maxHeight: typeof height === 'string' && height.endsWith('%') ? undefined : height 
        }}
      >
        
        {/* Inline Leaflet Map Canvas */}
        <div 
          ref={mapContainerRef} 
          className="w-full h-full"
          style={{ width: '100%', height: '100%' }}
        />

        {/* Top-Left Floating Coordinates Badge */}
        <div className="absolute top-2 left-2 z-10 flex items-center gap-1 pointer-events-auto select-none">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border border-slate-200/80 dark:border-slate-700/80 text-[10px] font-bold text-slate-700 dark:text-slate-200 shadow-xs">
            <Compass className="h-3 w-3 text-[#0f417a] dark:text-blue-400 shrink-0" />
            <span className="font-mono text-[9.5px]">
              {coordinates[0].toFixed(2)}°N, {coordinates[1].toFixed(2)}°E
            </span>
            <button
              type="button"
              onClick={handleCopyCoords}
              className="p-0.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
              title="Copy GPS coordinates"
            >
              {copied ? <Check className="h-2.5 w-2.5 text-emerald-500" /> : <Copy className="h-2.5 w-2.5" />}
            </button>
          </div>
        </div>

        {/* Top-Right Floating Actions */}
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1 pointer-events-auto select-none">
          
          {/* Layer Switcher Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowLayerMenu(!showLayerMenu)}
              className="p-1 bg-white/95 dark:bg-slate-900/95 hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg shadow-xs border border-slate-200/80 dark:border-slate-700/80 transition cursor-pointer flex items-center justify-center"
              title="Change Map Style"
            >
              <Layers className="h-3 w-3 text-[#0f417a] dark:text-blue-400" />
            </button>

            {showLayerMenu && (
              <div className="absolute right-0 top-7 w-32 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-1 z-20 space-y-0.5 text-[10.5px]">
                {Object.entries(TILE_LAYERS).map(([key, item]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setActiveLayer(key);
                      setShowLayerMenu(false);
                    }}
                    className={`w-full text-left px-2 py-1 rounded-lg font-semibold flex items-center justify-between transition cursor-pointer ${
                      activeLayer === key
                        ? 'bg-blue-50 dark:bg-blue-950/60 text-[#0f417a] dark:text-blue-400 font-bold'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span>{item.name}</span>
                    {activeLayer === key && <Check className="h-2.5 w-2.5 text-blue-600 dark:text-blue-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Current Location Button */}
          <button
            type="button"
            onClick={handleLocateMe}
            className="p-1 bg-white/95 dark:bg-slate-900/95 hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg shadow-xs border border-slate-200/80 dark:border-slate-700/80 transition cursor-pointer flex items-center justify-center"
            title="My Current Location"
          >
            {isLocating ? (
              <Loader2 className="h-3 w-3 animate-spin text-emerald-500" />
            ) : (
              <LocateFixed className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
            )}
          </button>

          {/* Recenter to Project */}
          <button
            type="button"
            onClick={handleResetCenter}
            className="p-1 bg-white/95 dark:bg-slate-900/95 hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg shadow-xs border border-slate-200/80 dark:border-slate-700/80 transition cursor-pointer flex items-center justify-center"
            title="Focus Project Location"
          >
            <Navigation className="h-3 w-3 text-[#0f417a] dark:text-blue-400" />
          </button>

          {/* Expand Fullscreen Button */}
          <button
            type="button"
            onClick={() => setIsFullscreen(true)}
            className="p-1 bg-white/95 dark:bg-slate-900/95 hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg shadow-xs border border-slate-200/80 dark:border-slate-700/80 transition cursor-pointer flex items-center justify-center"
            title="Expand Fullscreen Map"
          >
            <Maximize2 className="h-3 w-3 text-slate-600 dark:text-slate-300" />
          </button>
        </div>

        {/* Bottom External Links */}
        <div className="absolute bottom-1.5 left-2 z-10 flex items-center gap-1.5 pointer-events-auto select-none opacity-85 hover:opacity-100 transition">
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noreferrer"
            className="px-1.5 py-0.5 bg-white/90 dark:bg-slate-900/90 text-[9px] font-bold text-slate-600 dark:text-slate-300 rounded shadow-2xs border border-slate-200/80 dark:border-slate-700 flex items-center gap-1"
          >
            <span>Google Maps</span>
            <ExternalLink className="h-2 w-2" />
          </a>
          <a
            href={osmUrl}
            target="_blank"
            rel="noreferrer"
            className="px-1.5 py-0.5 bg-white/90 dark:bg-slate-900/90 text-[9px] font-bold text-slate-600 dark:text-slate-300 rounded shadow-2xs border border-slate-200/80 dark:border-slate-700 flex items-center gap-1"
          >
            <span>OSM</span>
            <ExternalLink className="h-2 w-2" />
          </a>
        </div>

      </div>

      {/* Pure Edge-to-Edge Fullscreen Map Mounted via Portal to document.body */}
      {isFullscreen && createPortal(
        <PureFullscreenMap
          onClose={() => setIsFullscreen(false)}
          coordinates={coordinates}
          projectName={projectName}
          stateName={stateName}
          districtName={districtName}
          talukName={talukName}
          villageName={villageName}
          cost={cost}
          activeLayer={activeLayer}
          onLayerChange={setActiveLayer}
          createPulseIcon={createPulseIcon}
          createUserLocationIcon={createUserLocationIcon}
        />,
        document.body
      )}
    </>
  );
}

function PureFullscreenMap({
  onClose,
  coordinates,
  projectName,
  stateName,
  districtName,
  talukName,
  villageName,
  cost,
  activeLayer,
  onLayerChange,
  createPulseIcon,
  createUserLocationIcon,
}) {
  const fullMapContainerRef = useRef(null);
  const fullMapInstanceRef = useRef(null);
  const fullTileLayerRef = useRef(null);
  const fullMarkerRef = useRef(null);
  const fullUserMarkerRef = useRef(null);
  
  const [copied, setCopied] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [geoError, setGeoError] = useState(null);

  useEffect(() => {
    if (!fullMapContainerRef.current) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const map = L.map(fullMapContainerRef.current, {
      center: coordinates,
      zoom: 13,
      zoomControl: false,
      attributionControl: true,
    });

    const selectedTile = TILE_LAYERS[activeLayer] || TILE_LAYERS.osm;
    const tile = L.tileLayer(selectedTile.url, {
      attribution: selectedTile.attribution,
      maxZoom: selectedTile.maxZoom,
    }).addTo(map);

    fullTileLayerRef.current = tile;

    const icon = createPulseIcon();
    const marker = L.marker(coordinates, { icon }).addTo(map);
    fullMarkerRef.current = marker;

    const costText = cost ? `₹ ${Number(cost).toLocaleString('en-IN', { minimumFractionDigits: 2 })} Cr` : '';
    const popupHtml = `
      <div style="font-family: inherit; font-size: 12px; line-height: 1.4; min-width: 200px;">
        <div style="font-weight: 800; color: #0f417a; margin-bottom: 4px; border-bottom: 1px solid #e2e8f0; padding-bottom: 3px;">
          ${projectName}
        </div>
        <div style="color: #475569; font-size: 11px; margin-bottom: 2px;">
          <strong>State:</strong> ${stateName || '-'}<br/>
          <strong>District:</strong> ${districtName || '-'}<br/>
          <strong>Taluk:</strong> ${talukName || '-'}<br/>
          <strong>Village:</strong> ${villageName || '-'}
        </div>
        ${costText ? `<div style="color: #059669; font-weight: 700; font-size: 11.5px; margin-top: 4px;">Cost: ${costText}</div>` : ''}
        <div style="color: #64748b; font-size: 10px; margin-top: 3px; font-family: monospace;">
          ${coordinates[0].toFixed(5)}°N, ${coordinates[1].toFixed(5)}°E
        </div>
      </div>
    `;

    marker.bindPopup(popupHtml).openPopup();
    fullMapInstanceRef.current = map;
    setTimeout(() => {
      map.invalidateSize();
    }, 100);

    return () => {
      document.body.style.overflow = originalOverflow;
      map.remove();
      fullMapInstanceRef.current = null;
    };
  }, [coordinates, createPulseIcon, projectName, stateName, districtName, talukName, villageName, cost]);
  useEffect(() => {
    if (!fullMapInstanceRef.current) return;
    const map = fullMapInstanceRef.current;

    if (fullTileLayerRef.current) {
      map.removeLayer(fullTileLayerRef.current);
    }

    const selectedTile = TILE_LAYERS[activeLayer] || TILE_LAYERS.osm;
    const newTile = L.tileLayer(selectedTile.url, {
      attribution: selectedTile.attribution,
      maxZoom: selectedTile.maxZoom,
    }).addTo(map);

    fullTileLayerRef.current = newTile;
  }, [activeLayer]);
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleZoomIn = () => fullMapInstanceRef.current?.zoomIn();
  const handleZoomOut = () => fullMapInstanceRef.current?.zoomOut();
  
  const handleRecenterProject = () => {
    fullMapInstanceRef.current?.flyTo(coordinates, 13, { duration: 0.8 });
    fullMarkerRef.current?.openPopup();
  };
  const handleLocateCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser.');
      setTimeout(() => setGeoError(null), 4000);
      return;
    }

    setIsLocating(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        const { latitude, longitude, accuracy } = position.coords;
        const map = fullMapInstanceRef.current;
        if (!map) return;

        map.flyTo([latitude, longitude], 15, { duration: 1.2 });

        if (fullUserMarkerRef.current) {
          fullUserMarkerRef.current.setLatLng([latitude, longitude]);
        } else {
          const userIcon = createUserLocationIcon();
          const uMarker = L.marker([latitude, longitude], { icon: userIcon }).addTo(map);
          const accText = accuracy ? `<span style="font-size: 9.5px; color: #64748b;">(Accuracy: ~${Math.round(accuracy)}m)</span>` : '';
          uMarker.bindPopup(`
            <div style="font-family: inherit; font-size: 11.5px;">
              <strong style="color: #059669; display: flex; align-items: center; gap: 4px;">
                📍 Your Current Location
              </strong>
              <div style="font-mono; font-size: 10px; color: #475569; margin-top: 3px;">
                ${latitude.toFixed(6)}°N, ${longitude.toFixed(6)}°E
              </div>
              ${accText}
            </div>
          `);
          fullUserMarkerRef.current = uMarker;
        }

        fullUserMarkerRef.current.openPopup();
      },
      (error) => {
        setIsLocating(false);
        let msg = 'Unable to fetch current location.';
        if (error.code === 1) msg = 'Location access was denied. Please allow location permissions in your browser.';
        else if (error.code === 2) msg = 'Location position unavailable. Please check GPS signal.';
        else if (error.code === 3) msg = 'Location request timed out.';
        setGeoError(msg);
        setTimeout(() => setGeoError(null), 4500);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleCopyCoords = () => {
    const text = `${coordinates[0].toFixed(6)}, ${coordinates[1].toFixed(6)}`;
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 999999,
        margin: 0,
        padding: 0,
        overflow: 'hidden',
        backgroundColor: '#020617',
      }}
      className="select-none animate-fade-in"
    >
      {/* 100% Edge-to-Edge Pure Map DOM */}
      <div 
        ref={fullMapContainerRef} 
        style={{ width: '100vw', height: '100vh', position: 'absolute', top: 0, left: 0 }}
      />

      {/* Floating Info Pill (Top-Left) */}
      <div style={{ position: 'absolute', top: '16px', left: '16px', zIndex: 1000000 }}>
        <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-900 text-white backdrop-blur-md border border-white/20 shadow-2xl text-xs font-bold">
          <MapPin className="h-4 w-4 text-cyan-400 shrink-0" />
          <span className="truncate max-w-[220px] sm:max-w-md">{projectName}</span>
          <span className="text-white/30">&bull;</span>
          <span className="font-mono text-cyan-300 text-[11px]">{coordinates[0].toFixed(4)}°N, {coordinates[1].toFixed(4)}°E</span>
          <button
            type="button"
            onClick={handleCopyCoords}
            className="p-1 hover:bg-white/20 rounded text-white/70 hover:text-white transition cursor-pointer"
            title="Copy coordinates"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* Floating Action Controls (Top-Right) */}
      <div style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 1000000 }} className="flex items-center gap-2">
        
        {/* Layer Switcher */}
        <div className="flex items-center bg-slate-900/90 backdrop-blur-md rounded-xl p-1 border border-white/20 shadow-2xl text-xs">
          {Object.entries(TILE_LAYERS).map(([key, item]) => (
            <button
              key={key}
              type="button"
              onClick={() => onLayerChange(key)}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs transition cursor-pointer flex items-center gap-1.5 ${
                activeLayer === key 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              {key === 'satellite' ? <Globe className="h-3.5 w-3.5" /> : <Layers className="h-3.5 w-3.5" />}
              <span>{item.name}</span>
            </button>
          ))}
        </div>

        {/* Current Location Button (GPS) */}
        <button
          type="button"
          onClick={handleLocateCurrentLocation}
          className={`p-2.5 rounded-xl backdrop-blur-md border shadow-2xl transition cursor-pointer flex items-center gap-1.5 font-bold text-xs ${
            isLocating 
              ? 'bg-emerald-600 text-white border-emerald-400' 
              : 'bg-slate-900/90 hover:bg-slate-900 text-emerald-400 border-white/20'
          }`}
          title="Locate My Current Position"
        >
          {isLocating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-white" />
              <span className="hidden md:inline">Locating...</span>
            </>
          ) : (
            <>
              <LocateFixed className="h-4 w-4 text-emerald-400" />
              <span className="hidden md:inline text-white">Current Location</span>
            </>
          )}
        </button>

        {/* Recenter to Project Location */}
        <button
          type="button"
          onClick={handleRecenterProject}
          className="p-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-900 text-white backdrop-blur-md border border-white/20 shadow-2xl transition cursor-pointer flex items-center justify-center"
          title="Recenter to Project Location"
        >
          <Navigation className="h-4 w-4 text-cyan-400" />
        </button>

        {/* Zoom In/Out */}
        <div className="flex bg-slate-900/90 backdrop-blur-md rounded-xl border border-white/20 shadow-2xl overflow-hidden">
          <button
            type="button"
            onClick={handleZoomIn}
            className="p-2.5 hover:bg-white/15 text-white transition cursor-pointer flex items-center justify-center border-r border-white/15"
            title="Zoom In"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="p-2.5 hover:bg-white/15 text-white transition cursor-pointer flex items-center justify-center"
            title="Zoom Out"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
        </div>

        {/* Exit Fullscreen Button */}
        <button
          type="button"
          onClick={onClose}
          className="px-3.5 py-2.5 rounded-xl bg-rose-600/90 hover:bg-rose-600 text-white font-bold text-xs backdrop-blur-md shadow-2xl transition cursor-pointer flex items-center gap-1.5 border border-rose-400/40"
          title="Exit Fullscreen (Esc)"
        >
          <Minimize2 className="h-4 w-4" />
          <span className="hidden sm:inline">Exit Fullscreen</span>
        </button>
      </div>

      {/* Floating Notification / Error Toast */}
      {geoError && (
        <div style={{ position: 'absolute', bottom: '24px', left: '50%', transform: 'translateX(-50%)', zIndex: 1000000 }}>
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-900/95 text-white text-xs font-semibold backdrop-blur-md border border-rose-500/50 shadow-2xl animate-fade-in">
            <AlertCircle className="h-4 w-4 text-rose-300 shrink-0" />
            <span>{geoError}</span>
          </div>
        </div>
      )}

    </div>
  );
}
