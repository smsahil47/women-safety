import React, { useState } from 'react';
import { AlertTriangle, Phone, MapPin, CheckCircle, X, Shield, Users } from 'lucide-react';
import { useApp } from '../context/AppContext';

const Spinner = () => (
    <div style={{ width: 20, height: 20, borderRadius: '50%', border: '3px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin 0.8s linear infinite' }} />
);

const SOSPage: React.FC = () => {
    const { sosStatus, sosCountdown, triggerSOS, cancelSOS, resetSOS, contacts } = useApp();
    const [modal, setModal] = useState(false);
    const [selectedContacts, setSelectedContacts] = React.useState<Set<string>>(new Set());

    React.useEffect(() => {
        setSelectedContacts(new Set(contacts.map(c => c.id)));
    }, [contacts]);

    const idle = sosStatus === 'idle';
    const confirming = sosStatus === 'confirming';
    const sending = sosStatus === 'sending';
    const sent = sosStatus === 'sent';

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* Page header */}
            <div className="fade-up" style={{ paddingBottom: 20, borderBottom: '1px solid var(--border-soft)' }}>
                <h1 className="page-title">SOS Alert</h1>
                <p className="page-subtitle">Instantly notify all emergency contacts with your location</p>
            </div>

            {/* Main area */}
            <div className="fade-up d1 card card-pad" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 24px', gap: 28 }}>

                {sent ? (
                    /* Sent state */
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, textAlign: 'center' }}>
                        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--green-dim)', border: '1px solid rgba(34,197,94,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <CheckCircle size={30} style={{ color: 'var(--green)' }} />
                        </div>
                        <div>
                            <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>Alert Sent</h2>
                            <p style={{ fontSize: 13.5, color: 'var(--text-2)', maxWidth: 320, lineHeight: 1.6 }}>
                                Your emergency contacts have been notified with your current location.
                            </p>
                        </div>
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
                            <div className="alert alert-success" style={{ padding: '8px 14px' }}>
                                <Users size={14} style={{ flexShrink: 0 }} />
                                <span>{contacts.length} contact{contacts.length !== 1 ? 's' : ''} notified</span>
                            </div>
                            <div className="alert alert-info" style={{ padding: '8px 14px' }}>
                                <MapPin size={14} style={{ flexShrink: 0 }} />
                                <span>Location shared</span>
                            </div>
                        </div>
                        <button id="sos-reset" onClick={resetSOS} className="btn btn-outline">
                            Dismiss
                        </button>
                    </div>
                ) : (
                    /* Idle / confirming / sending state */
                    <>
                        <div style={{ textAlign: 'center', maxWidth: 360 }}>
                            {contacts.length === 0 ? (
                                <p style={{ fontSize: 13.5, color: 'var(--red, #ef4444)', lineHeight: 1.7, fontWeight: 500 }}>
                                    Please add emergency contacts before using the SOS feature.
                                </p>
                            ) : confirming ? (
                                <p style={{ fontSize: 13.5, color: 'var(--red)', lineHeight: 1.7, fontWeight: 700, animation: 'pulse 1s ease-in-out infinite' }}>
                                    🚨 Sending alert in {sosCountdown}s… tap below to cancel!
                                </p>
                            ) : (
                                <p style={{ fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.7 }}>
                                    Press the button below to send an emergency alert to{' '}
                                    <strong style={{ color: 'var(--text)' }}>{contacts.length} contact{contacts.length !== 1 ? 's' : ''}</strong>.
                                    Your location will be shared automatically.
                                </p>
                            )}
                        </div>

                        <button id="sos-button" onClick={() => idle && setModal(true)} disabled={sending || contacts.length === 0}
                            className="sos-btn">
                            {sending
                                ? <><Spinner /><span style={{ fontSize: 13, fontWeight: 500, marginTop: 6 }}>Sending…</span></>
                                : <><AlertTriangle size={36} /><span>SOS</span></>
                            }
                        </button>

                        {/* Big cancel button during countdown */}
                        {confirming && (
                            <button id="sos-cancel-countdown"
                                onClick={cancelSOS}
                                style={{
                                    padding: '14px 40px',
                                    borderRadius: 12,
                                    background: 'var(--red)',
                                    color: '#fff',
                                    border: 'none',
                                    fontWeight: 700,
                                    fontSize: 16,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 10,
                                    boxShadow: '0 0 0 4px rgba(239,68,68,0.3)',
                                    animation: 'pulse 1s ease-in-out infinite',
                                }}
                            >
                                <X size={20} /> Cancel SOS ({sosCountdown})
                            </button>
                        )}

                        {idle && (
                            <p style={{ fontSize: 12, color: 'var(--text-3)', textAlign: 'center' }}>
                                A confirmation dialog will appear before sending
                            </p>
                        )}
                    </>
                )}
            </div>

            {/* Info cards */}
            <div className="fade-up d2 grid-3">
                {[
                    { icon: <Users size={16} />, title: 'Contacts Alerted', body: `${contacts.length} emergency contact${contacts.length !== 1 ? 's' : ''} notified instantly via SMS and call.` },
                    { icon: <MapPin size={16} />, title: 'Location Shared', body: 'Your exact GPS coordinates are sent automatically.' },
                    { icon: <Phone size={16} />, title: 'Emergency Line', body: 'Emergency services can be contacted separately if required.' },
                ].map(c => (
                    <div key={c.title} className="card card-pad-sm" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 6, background: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-2)' }}>{c.icon}</div>
                        <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)' }}>{c.title}</div>
                        <div style={{ fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.55 }}>{c.body}</div>
                    </div>
                ))}
            </div>

            {/* Warning notice */}
            <div className="fade-up d3 alert alert-warning">
                <Shield size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                <div>
                    <div style={{ fontWeight: 600, marginBottom: 3 }}>Important</div>
                    Use SOS only in genuine emergencies. Accidental activation? You have 5 seconds to cancel before alerts are sent.
                </div>
            </div>

            {/* Confirmation Modal */}
            {modal && (
                <div className="modal-mask">
                    <div className="modal-box fade-up">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                            <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--red-dim)', border: '1px solid rgba(239,68,68,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <AlertTriangle size={17} style={{ color: 'var(--red)' }} />
                            </div>
                            <div>
                                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Confirm Emergency Alert</div>
                                <div style={{ fontSize: 12.5, color: 'var(--text-2)', marginTop: 2 }}>This action cannot be undone immediately</div>
                            </div>
                        </div>

                        <div className="divider" style={{ marginBottom: 16 }} />

                        <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 14 }}>
                            Select the emergency contacts to notify with your current GPS location.
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20, maxHeight: 150, overflowY: 'auto' }}>
                            {contacts.map(c => (
                                <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '6px 0' }}>
                                    <input 
                                        type="checkbox" 
                                        checked={selectedContacts.has(c.id)}
                                        onChange={(e) => {
                                            const newSet = new Set(selectedContacts);
                                            if (e.target.checked) newSet.add(c.id);
                                            else newSet.delete(c.id);
                                            setSelectedContacts(newSet);
                                        }}
                                        style={{ width: 16, height: 16, accentColor: 'var(--red)' }}
                                    />
                                    <span style={{ fontSize: 14, color: 'var(--text)', fontWeight: 500 }}>{c.name}</span>
                                    <span style={{ fontSize: 12, color: 'var(--text-3)' }}>({c.relationship})</span>
                                </label>
                            ))}
                        </div>

                        <div style={{ display: 'flex', gap: 10 }}>
                            <button id="sos-cancel-modal" onClick={() => { setModal(false); cancelSOS(); }}
                                className="btn btn-outline" style={{ flex: 1, gap: 6 }}>
                                <X size={14} />Cancel
                            </button>
                            <button id="sos-confirm" onClick={() => { setModal(false); triggerSOS(Array.from(selectedContacts)); }}
                                disabled={selectedContacts.size === 0}
                                className="btn btn-danger" style={{ flex: 1, gap: 6 }}>
                                <AlertTriangle size={14} />Send Alert
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SOSPage;
