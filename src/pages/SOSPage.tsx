import React, { useState } from 'react';
import { AlertTriangle, Phone, MapPin, CheckCircle, X, Shield, Users } from 'lucide-react';
import { useApp } from '../context/AppContext';

const Spinner = () => (
    <div style={{ width: 20, height: 20, borderRadius: '50%', border: '3px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin 0.8s linear infinite' }} />
);

const SOSPage: React.FC = () => {
    const { sosStatus, triggerSOS, cancelSOS, resetSOS, contacts } = useApp();
    const [modal, setModal] = useState(false);

    const idle = sosStatus === 'idle';
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
                    /* Idle / sending state */
                    <>
                        <div style={{ textAlign: 'center', maxWidth: 360 }}>
                            <p style={{ fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.7 }}>
                                Press the button below to send an emergency alert to{' '}
                                <strong style={{ color: 'var(--text)' }}>{contacts.length} contact{contacts.length !== 1 ? 's' : ''}</strong>.
                                Your location will be shared automatically.
                            </p>
                        </div>

                        <button id="sos-button" onClick={() => idle && setModal(true)} disabled={sending}
                            className="sos-btn">
                            {sending
                                ? <><Spinner /><span style={{ fontSize: 13, fontWeight: 500, marginTop: 6 }}>Sending…</span></>
                                : <><AlertTriangle size={36} /><span>SOS</span></>
                            }
                        </button>

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
                            An SOS alert will be sent to <strong style={{ color: 'var(--text)' }}>{contacts.length} emergency contact{contacts.length !== 1 ? 's' : ''}</strong> with your current GPS location.
                        </p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
                            {contacts.map(c => (
                                <span key={c.id} className="badge badge-neutral">{c.name}</span>
                            ))}
                        </div>

                        <div style={{ display: 'flex', gap: 10 }}>
                            <button id="sos-cancel-modal" onClick={() => { setModal(false); cancelSOS(); }}
                                className="btn btn-outline" style={{ flex: 1, gap: 6 }}>
                                <X size={14} />Cancel
                            </button>
                            <button id="sos-confirm" onClick={() => { setModal(false); triggerSOS(); }}
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
