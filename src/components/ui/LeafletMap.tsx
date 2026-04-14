import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Circle, CircleMarker, Polyline, useMap, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { SafetyZone } from '../../services/indiaSafetyData';
import type { SafetyPoi } from '../../types';

// Fix for default Leaflet icons
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
const DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

interface Props {
    height?: string | number;
    zones?: SafetyZone[];
    route?: [number, number][]; // Default single polyline
    multiRoutes?: { positions: [number, number][]; color: string; }[]; // Multiple colored polylines
    center?: [number, number];
    zoom?: number;
    liveLocation?: [number, number] | null; // For precise live tracking marker
    poiMarkers?: SafetyPoi[];
    helpRoute?: [number, number][];
}

// Utility to auto-center the map when routes change
const MapCenterer = ({ center, route, multiRoutes }: { center?: [number, number], route?: [number, number][], multiRoutes?: { positions: [number, number][]; color: string }[] }) => {
    const map = useMap();
    useEffect(() => {
        if (multiRoutes && multiRoutes.length > 0) {
            // Combine ALL route positions into a single bounds so all 3 routes are visible
            const allPositions: [number, number][] = multiRoutes.flatMap(mr => mr.positions);
            if (allPositions.length > 0) {
                map.fitBounds(L.latLngBounds(allPositions), { padding: [60, 60], maxZoom: 14 });
                return;
            }
        }
        if (route && route.length > 0) {
            map.fitBounds(L.latLngBounds(route), { padding: [60, 60], maxZoom: 14 });
        } else if (center) {
            map.setView(center, map.getZoom());
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [JSON.stringify(multiRoutes?.map(m => m.positions[0])), route, center]);
    return null;
};

const getPoiIcon = (type: SafetyPoi['type']) => {
    const map: Record<SafetyPoi['type'], { label: string; color: string }> = {
        hospital: { label: 'H', color: '#dc2626' },
        police: { label: 'P', color: '#1d4ed8' },
        pharmacy: { label: 'Rx', color: '#16a34a' },
    };
    const meta = map[type];
    return L.divIcon({
        className: 'safety-poi-icon',
        html: `<div style="width:30px;height:30px;border-radius:50%;background:${meta.color};border:2px solid #fff;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:#fff;box-shadow:0 3px 8px rgba(0,0,0,.28)">${meta.label}</div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
    });
};

const LeafletMap: React.FC<Props> = ({ height = 400, zones = [], route = [], multiRoutes = [], center = [20.5937, 78.9629], zoom = 5, liveLocation = null, poiMarkers = [], helpRoute = [] }) => {
    return (
        <div style={{ height: typeof height === 'number' ? `${height}px` : height, width: '100%', borderRadius: '12px', overflow: 'hidden', zIndex: 1, position: 'relative' }}>
            <MapContainer center={center} zoom={zoom} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                
                {/* Auto Center Map — fits to all routes if present */}
                <MapCenterer center={center} route={route} multiRoutes={multiRoutes} />

                {/* Render Danger/Safe Zones */}
                {zones.map((zone) => (
                    <Circle
                        key={zone.id}
                        center={[zone.lat, zone.lng]}
                        radius={zone.radius}
                        pathOptions={{
                            color: zone.level === 'danger' ? '#ef4444' : zone.level === 'safe' ? '#22c55e' : '#f59e0b',
                            fillColor: zone.level === 'danger' ? '#ef4444' : zone.level === 'safe' ? '#22c55e' : '#f59e0b',
                            fillOpacity: 0.35,
                            weight: 0
                        }}
                    >
                    </Circle>
                ))}

                {/* Render Safe Route Polyline */}
                {route.length > 0 && multiRoutes.length === 0 && (
                    <Polyline 
                        positions={route}
                        pathOptions={{ color: '#4f46e5', weight: 5, opacity: 0.8 }} 
                    />
                )}

                {/* Render Multiple Distinct Safety Routes */}
                {multiRoutes.map((mr, i) => (
                    mr.positions.length > 0 && (
                        <Polyline 
                            key={i}
                            positions={mr.positions}
                            pathOptions={{ color: mr.color, weight: 6, opacity: 0.85 }} 
                        />
                    )
                ))}

                {helpRoute.length > 0 && (
                    <Polyline
                        positions={helpRoute}
                        pathOptions={{ color: '#3b82f6', weight: 5, opacity: 0.95, dashArray: '8 8' }}
                    />
                )}

                {/* Live Precise GPS Marker */}
                {liveLocation && (
                    <>
                        <CircleMarker
                            center={liveLocation}
                            radius={8}
                            pathOptions={{ fillColor: '#3b82f6', fillOpacity: 1, color: '#ffffff', weight: 3 }}
                        />
                        <Circle
                            center={liveLocation}
                            radius={150} // 150 meters accuracy ring
                            pathOptions={{ fillColor: '#3b82f6', fillOpacity: 0.15, color: '#3b82f6', weight: 1, opacity: 0.5 }}
                        />
                    </>
                )}

                {/* Safety POI Markers */}
                {poiMarkers
                    .filter((poi) => Number.isFinite(poi.lat) && Number.isFinite(poi.lng))
                    .map((poi) => (
                    <Marker key={poi.id} position={[poi.lat, poi.lng]} icon={getPoiIcon(poi.type)}>
                        <Popup>
                            <div style={{ minWidth: 160 }}>
                                <div style={{ fontWeight: 700 }}>{poi.name}</div>
                                <div style={{ fontSize: 12, color: '#475569', textTransform: 'capitalize' }}>{poi.type}</div>
                                {typeof poi.distanceKm === 'number' && (
                                    <div style={{ fontSize: 12, marginTop: 4 }}>~{poi.distanceKm.toFixed(2)} km away</div>
                                )}
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    );
};

export default LeafletMap;
