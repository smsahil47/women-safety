import React from 'react';
import type { SafetyLevel } from '../../types';

interface Props { level: SafetyLevel; score?: number; size?: 'sm' | 'md'; }

const CFG: Record<SafetyLevel, { cls: string; dot: string; label: string }> = {
    safe: { cls: 'badge badge-safe', dot: 'status-dot dot-green', label: 'Safe' },
    moderate: { cls: 'badge badge-moderate', dot: 'status-dot dot-amber', label: 'Moderate' },
    danger: { cls: 'badge badge-danger', dot: 'status-dot dot-red', label: 'High Risk' },
};

const SafetyBadge: React.FC<Props> = ({ level, score, size = 'md' }) => {
    const c = CFG[level];
    return (
        <span className={c.cls} style={size === 'sm' ? { fontSize: 11, padding: '1px 7px' } : {}}>
            <span className={c.dot} />
            {c.label}{score !== undefined ? ` · ${score}%` : ''}
        </span>
    );
};

export default SafetyBadge;
