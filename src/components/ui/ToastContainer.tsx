import React, { useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { ToastType } from '../../types';

const ICONS: Record<ToastType, React.ReactNode> = {
    success: <CheckCircle size={15} style={{ color: 'var(--green)', flexShrink: 0 }} />,
    error: <XCircle size={15} style={{ color: 'var(--red)', flexShrink: 0 }} />,
    warning: <AlertTriangle size={15} style={{ color: 'var(--amber)', flexShrink: 0 }} />,
    info: <Info size={15} style={{ color: '#a5b4fc', flexShrink: 0 }} />,
};
const CLS: Record<ToastType, string> = {
    success: 'toast toast-success',
    error: 'toast toast-error',
    warning: 'toast toast-warning',
    info: 'toast toast-info',
};

const ToastItem: React.FC<{ id: string; type: ToastType; message: string; onClose: (id: string) => void }> = ({ id, type, message, onClose }) => {
    useEffect(() => { const t = setTimeout(() => onClose(id), 4000); return () => clearTimeout(t); }, [id, onClose]);
    return (
        <div className={CLS[type]}>
            {ICONS[type]}
            <p style={{ flex: 1, fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>{message}</p>
            <button className="no-btn" onClick={() => onClose(id)} style={{ color: 'var(--text-3)', display: 'flex', alignItems: 'center', flexShrink: 0, padding: 2 }}>
                <X size={14} />
            </button>
        </div>
    );
};

const ToastContainer: React.FC = () => {
    const { toasts, removeToast } = useApp();
    return (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {toasts.map(t => <ToastItem key={t.id} id={t.id} type={t.type} message={t.message} onClose={removeToast} />)}
        </div>
    );
};

export default ToastContainer;
