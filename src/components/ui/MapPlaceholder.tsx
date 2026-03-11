import React from 'react';

interface Props { height?: string | number; label?: string; children?: React.ReactNode; }

const MapBox: React.FC<Props> = ({ height = 360, label = 'Map View', children }) => (
    <div className="map-box" style={{ height: typeof height === 'number' ? `${height}px` : height }}>
        <div className="map-grid" />

        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.12 }} viewBox="0 0 700 380" preserveAspectRatio="none">
            <line x1="0" y1="190" x2="700" y2="190" stroke="#6366f1" strokeWidth="1.5" strokeDasharray="8 5" />
            <line x1="350" y1="0" x2="350" y2="380" stroke="#6366f1" strokeWidth="1.5" strokeDasharray="8 5" />
            <line x1="0" y1="90" x2="700" y2="290" stroke="#6366f1" strokeWidth="1" strokeDasharray="6 6" opacity="0.6" />
            <line x1="0" y1="310" x2="700" y2="110" stroke="#6366f1" strokeWidth="1" strokeDasharray="6 6" opacity="0.6" />
            <circle cx="350" cy="190" r="5" fill="#6366f1" opacity="0.8" />
            <circle cx="350" cy="190" r="14" fill="none" stroke="#6366f1" strokeWidth="1" opacity="0.3" />
            <circle cx="170" cy="130" r="4" fill="#22c55e" opacity="0.8" />
            <circle cx="540" cy="265" r="4" fill="#ef4444" opacity="0.8" />
        </svg>

        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg viewBox="0 0 24 24" fill="var(--indigo)" style={{ width: 18, height: 18 }}>
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                </svg>
            </div>
            <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-2)' }}>{label}</p>
                <p style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 2 }}>Map integration available</p>
            </div>
        </div>

        {children && <div style={{ position: 'absolute', inset: 0 }}>{children}</div>}
    </div>
);

export default MapBox;
