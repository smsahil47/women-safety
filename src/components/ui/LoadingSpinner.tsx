import React from 'react';

interface LoadingSpinnerProps {
    size?: 'sm' | 'md' | 'lg';
    text?: string;
}

const SIZE_MAP = {
    sm: 'w-5 h-5 border-2',
    md: 'w-8 h-8 border-2',
    lg: 'w-12 h-12 border-3',
};

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'md', text }) => {
    return (
        <div className="flex flex-col items-center justify-center gap-3">
            <div className={`${SIZE_MAP[size]} rounded-full border-slate-700 border-t-purple-500 animate-spin`} />
            {text && <p className="text-slate-400 text-sm animate-pulse">{text}</p>}
        </div>
    );
};

export default LoadingSpinner;
